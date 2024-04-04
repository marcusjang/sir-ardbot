import { readdir } from 'fs/promises';
import child_process from 'node:child_process';
import { promisify } from 'node:util';
import puppeteer from 'puppeteer';
import config from './config.js';
import * as discord from './discord.js';
import * as database from './database.js';
import { getRates } from './currency.js';
import crawl from './crawl.js';
import { debug, delay, print } from './utils.js';
import { PathURL, Queue } from './classes.js'

const log = debug('sir-ardbot:main');
const error = debug('sir-ardbot:main', 'error');
const exec = promisify(child_process.exec);
const queue = new Queue(true);

function multiImport(paths) {
	return Promise.all(
		paths.map(path => import(new PathURL(path).href))
	).then(mod => mod.map(mod => mod.default));
}

function paceJob(callback, ms, span = 3000) {
	console.log(callback, ms, span)
	if (typeof callback !== 'function')
		return false;

	return Promise.race([
		Promise.all([ callback(), delay(ms) ]),
		delay(ms + span) // basically timeout
	]);
}

export async function init() {
	const sites = await readdir(new PathURL('sites').path)
		.then(files => {
			files = files.filter(file => {
				return (file.charAt(0) != '_' && file.endsWith('.js'));
			});

			if (files.length === 0) {
				config.debug.demo = true;
				config.discord.disabled = true;
			}

			if (config.debug.demo) {
				log('Sir Ardbot is in demo mode');
				files = [ '_example.js' ];
			}

			log('Found %d site module(s)...', files.length);

			return multiImport(files.map(file => `sites/${file}`));
		});

	if (!config.discord.disabled) {
		await discord.login();
		await discord.initChannels(sites); // initChannels() directly modifies the sites var
		const { stdout } = await exec('git describe --tags HEAD');
		const [ , tag, ahead, commit ] = stdout.trim().match(/^(.+)-(\d+)-g([a-f0-9]{7})$/);
		await discord.sendLogs(`Sir Ardbot \`${tag}\` was initialised at commit \`${commit}\` (ahead by ${ahead})`);
	}

	await database.init();

	const browser = await puppeteer.launch(config.puppeteer.options);
	log('Initialised puppeteer browser instance...');

	browser.on('disconnected', async () => {
		error('Connection to puppeteer browser has been servered, crashing down...');
		await discord.sendError(new Error('Connection to puppeteer browser has been servered'));
		discord.client.destroy();
		process.exit(0);
	});

	const unitDelay = Math.floor(config.crawler.interval / sites.length);
	log('Unit delay is %d ms per site', unitDelay);

	for (const site of sites) {
		const job = () => Promise.race([
			Promise.all([ crawl(browser, site).then(processProducts), delay(unitDelay) ]),
			delay(unitDelay + 3000) // basically timeout
		]);
		queue.add(job);
	}

	return; // returns nothing
}

async function processProducts(products) {
	if (!products || products.length === 0) return false;

	const site = products[0].site;
	products = products.reverse();

	log('%s: Successfully crawled %d products', site.domain, products.length);

	if (config.crawler.dbcheck) {
		try {
			const records = await database.getRecords(site);
			const set = new Set(records.map(el => el.url));
			products = products.filter(prod => !set.has(prod.url));
		} catch(err) {
			error("%s: We had some error while getting rates- to be specific:", site.domain);
			console.error(err);
			return false; // halt because no check means discord spam
		}
	}

	if (products.length === 0) {
		log('%s: ... but none of them were new.', site.domain);
		return false;
	}

	if (!config.dataApi.disabled) {
		try {
			const rates = await getRates();
			for (const product of products) {
				const currency = product.site.meta.currency;
				if (currency !== 'USD' && rates[currency]) {
					const priceUSD = product.price * (rates[currency] / rates['USD']);
					product.priceUSD = Math.round(priceUSD * 100) / 100; // two decimal places
				}
			}
		} catch(err) {
			error("%s: We had some error while getting rates- to be specific:", site.domain);
			console.error(err);
			// won't halt - just not display priceUSD
		}
	}

	if (!config.debug.demo && (config.debug.dryrun || !config.debug.dev)) {
		try {
			await database.putRecords(products);
			log('%s: ...and inserted them into the database as well!', site.domain);
		} catch(err) {
			if (err.code === 'SQLITE_CONSTRAINT') {
				error("%s: I'm sure it's nothing, but there was an (allowed) database conflic:", site.domain);
				console.error(err);
			} else {
				error("%s: We had some error while inserting- to be specific:", site.domain);
				console.error(err);
			}

			return false; // halt so no save = no broadcast
		}
	}

	if (config.discord.disabled ||config.debug.dryrun || config.debug.demo) {
		products.forEach((product, index) => {
			console.log(product.string);
			if (index === products.length-1)
				console.log('');
		});

		return true; // return true just for good lucks
	} else {
		try {
			return await discord.sendProducts(products);
		} catch(err) {
			error("%s: Something went wrong while trying to send to discord, to be specific:", site.domain);
			console.error(err);
			// nothing to halt now
		}
	}
}
