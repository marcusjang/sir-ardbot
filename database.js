/*
	database.js
		this is where we set our database details
*/

const path = require('path');
const debug = require('debug')('sir-ardbot:database');
const knex = require('knex')({
	client: 'sqlite3',
	connection: { filename: path.join(__dirname, './data.db') },
	useNullAsDefault: true
});

const init = async () => {
	// check if "products" table exists and create one if not
	await knex.schema.hasTable('products').then(async exists => {
		if (!exists) {
			await knex.schema.createTable('products', table => {
				table.increments();
				table.string('site');
				table.string('url').unique();
				table.boolean('available');
				table.timestamp('created_at').defaultTo(knex.fn.now());
			});
			debug(`Table "products" was missing, so new one has been created`);
		} else {
			debug(`Table "products" is thankfully in place`);
		}
	});

	// the same as above but with "rates"
	await knex.schema.hasTable('rates').then(async exists => {
		if (!exists) {
			await knex.schema.createTable('rates', table => {
				table.increments();
				table.date('expires').unique();
				table.text('data');
				table.timestamp('created_at').defaultTo(knex.fn.now());
			});
			debug(`Table "rates" was missing, so new one has been created`);
		} else {
			debug(`Table "rates" is thankfully in place`);
		}
	});

	return true;
}

module.exports = { knex, init };
