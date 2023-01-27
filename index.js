import config from './config.js';
import { init } from './main.js';
import { client } from './discord.js';
import { debug } from './utils.js';

const log = debug('sir-ardbot');

function exitHandler(code) {
	log('Process event %s was received; exiting...', code);
	if (client.readyAt !== null)
		client.destroy();
	process.exit(0);
}

process.on('SIGINT', exitHandler);
process.on('SIGTERM', exitHandler);

log('Sir Ardbot is initialising...');
init();
