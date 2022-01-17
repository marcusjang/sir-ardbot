/*
 *	crawl.js
 *		stuffs to interface with puppeteer
 *  
 */

const { log, error } = require('./utils/debug.js')('sir-ardbot:crawler');

const { Buffer } = require('buffer');

const config = require('./config.js');
const { getRecords, putRecords } = require('./database.js');
const { getRates } = require('./currency.js');

// just a simple handler for (currently small) smorgasboard of errors
const errorHandler = (err, domain) => {
	if (err.name === 'TimeoutError') {
		error(`${domain}: We somehow timed out?! Maybe it's nothing...`);
	} else if (err.code === 'SQLITE_CONSTRAINT') {
		error(`${domain}: I'm sure it's nothing, but there was an (allowed) database conflic:`);
		console.error(err);
	} else {
		error(`${domain}: We had some uncertain error- to be specific:`);
		console.error(err);
	}
	return false;
};

// used to relay puppeteer console to outside
const relayConsole = messages => {
	messages.args().forEach((message, index) => {
		console.log(`${index} : ${message}`);
	});
};

// 1x1 empty gif image in buffer form
// this will be used in requestHandler() to gracefully block image requests
const emptyImage = Buffer.from([
	0x47,0x49,0x46,0x38,0x39,0x61,0x01,0x00,
	0x01,0x00,0x91,0x00,0x00,0x00,0x00,0x00,
	0xff,0xff,0xff,0xff,0xff,0xff,0x00,0x00,
	0x00,0x21,0xff,0x0b,0x4e,0x45,0x54,0x53,
	0x43,0x41,0x50,0x45,0x32,0x2e,0x30,0x03,
	0x01,0x00,0x00,0x00,0x21,0xf9,0x04,0x05,
	0x00,0x00,0x02,0x00,0x2c,0x00,0x00,0x00,
	0x00,0x01,0x00,0x01,0x00,0x00,0x02,0x02,
	0x54,0x01,0x00,0x3b
]);

// request resource types to deny
const denyTypes = [ 'media', 'stylesheet', 'font', 'other' ];
const requestHandler = req => {
	req._interceptionHandled = false;
	if (req.resourceType() === 'image') {
		// images are handled separately to not trigger onError() 
		req.respond({
			status: 200,
			headers: {
				'Content-Length': emptyImage.length,
				'Content-Type': 'image/gif'
			},
			body: emptyImage // see? how graceful
		});
	} else if (denyTypes.includes(req.resourceType())) {
		// other types are simply denied
		req.respond({ status: 200, body: '' });
	} else {
		req.continue();
	}
};

const browse = (browser, site) => {
	return browser.newPage().then(page => {
		return Promise.all([
			page.setDefaultTimeout(config.puppeteer.timeout),
			page.setRequestInterception(true),
			(site.cookies) ?
				page.setExtraHTTPHeaders({ cookie: site.cookies }) :
				Promise.resolve()
		]).then(() => page);
	})
	.then(page => {
		// for debuging purposes
		if (config.puppeteer.console)
			page.on('console', relayConsole);

		// request rejection on selected types
		page.on('request', requestHandler);
		
		return page.goto(site.url, { waitUntil: [ 'load' ] })
			.catch(err => errorHandler(err, domain))
			.then(() => {
				return site.getProducts(page)
					.then(results => results.reverse())
					.catch(err => errorHandler(err, domain))
					.finally(() => page.close())
			});
	});
};

const crawl = (browser, domain) => {
	const site = require(`./sites/${domain}.js`);
	log(`${domain}: Acquired sites/${domain}.js, commencing crawling...`);

	const limit = (site.limit) ? site.limit * 4 : 200; // just some random big-ish number

	const jobs = [ browse(browser, site) ];
	if (config.crawler.dbcheck) jobs.push(getRecords(domain, limit));
	if (!config.unipass.disabled) jobs.push(getRates());

	return Promise.all(jobs)
		.then(parcel => {
			let products = parcel.shift();
			const records = (config.crawler.dbcheck) ? parcel.shift() : false;
			const currencyData = (!config.unipass.disabled) ? parcel.shift() : false;

			if (!products) return [];

			log(`${domain}: Successfully crawled ${products.length} products`);

			if (records) {
				log(`${domain}: Reading through the database to see if any has been seen...`);
				const set = new Set(records.map(el => el.url));
				products = products.filter(prod => !set.has(prod.url));
			}

			if (currencyData) {
				const rates = currencyData.data;
				products.forEach(prod => {
					const currency = prod.site.meta.currency;
					if (currency !== 'USD' && rates[currency]) {
						const priceUSD = prod.price * (rates[currency] / rates['USD']);
						// two decimal places
						prod.priceUSD = Math.round(priceUSD * 100) / 100;
					}
				});
			}

			return products;
		})
		.then(products => {
			if (products.length == 0) {
				log(`${domain}: No new product has been found`);
				return Promise.reject(null);
			}
			
			log(`${domain}: ${products.length} products are new`);

			const toSave = !config.debug.demo && (config.debug.dryrun || !config.debug.dev);
			if (!toSave) return products;

			return putRecords(products).then(() => products);
		});
}

module.exports = { crawl };
