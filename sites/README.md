# Site Modules
As previously stated, Sir Ardbot uses **site modules** which is defined by [`classes/site.js`](../classes/site.js). Below is an example and following explanations on what each parameters do so you can build your own site module.

## Example
```js
/*
 *		sites/_example.js
 *	
 */
const Site = require('../classes/site.js');

module.exports = new Site('an.excellent.example', {
	name: 'An Excellent Site',
	category: 'An Excellent Category',
	currency: 'EUR',
	euroSeparator: false,
	vatRate: 1.0,
	limit: 25,
	url: 'about:blank',
        cookies: [{ name: 'anExcellentCookie', value: 'anExcellentValue', domain:'an.excellent.example' }],
	hidden: false,
	productsSelector: 'html > *',
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
		product.img = product.url + `/an-excellent-${fullNameSlug}-thumbnail.png`;

		return product;
	}
});
```

## `Site` Object
### Properties
 * [`site.domain`](#sitedomain)
 * [`site.meta`](#sitemeta)
 * [`site.meta.name`](#sitemetaname)
 * [`site.meta.category`](#sitemetacategory)
 * [`site.meta.currency`](#sitemetacurrency)
 * [`site.meta.euroSeparator`](#sitemetaeuroseparator)
 * [`site.limit`](#sitelimit)
 * [`site.url`](#siteurl)
 * [`site.cookies`](#sitecookies)
 * [`site.hidden`](#sitehidden)
 * [`site.productsSelector`](#siteproductsselector)
 * [`site.parseProduct`](#siteparseproduct)

#### [`site.domain`](#properties)
```js
/*
 * 	site.domain
 *	@required
 *	@type string
 */
 module.exports = new Site('an.excellent.example', {
 ```
The first argument of `new Site()` is used as site.domain. It's used essentially as the identifier of the module.

#### [`site.meta`](#properties)
#### [`site.meta.name`](#properties)
```js
/*
 * 	site.meta.name
 *	@default	site.domain
 *	@type		string
 */
 	name: 'An Excellent Site',
 ```
A sanitised version of this will be used as the name of the channel. The bot will create a new channel if no channel with the same name is found.

#### [`site.meta.category`](#properties)
```js
/*
 * 	site.meta.category
 *	@default	"Uncategorized"
 *	@type		string
 */
 	category: 'An Excellent Category',
 ```
This will be used as the name of the category. Same as above - new categires will be dynamically created.

#### [`site.meta.currency`](#properties)
```js
/*
 * 	site.meta.currency
 *	@default	<empty string>
 *	@type		string
 */
 	currency: 'EUR',
 ```
This is used for two cases - first, for human-readablility reasons, and second, to calculate currency conversion into USD.  
Check Unipass OpenAPI docs for valid currensy acronyms.

#### [`site.meta.euroSeparator`](#properties)
```js
/*
 * 	site.meta.euroSeparator
 *	@default	false
 *	@type		boolean
 */
 	euroSeparator: false,
 ```
If set to true, on parsing the price of products the function will look for comma(,) as the decimal separator. If false, it will look for period(.) instead.

#### [`site.limit`](#properties)
```js
/*
 * 	site.limit
 *	@default	25
 *	@type		number
 */
 	limit: 25,
 ```
Limits the number of crawled products to be returned.

#### [`site.url`](#properties)
```js
/*
 * 	site.url
 *	@required
 *	@type		string | function
 */
 	url: 'about:blank',
 ```
The URL of page to crawl from. Can be a function that takes a page argument and returns according url, but currently the page-specific or multi-page crawling is unimplemented.

#### [`site.cookies`](#properties)
```js
/*
 * 	site.cookies
 *	@default	null
 *	@type		array<object>
 */
 	cookies: [{ name: 'anExcellentCookie', value: 'anExcellentValue', domain:'an.excellent.example' }],
 ```
Cookies required for the given page in object form.

#### [`site.hidden`](#properties)
```js
/*
 * 	site.hidden
 *	@default	false
 *	@type		boolean
 */
 	hidden: false,
 ```
If set, the site's channel will be accessible only to those with roles set in `.env`.

#### [`site.productsSelector`](#properties)
```js
/*
 * 	site.productsSelector
 *	@required
 *	@type		string
 */
 	productsSelector: 'anExcellentCookie=anExcellentValue;',
 ```
The selector of products in DOM. This value will be essentially passed to `document.querySelectorAll()` as its selector argument.

#### [`site.parseProduct`](#properties)
```js
/*
 * 	site.parseProduct
 *	@required
 *	@type		function
 */
 	parseProduct: prod => { ... }
 ```
This function is parsed into string, passed onto puppeteer, called onto for each products like below.
```js
// Not a real code -- just an approximation of what's happening under the hood
Array.from(document.querySelectorAll(site.productsSelector))
        .map(site.parseProduct)
```

Since this is essentially a `callbackFn` for [`Array.prototype.map()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map), the function can have up to three parameters - `element`, `index`, and `array`.
`thisArg` is not supported as the function is run at puppeteer's browser scope. Also, as the function is passed to puppeteer in string form and then reassembled to be executed browser-scope, **no variables outside of the function can be called from inside the function scope.**

`site.parseProduct` is expected to `return` either `false` (which will be filtered out further down the line), or for the most part, [`the product object`](#the-product-object).

The function included in `_example.js` is a simple, fun function that generates random, fictional products that I wrote as an example.


## The Product Object
The product object is a simple Javascript class object that contains essential informations about the product.
```js
        const product = {};

        product.name = fullName;
        product.price = 100 + Math.floor(Math.random() * 300) - 0.02;
        product.abv = 40 + Math.floor(Math.random() * 200)/10;
        product.size = 700;
        product.url = `https://an.excellent.example/an-excellent-${fullNameSlug}`;
        product.img = product.url + `/an-excellent-${fullNameSlug}-thumbnail.png`;

```
Each properties are *hopefully* self describing, and won't require further details.

As seen in [`classes/product.js`](../classes/product.js), each property has some checks and trimming functionss in places. Some details like `product.abv` or `product.size` can also be omitted.
