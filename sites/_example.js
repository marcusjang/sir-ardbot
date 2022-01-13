/*
 *		./sites/_example.js
 *	
 */
 
const Site = require('../classes/site.js');

module.exports = new Site('an.excellent.example', {

/*
 * 		site.domain
 *			@required
 *
 *			The first argument of new Site() is used as site.domain.
 *			It's used essentially as its identifier.
 */

/*
 * 		site.name
 *			@default site.domain
 *
 *			A sanitised version of this will be used as the name of the channel.
 *			The bot will create a new channel if no channel with the same name is found.
 */
	name: 'An Excellent Site',

/*
 * 		site.category
 *			@default 'Uncategorized'
 *
 *			This will be used as the name of the category.
 *			Same as above - new categires will be dynamically created.
 */
	category: 'An Excellent Category',

/*
 * 		site.category
 *			@default ''
 *
 *			This is used for two cases - first, for human-readablility reasons,
 *			and second, to calculate currency conversion into USD.
 * 			Check Unipass OpenAPI docs for valid currensy acronyms.
 */
	currency: 'EUR',

/*
 * 		site.euroSeparator
 *			@default false
 *
 *			If set to true, on parsing the price of products the function will look for 
 *			comma(,) as the decimal separator.
 * 			If false, it will look for period(.) instead.
 */
	euroSeparator: false,

/*
 * 		site.vatRate
 *			@default 1.0
 *
 *			The parsed price will be divided by this value.
 * 			Essentially used for calculating VAT excluded prices for oversees orders
 */
	vatRate: 1.0,

/*
 * 		site.limit
 *			@default 25
 *
 *			Limits the number of crawled products to be returned.
 */
	limit: 25,

/*
 * 		site.url
 *			@required
 *
 *			The URL of page to crawl from.
 *			Can be either a function that takes a page argument and returns according url,
 *			but currently the page-specific or multi-page crawling is unimplemented 
 */
	url: 'about:blank',

/*
 * 		site.cookies
 *			@default null
 *
 *			Cookies required for the given page in string form.
 *			If set, it will override Puppeteer's HTTP request header cookie
 */
	cookies: 'anExcellentCookie=anExcellentValue;',

/*
 * 		site.hidden
 *			@default false
 *
 *			If set, the site's channel will be accessible only to those with roles set in .env
 */
	hidden: false,

/*
 * 		site.productsSelector
 *			@required
 *
 *			The selector of products in DOM
 *			This value will be essentially used in document.querySelectorAll() selector argument
 */
	productsSelector: 'html > *',

/*
 * 		site.parseProduct
 *			@type function
 *			@required 
 *
 *			This function is parsed into string, passed onto Puppeteer, called onto
 *			document.querySelectorAll(site.productsSelector).map() for each products.
 *
 * 			Since this is essentially a callbackFn for Array.prototype.map(),
 *			the function can have up to three parameters - element, index, and array.
 *			thisArg is not supported as the function is run at Puppeteer scope.
 *
 *			The function is expected to return either false (which will be filtered out 
 *			further down the line), or for the most part, the product object.
 *
 *			The below is a simple, fun function that generates random, fictional products
 *			that I wrote as an example.
 */
	parseProduct: prod => {
		const product = {};

		const namePrefix = ['Glen', 'Ben', 'Ard', 'Strath', 'Auch', 'Brachen', 'Kil'];
		const nameSuffix = ['nagar', 'lochy', 'livet', 'moray', 'maor'];
  
		const distillery = namePrefix[namePrefix.length * Math.random() | 0]
				 + nameSuffix[nameSuffix.length * Math.random() | 0];

		const vintage = 1980 + Math.floor(Math.random() * 30);
		const bottled = 2015 + Math.floor(Math.random() * 5);
		const age = bottled - vintage - Math.floor(Math.random() * 2);
		const fullName = `${distillery} ${vintage}/${bottled} ${age} years old`;
		const fullNameSlug = fullName.toLowerCase().replace(/\W/g, '-');
  
		product.name = fullName;
		product.price = 100 + Math.floor(Math.random() * 300) - 0.02;
		product.abv = 40 + Math.floor(Math.random() * 200)/10;
		product.size = 700;
		product.url = `https://an.excellent.example/an-excellent-${fullNameSlug}`;
		product.img = `https://an.excellent.example/an-excellent-${fullNameSlug}/an-excellent-${fullNameSlug}-thumbnail.png`;

		if (product.abv < 43) return false;

		return product;
	}
});