# Site modules

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
	cookies: 'anExcellentCookie=anExcellentValue;',
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
		product.img = `https://an.excellent.example/an-excellent-${fullNameSlug}/an-excellent-${fullNameSlug}-thumbnail.png`;

		return product;
	}
});
```