/*
	database.js
		this is where the fun really is
*/

const debug = require('debug')('sir-ardbot:main');
const path = require('path');
const fs = require('fs/promises');
const { CronJob } = require('cron');

const crawl = require('./crawl.js');
const discord = require('./discord.js');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const init = async () => {
	require('./database.js').init(); // initialise the database

	// see through ./sites/* and get files
	debug(`Let's get through what sites we have`);
	fs.readdir(path.join(__dirname, './sites/'))
		// filtering happens here for filenames starting with '-' or not ending with .js
		.then(files => files.filter(file => (file.charAt(0) != '_' && file.endsWith('.js'))))
		.then(files => discord.initChannels(files))
		.then(channelArray => {
			const unitDelay = Math.floor((60 * 1000) / channelArray.length); // 60 seconds = 1 minute
			debug(`unit delay is ${unitDelay}ms per site`);

			// one cronjob for ~~site each~~ all sites and the delay will be given with an await()
			debug(`Assigning cronjob in place`);
			new CronJob(`*/2 * * * *`, () => {
				channelArray.forEach(async (channelObj, index) => {
					await delay(unitDelay * index + Math.floor(Math.random()*500)); // add some random delay
					const { site, channel } = channelObj;
					debug(`Begin crawling for ${site}!`);
					crawl(site).then(products => discord.sendProducts(channel, products));
				});
			}, null, true);
		});
};

module.exports = init;
