/*
	database.js
		this is where the fun really is
*/

const debug = require('debug')('sir-ardbot:main');
const path = require('path');
const fs = require('fs/promises');
const puppeteer = require('puppeteer');

const crawl = require('./crawl.js');
const discord = require('./discord.js');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const queue = {
	array: [],
	arrayCopy: [],
	pending: false,
	working: false,
	unitDelay: 2500 // the base amount of time in between jobs
					// used to not clog up the http req, will be overwritten depending on the job size
}

const period = 90 * 1000; // theorically each site should be crawled every 90 seconds

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

const init = async () => {
	await require('./database.js').init(); // initialise the database

	const browser = await puppeteer.launch();

	// see through ./sites/* and get files
	debug(`Let's get through what sites we have`);
	fs.readdir(path.join(__dirname, './sites/'))
		// filtering happens here for filenames starting with '-' or not ending with .js
		.then(files => files.filter(file => (file.charAt(0) != '_' && file.endsWith('.js'))))
		.then(files => discord.initChannels(files))
		.then(channelArray => {
			queue.unitDelay = Math.floor(period / channelArray.length + Math.random()*500); // 60 seconds = 1 minute
			debug(`unit delay is ${queue.unitDelay}ms per site`);

			queue.array = channelArray.map(channelObj => {
				const { site, channel } = channelObj;
				return () => crawl(browser, site).then(products => discord.sendProducts(channel, products));
			});
			queue.arrayCopy = queue.array.map(el => el); // just to copy the array
			work();
		});
};

module.exports = init;
