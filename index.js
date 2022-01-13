/*
	index.js
		this is where the fun begins
		well, actually only for discord stuffs
		well again, not anymore since discord stuffs happen in discord.js - except client stuffs here
*/

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const debug = require('debug')('sir-ardbot:index');
      debug.log = console.info.bind(console);

const discord = require('./discord.js');

// the starting point
discord.login(process.env.DISCORD_TOKEN);


// everything starts when the Discord client is ready
discord.client.once('ready', require('./init.js'));


// just some hacky shit to make JSDOM shut up
const consoleError = console.error;
console.error = err => {
	if (err.toString().slice(0, 37) == 'Error: Could not parse CSS stylesheet') return false;
	return consoleError(err);
}

const exitHandler = code => {
	discord.client.destroy();
	debug(`${code} was received. So long, partner...`);
	process.exit(0);
};

process.on('SIGINT', exitHandler);
process.on('SIGTERM', exitHandler);
