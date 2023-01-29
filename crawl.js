import { Buffer } from 'buffer';
import UserAgent from 'user-agents';
import config from './config.js';
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

	if (site.delay > 0) {
		if (site.counter === 0) {
			site.counter = site.delay;
		} else {
			site.counter--;
			log('%s: Will be skipped for now, remaining counter: %d...', site.domain, site.counter);
			return false;
		}
	}

	const page = await browser.newPage();
	try {
		const userAgent = new UserAgent({ deviceCategory: 'desktop' });
		await page.setUserAgent(userAgent.toString());
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
		site.counter = (site.delay / 10); // Soft-reset the counter so we can try again sooner

		if (err.name === 'TimeoutError') {
			error("%s: We somehow timed out?! Maybe it's nothing...", site.domain);
			
			site.timeoutCounter++;
			if (site.timeoutCounter >= 4) {
				site.timeoutCounter = 0;
				await sendError(err, site);
			}
		} else {
			error("%s: We had some uncertain error- to be specific:", site.domain);
			console.error(err);
			await sendError(err, site);
		}

		return false; // return false will be handled in processProducts()
	} finally {
		page.close();
	}
}
