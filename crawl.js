/*
	crawl.js
		this is where the crawling happens under my skin
*/

const debug = require('debug')('sir-ardbot:crawler');
const { knex } = require('./database.js');
const getRates = require('./currency.js');

module.exports = (browser, domain) => {
	try {
		const site = require(`./sites/${domain}.js`);
		debug(`${domain}: Acquired ./sites/${domain}.js, commencing crawling...`);

		return Promise.all([
				browser.newPage()
					.then(page => {
							return Promise.all([
								page.setDefaultTimeout(8000),
								page.setRequestInterception(true),
								(site.cookies) ? page.setExtraHTTPHeaders({ cookie: site.cookies }) : Promise.resolve()
							])
								.catch(err => {
									if (err.name == 'TimeoutError') {
										debug(`${domain}: We somehow timed out?!`);
									} else {
										console.error(err);
									}
									return page.close();
								})
								.then(() => page);
						})
					.then(page => {
						page.on('request', req => {
							req._interceptionHandled = false;
							if (['image', 'stylesheet', 'font', 'other'].includes(req.resourceType())) {
								//console.log('DENIED', req.url());
								// left here for debug purposes
								req.respond({ status: 200, body: '' });
							} else {
								//console.log('SURE', req.url());
								// ditto
								req.continue();
							}
						});
						
						return page.goto(site.url, { waitUntil: 'networkidle2' })
							.then(() => site.getPuppet(page)
								.then(results => {
									debug(`${domain}: Successfully crawled ${results.length} products`);
									return results.reverse();
								})
								.catch(err => console.error(err.message))
								.finally(() => {
									debug(`${domain}: Closing page...`);
									return page.close();
								})
							);
					})
					,
				knex.where('site', domain).select('url').from('products'),
				getRates()
			])
			.then(parcel => {
				const [ results, record, rates ] = parcel;
				if (!results) return false;
				debug(`${domain}: Reading through the database to see if any has been seen...`);
				const set = new Set(record.map(el => el.url));
				const products = results.filter(prod => !set.has(prod.url));

				products.forEach(prod => {
					prod.priceUSD = Math.round(
							prod.price *
							rates[prod.currency].rate /
							rates.USD.rate * 100
						) / 100;
				});

				if (!products || products.length == 0) {
					debug(`${domain}: No new product has been found`);
					return null;
				} else {
					// store new products on the database (for some time at least)
					// needs to be expunged routinely
					const entries = products.map(product => {
						return {
							site: product.site,
							url: product.url
						}
					});

					if ((process.env.DRYRUN === 'true') || !(process.env.DEV === 'true')) {
						debug(`${domain}: ${entries.length} new products has been found, inserting...`);
						return knex.insert(entries).onConflict('url').ignore().into('products')
							.then(() => {
								debug(`${domain}: Successfully inserted ${entries.length} entries into the DB`);
								debug(`${domain}: Returning to Discord interface with new products...`);
								return products;
							})
					} else {
						debug(`${domain}: Returning to Discord interface without inserting...`);
						return products;
					}
				}
			});
	} catch(err) {
		// actively ignore conflict messages
		if (err.code != 'SQLITE_CONSTRAINT') {
			console.error(`${domain} Failed with the following:`);
			console.error(err);
		}
	}
}
