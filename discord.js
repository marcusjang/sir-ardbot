/*
	discord.js
		this is where the discord things happen
*/

const debug = require('debug')('sir-ardbot:discord');
const path = require('path');
const fs = require('fs/promises');
const { Client, Intents } = require('discord.js');

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

// everything starts when the Discord client is ready
client.once('ready', () => {
	debug(`Sir Ardbot is ready on Discord! Initialising...`);

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
		});

	require('./init.js')(client);
});

// Here we handle commands
client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;

	const command = client.commands.get(interaction.commandName);
	if (!command) return;

	try {
		await command.execute(interaction);
	} catch(e) {
		console.error(e);
		await interaction.reply({
			content: 'Oh no, something has gone awry! I will make sure this incident will be reported.',
			ephemeral: true
		});
	}
});


module.exports = {
	client: client,
	login: token => client.login(token),
	initChannels: async (files) => {
		// guild is stored in the .env 
		const guild = client.guilds.cache.get(process.env.GUILD_ID);
		const roleIDs = (process.env.ROLE_ID || '').split(',');

		const channelArray = [];

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
			const country = site.meta.country.toUpperCase();
			let category = guild.channels.cache.find(ch => ch.name == country);
			if (!categories.has(country)) {
				// create national categories if there is none
				// category var is set to the new category
				debug(`${country} does not exist yet, creating...`);
				category = await guild.channels.create(country, { type: 'GUILD_CATEGORY' });
				debug(`${country} successfully created`);
			}

			// better channel name sanitisation
			const siteName =
				site.meta.name
					.toLowerCase()				// first to lowercase (stylistic choices)
					.replace(/[^\w\s-]/g, '')	// then remove non-word (excluding dash and space)
					.replace(/\s/g, '-')		// then replace space into dash
					.replace(/-+/g, '-');		// then remove duplicate dashes

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
					topic: site.meta.url,
					permissionOverwrites: permissions
				});
				debug(`${siteName} successfully created`);
			}

			// store them to array so we can locally use them
			channelArray.push({
				site: site.domain,
				channel: guild.channels.cache.get(channel.id)
			});
		}

		debug(`We currently have ${channelArray.length} channels`);
		return channelArray;
	},
	sendProducts: (channel, products) => {
		if (!products) return false;

		debug(`New products have arrived! Send them to Discord at this very moment!`);
		const embedsArray = [];

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
			};

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

			// 10 is Discord embed length limit apparently
			// well, at least coording to the link below, so we chop it up
			// https://birdie0.github.io/discord-webhooks-guide/other/field_limits.html
			if (index % 10 == 0) embedsArray.push([]);
			embedsArray[Math.floor(index / 10)].push(embed);
		});

		return Promise.all(embedsArray.map(embeds => {
			if (!(process.env.DEV === 'true')) {
				return channel.send({ embeds: embeds });
			} else {
				return embeds.forEach(embed => console.log(embed.title, embed.timestamp, embed.url));
			}
		}));
	}
};
