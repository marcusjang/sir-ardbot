/*
 *	init.js
 *		read module files and do stuff
 *  
 */

const debugModule = require('debug');

const debug = debugModule('sir-ardbot:main');
const error = debugModule('sir-ardbot:main-error');
debug.log = console.info.bind(console);
error.log = console.error.bind(console);

const path = require('path');
const fs = require('fs/promises');
const puppeteer = require('puppeteer');

const config = require('./config.js');
const { crawl } = require('./crawl.js');
const discord = require('./discord.js');
const database = require('./database.js');
const knex = database.knex;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const queue = {
	array: [],
	arrayCopy: [],
	working: false,
	unitDelay: 2500 // just a placeholder default value that basically does nothing
};

const puppeteerOptions = { args: [ '--no-sandbox', '--disable-setuid-sandbox' ] };
if (config.puppeteer.path) {
	puppeteerOptions.product = 'chrome';
	puppeteerOptions.executablePath = config.puppeteer.path;
};

const work = () => {
	if (queue.working) return false;

	const job = queue.array.shift();
	if (!job) return false;

	// do this until the end of time (or usually SIGINT)
	if (queue.array.length == 0) queue.array = queue.arrayCopy.slice(); 

	queue.working = true;

	// some .race() and .all() to do job not too fast but not too slow
	Promise.race([
			Promise.all([ job(), delay(queue.unitDelay) ]),
			delay(queue.unitDelay + 3000) // basically timeout
		])
		// we do not care if crawl() properly resolves or not so just use .finally()
		.finally(() => { 
			queue.working = false;
			work();
		});
	return true;
};

module.exports = () => {
	debug(`Sir Ardbot is ready! Initialising...`);

	// dynamically reads commands
	discord.client.commands = new Map();
	fs.readdir(path.join(__dirname, './commands/'))
		.then(files => files.filter(file => (file.charAt(0) != '_' && file.endsWith('.js'))))
		.then(files => {
			if (!config.discord.disabled) {
				debug(`Found ${files.length} command(s), setting...`);
				for (const file of files) {
					const command = require(`./commands/${file}`);
					discord.client.commands.set(command.data.name, command);
				}
			}
		})
		.then(() => Promise.all([
				database.init(), // initialise the database, returns nothing useful
				puppeteer.launch(puppeteerOptions)
			]).then(init => {
				const browser = init[1];
				// see through ./sites/* and get files
				debug(`Let's get through what sites we have`);
				return fs.readdir(path.join(__dirname, './sites/'))
					// filtering happens here for filenames starting with '-' or not ending with .js
					.then(files => files.filter(file => (file.charAt(0) != '_' && file.endsWith('.js'))))
					.then(files => {
						if (files.length === 0) {
							debug(`Sir ardbot is in demo mode`);
							files.push('_example.js');
						}

						if (config.discord.disabled || files[0] == '_example.js') {
							return files.map(file => {
								return { site: file.replace('.js', ''), channel: null };
							});
						} else {
							return discord.initChannels(files);
						}
					})
					.then(channelArray => {
						queue.unitDelay = Math.floor(config.crawler.interval / channelArray.length);
						debug(`unit delay is ${queue.unitDelay}ms per site`);

						queue.array = channelArray.map(channelObj => {
							const { site, channel } = channelObj;
							return () => crawl(browser, site).then(products => {
								if (!products) return Promise.reject(null);

								if (!config.debug.dev || config.debug.dryrun) {
									// store new products on the database (for some time at least)
									// needs to be expunged routinely
									const entries = products.map(product => {
										return {
											site: product.site.domain,
											url: product.url
										}
									});

									return knex.insert(entries).onConflict('url').ignore().into('products')
										.then(() => {
											debug(`${site}: Successfully inserted ${entries.length} entries into the DB`);
											debug(`${site}: Returning to Discord interface with new products...`);
											return products;
										})
								} else {
											debug(`${site}: Returning to Discord interface without inserting...`);
											return products;
								}
							})
							.then(products => discord.sendProducts(channel, products))
							.catch(err => {
								if (err !== null) error(err);
							});
						});
						queue.arrayCopy = queue.array.slice(); // just to copy the array
						work();
					});
			}));
}
