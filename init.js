import { readdir } from 'fs/promises';
import puppeteer from 'puppeteer';
import config from './config.js';
import * as discord from './discord.js';
import * as database from './database.js';
import debug, { print } from './utils/debug.js';
import PathURL from './classes/pathurl.js';

const log = debug('sir-ardbot:init');

export default function() {
	log('Sir Ardbot is initialising...');
	readdir(new PathURL('sites').path)
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

			const importation = () => {
				return sites.map(site => {
					return import(new PathURL(`sites/${site}`).href);
				});
			}

			log('Found %d site module(s)...', sites.length);

			return Promise.all(importation())
				.then(sites => sites.map(site => site.default));
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
			Promise.all([ puppeteer.launch(config.puppeteer.options), database.init() ])
				.then(init => {
					const [ browser ] = init;
					// TODO init further
				});
		});

}