import { Buffer } from 'buffer';
import config from './config.js';
import { debug } from './utils.js';

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

function relayConsole(message) {
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
	try {
		const page = await browser.newPage();
		const headers = (site.cookies) ? { cookies: site.cookies } : {};

		await page.setDefaultTimeout(config.puppeteer.timeout);
		await page.setRequestInterception(true);
		await page.setExtraHTTPHeaders(headers);

		// for debuging purposes
		if (config.puppeteer.console)
			page.on('console', relayConsole);

		page.on('request', requestHandler);

		await page.goto(site.url, { waitUntil: [ 'load' ] });
		const results = (await site.getProducts(page)).reverse();

		console.log(results);
		
		page.close();
		return results;

	} catch(err) {
		if (err.name === 'TimeoutError') {
			error("%s: We somehow timed out?! Maybe it's nothing...", site.domain);
		} else if (err.code === 'SQLITE_CONSTRAINT') {
			error("%s: I'm sure it's nothing, but there was an (allowed) database conflic:", site.domain);
			console.error(err);
		} else {
			error("%s: We had some uncertain error- to be specific:", site.domain);
			console.error(err);
		}
	}
}