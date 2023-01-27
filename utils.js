import { default as debugModule } from 'debug';
import { inspect } from 'util';

export function debug(name, type = 'log') {
	const types = [ 'debug', 'error', 'info', 'log', 'warn' ];
	if (!types.find(value => type === value))
		return console.log;

	const debug = debugModule(name);
	debug.log = console[type].bind(console);

	return (type === 'log') ? debug : debug.extend(type);
}

export function print(object) {
	return console.log(inspect(object, { showHidden: false, depth: null, colors: true }));
}

export function delay(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}
