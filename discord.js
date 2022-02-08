import config from './config.js';
import { Client, Intents } from 'discord.js';
import { Site } from './classes.js';
import { debug } from './utils.js';
import { PathURL } from './classes.js';

const log = debug('sir-ardbot:discord');
const error = debug('sir-ardbot:discord', 'error');

export const client = new Client({
	intents: [
		Intents.FLAGS.GUILDS,
		Intents.FLAGS.GUILD_MEMBERS,
		Intents.FLAGS.GUILD_MESSAGES
	]
});

function toChannelName(string) {
	return string.toLowerCase()     // first to lowercase (stylistic choices)
		.replace(/[^\w\s-]/g, '')   // then remove non-word (excluding dash and space)
		.replace(/\s/g, '-')        // then replace space into dash
		.replace(/-+/g, '-');       // then remove duplicate dashes
}

export async function login(token) {
	if (typeof token !== 'string' || token.length === 0)
		token = config.discord.token;

	await new Promise((resolve) => {
		log('Logging into Discord with token %s', token.replace(/^(.{5}).*(.{3})$/, '$1...$2'));
		client.login(token);

		client.on('ready', () => {
			log('Logged in on Discord as %s(<@%s>)', client.user.username, client.user.id);
			resolve();
		});
	});

	client.guild = client.guilds.cache.get(config.discord.guildID);

	return client;
}

function priceString(number) {
	return number.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export async function sendProducts(products) {
	const { site } = products[0];
	const embedsArray = [];
			
	products.forEach((product, index) => {
		const embed = {
			title: product.name,
			url: product.url,
			thumbnail: { url: product.img },
			fields: [{
				name: 'Price (excl. VAT)',
				value: `${priceString(product.price)} ${product.site.meta.currency}`,
				inline: true
			}],
			timestamp: new Date()
		}

		if (product.priceUSD) {
			embed.fields[0].value = embed.fields[0].value
				+ ` (≒ ${priceString(product.priceUSD)} USD)`;
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

		if (index == 0)
			embed.color = 0xEDBC11;

		// 10 is Discord embed length limit apparently
		// well, at least coording to the link below, so we chop it up
		// https://birdie0.github.io/discord-webhooks-guide/other/field_limits.html
		if (index % 10 == 0)
			embedsArray.push([]);

		embedsArray[Math.floor(index / 10)].push(embed);
	});

	for (const embeds of embedsArray)
		await site.channel.send({ embeds: embeds });
}

async function getCategory(site) {
	const categoryName = site.meta.category.toUpperCase();

	let category = client.guild.channels.cache.find(channel => (
		channel.type === 'GUILD_CATEGORY' &&
		channel.name.toUpperCase() === categoryName
	));

	if (!category) {
		log('Category "%s" does not exist yet, creating...', categoryName);
		category = await client.guild.channels.create(categoryName, { type: 'GUILD_CATEGORY' });
		log('Category "%s" was successfully created', categoryName);
	}

	return category;
}

async function createChannel(site, parentID) {
	return await client.guild.channels.create(
		toChannelName(site.meta.name),
		{
			type: 'GUILD_TEXT',
			parent: parentID,
			topic: site.url,
			permissionOverwrites: [
				{ id: client.guild.roles.everyone.id, deny: [ 'SEND_MESSAGES', 'VIEW_CHANNEL' ] },
				{ id: client.user.id, allow: [ 'SEND_MESSAGES' ] }
			] // by default @everyone cannot view or send
		}
	);
}

export async function getChannel(site) {
	const channelName = toChannelName(site.meta.name);

	let channel = client.guild.channels.cache.find(channel => (
		channel.type === 'GUILD_TEXT' &&
		channel.name === channelName
	));

	if (!channel) {
		log('Channel #%s does not exist yet, creating...', channelName);
		const category = await getCategory(site);
		channel = await createChannel(site, category.id);
		log('Channel #%s was successfully created', channelName);
	}

	return channel;
}

export async function sendError(error, site) {
	if (config.discord.error !== false) {
		const errorSite = new Site('errors', {
			name: config.discord.error.channel,
			category: config.discord.error.category,
			moderator: true
		});
		const channel = await getChannel(errorSite);
		const { id } = (!site) ? channel : await getChannel(site);

		await channel.send(
			`An error has occurred from <#${id}>:\n` +
			'```' + error.toString() + '```'
		);
	}
}
