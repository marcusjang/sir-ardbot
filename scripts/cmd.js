/*
 *	scripts/cmd.js
 *	@usage node cmd option0=value0, option1=value1,  ... , optionN=valueN
 *	
 */

const config = require('../config.js');
const print = require('../utils/print.js');

process.argv.shift(); // node
process.argv.shift(); // cmd.js

const cmdFile = process.argv.shift();

const options = new Map();

process.argv.forEach(arg => {
	const [ key, value ] = arg.split('=');
	options.set(key, value);
});

const interaction = {
	options: { getString: string => options.get(string) },
	reply: print,
	send: print
}

const command = require(`../commands/${cmdFile}.js`);

command.execute(interaction)
	.finally(() => process.exit(0));
