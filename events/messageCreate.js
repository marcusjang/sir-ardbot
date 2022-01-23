export default {
	name: 'messageCreate',
	execute(message) {
		if (message.content.match(/whiskybase\.com/i) && message.embeds.length > 0) {
				const [ embed ] = message.embeds;
				message.suppressEmbeds(true);
				message.reply({
					embeds: [{
						color: 0x588699,
						url: embed.url,
						image: {
							url: embed.thumbnail.proxyURL,
							height: 1200,
							width: 630
						},
						author: {
							name: 'Whiskybase - Ratings and reviews for whisky',
							url: embed.url,
							icon_url: 'https://assets.whiskybase.com/images/logos/icons/base/apple-touch-icon.png?v4'
						}
					}]
				});
			}
	}
}