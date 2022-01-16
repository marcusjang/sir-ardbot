/*
 *	utils/cmd.js
 *	@usage node cmd option0=value0, option1=value1,  ... , optionN=valueN
 *	
 */

const config = require('../config.js');

const util = require('util');

process.argv.shift(); // node
process.argv.shift(); // cmd.js

const cmdFile = process.argv.shift();

const options = new Map();

process.argv.forEach(arg => {
	const [ key, value ] = arg.split('=');
	options.set(key, value);
});

const print = message => console.log(
	util.inspect(message, {
		showHidden: false,
		depth: null,
		colors: true
	})
);

const interaction = {
	options: { getString: string => options.get(string) },
	reply: print,
	send: print
}

const command = require(`../commands/${cmdFile}.js`);

command.execute(interaction)
	.finally(() => process.exit(0));
