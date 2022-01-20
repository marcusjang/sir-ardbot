import { readdir } from 'fs/promises';
import puppeteer from 'puppeteer';
import config from './config.js';
import * as discord from './discord.js';
import * as database from './database.js';
import crawl from './crawl.js';
import { debug, print, delay } from './utils.js';
import PathURL from './classes/pathurl.js';
import Queue from './classes/queue.js'

const log = debug('sir-ardbot:init');
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

export default function() {
	return readdir(new PathURL('sites').path)
		// get site modules then import them
		.then(files => files.filter(file => (file.charAt(0) != '_' && file.endsWith('.js'))))
		.then(sites => {
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
		})

		// login on discord if necessary then modularise the site modules
		.then(sites => {
			if (config.discord.disabled)
				return sites;

			return discord.login()
				.then(() => discord.initChannels(sites));
		})

		// launch puppeteer and initialise the database
		.then(async sites => {
			await database.init();

			const browser = await puppeteer.launch(config.puppeteer.options);
			const unitDelay = Math.floor(config.crawler.interval / sites.length);
			log('Unit delay is %d ms per site', unitDelay);

			for (const site of sites) {
				const job = () => Promise.race([
					Promise.all([ crawl(browser, site), delay(unitDelay) ]),
					delay(unitDelay + 3000) // basically timeout
				]);
				queue.add(job);
			}

			return true;
		});

}