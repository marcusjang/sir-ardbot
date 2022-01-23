/*
 *  scripts/api.js
 *  @usage node api [method] [commandName] [guildID]
 *	
 */

import fetch from 'node-fetch';
import config from '../config.js';
import { print } from '../utils.js';
import { PathURL } from '../classes.js';

process.argv.shift(); // node
process.argv.shift(); // api.js

const headers = {
	'Authorization': `Bot ${config.discord.token}`,
	'Content-Type': 'application/json'
};

const apiVer = 9;
const baseUrl = `https://discord.com/api/v${apiVer}`;
const path = {
	me: baseUrl + `/oauth2/applications/@me`,
	guilds: baseUrl + `/users/@me/guilds`,
	commands: (appID, guildID) => {
		return baseUrl + `/applications/${appID}/guilds/${guildID}/commands`;
	}
};

function request(url, method = 'get', body) {
	const options = { method: method, headers: headers };
	if (!method.match(/^get$/i) && body) options.body = JSON.stringify(body);
	return fetch(url, options)
		.then(response => {
			if (response.status === 401) {
				return Promise.reject(new Error('401 Unauthorised'));
			}
			return response.json();
		})
		.catch(err => console.error(err));
}

function toMap(array, keyString, callbackFn) {
	const map = new Map();
	for (const el of array) {
		if (!callbackFn && typeof callbackFn !== 'function') {
			map.set(el[keyString], el);
		} else {
			map.set(el[keyString], callbackFn(el));
		}			
	}
	return map;
}

function getAppID() {
	if (global.appID) { return Promise.resolve(global.appID); } else {
		return request(path.me).then(app => {
			global.appID = app.id;
			return app.id;
		});
	}
}

function getGuilds() {
	if (global.guilds) { return Promise.resolve(guilds); } else {
		return request(path.guilds).then(guilds => {
			global.guilds = guilds;
			return toMap(guilds, 'id');
		});;
	}
}

function getGuildCommands(guildID) {
	return getAppID().then(appID => {
		return request(path.commands(appID, guildID))
			.then(response => {
				if (response.message == 'Missing Access') return false;
				return {
					guildID: guildID,
					commands: toMap(response, 'name')
				};
			});
	});
}

function getAllGuildCommands() {
	return Promise.all([ getAppID(), getGuilds() ])
		.then(results => {
			const [ appID, guilds ] = results;
			const jobs = [];

			guilds.forEach(guild => {
				jobs.push(getGuildCommands(guild.id))
			});

			return Promise.all(jobs)
				.then(allCommands => allCommands.filter(commands => commands))
				.then(allCommands => toMap(allCommands, 'guildID', el => el.commands));
		});
}

function getGuildCommand(commandName, guildID) {
	return (guildID ? getGuildCommands(guildID) : getAllGuildCommands())
		.then(guildCommands => {
			if (guildID) {
				return guildCommands.commands.get(commandName);
			} else {
				const map = new Map();
				guildCommands.forEach((commands, guildID) => {
					const command = commands.get(commandName);
					if (command) map.set(guildID, command);
				})
				return map;
			}
		});
}

async function postGuildCommand(commandName, guildID) {
	const { data } = await import(new PathURL(`commands/${commandName}.js`).href);
	return getAppID().then(appID => {
		return request(path.commands(appID, guildID), 'post', data);
	});
}

function postAllGuildCommand(commandName) {
	return getGuilds()
		.then(guilds => {
			const jobs = [];
			guilds.forEach((guild, guildID) => {
				jobs.push(postGuildCommand(commandName, guildID));
			});
			return Promise.all(jobs);
		});
}

function upsertAllGuildCommand(commandName) {
	return getCommand(commandName)
		.then(commands => {
			const jobs = [];
			commands.forEach((command, guildID) => {
				jobs.push(postGuildCommand(commandName, guildID));
			});
			return Promise.all(jobs);
		});
}

function init() {
	return ((method, commandName, guildID) => {
		if (!method) {
			return getAllGuildCommands();
		} else {
			if (method === 'get') {
				if (!commandName) {
					return getAllGuildCommands();
				} else if (commandName.match(/\d{18}/)) {
					guildID = commandName;
					return getGuildCommands(guildID);
				} else if (commandName.match(/^appid$/i)) {
					return getAppID();
				} else if (commandName.match(/^guilds$/i)) {
					return getGuilds();
				} else {
					return getGuildCommand(commandName, guildID);
				}
			} else if (method === 'post' || method === 'update') {
				if (!guildID) {
					if (method === 'post') {
						return postAllGuildCommand(commandName);
					} else {
						return upsertAllGuildCommand(commandName);
					}
				} else {
					return postGuildCommand(commandName, guildID);
				}
			} else {
				return Promise.resolve('Invalid method');
			}
		}
	})(...arguments)
		.then(response => {
			if (typeof response !== 'array') response = [ response ];
			response.forEach(data => {
				if (data.errors) console.error(data.errors);
				print(data);
			});
		});
}

init(...process.argv);
