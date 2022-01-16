/*
 *  scripts/crawl.js
 *  @usage node crawl site
 *	
 */

const config = require('../config.js');
const print = require('../utils/print.js');

process.argv.shift(); // node
process.argv.shift(); // crawl.js

process.env.DEBUG = 'sir-ardbot:*';

const puppeteer = require('puppeteer');
const { crawl } = require('../crawl.js');

const siteName = process.argv.shift();

puppeteer.launch(config.puppeteer.options).then(browser => {
	return crawl(browser, siteName)
		.then(results => {
			print(results);
			print(`Successfully crawled ${results.length} results`);
		})
		.finally(() => {
			browser.close();
			process.exit(0);
		});
});
