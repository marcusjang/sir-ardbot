import { delay } from '../utils.js';

export default {
	name: 'messageCreate',
	async execute(message) {
		if (message.content.match(/whiskybase\.com/i)) {
			if(message.embeds.length === 0) await delay(1500);

			if(message.embeds.length > 0) {
				const [ embed ] = message.embeds;
				message.suppressEmbeds(true);
				message.reply({
					allowedMentions: { repliedUser: false },
					embeds: [{
						color: 0x588699,
						url: embed.url,
						image: {
							url: embed.thumbnail.proxyURL,
							height: 1200,
							width: 630
						},
						author: {
							name: embed.title,
							url: embed.url,
							icon_url: 'https://assets.whiskybase.com/images/logos/icons/base/apple-touch-icon.png?v4'
						}
					}]
				});
			}
		}

	}
}