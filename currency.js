const debug = require('debug')('sir-ardbot:currency');

const bent = require('bent');
const { JSDOM } = require('jsdom');

const knex = require('./database.js');

const getText = (parent, tag) => parent.getElementsByTagName(tag)[0].textContent.trim();

const url = 'https://unipass.customs.go.kr:38010/ext/rest/trifFxrtInfoQry/retrieveTrifFxrtInfo';

const getRates = async (date = new Date()) => {
	const api = new URL(url);
	const param = {
		'crkyCn': process.env.UNIPASS_TOKEN,
		'imexTp': 2,
		'qryYymmDd': new Date(
				date.valueOf() - (new Date().getTimezoneOffset() *60*1000)
			).toISOString().substring(0,10).replace(/\-/g, '')
	}
	api.search = '?' + (new URLSearchParams(param)).toString();

	const get = bent();

	debug(`Reaching Unipass Forex Rate API...`);
	const stream = await get(api.href);

	debug(`Successfully got new forex rates, parsing...`);
	const body = await stream.text();
	const dom = new JSDOM(body, {
		contentType: 'text/xml',
		includeNodeLocations: false
	});
	const DOMParser = dom.window.DOMParser;
	const parser = new DOMParser;
	const xmlDOM = parser.parseFromString(body, 'text/xml');

	const expires = new Date(
		new Date(getText(xmlDOM, 'aplyBgnDt').replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')).valueOf()
		+ ((new Date().getTimezoneOffset() + 7*24*60) *60*1000)
	);
	debug(`New expiration date is ${expires}`);

	debug(`Checking database for cached expiration date`);
	const [ record ] = await knex.select('expires').orderBy('expires', 'desc').limit(1).from('rates');
	debug(`Cached expiration date is older (or there is none)`);

	if (!record || expires > new Date(record.expires)) {
		debug(`Data is newer than the record, updating...`);
		const rates = { };
		for (const rate of xmlDOM.getElementsByTagName('trifFxrtInfoQryRsltVo')) {
			rates[getText(rate, 'currSgn')] = {
				rate: getText(rate, 'fxrt') *1,
				currency: getText(rate, 'currSgn')
			};
		}

		const entry = {
			expires: expires,
			data: JSON.stringify(rates)
		};

		await knex.insert(entry).onConflict('expires').ignore().into('rates');
		return entry;
	} else {
		debug(`Currency: Data is on the same version to the record, doing nothing...`);
		return false;
	}
};

module.exports = { getRates };
