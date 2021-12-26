const debug = require('debug')('sir-ardbot:database');

const knex = require('knex')({
	client: 'sqlite3',
	connection: { filename: './data.db' },
	useNullAsDefault: true
});

//await knex.schema.dropTable('products');

knex.schema.hasTable('products').then(async exists => {
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

knex.schema.hasTable('rates').then(async exists => {
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

module.exports = knex;