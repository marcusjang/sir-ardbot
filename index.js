import config from './config.js';
import { init } from './init.js';

function info(message, ...args) {
	return console.info('  \x1b[33msir-ardbot\x1b[0m ' + message, ...args);
}

info('Sir Ardbot is initialising...');
const { browser, client } = await init();

async function destroy() {
	if (client.readyAt !== null)
		client.destroy();
	await browser.close();
	process.exit(0);
}

function exitHandler(code) {
	info('Process event %s was received; exiting...', code);
	destroy();
}

browser.on('disconnected', destroy);
process.on('SIGINT', exitHandler);
process.on('SIGTERM', exitHandler);
