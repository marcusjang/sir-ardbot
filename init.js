/*
 *	init.js
 *		read module files and do stuff
 *  
 */

const { log, error } = require('./utils/debug.js')('sir-ardbot:main');

const path = require('path');
const fs = require('fs/promises');
const puppeteer = require('puppeteer');

const config = require('./config.js');
const { crawl } = require('./crawl.js');
const discord = require('./discord.js');
const database = require('./database.js');

const delay = require('./utils/delay.js');

const queue = {
	array: [],
	arrayCopy: [],
	working: false,
	unitDelay: 2500 // just a placeholder default value that basically does nothing
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

const getChannels = () => {
	// see through ./sites/* and get files
	log(`Let's get through what sites we have`);
	return fs.readdir(path.join(__dirname, './sites/'))
		// filtering happens here for filenames starting with '-' or not ending with .js
		.then(files => files.filter(file => (file.charAt(0) != '_' && file.endsWith('.js'))))
		.then(files => {
			// if no files force demo mode (at least in here)
			if (files.length === 0) config.debug.demo = true;

			if (config.debug.demo) {
				log(`Sir ardbot is in demo mode`);
				files = [ '_example.js' ];
			}

			if (config.debug.demo || config.discord.disabled) {
				return files.map(file => {
					return { site: file.replace('.js', '') };
				});
			} else {
				return discord.initChannels(files);
			}
		})
}

module.exports = () => {
	log(`Sir Ardbot is ready! Initialising...`);

	// dynamically reads commands
	discord.client.commands = new Map();
	fs.readdir(path.join(__dirname, './commands/'))
		.then(files => files.filter(file => (file.charAt(0) != '_' && file.endsWith('.js'))))
		.then(files => {
			if (!config.discord.disabled) {
				log(`Found ${files.length} command(s), setting...`);
				for (const file of files) {
					const command = require(`./commands/${file}`);
					discord.client.commands.set(command.data.name, command);
				}
			}
		});

	Promise.all([
		database.init(),
		puppeteer.launch(config.puppeteer.options),
		getChannels()
	]).then(init => {
		// database.init() returns knex but we won't be using it here
		const [ , browser, channelArray ] = init;

		queue.unitDelay = Math.floor(config.crawler.interval / channelArray.length);
		log(`unit delay is ${queue.unitDelay}ms per site`);

		// add jobs to queue.array
		queue.array = channelArray.map(channelObj => { 
			const { site, channel } = channelObj;
			return () => { // job needs to be wrapped in a function
				return crawl(browser, site).then(products => {
					if (config.debug.demo || config.discord.disabled) {
						products.forEach(product => console.log(product.string));
						return false;
					} else { 
						return discord.sendProducts(channel, products);
					}
				}).catch(err => (err) ? error(err) : null);
			};
		});

		// then copy queue.array into queue.arrayCopy for later use
		queue.arrayCopy = queue.array.slice(); 

		// get to work()
		return work();
	});
}
