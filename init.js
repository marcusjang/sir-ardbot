/*
	init.js
		this is where the fun really is
*/

const debugModule = require('debug');
const debug = debugModule('sir-ardbot:main');
      debug.log = console.info.bind(console);
const error = debugModule('sir-ardbot:main-error');
      error.log = console.error.bind(console);
const path = require('path');
const fs = require('fs/promises');
const puppeteer = require('puppeteer');

const crawl = require('./crawl.js');
const discord = require('./discord.js');
const database = require('./database.js');
const knex = database.knex;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const queue = {
	array: [],
	arrayCopy: [],
	pending: false,
	working: false,
	unitDelay: 2500 // the base amount of time in between jobs
					// used to not clog up the http req, will be overwritten depending on the job size
}

const interval = (process.env.CRAWLER_INTERVAL || 90) * 1000; // theorically each site should be crawled every 90 seconds
const puppeteerOptions = { args: [ '--no-sandbox', '--disable-setuid-sandbox' ] };
const puppeteerPath = process.env.PUPPETEER_PATH || false;

if (puppeteerPath && puppeteerPath !== '') {
	puppeteerOptions.product = 'chrome';
	puppeteerOptions.executablePath = puppeteerPath;
}

const work = () => {
	if (queue.working) return false;
	const job = queue.array.shift();
	if (!job) return false;
	if (queue.array.length == 0) queue.array = queue.arrayCopy.slice(); // until the end of time (or usually SIGINT)
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

const client = discord.client;

module.exports = () => {
	debug(`Sir Ardbot is ready! Initialising...`);

	// dynamically reads commands
	client.commands = new Map();
	fs.readdir(path.join(__dirname, './commands/'))
		.then(files => files.filter(file => (file.charAt(0) != '_' && file.endsWith('.js'))))
		.then(files => {
			debug(`Found ${files.length} command(s), setting...`);
			for (const file of files) {
				const command = require(`./commands/${file}`);
				client.commands.set(command.data.name, command);
			}
		})
		.then(() => Promise.all([
				database.init(), // initialise the database
				puppeteer.launch(puppeteerOptions)
			]).then(init => {
				const browser = init[1];
				// see through ./sites/* and get files
				debug(`Let's get through what sites we have`);
				return fs.readdir(path.join(__dirname, './sites/'))
					// filtering happens here for filenames starting with '-' or not ending with .js
					.then(files => files.filter(file => (file.charAt(0) != '_' && file.endsWith('.js'))))
					.then(files => {
						if (files.length > 0) {
							return discord.initChannels(files);
						} else {
							return [{
								site: '_example',
								channel: null
							}];
						}
					})
					.then(channelArray => {
						queue.unitDelay = Math.floor(interval / channelArray.length); // 60 seconds = 1 minute
						debug(`unit delay is ${queue.unitDelay}ms per site`);

						queue.array = channelArray.map(channelObj => {
							const { site, channel } = channelObj;
							return () => crawl(browser, site)
								.then(products => {
									if (!products) return Promise.reject(null);

									if (discord.enabled && ((process.env.DRYRUN === 'true') || !(process.env.DEV === 'true'))) {
										// store new products on the database (for some time at least)
										// needs to be expunged routinely
										const entries = products.map(product => {
											return {
												site: product.site,
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
						queue.arrayCopy = queue.array.map(el => el); // just to copy the array
						work();
					});
			}));
}
