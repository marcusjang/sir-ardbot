/*
 *	currency.js
 *		stuffs to interface with unipass forex rate openapi
 *	
 */

const { log, error } = require('./utils/debug.js')('sir-ardbot:currency');

const fetch = require('node-fetch');
const { XMLParser } = require('fast-xml-parser');
const parser = new XMLParser();

const config = require('./config.js');
const { knex } = require('./database.js');

// a bunch of Date related stuffs that makes me weep
const addDays = (date, days) => new Date(date.valueOf() + (days*24*60*60*1000));

const toDate = (string, tzOffset) => new Date(
	new Date(string.toString().replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')).valueOf() +
	(new Date().getTimezoneOffset()) * 60*1000
);

const toYyMMdd = (date = new Date()) => {
	return new Date(date.valueOf() - (date.getTimezoneOffset()*60*1000))
			.toISOString().substring(0,10).replace(/\-/g, '');
};

// See https://unipass.customs.go.kr for more information
const getApiUrl = (date = new Date()) => {
	return 'https://unipass.customs.go.kr:38010/ext/rest/trifFxrtInfoQry/retrieveTrifFxrtInfo' + 
		   `?crkyCn=${config.unipass.token}&imexTp=2&qryYymmDd=${toYyMMdd(date)}`;
}

// just because the keys to the api are so confusing
// hopefully they won't be changing api anytime soon
const keys = {
	return: 'trifFxrtInfoQryRtnVo',
	result: 'trifFxrtInfoQryRsltVo',
	begins: 'aplyBgnDt',
	currency: 'currSgn',
	rate: 'fxrt'
};

const getRates = (date = new Date()) => {
	const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const nextSunday = addDays(today.setDate(today.getDate() - today.getDay()), 7);
	const future = addDays(today.setDate(today.getDate() - today.getDay()), 3);

	return knex.where('expires', nextSunday.valueOf()).from('rates')
		.then(rates => {
			if (rates.length == 0) {
				log(`No current rates were found in the cache, fetching...`);
				return fetch(getApiUrl(future))
					.then(response => response.text())
					.then(text => parser.parse(text))
					.then(data => {
						const results = data[keys.return][keys.result];
						const rates = {};

						results.forEach(rate => {
							const currency = rate[keys.currency];
							rates[currency] = rate[keys.rate];
						});

						const starts = results[0][keys.begins];
						const expires = addDays(toDate(starts, true), 7);

						return {
							expires: expires.valueOf(),
							data: JSON.stringify(rates)
						};
					})
					.then(data => {
						log(`Fetched data, new expiration date is ${new Date(data.expires)}`);
						log(`Pushing the fetched data into the database...`);
						return knex.insert(data).onConflict('expires').ignore().into('rates')
							.then(() => data);
					});
			} else {
				return rates[0];
			}
		})
		.then(rates => {
			rates.data = JSON.parse(rates.data);

			// just to keep some kind of backward compatibility for now
			// will be phased out in future probably
			if (Object.values(rates.data)[0].hasOwnProperty('currency')) {
				return knex.where('expires', rates.expires).from('rates').del()
					.then(() => getRates());
			}

			return rates;
		});
};

module.exports = { getRates };
