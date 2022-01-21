/*
 *	scripts/cmd.js
 *	@usage node cmd option0=value0, option1=value1,  ... , optionN=valueN
 *	
 */

import config from '../config.js';
import { print } from '../utils.js';
import { PathURL } from '../classes.js';

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
	send: print,
	user: { id: 'test' }
}

const command = await import(new PathURL(`commands/${cmdFile}.js`).href);

await command.execute(interaction)
process.exit(0);
