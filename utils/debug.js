import debug from 'debug';
import { inspect } from 'util';

export default function (name, type = 'log') {
	const types = [ 'debug', 'error', 'info', 'log', 'warn' ];
	if (!types.find(value => type === value))
		return console.log;

	if (type !== 'log')
		name = name + '-' + type;

	const log = debug(name);
	log.log = console[type].bind(console);

	return log;
}

export function print (object) {
	return console.log(inspect(object, { showHidden: false, depth: null, colors: true }));
}