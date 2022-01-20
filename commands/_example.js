export const data = {
	name: 'wb',
	description: 'Search bottles on whiskybase.com',
	options: [{
		name: 'query',
		type: 3,
		description: 'Whiskybase.com bottle id',
		required: true,
		autocomplete: false
	}]
}

export function execute(interaction) {
	if (interaction.commandName == 'wb') {
		const query = interaction.options.getString('query');

		if (query.match(/^\d+$/)) {
			interaction.reply(`Perhaps this is [the bottle](https://www.whiskybase.com/whiskies/whisky/${query}) you are looking for?`);
		} else {
			interaction.reply({ content: 'Sorry chap, but for the time I only accept `/wb <WBID>` query', ephemeral: true });
		}
	}
}
