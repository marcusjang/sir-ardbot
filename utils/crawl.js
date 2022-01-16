/*
 *  utils/crawl.js
 *  @usage node crawl site
 *	
 */

const config = require('./config.js');

process.argv.shift(); // node
process.argv.shift(); // crawl.js

process.env.DEBUG = 'sir-ardbot:*';

const puppeteer = require('puppeteer');
const util = require('util');
const crawl = require('../crawl.js');

config.crawler.dbcheck = false;
config.discord.disabled = true;
config.unipass.disabled = true;
config.debug.dev = true;
config.debug.dryrun = true;

const puppeteerOptions = { args: [ '--no-sandbox', '--disable-setuid-sandbox' ] };
if (config.puppeteer.path) {
	puppeteerOptions.product = 'chrome';
	puppeteerOptions.executablePath = config.puppeteer.path;
}

const siteName = process.argv.shift();

const print = message => console.log(
	util.inspect(message, {
		showHidden: false,
		depth: null,
		colors: true
	})
);

puppeteer.launch(puppeteerOptions).then(browser => {
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
