const debug = require('debug');

module.exports = (name) => {
	const functions = {
		log: debug(name),
		error: debug(name + '-error')
	};
	functions.log.log = console.log.bind(console);
	return functions;
};
