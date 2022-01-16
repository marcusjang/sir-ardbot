/*
	crawl.js
		this is where the crawling happens in my skin
*/

const debugModule = require('debug');
const debug = debugModule('sir-ardbot:crawler-info');
      debug.log = console.info.bind(console);
const error = debugModule('sir-ardbot:crawler-error');
      error.log = console.error.bind(console);
const { Buffer } = require('buffer');
const { knex } = require('./database.js');
const currency = require('./currency.js');

const timeout = +process.env.PUPPETEER_TIMEOUT || 10000;
const pptrConsoleRelay = (process.env.PUPPETEER_CONSOLE === 'true');
const dbCheck = (process.env.CRAWLER_DBCHECK !== 'false');

// 1x1 empty gif image in buffer form
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

const errorHandler = (err, domain) => {
	if (err.name == 'TimeoutError') {
		error(`${domain}: We somehow timed out?! Maybe it's nothing...`);
	} else if (err.code != 'SQLITE_CONSTRAINT') {
		error(`${domain}: I'm sure it's nothing, but there was an (allowed) database conflic:`);
		error(err.message);
	} else {
		error(`${domain}: We had some uncertain error- to be specific:`);
		error(err.message);
	}
	return false;
};

const relayConsole = messages => {
	messages.args().forEach((message, index) => {
		console.log(`${index} : ${message}`);
	});
};

const requestHandler = req => {
	req._interceptionHandled = false;
	if (req.resourceType() === 'image') {
		req.respond({
			status: 200,
			headers: {
				'Content-Length': emptyImage.length, 
				'Content-Type': 'image/gif'
			},
			body: emptyImage
		});
	} else if (denyTypes.includes(req.resourceType())) {
		req.respond({ status: 200, body: '' });
	} else {
		req.continue();
	}
}

module.exports = (browser, domain) => {
	try {
		const site = require(`./sites/${domain}.js`);
		debug(`${domain}: Acquired ./sites/${domain}.js, commencing crawling...`);

		const browse = () => browser.newPage()
			.then(page => {
				return Promise.all([
					page.setDefaultTimeout(timeout),
					page.setRequestInterception(true),
					(site.cookies) ? page.setExtraHTTPHeaders({ cookie: site.cookies }) : Promise.resolve()
				]).then(() => page);
			})
			.then(page => {
				// for debuging purposes
				if (pptrConsoleRelay) page.on('console', relayConsole);

				// request rejection on selected types
				page.on('request', requestHandler);
				
				return page.goto(site.url, { waitUntil: [ 'load' ] })
					.catch(err => errorHandler(err, domain))
					.then(() => {
						return site.getPuppet(page)
							.then(results => results.reverse())
							.catch(err => errorHandler(err, domain))
							.finally(() => page.close())
					});
			});

		return Promise.all([
			browse(),
			(dbCheck) ? knex.where('site', domain).select('url').from('products') : Promise.resolve([]),
			currency.getRates()
		])
		.then(parcel => {
			const [ results, record, rates ] = parcel;
			debug(`${domain}: Successfully crawled ${results.length} products`);
			if (!results) return false;
			debug(`${domain}: Reading through the database to see if any has been seen...`);
			const set = new Set(record.map(el => el.url));
			const products = results.filter(prod => !set.has(prod.url));

			if (currency.enabled) {
				products.forEach(prod => {
					if (rates[prod.currency]) {
						prod.priceUSD = Math.round(
							prod.price *
							rates[prod.currency].rate /
							rates.USD.rate * 100
						) / 100;
					}
				});
			}

			if (!products || products.length == 0) {
				debug(`${domain}: No new product has been found`);
				return null;
			} else {
				debug(`${domain}: Returning to the job queue with new products...`);
				return products;
			}
		});
	} catch(err) {
		errorHandler(err, 'database');
	}
}
