import dotenv from 'dotenv';
dotenv.config();

import init from './init.js';
import { client as discordClient, login as discordLogin } from './discord.js';
discordLogin().then(init);

const exitHandler = (code) => {
	discordClient.destroy();
	console.log(`${code} was received. So long, partner...`);
	process.exit(0);
}

process.on('SIGINT', exitHandler);
process.on('SIGTERM', exitHandler);