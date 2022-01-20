import { default as debugModule } from 'debug';
import { inspect } from 'util';
import { URL, fileURLToPath } from 'url';
import { join } from 'path';

/*
 *	Queue
 *  	shamelessly ripped off from
 *		https://medium.com/@karenmarkosyan/9d0d1f8d4df5
 */
export class Queue {
	constructor(repeat, jobs) {
		this.repeat = repeat || false;
		this.queue = (jobs && typeof jobs === 'array') || [];
		this.working = false;
	}

	add(work) {
		if (typeof work !== 'function') return Promise.resolve(false);
		return new Promise((resolve, reject) => {
			this.queue.push({ work, resolve, reject });
			this.start();
		});
	}

	start() {
		if (this.working) return false;

		const job = this.queue.shift();
		if (!job) return false;

		this.working = true;

		job.work()
			.then(job.resolve)
			.catch(job.reject)
			.finally(() => { 
				if (this.repeat) this.queue.push(job);
				this.working = false;
				this.start();
			});

		return true;
	}
}

export class PathURL extends URL {
	constructor(path) {
		super(join('..', path), import.meta.url);
	}

	get path() {
		return fileURLToPath(this);
	}
}

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
