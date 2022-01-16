/*
 *  classes/site.js
 *  
 */

const acorn = require('acorn');
const Product = require('../classes/product.js');

module.exports = class Site {
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
