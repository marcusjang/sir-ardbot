import { readdir } from 'fs/promises';
import puppeteer from 'puppeteer';
import config from './config.js';
import { login, client, initChannels } from './discord.js';
import { init as dbInit } from './database.js';
import crawl from './crawl.js';
import { debug, delay } from './utils.js';
import { PathURL, Queue } from './classes.js'

const log = debug('sir-ardbot:init');
const error = debug('sir-ardbot:init', 'error');
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
			const sites = files.filter(file => {
				return (file.charAt(0) != '_' && file.endsWith('.js'));
			});

			if (sites.length === 0) {
				config.debug.demo = true;
				config.discord.disabled = true;
			}

			if (config.debug.demo) {
				log('Sir Ardbot is in demo mode');
				sites = [ '_example.js' ];
			}

			log('Found %d site module(s)...', sites.length);

			return multiImport(sites.map(path => `sites/${path}`));
		});

	if (!config.discord.disabled) {
		await login();
		await initChannels(sites); // initChannels() directly modifies the sites var
	}

	await dbInit();

	const browser = await puppeteer.launch(config.puppeteer.options);
	log('Initialised puppeteer browser instance...');

	browser.on('disconnected', () => {
		error('Connection to puppeteer browser has been servered, crashing down...');
		destroy();
	});

	const unitDelay = Math.floor(config.crawler.interval / sites.length);
	log('Unit delay is %d ms per site', unitDelay);

	for (const site of sites) {
		const job = () => Promise.race([
			Promise.all([ crawl(browser, site), delay(unitDelay) ]),
			delay(unitDelay + 3000) // basically timeout
		]);
		queue.add(job);
	}

	return; // returns nothing
}
