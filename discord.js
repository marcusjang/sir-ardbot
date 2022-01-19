import { Client, Intents } from 'discord.js';

export const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

export function login(token) {
	return new Promise((resolve) => {
		if (typeof token !== 'string' || token.length === 0)
			token = process.env.DISCORD_TOKEN;

		client.login(token);
		
		client.on('interactionCreate', (interaction) => {
			if (!interaction.isCommand())
				return false;

			const command = client.commands.get(interaction.commandName);

			if (!command)
				return false;

			command.execute(interaction)
				.catch(error => {
					console.error(error);
					interaction.reply({ content: 'error', ephemeral: true });
				})
		});

		client.on('ready', resolve);
	});
}