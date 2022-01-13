/*
	discord.js
		this is where the discord things happen
*/

const debug = require('debug')('sir-ardbot:discord');
      debug.log = console.info.bind(console);
const path = require('path');
const fs = require('fs/promises');
const { Client, Intents } = require('discord.js');

const realClient = new Client({ intents: [Intents.FLAGS.GUILDS] });
const token = process.env.DISCORD_TOKEN;
const guildID = process.env.DISCORD_GUILD_ID;
const roleIDs = (process.env.DISCORD_ROLE_ID || '').split(',');
const enabled = !((!token || typeof token !== 'string') || process.env.DISCORD_DISABLED === 'true');

let fauxClient = null;
if (!enabled) {
	const EventEmitter = require('events');
	fauxClient = new EventEmitter();
	fauxClient.login = () => setInterval(() => fauxClient.emit('ready'), 500);
	fauxClient.destroy = () => null;
}

const client = (enabled) ? realClient : fauxClient;

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
	enabled: enabled,
	client: client,
	login: () => client.login(token),
	initChannels: async (files) => {
		// guild is stored in the .env 
		const guild = client.guilds.cache.get(guildID);

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
			const categoryName = site.meta.category.toUpperCase();
			let category = guild.channels.cache.find(ch => ch.name == categoryName);
			if (!categories.has(categoryName)) {
				// create national categories if there is none
				// category var is set to the new category
				debug(`${categoryName} does not exist yet, creating...`);
				category = await guild.channels.create(categoryName, { type: 'GUILD_CATEGORY' });
				debug(`${categoryName} successfully created`);
			}

			// better channel name sanitisation
			const channelName =
				site.meta.name
					.toLowerCase()				// first to lowercase (stylistic choices)
					.replace(/[^\w\s-]/g, '')	// then remove non-word (excluding dash and space)
					.replace(/\s/g, '-')		// then replace space into dash
					.replace(/-+/g, '-');		// then remove duplicate dashes

			let channel = guild.channels.cache.find(ch => ch.name == channelName);
			if (!channels.has(channelName)) {
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
				debug(`${channelName} channel does not exist yet, creating...`);
				channel = await guild.channels.create(channelName, {
					type: 'GUILD_TEXT',
					parent: category.id,
					topic: site.meta.url,
					permissionOverwrites: permissions
				});
				debug(`${channelName} successfully created`);
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
			if (!(process.env.DEV === 'true') && enabled) {
				return channel.send({ embeds: embeds });
			} else {
				return embeds.forEach(embed => console.log(embed.title, embed.timestamp, embed.url));
			}
		}));
	}
};
