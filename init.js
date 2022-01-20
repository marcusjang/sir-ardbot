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

function paceJob(callback, delay, span = 3000) {
	if (typeof callback !== 'function')
		return false;

	return Promise.race([
		Promise.all([ job(), delay(delay) ]),
		delay(delay + span) // basically timeout
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
		.then(sites => {
			return Promise.all([ puppeteer.launch(config.puppeteer.options), database.init() ])
				.then(init => {
					const [ browser ] = init;
					const unitDelay = Math.floor(config.crawler.interval / sites.length);
					log('Unit delay is %d ms per site', unitDelay);

					for (const site of sites) {
						queue.add(paceJob(crawl(browser, site), unitDelay));
					}

					return true;
				});
		});

}