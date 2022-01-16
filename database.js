/*
 *  currency.js
 *  	stuffs to interface with sqlite3 database via knex
 *  
 */

const config = require('./config.js');

const path = require('path');
const debug = require('debug')('sir-ardbot:database');
      debug.log = console.info.bind(console);

const knex = require('knex')({
	client: 'sqlite3',
	connection: { filename: path.join(__dirname, './data.db') },
	useNullAsDefault: true
});

const tables = [
	{
		name: 'products',
		create: table => {
			table.increments();
			table.string('site');
			table.string('url').unique();
			table.boolean('available');
			table.timestamp('created_at').defaultTo(knex.fn.now());
		}
	}
];

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
		Promise.all(checkTables)
			.then(exists => {
				const createTables = exists.map((exist, index) => {
					const table = tables[index];
					return (!exist) ?
						knex.schema.createTable(table.name, table.create) :
						Promise.resolve('exists');
					});
				return Promise.all(createTables)
					.then(results => {
						results.forEach((result, index) => {
							const table = tables[index];
							if (result === 'exists') {
								debug(`Table "${table.name}" is thankfully still in place`);
							} else {
								debug(`Table "${table.name}" was missing, so new one has been created`);
							}
						});
					});
			})
	}
}
