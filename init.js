/*
 *	init.js
 *		read module files and do stuff
 *  
 */

const puppeteer = require('puppeteer');

const config = require('./config.js');
const { crawl } = require('./crawl.js');
const discord = require('./discord.js');
const database = require('./database.js');

const { log, error } = require('./utils/debug.js')('sir-ardbot:main');
const delay = require('./utils/delay.js');
const getModules = require('./utils/getModules.js');

const Queue = require('./classes/queue.js');
const queue = new Queue(true);

module.exports = () => {
	log(`Sir Ardbot is ready! Initialising...`);

	Promise.all([ getModules('sites'), getModules('commands') ])
		.then(modules => {
			const [ sites, commands ] = modules;

			const initModules = () => new Promise((resolve, reject) => {
				if (sites.length === 0) {
					log(`Sir ardbot is in demo mode`);
					config.debug.demo = true;
					config.discord.disabled = true;
					sites.push('_example.js');
				}

				log(`Found ${sites.length} site(s)`);

				if (config.discord.disabled) {
					const channels = sites.map(file => {
						return { site: file.replace('.js', '') };
					});
					resolve(channels);
				} else {
					discord.initChannels(sites)
						.then(resolve).catch(reject);
				}
			});

			if (!config.discord.disabled) {
				discord.client.commands = new Map();
				log(`Found ${commands.length} command(s), setting...`);
				for (const command of commands) {
					const commandModule = require(`./commands/${command}`);
					discord.client.commands.set(commandModule.data.name, commandModule);
				}
			}

			return Promise.all([
				puppeteer.launch(config.puppeteer.options),
				initModules(),
				database.init()
			]);
		})
		.then(init => {
			// database.init() returns knex but we won't be using it here anyway
			const [ browser, channels ] = init;

			const unitDelay = Math.floor(config.crawler.interval / channels.length);
			log(`Unit delay is ${unitDelay}ms per site`);

			channels.forEach(channel => {
				const job = () => crawl(browser, channel.site)
					.then(products => (config.discord.disabled) ?
						products.forEach(product => console.log(product.string)) :
						discord.sendProducts(channel.channel, products)
					)
					.catch(err => (err) ? reject(err) : null);

				queue.add(() => Promise.race([
					Promise.all([ job(), delay(unitDelay) ]),
					delay(unitDelay + 3000) // basically timeout
				]));
					
			});
		});
}
