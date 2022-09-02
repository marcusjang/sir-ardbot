/*
 *	database.js
 *		stuffs to interface with sqlite3 database via knex
 *	
 */

import config from './config.js';
import knex from 'knex';
import { debug } from './utils.js';
import { PathURL } from './classes.js';

const log = debug('sir-ardbot:database');

const tablesSchema = [{
	name: 'products',
	create: table => {
		table.increments();
		table.string('site');
		table.string('url').unique();
		table.timestamp('created_at').defaultTo(db.fn.now());
	}
}];

if (!config.dataApi.disabled) {
	tablesSchema.push({
		name: 'rates',
		create: table => {
			table.increments();
			table.date('expires').unique();
			table.text('data');
			table.timestamp('created_at').defaultTo(db.fn.now());
		}
	});
}

export const db = knex({
	client: 'sqlite3',
	connection: { filename: new PathURL('data.db').path },
	useNullAsDefault: true
});

function checkTables(tables) {
	return Promise.all(tables.map(table => db.schema.hasTable(table.name)))
		.then(results => {
			tables.forEach((table, index) => table.exists = results[index]);
			return tables;
		});
}

function createTables(tables) {
	return Promise.all(
		tables.map(table => {
			if (table.exists)
				return log('Table "%s" is thankfully still in place', table.name);

			return db.schema.createTable(table.name, table.create)
				.then(results => log('Table "%s" was missing; so it was created', table.name));
		})
	);
}

export function init(tables = tablesSchema) {
	return checkTables(tables).then(createTables);
}

export function getRecords(site, limit) {
	if (!limit) limit = Math.max(site.limit * 4, 200);
	return db.select('url', 'created_at').where('site', site.domain)
			.from('products').orderBy('created_at', 'desc');
}

export function putRecords(products) {
	const records = products.map(product => {
		return { site: product.site.domain, url: product.url };
	});

	return db.insert(records).into('products').onConflict('url').ignore();
}
