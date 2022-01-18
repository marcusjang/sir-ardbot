/*
 *	utils/getModules.js
 *  
 */
const path = require('path');
const { readdir } = require('fs/promises');

module.exports = modulePath => {
	return readdir(path.join(__dirname, '../' + modulePath))
		.then(files => files.filter(file => (file.charAt(0) != '_' && file.endsWith('.js'))));
}