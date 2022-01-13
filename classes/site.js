/*
	classes/site.js
		so far the only class in project
		mostly used for its static fns? wtf
*/

class Site {
	constructor(domain, data) {
		this.domain = domain;
		this.meta.name = data.name;
		this.meta.category = data.category;
		this.meta.currency = data.currency;
		this.meta.euroSeparator = data.euroSeparator || false;
		this.meta.vatRate = data.vatRate || 1;
		this.limit = (data.limit === undefined) ? 25 : data.limit;
		this.productsSelector = data.productsSelector;
		this.parseProduct = data.parseProduct;
		this.url = (typeof data.url === 'function') ? data.url() : data.url;
		this.cookies = data.cookies || null;
		this.hidden = data.hidden || false;
	}

	// site.newProduct()
	// Returns an object containing common product info
	get newProduct() {
		return {
			site: this.domain,
			currency: this.meta.currency
		}
	}

	get parseProductFn() {
		return this.parseProduct.toString()
			.replace(/^[^\{]+\{(.+)\}$/s, '$1')
			.replace(/\t/g, '')
			.trim();
	}

	mapProducts(products) {
		const results = products
			.filter(product => product !== false)
			.map(product => {
				if (product.price) product.price = this.parsePrice(product.price);
				if (product.size) product.size = this.parseSize(product.size);
				if (product.abv) product.abv = this.parseABV(product.abv);
				if (product.url.match(/^\/[^\/]/)) product.url = this.absUrl(product.url);
				if (product.img && product.img.match(/^\/[^\/]/)) product.img = this.absUrl(product.img);
				if (product.img && product.img.match(/^\/\/cdn/)) product.img = 'https' + product.img;
				return { ...this.newProduct, ...product };
			})
			.filter(product => product.url && (!product.size || product.size > 100));
		return (this.limit) ? results.slice(0, this.limit) : results;
	}

	getProducts(doc) {
		return this.mapProducts(
					Array.from(doc.querySelectorAll(this.productsSelector))
						.map(this.parseProduct)
				);
	}

	getPuppet(page) {
		return page.waitForSelector(this.productsSelector).then(() => {
			return page.$$eval(this.productsSelector, (products, parseProduct) => {
				return products.map(prod => new Function('prod', parseProduct)(prod));
			}, this.parseProductFn)
				.then(products => this.mapProducts(products));
		});
	}

	// absUrl(string)
	// Returns absolute url (with https:// in front) of the given relative path
	//   returns: string
	absUrl(urlString) {
		return (!urlString) ? null : 'https://www.' + this.domain + urlString;
	}

	parseSize(sizeString) {
		return Site.parseSize(sizeString);
	}

	parseABV(abvString) {
		return Site.parseABV(abvString);
	}

	parsePrice(priceString) {
		return Site.parsePrice(priceString, this.meta.euroSeparator, this.meta.vatRate);
	}

	// parseSize(string)
	// Parses size string (e.g. "700ml", "50cl", "0.7 ltr" etc.) into appropriate numbers in ml
	//   returns: number | null
	static parseSize(sizeString) {
		if (!sizeString) return null;

		const sizeChunks = sizeString.trim().match(/^([\d\.\,]+)\s?(\w+)$/);
		if (!sizeChunks) return null;

		let [ , size, unit ] = sizeChunks.map(ch => ch.trim());

		size = +size.replace(',', '.');

		if (unit.match('cl')) size = size * 10;
		if (unit.match(/li?te?r/)) size = size * 1000;

		return size;
	}

	// parseABV(string)
	// Takes ABV in string (e.g. "45.8%" etc.) and returns only numbers
	// Returns null when given null
	//   returns: number | null
	static parseABV(abvString) {
		return (!abvString) ? null : abvString.replace(',', '.').replace(/[^\d\.]/g, '') * 1;
	}

	// parsePrice(string, euroSeparator = false, vatRate = 1)
	// Parses out price string into appropriate number values
	// Can take additional arguments to calculate excl. VAT value
	//   returns: number
	static parsePrice(priceString, euroSeparator = false, vatRate = 1) {
		const separator = (euroSeparator) ? '.' : ',';
		const decimal = (euroSeparator) ? ',' : '.';

		// remove separator and then strip anything that is not number or "."
		let price = priceString.trim()
			.replace(new RegExp(`\\${separator}`, 'g'), '')      
			.replace(new RegExp(`[^\\${decimal}\\d]`, 'g'), '');

		// convert euro separator "," into "."
		if (euroSeparator) price = price.replace(/\,/g, '.');

		price = +price; // cast into number

		// Calculate excl. VAT price when given argument
		if (vatRate > 1) price = Math.round(price / vatRate * 100) / 100;

		return price;
	}
}

module.exports = Site;
