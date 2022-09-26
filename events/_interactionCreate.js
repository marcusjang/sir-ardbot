import { client } from '../discord.js';
import { debug, print, delay } from '../utils.js';

const error = debug('sir-ardbot:discord-interaction', 'error');

export default {
	name: 'interactionCreate',
	async execute(interaction) {
		if (interaction.isCommand()) {
			const command = client.commands.get(interaction.commandName);

			if (!command)
				return false;

			try {
				command.execute(interaction)
			} catch(error) {
				console.error(error);
				interaction.reply({ content: 'error', ephemeral: true });
			}
		}
	}
}
