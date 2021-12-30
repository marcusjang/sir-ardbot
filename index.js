/*
	index.js
		this is where the fun begins
		well, actually only for discord stuffs
*/

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const debug = require('debug')('sir-ardbot:discord');
const { Client, Intents } = require('discord.js');


const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

// everything starts when the Discord client is ready
client.once('ready', () => {
	debug(`Sir Ardbot is ready on Discord! Initialising...`);
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
		await interaction.reply({ content: 'Oh no, something has gone awry! I will make sure this incident will be reported.', ephemeral: true })
	}
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
