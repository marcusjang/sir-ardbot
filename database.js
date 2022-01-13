/*
	database.js
		this is where we set our database details
*/

const path = require('path');
const debug = require('debug')('sir-ardbot:database');
      debug.log = console.info.bind(console);
const knex = require('knex')({
	client: 'sqlite3',
	connection: { filename: path.join(__dirname, './data.db') },
	useNullAsDefault: true
});

module.exports = {
	knex: knex,
	init: () => Promise.all([
			knex.schema.hasTable('products'),
			knex.schema.hasTable('rates')
		]).then(exists => {
			// products table
			if (!exists[0]) {
				exists[0] = knex.schema.createTable('products', table => {
					table.increments();
					table.string('site');
					table.string('url').unique();
					table.boolean('available');
					table.timestamp('created_at').defaultTo(knex.fn.now());
				}).then(() => debug(`Table "products" was missing, so new one has been created`));
			} else {
				exists[0] = Promise.resolve(debug(`Table "products" is thankfully in place`));
			}

			// rates table
			if (!exists[1]) {
				exists[1] = knex.schema.createTable('rates', table => {
					table.increments();
					table.date('expires').unique();
					table.text('data');
					table.timestamp('created_at').defaultTo(knex.fn.now());
				}).then(() => debug(`Table "rates" was missing, so new one has been created`));
			} else {
				exists[1] = Promise.resolve(debug(`Table "rates" is thankfully in place`));
			}

			return Promise.all(exists);
		})
}
