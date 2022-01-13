/*
	crawl.js
		this is where the crawling happens under my skin
*/

const debugModule = require('debug');
const debug = debugModule('sir-ardbot:crawler-info');
      debug.log = console.info.bind(console);
const error = debugModule('sir-ardbot:crawler-error');
      error.log = console.error.bind(console);
const { knex } = require('./database.js');
const currency = require('./currency.js');

const timeout = +process.env.PUPPETEER_TIMEOUT || 10000;

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

module.exports = (browser, domain) => {
	try {
		const site = require(`./sites/${domain}.js`);
		debug(`${domain}: Acquired ./sites/${domain}.js, commencing crawling...`);

		return Promise.all([
				browser.newPage()
					.then(page => {
							return Promise.all([
								page.setDefaultTimeout(timeout),
								page.setRequestInterception(true),
								(site.cookies) ? page.setExtraHTTPHeaders({ cookie: site.cookies }) : Promise.resolve()
							]).then(() => page);
						})
					.then(page => {
						/* for debuging purposes as well
						page.on('console', (msg) => {
							for (let i = 0; i < msg.args().length; ++i)
								console.log(`${i}: ${msg.args()[i]}`);
						});
						*/

						page.on('request', req => {
							req._interceptionHandled = false;
							if (['image', 'media', 'stylesheet', 'font', 'other'].includes(req.resourceType())) {
								//console.log('DENIED', req.url());
								// left here for debug purposes
								req.respond({ status: 200, body: '' });
							} else {
								//if(req.resourceType() == 'document') console.log('SURE', req.url());
								// ditto
								req.continue();
							}
						});
						
						return page.goto(site.url, { waitUntil: [ 'load' ] })
							.catch(err => errorHandler(err, domain))
							.then(() => {
								return site.getPuppet(page)
									.then(results => {
										debug(`${domain}: Successfully crawled ${results.length} products`);
										return results.reverse();
									})
									.catch(err => errorHandler(err, domain))
									.finally(() => {
										debug(`${domain}: Closing page...`);
										return page.close();
									});
								});
					}),
				knex.where('site', domain).select('url').from('products'),
				currency.getRates()
			])
			.then(parcel => {
				const [ results, record, rates ] = parcel;
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
