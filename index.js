require('dotenv').config();
const debug = require('debug')('sir-ardbot:main');

const fs = require('fs/promises');

const { Client, Intents, MessageEmbed } = require('discord.js');
const CronJob = require('cron').CronJob;

const crawl = require('./crawl.js');
const knex = require('./database.js');

const { getRates } = require('./currency.js');

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

// everything starts when the Discord client is ready
client.once('ready', () => {
	debug(`Sir Ardbot is ready on Discord!`);
	// guild is stored in the .env 
	const guild = client.guilds.cache.get(process.env.GUILD_ID);
	const channelArray = [];

	// see through ./sites/* and get files
	debug(`Let's get through what sites we have`);
	fs.readdir('./sites/')
		.then(async sitePaths => {
			// go through existing channels cache and store them to sets
			// these will be used to be check against with the files
			debug(`Then the categories we have`);
			const categories = new Set();
			const channels = new Set();
			for (const [ id, channel ] of guild.channels.cache) {
				if (channel.type == 'GUILD_CATEGORY') categories.add(channel.name);
				if (channel.type == 'GUILD_TEXT') channels.add(channel.name);
			}

			debug(`Found ${sitePaths.length} site files`);
			for (const sitePath of sitePaths) {
				// skip if filename starts with '-'
				if (sitePath.charAt(0) == '_') continue;
				// or does not end with js
				if (sitePath.match(/(?:\.([^.]+))?$/)[1] != 'js') continue;
				const site = require(`./sites/${sitePath}`);

				// just some stylistic choices
				const country = site.country.toUpperCase();
				let category = guild.channels.cache.find(ch => ch.name == country);
				if (!categories.has(country)) {
					// create national categories if there is none
					// category var is set to the new category
					debug(`${sitePaths.length} does not exist yet, creating...`);
					category = await guild.channels.create(country, { type: 'GUILD_CATEGORY' });
					debug(`${sitePaths.length} successfully created`);
				}

				// same as above
				const siteName = site.name.toLowerCase().replace(/\s/g, '-');
				let channel = guild.channels.cache.find(ch => ch.name == siteName);
				if (!channels.has(siteName)) {
					// set barebone permissions
					const permissions = [
						{
							id: guild.roles.everyone.id,
							allow: [ ],
							deny: [ 'SEND_MESSAGES' ]
						},
						{
							id: client.user.id,
							allow: [ 'SEND_MESSAGES' ]
						}
					];

					// set to hidden channel accordingly
					const role = guild.roles.cache.find(process.env.ROLE_ID);
					if (site.hidden && process.env.ROLE_ID && role) {
						permissions[0].deny.push('VIEW_CHANNEL');
						permissions.push({
							id: process.env.ROLE_ID,
							allow: [ 'VIEW_CHANNEL' ]
						});
					} else {
						permissions[0].allow.push('VIEW_CHANNEL');
					}
					

					// create channels if there is none
					// channel var is set to the new channel
					debug(`${siteName} channel does not exist yet, creating...`);
					channel = await guild.channels.create(siteName, {
						type: 'GUILD_TEXT',
						parent: category.id,
						topic: site.url(),
						permissionOverwrites: permissions
					});
					debug(`${siteName} successfully created`);
				}

				// store them to array so we can locally use them
				channelArray.push({
					site: site.domain,
					channelId: channel.id
				});
			}

			debug(`We currently have ${channelArray.length} channels`);
			return;
		})
		/*
		*	maybe this whole part can be skipped as there is one is crawl.js?
		* 
		.then(() => {
			// check for the currency exchange rates and get one if there is none
			debug(`Checking to see if forex rate data is (still) in place...`);
			knex.count().from('rates').then(res => {
				if (res[0]['count(*)'] == 0) {
					debug(`It seems there is no forex rate data, will fetch new one`);
					getRates().then(() => true);
				}
				return;
			});
			return;
		})
		*/
		.then(() => {
			// one cronjob for site each
			// maybe there is a better way than doing it every i*2 second?
			debug(`Assigning cronjobs in place`);
			for (let i = 0; i < channelArray.length; i++){
				const { site, channelId } = channelArray[i];
				const channel = guild.channels.cache.get(channelId);

				const cron = new CronJob(`${i*2} */2 * * * *`, async () => {
					debug(`Begin crawling for ${site}!`);
					const products = await crawl(site);

					if (products) {
						debug(`New products have arrived! Send them to Discord at this very moment!`);
						channel.send({ embeds: [{
							title: `New products of ${(new Date()).toLocaleString('en-GB')}`
						}]});

						for (const product of products) {
							const embed = {
								title: product.name,
								url: product.url,
								// probably less clutter is better
								// author: { name: product.site },
								thumbnail: { url: product.img },
								fields: [{
									name: 'Price (excl. VAT)',
									value: `${product.price} ${product.currency} (≒ ${product.priceUSD} USD)`,
									inline: true
								}],
								timestamp: new Date()
							}

							if (product.size || product.abv) {
								embed.fields.push({
									name: ((product.size) ? 'Size' : '') +
											((product.size && product.abv) ? ' / ' : '') +
											((product.abv) ? 'ABV' : ''),
									value: ((product.size) ? `${product.size}ml` : '') +
											((product.size && product.abv) ? ' / ' : '') +
											((product.abv) ? `${product.abv}%` : ''),
									inline: true
								});
							}

							channel.send({ embeds: [embed] });
						}
					}
				});

				cron.start();
			}
			return;
		});
});

// this is where the fun begins
client.login(process.env.DISCORD_TOKEN);

// just some hacky shit to make JSDOM shut up
const consoleError = console.error;
console.error = err => {
	if (err.toString().slice(0, 37) == 'Error: Could not parse CSS stylesheet') return false;
	return consoleError(err);
}

const handler = code => {
	client.destroy();
	debug(`${code} was received. So long, partner...`);
	process.exit(0);
};

process.on('SIGINT', handler);
process.on('SIGTERM', handler);
