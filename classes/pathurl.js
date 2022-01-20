import { URL, fileURLToPath } from 'url';
import { join } from 'path';

export default class PathURL extends URL {
	constructor(path) {
		super(join('..', path), import.meta.url);
	}

	get path() {
		return fileURLToPath(this);
	}
}
