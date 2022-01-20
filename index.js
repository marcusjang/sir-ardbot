import config from './config.js';
import init from './init.js';
import * as discord from './discord.js';
import debug from './utils/debug.js';

const log = debug('sir-ardbot:main');

new Promise((resolve) => {
	if (config.discord.disabled) {
		resolve();
	} else {
		discord.login().then(resolve);
	}
}).then(init);

function exitHandler(code) {
	if (discord.client.readyAt !== null)
		discord.client.destroy();
	log(`${code} was received. So long, partner...`);
	process.exit(0);
}

process.on('SIGINT', exitHandler);
process.on('SIGTERM', exitHandler);