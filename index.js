/*
 *	index.js
 *		just calls discord and init then peaces out
 *	
 */

const config = require('./config.js');
const discord = require('./discord.js');
const { log } = require('./utils/debug.js')('sir-ardbot:main');

// everything starts when the Discord client is ready
discord.client.login(config.discord.token);
discord.client.once('ready', require('./init.js'));

const exitHandler = code => {
	discord.client.destroy();
	log(`${code} was received. So long, partner...`);
	process.exit(0);
};

process.on('SIGINT', exitHandler);
process.on('SIGTERM', exitHandler);
