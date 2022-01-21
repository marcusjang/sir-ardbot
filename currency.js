/*
 *	currency.js
 *		stuffs to interface with unipass forex rate openapi
 *	
 */

import fetch from 'node-fetch';
import { XMLParser } from 'fast-xml-parser';
import config from './config.js';
import { debug } from './utils.js';
import { db } from './database.js';

const log = debug('sir-ardbot:currency');
const error = debug('sir-ardbot:currency', 'error');
const parser = new XMLParser();

// just because the keys to the api are so confusing
// hopefully they won't be changing api anytime soon
const keys = {
	return: 'trifFxrtInfoQryRtnVo',
	result: 'trifFxrtInfoQryRsltVo',
	begins: 'aplyBgnDt',
	currency: 'currSgn',
	rate: 'fxrt'
};

// a bunch of Date related stuffs that makes me weep
function addDays(date, days) {
	return new Date(date.valueOf() + (days*24*60*60*1000));
}

function toDate(string, tzOffset) {
	return new Date(
		new Date(string.toString().replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')).valueOf() +
		(new Date().getTimezoneOffset()) * 60*1000
	);
}

function toYyMMdd(date = new Date()) {
	return new Date(date.valueOf() - (date.getTimezoneOffset()*60*1000))
			.toISOString().substring(0,10).replace(/\-/g, '');
}

function getAPIURL(date = new Date()) {
	return 'https://unipass.customs.go.kr:38010/ext/rest/trifFxrtInfoQry/retrieveTrifFxrtInfo' + 
		   `?crkyCn=${config.unipass.token}&imexTp=2&qryYymmDd=${toYyMMdd(date)}`;
}

export function getFutureDay(date = new Date(), offset = 7) {
	return addDays(date.setDate(date.getDate() - date.getDay()), offset);
}

export async function getRates(date = new Date()) {
	const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const nextSunday = getFutureDay(today, 7);
	const future = getFutureDay(today, 3);

	try {
		const records = await db.where('expires', nextSunday.valueOf()).from('rates').limit(1);

		if (records.length > 0) {
			return JSON.parse(records[0].data);
		} else {
			log(`No current rates were found in the cache, fetching...`);
			const data = await fetch(getAPIURL(future))
				.then(response => response.text())
				.then(text => parser.parse(text));

			const rates = {};
			const results = data[keys.return][keys.result];
			results.forEach(rate => {
				const currency = rate[keys.currency];
				rates[currency] = rate[keys.rate];
			});

			const expires = addDays(toDate(results[0][keys.begins], true), 7);

			const entry = { expires: expires.valueOf(), data: JSON.stringify(rates) };

			log('Fetched data, new expiration date is $s', new Date(data.expires).toLocaleDateString());
			log('Pushing the fetched data into the database...');
			await db.insert(entry).onConflict('expires').ignore().into('rates');

			return rates;
		}
	} catch(err) {
		error('Some kind of error was occured:');
		console.error(err);
	}
}
