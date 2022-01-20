import { readdir } from 'fs/promises';
import puppeteer from 'puppeteer';
import config from './config.js';
import * as discord from './discord.js';
import debug, { print } from './utils/debug.js';
import PathURL from './classes/pathurl.js';

const log = debug('sir-ardbot:init');

export default function() {
	log('Sir Ardbot is initialising...');
	readdir(new PathURL('sites').path)
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
				return sites.map(site => import(new PathURL(`sites/${site}`).href));
			}

			return Promise.all(importation());
		})
		.then(sites => {
			sites = sites.map(site => site.default)
			log('Found %d site module(s)...', sites.length);
			return new Promise(resolve => {
				if (!config.discord.disabled) {
					discord.login()
						.then(() => discord.initChannels(sites))
						.then(resolve);
				} else {
					resolve(sites);
				}
			});
		})
		.then(sites => {
			//print(sites);
		});

	//puppeteer.launch()
	//	.then(browser => console.log(browser));
	// TODO init
}