/*
 *  currency.js
 *  	stuffs to interface with unipass forex rate openapi
 *  
 */

const config = require('./config.js');

const debug = require('debug')('sir-ardbot:currency');
      debug.log = console.info.bind(console);
const fetch = require('node-fetch');
const { XMLParser } = require('fast-xml-parser');
const parser = new XMLParser();

const { knex } = require('./database.js');

// a bunch of Date related stuffs that makes me weep
const addDays = (date, days) => new Date(date.valueOf() + (days*24*60*60*1000));
const toDate = (string, tzOffset) => new Date(
	new Date(string.toString().replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')).valueOf() +
	(new Date().getTimezoneOffset()) * 60*1000
);
const toYyMMdd = (date = new Date()) => {
	return new Date(date.valueOf() - (date.getTimezoneOffset() *60*1000))
			.toISOString().substring(0,10).replace(/\-/g, '');
};

const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const nextSunday = addDays(today.setDate(today.getDate() - today.getDay()), 7);
const future = addDays(today.setDate(today.getDate() - today.getDay()), 3);

// See https://unipass.customs.go.kr for more information
const url = 'https://unipass.customs.go.kr:38010/ext/rest/trifFxrtInfoQry/retrieveTrifFxrtInfo'
			+ `?crkyCn=${config.unipass.token}&imexTp=2&qryYymmDd=${toYyMMdd(future)}`;

module.exports = {
	getRates: () => {
		if (config.unipass.disabled) {
			return Promise.resolve(null);
		} else {
			return knex.where('expires', nextSunday.valueOf()).from('rates')
				.then(rates => {
					if (rates.length == 0) {
						debug(`No current rates were found in the cache, fetching...`);
						return fetch(url)
							.then(res => res.text())
							.then(text => parser.parse(text))
							.then(data => {
								const rates = {}
								data.trifFxrtInfoQryRtnVo.trifFxrtInfoQryRsltVo.forEach(rate => {
									rates[rate.currSgn] = {
										rate: rate.fxrt,
										currency: rate.currSgn
									};
								});
								const starts = data.trifFxrtInfoQryRtnVo.trifFxrtInfoQryRsltVo[0].aplyBgnDt;
								const expires = addDays(toDate(starts, true), 7);
								return {
									expires: expires.valueOf(),
									data: JSON.stringify(rates)
								}
							})
							.then(data => {
								debug(`Fetched data, new expiration date is ${new Date(data.expires)}`);
								debug(`Pushing the fetched data into the database...`);
								return knex.insert(data).onConflict('expires').ignore().into('rates').then(() => data);
							})
					} else {
						return rates[0];
					}
				})
				.then(data => JSON.parse(data.data));
		}
	}
}



