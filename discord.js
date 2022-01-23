import { readdir } from 'fs/promises';
import { Client, Intents } from 'discord.js';
import config from './config.js';
import { Site } from './classes.js';
import { debug } from './utils.js';
import { PathURL } from './classes.js';

const log = debug('sir-ardbot:discord');

export const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

export function login(token) {
	return new Promise((resolve) => {
		if (typeof token !== 'string' || token.length === 0)
			token = process.env.DISCORD_TOKEN;

		log('Logging into Discord with token %s', token.replace(/^(.{6}).*(.{4})$/, '$1...$2'));
		client.login(token);
		
		client.on('interactionCreate', (interaction) => {
			if (!interaction.isCommand())
				return false;

			const command = client.commands.get(interaction.commandName);

			if (!command)
				return false;

			command.execute(interaction)
				.catch(error => {
					console.error(error);
					interaction.reply({ content: 'error', ephemeral: true });
				})
		});

		client.on('ready', () => {
			log('Logged in on Discord as %s(<@%s>)', client.user.username, client.user.id);
			client.commands = new Map(); // prep for command setting
			resolve();
		});
	})
	.then(() => {
		return readdir(new PathURL('commands').path)
			.then(files => files.filter(file => (file.charAt(0) != '_' && file.endsWith('.js'))))
			.then(async commands => {
				if (commands.length > 0) {
					log('Found %d command module(s), setting...', commands.length);

					for (const file of commands) {
						const command = await import(new PathURL(`commands/${file}`).href);
						client.commands.set(command.data.name, command);
					}
				}

				return;
			});
	});
}

export async function initChannels(sites) {
	log('Initialising Discord channels...');

	for (const site of sites) {
		site.channel = await getChannel(site);
	};

	log('Initialised Discord channels for %d sites!', sites.length);
	return sites;
}

export async function sendProducts(products) {
	const site = products[0].site;
	const embedsArray = [];
			
	products.forEach((product, index) => {
		const embed = {
			title: product.name,
			url: product.url,
			thumbnail: { url: product.img },
			fields: [{
				name: 'Price (excl. VAT)',
				value: `${product.price} ${product.site.meta.currency}`,
				inline: true
			}],
			timestamp: new Date()
		};

		if (product.priceUSD) {
			embed.fields[0].value = embed.fields[0].value + ` (≒ ${product.priceUSD} USD)`;
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

		// 10 is Discord embed length limit apparently
		// well, at least coording to the link below, so we chop it up
		// https://birdie0.github.io/discord-webhooks-guide/other/field_limits.html
		if (index % 10 == 0) embedsArray.push([]);
		embedsArray[Math.floor(index / 10)].push(embed);
	});

	for (const embeds of embedsArray) {
		await site.channel.send({ embeds: embeds });
	}

	return true;
}

async function getCategory(site) {
	const guild = client.guilds.cache.get(config.discord.guildID);
	const channels = guild.channels.cache;

	const categoryName = site.meta.category.toUpperCase();
	let category = channels.find(channel => channel.type === 'GUILD_CATEGORY' && channel.name === categoryName);

	if (!category) {
		log('Category "%s" does not exist yet, creating...', categoryName);
		category = await guild.channels.create(categoryName, { type: 'GUILD_CATEGORY' });
		log('Category "%s" was successfully created', categoryName);
	}

	return category;
}

async function getChannel(site) {
	const guild = client.guilds.cache.get(config.discord.guildID);
	const channels = guild.channels.cache;

	const category = await getCategory(site);

	const channelName = site.meta.name
		.toLowerCase()				// first to lowercase (stylistic choices)
		.replace(/[^\w\s-]/g, '')	// then remove non-word (excluding dash and space)
		.replace(/\s/g, '-')		// then replace space into dash
		.replace(/-+/g, '-');		// then remove duplicate dashes

	let channel = channels.find(channel => channel.type === 'GUILD_TEXT' && channel.name === channelName);

	if (!channel) {
		log('Channel #%s does not exist yet, creating...', channelName);
		const channelObj = {
			type: 'GUILD_TEXT',
			parent: category.id,
			topic: site.url,
			permissionOverwrites: [
				{ id: guild.roles.everyone.id, allow: [ ], deny: [ 'SEND_MESSAGES' ] },
				{ id: client.user.id, allow: [ 'SEND_MESSAGES' ] }
			]
		}

		if (site.hidden && config.discord.roleIDs[0] != '') {
			const permissions = channelObj.permissionOverwrites;
			permissions[0].deny.push('VIEW_CHANNEL');
			for (const roleID of config.discord.roleIDs) {
				if (roleID && guild.roles.cache.get(roleID))
					permissions.push({ id: roleID, allow: [ 'VIEW_CHANNEL' ] });
			}
		} else {
			channelObj.permissionOverwrites[0].allow.push('VIEW_CHANNEL');
		}

		channel = await guild.channels.create(channelName, channelObj);
		log('Channel #%s was successfully created', channelName);
	}

	return channel;
}

export async function sendError(site, error) {
	if (config.discord.error !== false) {
		const errorSite = new Site('errors', {
			name: config.discord.error.channel,
			category: config.discord.error.category,
			hidden: true
		});
		const channel = await getChannel(errorSite);
		site = await getChannel(site);

		channel.send(
			`An error has occurred from <#${site.id}>:\n` +
			'```' + error.toString() + '```'
		);
	}
}