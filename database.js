/*
 *	currency.js
 *		stuffs to interface with sqlite3 database via knex
 *	
 */

const { log } = require('./utils/debug.js')('sir-ardbot:database');

const path = require('path');
const knex = require('knex')({
	client: 'sqlite3',
	connection: { filename: path.join(__dirname, './data.db') },
	useNullAsDefault: true
});

const config = require('./config.js');

const tables = [{
	name: 'products',
	create: table => {
		table.increments();
		table.string('site');
		table.string('url').unique();
		table.timestamp('created_at').defaultTo(knex.fn.now());
	}
}];

if (!config.unipass.disabled) {
	tables.push({
		name: 'rates',
		create: table => {
			table.increments();
			table.date('expires').unique();
			table.text('data');
			table.timestamp('created_at').defaultTo(knex.fn.now());
		}
	});
}

module.exports = {
	knex: knex,
	init: () => {
		const checkTables = tables.map(table => knex.schema.hasTable(table.name));
		return Promise.all(checkTables).then(exists => {
			const createTables = exists.map((exist, index) => {
				const table = tables[index];
				return (!exist) ?
					knex.schema.createTable(table.name, table.create) :
					Promise.resolve('exists');
			});

			return Promise.all(createTables).then(results => {
				results.forEach((result, index) => {
					const table = tables[index];
					if (result === 'exists') {
						log(`Table "${table.name}" is thankfully still in place`);
					} else {
						log(`Table "${table.name}" was missing, so new one has been created`);
					}
				});

				return true;
			});
		});
	}
}
