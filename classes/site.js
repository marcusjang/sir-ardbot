class Site {
	constructor(domain, name, country, currency, url, header = {}, hidden = false) {
		this.domain = domain;
		this.name = name;
		this.country = country;
		this.currency = currency;
		this.url = url;
		this.header = header;
		this.hidden = hidden;
	}

	get newProduct() {
		return {
			site: this.domain,
			currency: this.currency,
			available: true
		}
	}

	// absUrl(string)
	// Returns absolute url (with https:// in front) of the given relative path
	//   returns: string
	absUrl(urlString) {
		return (!urlString) ? null : 'https://www.' + this.domain + urlString;
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
