/*
 *  index.js
 *  	just calls discord and init then peaces out
 *  
 */

const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const discord = require('./discord.js');

// everything starts when the Discord client is ready
discord.login();
discord.client.once('ready', () => require('./init.js')(discord));

const exitHandler = code => {
	discord.client.destroy();
	console.info(`  sir-ardbot ${code} was received. So long, partner...`);
	process.exit(0);
};

process.on('SIGINT', exitHandler);
process.on('SIGTERM', exitHandler);
