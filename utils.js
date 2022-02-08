import { default as debugModule } from 'debug';
import { inspect } from 'util';
import { PathURL } from './classes.js';

export function debug(name, type = 'log') {
	const types = [ 'debug', 'error', 'info', 'log', 'warn' ];
	if (!types.find(value => type === value))
		return console.log;

	if (type !== 'log')
		name = name + '-' + type;

	const log = debugModule(name);
	log.log = console[type].bind(console);

	return log;
}

export function print(object) {
	return console.log(inspect(object, { showHidden: false, depth: null, colors: true }));
}

export function delay(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}


export async function readJSON(file) {
	const path = new PathURL(file).path;
	return await readFile(path, 'utf-8')
		.then(text => JSON.parse(text));
}

export async function saveJSON(file, object) {
	const path = new PathURL(file).path;
	const text = JSON.stringify(results, null, 4);
	await writeFile(path, text, 'utf-8');
}

export async function modifyJSON(file, callbackFn) {
	const json = await readJSON(file).then(callbackFn);
	await saveJSON(file, json);
	return json;
}