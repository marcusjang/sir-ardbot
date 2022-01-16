const { inspect } = require('util');

module.exports = (message) => console.log(
	inspect(message, {
		showHidden: false,
		depth: null,
		colors: true
	})
);