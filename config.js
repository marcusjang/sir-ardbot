import { PathURL } from './classes.js';
import dotenv from 'dotenv';
dotenv.config({ path: new PathURL('.env').path });

const { env } = process;

// these checks are done exclusively
// so either undefined or <empty string> is handled exclusively
const isTrue = string => (string === 'true');
const isFalse = string => (string === 'false');

const config = {
	crawler: {
		interval: (env.CRAWLER_INTERVAL || 90) * 1000,
		dbcheck: !isFalse(env.CRAWLER_DBCHECK)
	},
	discord: {
		token: env.DISCORD_TOKEN,
		guildID: env.DISCORD_GUILD_ID,
		roleIDs: (env.DISCORD_ROLE_ID || '').split(','),
		disabled: (!env.DISCORD_TOKEN || isTrue(env.DISCORD_DISABLED)),
		logging: (!env.DISCORD_ERROR_CHANNEL || !env.DISCORD_LOGGING_CATEGORY) ?
			false :
			{
				error: env.DISCORD_ERROR_CHANNEL,
				logging: env.DISCORD_LOGGING_CHANNEL,
				category: env.DISCORD_LOGGING_CATEGORY
			}
	},
	dataApi: {
		token: env.DATAAPI_TOKEN,
		disabled: (!env.DATAAPI_TOKEN || isTrue(env.DATAAPI_DISABLED) || isTrue(env.DEMO))
	},
	puppeteer: {
		timeout: env.PUPPETEER_TIMEOUT*1 || 10000,
		path: env.PUPPETEER_PATH || false,
		console: isTrue(env.PUPPETEER_CONSOLE),
		options: { args: [ '--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors' ] }
	},
	debug: {
		dev: isTrue(env.DEV),
		dryrun: isTrue(env.DRYRUN),
		demo: isTrue(env.DEMO)
	}
}

if (config.puppeteer.path) {
	config.puppeteer.options.product = 'chrome';
	config.puppeteer.options.executablePath = config.puppeteer.path;
}

export default config;
