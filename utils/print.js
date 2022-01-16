const util = require('util');

module.exports = (message) => console.log(
	util.inspect(message, {
		showHidden: false,
		depth: null,
		colors: true
	})
);