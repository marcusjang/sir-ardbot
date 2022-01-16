/*
 *	config.js
 *		normalizes env vars with defaults
 *	
 */

// we won't be using process.env as is
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { env } = process;

// these checks are done exclusively
// so either undefined or <empty string> is handled exclusively
const isTrue = string => (string === 'true');
const isFalse = string => (string === 'false');

module.exports = {
	crawler: {
		interval: (env.CRAWLER_INTERVAL || 90) * 1000,
		dbcheck: !isFalse(env.CRAWLER_DBCHECK)
	},
	discord: {
		token: env.DISCORD_TOKEN,
		guildID: env.DISCORD_GUILD_ID,
		roleIDs: (env.DISCORD_ROLE_ID || '').split(','),
		disabled: (!env.DISCORD_TOKEN || isTrue(env.DISCORD_DISABLED) || isTrue(env.DEMO))
	},
	unipass: {
		token: env.UNIPASS_TOKEN,
		disabled: (!env.UNIPASS_TOKEN || isTrue(env.UNIPASS_DISABLED) || isTrue(env.DEMO))
	},
	puppeteer: {
		timeout: env.PUPPETEER_TIMEOUT*1 || 10000,
		path: env.PUPPETEER_PATH || false,
		console: isTrue(env.PUPPETEER_CONSOLE)
	},
	debug: {
		// env.DEBUG is only used by debug module
		dev: isTrue(env.DEV),
		dryrun: isTrue(env.DRYRUN),
		demo: isTrue(env.DEMO)
	}
}

/* sample .env
	# .env

	# Crawler
	CRAWLER_INTERVAL=90
	CRAWLER_DBCHECK=true

	# Discord
	DISCORD_TOKEN=
	DISCORD_GUILD_ID=
	DISCORD_ROLE_ID=
	DISCORD_DISABLED=false

	# Unipass
	UNIPASS_TOKEN=
	UNIPASS_DISABLED=false

	# Puppeteer
	PUPPETEER_TIMEOUT=10000
	PUPPETEER_PATH=
	PUPPETEER_CONSOLE=false

	# Debug
	DEBUG=sir-ardbot:*
	DEV=true
	DRYRUN=true
	DEMO=false
*/
