import { readdir } from 'fs/promises';
import { Client, Intents } from 'discord.js';
import config from './config.js';
import { Site } from './classes.js';
import { debug } from './utils.js';
import { PathURL } from './classes.js';

const log = debug('sir-ardbot:discord');
const error = debug('sir-ardbot:discord', 'error');

export const client = new Client({ intents: [ Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES ] });

export async function login(token) {
	if (typeof token !== 'string' || token.length === 0)
		token = process.env.DISCORD_TOKEN;

	await new Promise((resolve) => {
		log('Logging into Discord with token %s', token.replace(/^(.{6}).*(.{4})$/, '$1...$2'));
		client.login(token);

		client.on('ready', () => {
			log('Logged in on Discord as %s(<@%s>)', client.user.username, client.user.id);
			client.commands = new Map(); // prep for command setting
			resolve();
		});
	});

	const events = await readdir(new PathURL('events').path)
		.then(files => files.filter(file => (file.charAt(0) != '_' && file.endsWith('.js'))));

	if (events.length > 0) {
		log('Found %d event handling module(s), setting...', events.length);

		for (const file of events) {
			const { default: event } = await import(new PathURL(`events/${file}`).href);

			if (event.once) {
				client.once(event.name, (...args) => event.execute(...args));
			} else {
				client.on(event.name, (...args) => event.execute(...args));
			}
		}
	}

	const commands = await readdir(new PathURL('commands').path)
		.then(files => files.filter(file => (file.charAt(0) != '_' && file.endsWith('.js'))))

	if (commands.length > 0) {
		log('Found %d command module(s), setting...', commands.length);

		for (const file of commands) {
			const command = await import(new PathURL(`commands/${file}`).href);
			client.commands.set(command.data.name, command);
		}
	}
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

	try {
		for (const embeds of embedsArray) {
			await site.channel.send({ embeds: embeds });
		}
	} catch(err) {
		error("%s: We had some uncertain error- to be specific:", site.domain);
		console.error(err);

		sendError(err, site);
	}

	return true;
}

async function getCategory(site) {
	const guild = client.guilds.cache.get(config.discord.guildID);
	const channels = guild.channels.cache;

	const categoryName = site.meta.category.toUpperCase();
	let category = channels.find(channel => {
		return (channel.type === 'GUILD_CATEGORY' && channel.name.toUpperCase() === categoryName);
	});

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
		.toLowerCase()              // first to lowercase (stylistic choices)
		.replace(/[^\w\s-]/g, '')   // then remove non-word (excluding dash and space)
		.replace(/\s/g, '-')        // then replace space into dash
		.replace(/-+/g, '-');       // then remove duplicate dashes

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

export async function sendError(error, site) {
	if (config.discord.error !== false) {
		const errorSite = new Site('errors', {
			name: config.discord.error.channel,
			category: config.discord.error.category,
			hidden: true
		});
		const channel = await getChannel(errorSite);
		const { id } = (!site) ? channel : await getChannel(site);

		await channel.send(
			`An error has occurred from <#${id}>:\n` +
			'```' + error.toString() + '```'
		);

		return;
	}
}