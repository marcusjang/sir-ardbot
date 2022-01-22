import config from './config.js';
import { init } from './main.js';
import { client } from './discord.js';

function info(message, ...args) {
	return console.info('  \x1b[33msir-ardbot\x1b[0m ' + message, ...args);
}

function exitHandler(code) {
	info('Process event %s was received; exiting...', code);
	if (client.readyAt !== null)
		client.destroy();
	process.exit(0);
}

process.on('SIGINT', exitHandler);
process.on('SIGTERM', exitHandler);

info('Sir Ardbot is initialising...');
init();
