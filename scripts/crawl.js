/*
 *  scripts/crawl.js
 *  @usage node crawl site
 *	
 */

import puppeteer from 'puppeteer';
import config from '../config.js';
import { print } from '../utils.js';
import { PathURL } from '../classes.js';
import crawl from '../crawl.js';

process.argv.shift(); // node
process.argv.shift(); // crawl.js

process.env.DEBUG = 'sir-ardbot:*';

config.crawler.dbcheck = false;
config.puppeteer.console = true;

const siteName = process.argv.shift();
const site = (await import(new PathURL(`sites/${siteName}.js`).href)).default;

puppeteer.launch(config.puppeteer.options).then(browser => {
	return crawl(browser, site)
		.then(results => {
			print(results);
			print(`Successfully crawled ${results.length} results`);
		})
		.finally(() => {
			browser.close();
			process.exit(0);
		});
});
