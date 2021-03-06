import config from './config.js';
import puppeteer from 'puppeteer';
import { Buffer } from 'buffer';
import { debug } from './utils.js';
import { sendError } from './discord.js';

const log = debug('sir-ardbot:crawler');
const error = debug('sir-ardbot:crawler', 'error');

const denyTypes = [ 'media', 'stylesheet', 'font', 'other' ];
const emptyImage = Buffer.from([
	0x47,0x49,0x46,0x38, 0x39,0x61,0x01,0x00,
	0x01,0x00,0x91,0x00, 0x00,0x00,0x00,0x00,
	0xff,0xff,0xff,0xff, 0xff,0xff,0x00,0x00,
	0x00,0x21,0xff,0x0b, 0x4e,0x45,0x54,0x53,
	0x43,0x41,0x50,0x45, 0x32,0x2e,0x30,0x03,
	0x01,0x00,0x00,0x00, 0x21,0xf9,0x04,0x05,
	0x00,0x00,0x02,0x00, 0x2c,0x00,0x00,0x00,
	0x00,0x01,0x00,0x01, 0x00,0x00,0x02,0x02,
	0x54,0x01,0x00,0x3b
]);

function relayConsole(messages) {
	messages.args().forEach((message, index) => {
		console.log(`${index} : ${message}`);
	});
}

function requestHandler(request) {
	request._interceptionHandled = false;
	if (request.resourceType() === 'image') {
		// images are handled separately to not trigger onError() 
		request.respond({
			status: 200,
			headers: {
				'Content-Length': emptyImage.length,
				'Content-Type': 'image/gif'
			},
			body: emptyImage // see? how graceful
		});
	} else if (denyTypes.includes(request.resourceType())) {
		// other types are simply denied
		request.respond({ status: 200, body: '' });
	} else {
		request.continue();
	}
}

export default async function(browser, site) {
	const page = await browser.newPage();
	try {
		await page.setDefaultTimeout(config.puppeteer.timeout);
		await page.setRequestInterception(true);

		if (site.cookies) {
			for (const cookie of site.cookies) {
				await page.setCookie(cookie);
			}
		}

		// for debuging purposes
		if (config.puppeteer.console)
			page.on('console', relayConsole);

		page.on('request', requestHandler);

		log('%s: Start crawling...', site.domain);

		await page.goto(site.url, { waitUntil: [ 'load' ] });
		const products = await site.getProducts(page);

		log('%s: Crawling done! Returning with products...', site.domain);

		return products;

	} catch(err) {
		if (err instanceof puppeteer.errors.TimeoutError) {
			error("%s: We somehow timed out?! Maybe it's nothing...", site.domain);
		} else if (err.name === 'ProtocolError' || !page.browser().isConnected()) {
			error("%s: A protocol error happened, possibly the connections have been servered...", site.domain);
		} else {
			error("%s: We had some uncertain error- to be specific:", site.domain);
			console.error(err);
		}

		if (!config.discord.disabled)
			sendError(err, site);

		return false; // return false will be handled in processProducts()
	} finally {
		if (!page.isClosed() && page.browser().isConnected())
			await page.close();
	}
}
