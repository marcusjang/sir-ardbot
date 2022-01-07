/*
	crawl.js
		this is where the crawling happens under my skin
*/

const debug = require('debug')('sir-ardbot:crawler');
const bent = require('bent');
const UserAgent = require('user-agents');
const userAgent = new UserAgent({ deviceCategory: 'desktop' });
const { JSDOM } = require('jsdom');

const { knex } = require('./database.js');
const { getRates } = require('./currency.js');

const baseHeader = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
	'Accept-Encoding': 'gzip, deflate, br',
	'Accept-Language': 'en-US',
	'Cache-Control': 'max-age=0',
	'DNT': 1,
	'User-Agent': userAgent.toString()
};

const crawl = async domain => {
	try {
		const site = require(`./sites/${domain}.js`);
		debug(`${domain}: Acquired ./sites/${domain}.js, commencing crawling...`);

		// get new merged, sorted header
		const mergedHeader = { ...baseHeader, ...site.header };
		const header = Object.keys(mergedHeader).sort()
			.reduce((obj, key) => {
				obj[key] = mergedHeader[key];
				return obj;
			}, {});

		// some bent stack into results
		const results = await bent(header)(site.url())
			.catch(async err => {
				if (err.statusCode = 307) {
					// follow redirects
					return await bent(header)(err.headers.location);
				} else {
					return false;
				}
			})
			.then(stream => stream.text())
			.then(body => new JSDOM(body))
			.then(dom => dom.window.document)
			// reverse the order so the newer ones come up last
			.then(doc => site.getProducts(doc).reverse());

		debug(`${domain}: Successfully crawled ${results.length} products`);

		debug(`${domain}: Reading through the database to see if any has been seen...`);
		const record = await knex.where('site', domain).select('url').from('products');
		const set = new Set(record.map(el => el.url));

		// get the forex data by expiration date (next sunday)
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const nextSunday = new Date(today.setDate(today.getDate() - today.getDay())+7*24*60*60*1000);
		let [ data ] = await knex.select('data').where('expires', nextSunday.valueOf()).from('rates');
		let rates;
		if (!data) {
			debug(`${domain}: There is no forex data! Fetching...`);
			// get new data from some time in the future (= 3 days)
			const future = new Date(today.setDate(today.getDate() - today.getDay())+3*24*60*60*1000);
			rates = (await getRates(future)).data;
		} else {
			rates = JSON.parse(data.data);
		}


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
			return false;
		} else {
			// store new products on the database (for some time at least)
			// needs to be expunged routinely
			const entries = products.map(product => {
				return {
					site: product.site,
					url: product.url,
					available: product.available
				}
			});

			debug(`${domain}: ${entries.length} new products has been found, inserting...`);
			if (!process.env.DEV) await knex.insert(entries).onConflict('url').ignore().into('products');
			debug(`${domain}: Successfully inserted ${entries.length} entries into the DB`);

			debug(`${domain}: Returning to Discord interface with new products...`);
			return products;
		}

	} catch(err) {
		// actively ignore conflict messages
		if (err.code != 'SQLITE_CONSTRAINT') {
			console.error(`${domain} Failed with the following:`);
			console.error(err);
		}
	}
}

module.exports = crawl;
