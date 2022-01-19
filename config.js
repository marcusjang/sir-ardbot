import dotenv from 'dotenv';
dotenv.config();

const { env } = process;

// these checks are done exclusively
// so either undefined or <empty string> is handled exclusively
const isTrue = string => (string === 'true');
const isFalse = string => (string === 'false');

// env.DEBUG is only used by debug module
// but we'll give it a default vaulue
if (!env.DEBUG) env.DEBUG = 'sir-ardbot*';

const config = {
	crawler: {
		interval: (env.CRAWLER_INTERVAL || 90) * 1000,
		dbcheck: !isFalse(env.CRAWLER_DBCHECK)
	},
	discord: {
		token: env.DISCORD_TOKEN,
		guildID: env.DISCORD_GUILD_ID,
		roleIDs: (env.DISCORD_ROLE_ID || '').split(','),
		disabled: (!env.DISCORD_TOKEN || isTrue(env.DISCORD_DISABLED) ||
			isTrue(env.DEMO) || isTrue(env.DRYRUN))
	},
	unipass: {
		token: env.UNIPASS_TOKEN,
		disabled: (!env.UNIPASS_TOKEN || isTrue(env.UNIPASS_DISABLED) || isTrue(env.DEMO))
	},
	puppeteer: {
		timeout: env.PUPPETEER_TIMEOUT*1 || 10000,
		path: env.PUPPETEER_PATH || false,
		console: isTrue(env.PUPPETEER_CONSOLE),
		options: { args: [ '--no-sandbox', '--disable-setuid-sandbox' ] }
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