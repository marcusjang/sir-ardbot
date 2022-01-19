/*
 *  classes/product.js
 *  
 */

module.exports = class Product {
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
		return (!urlString) ? null : 'https://www.' + this.site.domain + urlString;
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
