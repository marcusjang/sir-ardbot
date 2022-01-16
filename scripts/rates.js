/*
 *  scripts/rates.js
 *  @usage node rates
 *	
 */

const { getRates } = require('../currency.js');
const { knex } = require('../database.js');

getRates()
	.then(results => {
		console.log(results);
	})
	//.then(() => knex.select().from('rates'))
	.finally(() => process.exit(0));