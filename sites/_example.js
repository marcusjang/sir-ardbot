const { JSDOM } = require('jsdom');

const Site = require('../classes/site.js');
const site = new Site(
	'example-site.tld',
	'Example Site',
	'Somewhere in the Earth',
	'GBP',
	(page = 0) => `https://example-site.tld/products/${page + 1}`
);

site.getProducts = body => {
	const products = [];

	for (let i = 1; i <= 5; i ++) {
		const product = site.newProduct;

		product.name = `Example Product ${i}`;
		product.price = i - 0.01;
		product.size = 700;
		product.abv = 40;
		product.url = `https://example-site.tld/products/product/${1}`;
		product.img = `https://example-site.tld/images/product_${1}.jpg`;

		products.push(product);
	}

	return products.reverse();
}

module.exports = site;
