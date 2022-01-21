import { Buffer } from 'buffer';
import config from './config.js';
import { debug, print } from './utils.js';
import { getRecords, putRecords } from './database.js';
import { getRates } from './currency.js';

const log = debug('sir-ardbot:crawler');
const error = debug('sir-ardbot:crawler', 'error');

const denyTypes = [ 'media', 'stylesheet', 'font', 'other' ];
const emptyImage = Buffer.from([
	0x47,0x49,0x46,0x38, 0x39,0x61,0x01,0x00,
	0x01,0x00,0x91,0x00, 0x00,0x00,0x00,0x00,
	0xff,0xff,0xff,0xff, 0xff,0xff,0x00,0x00,
	0x00,0x21,0xff,0x0b, 0x4e,0x45,0x54,0x53,
	0x43,0x41,0x50,0x45, 0x32,0x2e,0x30,0x03,
	0x01,0x00,0x00,0x00, 0x21,0xf9,0x04,0x05,
	0x00,0x00,0x02,0x00, 0x2c,0x00,0x00,0x00,
	0x00,0x01,0x00,0x01, 0x00,0x00,0x02,0x02,
	0x54,0x01,0x00,0x3b
]);

function relayConsole(messages) {
	messages.args().forEach((message, index) => {
		console.log(`${index} : ${message}`);
	});
}

function requestHandler(request) {
	request._interceptionHandled = false;
	if (request.resourceType() === 'image') {
		// images are handled separately to not trigger onError() 
		request.respond({
			status: 200,
			headers: {
				'Content-Length': emptyImage.length,
				'Content-Type': 'image/gif'
			},
			body: emptyImage // see? how graceful
		});
	} else if (denyTypes.includes(request.resourceType())) {
		// other types are simply denied
		request.respond({ status: 200, body: '' });
	} else {
		request.continue();
	}
}

export default async function(browser, site) {
	try {
		const page = await browser.newPage();

		await page.setDefaultTimeout(config.puppeteer.timeout);
		await page.setRequestInterception(true);

		if (site.cookies) {
			for (const cookie of site.cookies) {
				await page.setCookie(cookie);
			}
		}

		// for debuging purposes
		if (config.puppeteer.console)
			page.on('console', relayConsole);

		page.on('request', requestHandler);

		log('%s: Start crawling %s...', site.domain, site.domain);

		await page.goto(site.url, { waitUntil: [ 'load' ] });

		let products = (await site.getProducts(page)).reverse();
		log('%s: Successfully crawled %d products', site.domain, products.length);

		page.close();

		if (config.crawler.dbcheck) {
			const records = await getRecords(site);
			const set = new Set(records.map(el => el.url));
			products = products.filter(prod => !set.has(prod.url));
		}

		if (!config.unipass.disabled) {
			const rates = await getRates();
			for (const product of products) {
				const currency = product.site.meta.currency;
				if (currency !== 'USD' && rates[currency]) {
					const priceUSD = product.price * (rates[currency] / rates['USD']);
					product.priceUSD = Math.round(priceUSD * 100) / 100; // two decimal places
				}
			}
		}

		if (products.length === 0) {
			log('%s: ... but none of them were new.', site.domain);
			return false;
		}

		log('%s: Successfully crawled %d new products!', site.domain, products.length);

		if (!config.debug.demo && (config.debug.dryrun || !config.debug.dev)) {
			await putRecords(products);
			log('%s: ...and inserted them into the database as well!', site.domain);
		}

		if (config.discord.disabled) {
			products.forEach((product, index) => {
				console.log(product.string);
				if (index === products.length-1)
					console.log('\n');
			});
		} else {
			const embedsArray = [];
			
			products.forEach((product, index) => {
				const embed = {
					title: product.name,
					url: product.url,
					thumbnail: { url: product.img },
					fields: [{
						name: 'Price (excl. VAT)',
						value: `${product.price} ${product.site.meta.currency}`,
						inline: true
					}],
					timestamp: new Date()
				};

				if (product.priceUSD) {
					embed.fields[0].value = embed.fields[0].value + ` (≒ ${product.priceUSD} USD)`;
				}

				if (product.size || product.abv) {
					embed.fields.push({
						name: ((product.size) ? 'Size' : '') +
								((product.size && product.abv) ? ' / ' : '') +
								((product.abv) ? 'ABV' : ''),
						value: ((product.size) ? `${product.size}ml` : '') +
								((product.size && product.abv) ? ' / ' : '') +
								((product.abv) ? `${product.abv}%` : ''),
						inline: true
					});
				}

				if (index == 0) embed.color = 0xEDBC11;

				// 10 is Discord embed length limit apparently
				// well, at least coording to the link below, so we chop it up
				// https://birdie0.github.io/discord-webhooks-guide/other/field_limits.html
				if (index % 10 == 0) embedsArray.push([]);
				embedsArray[Math.floor(index / 10)].push(embed);
			});

			for (const embeds of embedsArray) {
				await site.channel.send({ embeds: embeds });
			}
		}

		return products;

	} catch(err) {
		if (err.name === 'TimeoutError') {
			error("%s: We somehow timed out?! Maybe it's nothing...", site.domain);
		} else if (err.code === 'SQLITE_CONSTRAINT') {
			error("%s: I'm sure it's nothing, but there was an (allowed) database conflic:", site.domain);
			console.error(err);
		} else {
			error("%s: We had some uncertain error- to be specific:", site.domain);
			console.error(err);
		}
	}
}
