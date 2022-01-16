/*
 *  utils/crawl.js
 *  @usage node crawl site
 *	
 */

process.argv.shift(); // node
process.argv.shift(); // crawl.js

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

process.env.CRAWLER_DBCHECK = false;
process.env.DISCORD_DISABLED = true;
process.env.UNIPASS_DISABLED = true;
process.env.DEBUG = 'sir-ardbot:*';
process.env.DEV = true;
process.env.DRYRUN = true;

const puppeteer = require('puppeteer');
const crawl = require('../crawl.js');

const puppeteerOptions = { args: [ '--no-sandbox', '--disable-setuid-sandbox' ] };
const puppeteerPath = process.env.PUPPETEER_PATH || false;

if (puppeteerPath && puppeteerPath !== '') {
	puppeteerOptions.product = 'chrome';
	puppeteerOptions.executablePath = puppeteerPath;
}

const siteName = process.argv.shift();

puppeteer.launch(puppeteerOptions).then(browser => {
	return crawl(browser, siteName)
		.then(results => {
			console.log(results);
			console.log(`Successfully crawled ${results.length} results`);
		})
		.finally(() => {
			browser.close();
			process.exit(0);
		});
});
