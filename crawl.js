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
								(site.cookies) ? page.setExtraHTTPHeaders({ cookie: site.cookies }) : Promise.resolve(),
								page.goto(site.url, { waitUntil: 'networkidle2' }),
								page.exposeFunction('parseProduct', (prod) => prod.dataset.name)
							])
								.catch(err => {
									if (err.name == 'TimeoutError') {
										debug(`${domain}: We somehow timed out?!`);
									} else {
										console.error(err);
									}
								})
								.then(() => page);
						})
					.then(page => site.getPuppet(page).finally(() => page.close())),
				knex.where('site', domain).select('url').from('products'),
				getRates
			])
			.then(parcel => {
				const [ results, record, rates ] = parcel;
				debug(`${domain}: Successfully crawled ${results.length} products`);
				debug(`${domain}: Reading through the database to see if any has been seen...`);
				const set = new Set(record.map(el => el.url));
				const products = results
					.reverse()
					.filter(prod => !set.has(prod.url));

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

					if (!(process.env.DEV === 'true')) {
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
