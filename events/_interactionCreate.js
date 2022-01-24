import { client } from '../discord.js';
import { debug, print } from '../utils.js';

const error = debug('sir-ardbot:discord-interaction', 'error');

export default {
	name: 'interactionCreate',
	execute(interaction) {
		if (!interaction.isCommand())
			return false;

		const command = client.commands.get(interaction.commandName);

		if (!command)
			return false;

		command.execute(interaction)
			.catch(error => {
				console.error(error);
				interaction.reply({ content: 'error', ephemeral: true });
			});
	}
}