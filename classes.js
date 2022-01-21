/*
 *  classes.js
 *  
 */

import { URL, fileURLToPath } from 'url';
import { join } from 'path';
import * as acorn from 'acorn';

export class Site {
	constructor(domain, data) {
		this.domain = domain;
		this.meta = {};
		this.meta.name = data.name || domain;
		this.meta.category = data.category || 'Uncategorized';
		this.meta.currency = data.currency || '';
		this.meta.euroSeparator = data.euroSeparator || false;
		this.meta.vatRate = data.vatRate || 1;
		this.limit = (data.limit === undefined) ? 25 : data.limit;
		this.productsSelector = data.productsSelector;
		this.parseProduct = data.parseProduct;
		this.url = (typeof data.url === 'function') ? data.url() : data.url;
		this.cookies = data.cookies || null;
		this.hidden = data.hidden || false;
	}

	get parseProductFn() {
		const parsed = acorn.parse(this.parseProduct, { ecmaVersion: 2020 });
		const expression = parsed.body[0].expression;
		const params = expression.params.map(param => param.name).slice(0, 3);
		if (params.length == 1) params.push('index');
		if (params.length == 2) params.push('array');
		const fn = this.parseProduct.toString().slice(expression.body.start, expression.body.end);

		return { params: params, fn: fn };
	}

	getProducts(page) {
		return page.waitForSelector(this.productsSelector).then(() => {
			return page.$$eval(this.productsSelector, (products, params, parseProduct) => {
				return products.map(prod => new Function(params[0], params[1], params[2], parseProduct)(prod));
			}, this.parseProductFn.params, this.parseProductFn.fn)
				.then(products => {
					const results = products.filter(prod => prod)
						.map(prod => new Product(this, prod))
						.filter(product => product.url && (!product.size || product.size > 100))
					return (this.limit) ? results.slice(0, this.limit) : results;
				});
		});
	}
}

export class Product {
	constructor(siteObj, prodObj) {
		this.site = siteObj;
		this.name = prodObj.name;
		this.price = prodObj.price ? this.parsePrice(prodObj.price) : null;
		this.abv = prodObj.abv ? this.parseABV(prodObj.abv) : null;
		this.size = prodObj.size ? this.parseSize(prodObj.size) : null;
		this.url = prodObj.url;
		this.img = prodObj.img || null;

		if (this.url.match(/^\/[^\/]/)) this.url = this.absUrl(this.url);
		if (this.img && this.img.match(/^\/[^\/]/)) this.img = this.absUrl(this.img);
		if (this.img && this.img.match(/^\/\/cdn/)) this.img = 'https:' + this.img;
	}

	absUrl(urlString) {
		return (!urlString) ? null : 'https://www.' + this.site + urlString;
	}

	parseSize(sizeString) {
		if (!sizeString) return null;
		if (typeof sizeString === 'number') return sizeString;

		const sizeChunks = sizeString.trim().match(/^([\d\.\,]+)\s?(\w+)$/);
		if (!sizeChunks) return null;

		let [ , size, unit ] = sizeChunks.map(ch => ch.trim());

		size = +size.replace(',', '.');

		if (unit.match('cl')) size = size * 10;
		if (unit.match(/li?te?r/)) size = size * 1000;

		return size;
	}

	parseABV(abvString) {
		if (!abvString) return null;
		if (typeof abvString === 'number') return abvString;
		return abvString.replace(',', '.').replace(/[^\d\.]/g, '') * 1;
	}

	parsePrice(priceString) {
		if (typeof priceString === 'number') return priceString;
		
		const separator = (this.site.meta.euroSeparator) ? '.' : ',';
		const decimal = (this.site.meta.euroSeparator) ? ',' : '.';

		// remove separator and then strip anything that is not number or "."
		let price = priceString.trim()
			.replace(new RegExp(`\\${separator}`, 'g'), '')      
			.replace(new RegExp(`[^\\${decimal}\\d]`, 'g'), '');

		// convert euro separator "," into "."
		if (this.site.meta.euroSeparator) price = price.replace(/\,/g, '.');

		// cast into number
		price = +price;

		// Calculate excl. VAT price when given argument
		if (this.site.meta.vatRate > 1) price = Math.round(price / this.site.meta.vatRate * 100) / 100;

		return price;
	}

	get string() {
		return `\n` +
			`   \x1b[2mfrom ${this.site.domain}\x1b[0m\n` +
			`  \x1b[1m\x1b[32m${this.name}\x1b[0m\n` +
			`  \x1b[1m\x1b[4m${this.url}\x1b[0m\n` +
			`    \x1b[1mPRICE \x1b[0m${this.price} ${this.site.meta.currency}\x1b[0m` +
			((this.abv)  ? `      \x1b[1mABV \x1b[0m${this.abv} %\x1b[0m`   : '') +
			((this.size) ? `      \x1b[1mSIZE \x1b[0m${this.size} ml\x1b[0m` : '');
	}
}

/*
 *	Queue
 *  	shamelessly ripped off from
 *		https://medium.com/@karenmarkosyan/9d0d1f8d4df5
 */
export class Queue {
	constructor(repeat, jobs) {
		this.repeat = repeat || false;
		this.queue = (jobs && typeof jobs === 'array') || [];
		this.working = false;
	}

	add(work) {
		if (typeof work !== 'function') return Promise.resolve(false);
		return new Promise((resolve, reject) => {
			this.queue.push({ work, resolve, reject });
			this.start();
		});
	}

	start() {
		if (this.working) return false;

		const job = this.queue.shift();
		if (!job) return false;

		this.working = true;

		job.work()
			.then(job.resolve)
			.catch(job.reject)
			.finally(() => { 
				if (this.repeat) this.queue.push(job);
				this.working = false;
				this.start();
			});

		return true;
	}
}

export class PathURL extends URL {
	constructor(path) {
		super(join('./', path), import.meta.url);
	}

	get path() {
		return fileURLToPath(this);
	}
}
