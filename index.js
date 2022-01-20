import config from './config.js';
import init from './init.js';
import { client } from './discord.js';
import debug from './utils/debug.js';

init();

function exitHandler(code) {
	console.log('%s was received; exiting...', code);
	if (client.readyAt !== null)
		client.destroy();
	process.exit(0);
}

process.on('SIGINT', exitHandler);
process.on('SIGTERM', exitHandler);