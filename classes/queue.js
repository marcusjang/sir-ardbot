/*
 *	classes/queue.js
 *  	shamelessly ripped off from
 *		https://medium.com/@karenmarkosyan/9d0d1f8d4df5
 */

module.exports = class Queue {
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

		if (this.repeat) this.queue.push(job);

		this.working = true;

		job.work()
			.then(job.resolve)
			.catch(job.reject)
			.finally(() => { 
				this.working = false;
				this.start();
			});

		return true;
	}

}