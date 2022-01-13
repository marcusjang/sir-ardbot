/*
	currency.js
		dealing with fetching unipass exchange rates
		probably bad naming but it's too late
*/

const debug = require('debug')('sir-ardbot:currency');
      debug.log = console.info.bind(console);
const fetch = require('node-fetch');
const { XMLParser } = require('fast-xml-parser');
const parser = new XMLParser();

const { knex } = require('./database.js');

const token = process.env.UNIPASS_TOKEN;
const enabled = !(!token || (process.env.UNIPASS_DISABLED === 'true'));

const addDays = (date, days) => new Date(date.valueOf() + ((new Date().getTimezoneOffset() + days*24*60)*60*1000));
const toDate = string => new Date(string.toString().replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
const toYyMMdd = (date = new Date()) => {
	return new Date(date.valueOf() - (date.getTimezoneOffset() *60*1000))
			.toISOString().substring(0,10).replace(/\-/g, '');
};

const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const nextSunday = new Date(today.setDate(today.getDate() - today.getDay())+7*24*60*60*1000);
const future = new Date(today.setDate(today.getDate() - today.getDay())+3*24*60*60*1000);

// See https://unipass.customs.go.kr for more information
const url = 'https://unipass.customs.go.kr:38010/ext/rest/trifFxrtInfoQry/retrieveTrifFxrtInfo'
			+ `?crkyCn=${token}&imexTp=2&qryYymmDd=${toYyMMdd()}`;

module.exports = {
	enabled: enabled,
	getRates: () => {
		if (!enabled) {
			return Promise.resolve(null);
		} else {
			return knex.where('expires', nextSunday.valueOf()).from('rates')
				.then(currentRates => {
					if (currentRates.length == 0) {
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
								const expires = addDays(toDate(starts), 7);
								return {
									expires: expires.valueOf(),
									data: JSON.stringify(rates)
								}
							})
							.then(data => {
								debug(`Fetched data, new expiration date is ${data.expires}`);
								debug(`Pushing the fetched data into the database...`);
								return knex.insert(data).onConflict('expires').ignore().into('rates').then(() => data);
							})
					} else {
						return currentRates[0];
					}
				})
				.then(data => JSON.parse(data.data));
		}
	}
}



