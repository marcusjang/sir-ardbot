/*
	index.js
		this is where the fun begins
*/

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const debug = require('debug')('sir-ardbot:main');
const fs = require('fs/promises');
const { Client, Intents, MessageEmbed } = require('discord.js');
const CronJob = require('cron').CronJob;

const crawl = require('./crawl.js');
const database = require('./database.js');
const { getRates } = require('./currency.js');

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

const init = () => {
	debug(`Sir Ardbot is ready on Discord!`);
	// guild is stored in the .env 
	const guild = client.guilds.cache.get(process.env.GUILD_ID);
	const roleIDs = (process.env.ROLE_ID || '').split(',');
	const channelArray = [];

	// see through ./sites/* and get files
	debug(`Let's get through what sites we have`);
	fs.readdir(path.join(__dirname, './sites/'))
		// filtering happens here for filenames starting with '-' or not ending with .js
		.then(files => files.filter(file => (file.charAt(0) != '_' && file.endsWith('.js'))))
		.then(async files => {
			// go through existing channels cache and store them to sets
			// these will be used to be check against with the files
			debug(`Then the categories we have`);
			const categories = new Set();
			const channels = new Set();
			for (const [ id, channel ] of guild.channels.cache) {
				if (channel.type == 'GUILD_CATEGORY') categories.add(channel.name);
				if (channel.type == 'GUILD_TEXT') channels.add(channel.name);
			}

			debug(`Found ${files.length} site files`);
			for (const file of files) {
				const site = require(`./sites/${file}`);

				// just some stylistic choices
				const country = site.country.toUpperCase();
				let category = guild.channels.cache.find(ch => ch.name == country);
				if (!categories.has(country)) {
					// create national categories if there is none
					// category var is set to the new category
					debug(`${country} does not exist yet, creating...`);
					category = await guild.channels.create(country, { type: 'GUILD_CATEGORY' });
					debug(`${country} successfully created`);
				}

				// same as above
				const siteName = site.name.toLowerCase().replace(/\s/g, '-').replace(/[^\w-]/g, '');
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
					if (site.hidden && roleIDs && roleIDs[0] != '') {
						permissions[0].deny.push('VIEW_CHANNEL');
						for (const roleID of roleIDs) {
							const role = guild.roles.cache.get(roleID);
							if (roleID && role) {
								permissions.push({
									id: roleID,
									allow: [ 'VIEW_CHANNEL' ]
								});
							}
						}
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
		.then(() => database.init()) // initialise the database
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
						/* for less clutter
						if (!process.env.DEV) channel.send({ embeds: [{
							title: `New products of ${(new Date()).toLocaleString('en-GB')}`
						}]});
						*/

						products.forEach((product, index) => {
							const embed = {
								title: product.name,
								url: product.url,
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

							if (index == 0) embed.color = 0xEDBC11;

							if (!process.env.DEV) channel.send({ embeds: [embed] });
						});
					}
				});

				cron.start();
			}
			return;
		});
};

// everything starts when the Discord client is ready
client.once('ready', init);

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
