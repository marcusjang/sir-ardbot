import config from './config.js';

import { readdir } from 'fs/promises';
import puppeteer from 'puppeteer';

import * as discord from './discord.js';
import * as database from './database.js';
import { getRates } from './currency.js';
import { debug, delay } from './utils.js';
import { PathURL, Queue } from './classes.js';
import crawl from './crawl.js';

const log = debug('sir-ardbot:main');
const error = debug('sir-ardbot:main', 'error');

function getModules(path) {
	return readdir(new PathURL(path).path)
		.then(files => files.filter(file => (file.charAt(0) != '_' && file.endsWith('.js'))))
		.then(files => files.map(file => path + '/' + file))
		.then(files => Promise.all(files.map(file => import(new PathURL(file).href))))
		.then(modules => modules.map(mod => mod.default)) ;
}

void async function init() {
	log('Sir Ardbot is initialising...');

	const client = await discord.login();
	// Logged into Discord

	const sites = await getModules('sites');
	const unitDelay = Math.floor(config.crawler.interval / sites.length);
	log('Loaded %d site modules, unit delay set to %d ms per site', sites.length, unitDelay);
	log('initialising Discord channels...');
	for (const site of sites) {
		site.channel = await discord.getChannel(site);
		site.delay = unitDelay;
	}

	const events = await getModules('events');
	if (events.length > 0) {
		log('Found %d event handling module(s), setting catchers...', events.length);
		for (const event of events) {
			if (event.once) {
				client.once(event.name, (...args) => event.execute(...args));
			} else {
				client.on(event.name, (...args) => event.execute(...args));
			}
		}
	}

	const commands = await getModules('commands');
	if (commands.length > 0) {
		log('Found %d command module(s), setting on client...', commands.length);
		client.commands = new Map(); // prep for command setting
		for (const command of commands) {
			client.commands.set(command.data.name, command);
		}
	}

	const db = await database.init();
	// Initialised knex database

	const browser = await puppeteer.launch(config.puppeteer.options);
	log('Initialised puppeteer browser instance...');

	browser.on('disconnected', async () => {
		error('Connection to puppeteer browser has been servered, crashing down...');
		if (!config.discord.disabled) {
			await discord.sendError(new Error('Connection to puppeteer browser has been servered'))
				.then(exit);
		}
	});

	// the real meat and juice
	const queue = new Queue(true);

	for (const site of sites) {
		queue.add(() => Promise.race([
			Promise.all([ crawl(browser, site).then(processProducts), delay(site.delay) ]),
			delay(site.delay + 3000) // basically timeout
		]));
	}

	// exit handling
	function exit() {
		log('Exiting gracefully...');

		queue.destroy();
		client.destroy();
		db.destroy();
		browser.close();
	}

	process.on('SIGINT', exit);
	process.on('SIGTERM', exit);
}();

async function processProducts(products) {
	if (!products || products.length === 0) return false;

	const { site } = products[0];
	products = products.reverse();

	log('%s: Successfully crawled %d products', site.domain, products.length);

	try {
		if (config.crawler.dbcheck) {
			const records = await database.getRecords(site);
			const set = new Set(records.map(el => el.url));
			products = products.filter(prod => !set.has(prod.url));
		}

		if (products.length === 0) {
			log('%s: ... but none of them were new.', site.domain);
			return;
		}

		if (!config.unipass.disabled) {
			const rates = await getRates().catch(() => null);
			if (typeof rates === 'array' && rates.length > 0) {
				for (const product of products) {
					const currency = product.site.meta.currency;
					if (currency !== 'USD' && rates[currency])
						product.priceUSD = product.price * (rates[currency] / rates['USD']);
				}
			}
		}

		if (!config.debug.dev) {
			await database.putRecords(products);
			log('%s: ...and inserted them into the database as well!', site.domain);
		}

		if (!config.discord.disabled) {
			await discord.sendProducts(products);
		} else {
			for (const product of products)
				console.log(product.string);
			console.log('');
		}

	} catch(err) {
		error("%s: We had some error while processing products- to be specific:", site.domain);
		console.error(err);

		if (!config.discord.disabled)
			discord.sendError(err, site);
	}
}
