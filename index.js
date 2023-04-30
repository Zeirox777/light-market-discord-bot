const fs = require('node:fs');
const path = require('node:path');
const {
	Client,
	Collection,
	Events,
	GatewayIntentBits,
	PermissionsBitField,
	EmbedBuilder,
	ActionRowBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	ButtonStyle,
	ButtonBuilder
} = require('discord.js');
const { token } = require('./config.json');
const { openedCategory } = require('./commands/tickets/config-ticket.json');
const { COLLECTION_FORMATS } = require('openai/dist/base');
const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});
client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

const catalogue = JSON.parse(fs.readFileSync('./catalogue/catalogue.json'));

const categories = [...new Set(catalogue.map((element) => element.category))];

let quantity;

let panier = [];
let ticketsOuverts = [];

module.exports.commande = async function commande(interaction, channelU) {
	const categoryMenu = new StringSelectMenuBuilder()
		.setCustomId('catalogue-category-menu')
		.setPlaceholder('Sélectionnez une catégorie')
		.addOptions(categories.map((category) => {
			return {
				label: category,
				value: category
			};
		}));

	const embedCategory = new EmbedBuilder()
		.setTitle('Catalogue')
		.setDescription('Sélectionnez une catégorie pour voir les articles correspondants')
		.setColor('#0099ff');

	const rowCategory = new ActionRowBuilder()
		.addComponents(categoryMenu);

	const messageCategory = await channelU.send({
		embeds: [embedCategory],
		components: [rowCategory],
	});

	const articleMenu = new StringSelectMenuBuilder()
		.setCustomId('catalogue-article-menu')
		.setPlaceholder('Sélectionnez un article');

	const collector = messageCategory.createMessageComponentCollector({
		filter: (interaction) => interaction.user.id,
		time: 120000
	});

	collector.on('collect', async (interactionMenu) => {
		if (interactionMenu.customId === 'catalogue-category-menu') {
			const selectedCategory = interactionMenu.values[0];
			const selectedArticles = catalogue.filter(article => article.category === selectedCategory);

			selectedArticles.forEach((article) => {
				articleMenu.addOptions(
					new StringSelectMenuOptionBuilder()
					.setLabel(`${article.name} (${article.price}$/u)`)
					.setValue(article.name)
				);
			});

			const articleRow = new ActionRowBuilder()
				.addComponents(articleMenu);

			const newEmbed = new EmbedBuilder()
				.setTitle(selectedCategory)
				.setDescription('Sélectionnez un article pour le commander')
				.setColor('#0099ff')

			await interactionMenu.update({
				embeds: [newEmbed],
				components: [articleRow]
			});
		} else if (interactionMenu.customId === 'catalogue-article-menu') {
			const selectedArticle = catalogue.find(article => article.name === interactionMenu.values[0]);

			const quantityEmbed = new EmbedBuilder()
				.setTitle('Confirmation de commande')
				.setDescription(`Combien de **${selectedArticle.name}** voulez-vous commander ?`)
				.setColor('#0099ff');

			const quantityMessage = await interactionMenu.update({
				embeds: [quantityEmbed],
				components: []
			});
			const messageCollector = await channelU.createMessageCollector({
				filter: (msg) => msg.author.id === interaction.user.id,
				time: 120000,
				max: 1,
			});
			await new Promise((resolve) => {
				messageCollector.on('collect', (msg) => {
					quantity = msg
                    msg.delete()
                    quantityMessage.delete()
					resolve();
				});
				messageCollector.on('end', collected => {
					channelU.send("Cette commande a été fermé pour inactivité de la part du client ! Veuillez effecture la commande **/close** afin d'ouvrir une nouvelle commande par la suite !")
					resolve();
				});
			});
			const confirmAddEmbed = new EmbedBuilder()
				.setTitle("Confirmation")
				.setDescription(`Voulez-vous vraiment ajouter **${quantity.content}x ${selectedArticle.name}** à votre panier ?`);

			const confirmButton = new ButtonBuilder()
				.setLabel("Confirmer l'ajout !")
				.setCustomId('confirm')
				.setStyle(ButtonStyle.Success);

			const cancelButton = new ButtonBuilder()
				.setLabel("Annuler l'ajout !")
				.setCustomId('cancel')
				.setStyle(ButtonStyle.Secondary);

			const confirmRaw = new ActionRowBuilder()
				.addComponents(confirmButton, cancelButton);

			const confirmMessage = await channelU.send({
				embeds: [confirmAddEmbed],
				components: [confirmRaw]
			})

			const collector = confirmMessage.createMessageComponentCollector({
				filter: (interaction) => interaction.user.id,
				time: 120000
			});

			collector.on('collect', async (interactionButton) => {
                const redoYesButton = new ButtonBuilder()
				    .setLabel("Oui !")
				    .setCustomId('yes')
				    .setStyle(ButtonStyle.Success);

			    const redoNoButton = new ButtonBuilder()
				    .setLabel("Non !")
				    .setCustomId('no')
				    .setStyle(ButtonStyle.Danger);

			    const redoRaw = new ActionRowBuilder()
				    .addComponents(redoYesButton, redoNoButton);
				if (interactionButton.customId === 'confirm') {
					const command = {
						article: selectedArticle.name,
						quantity: parseInt(quantity.content),
						price: selectedArticle.price,
                        id: interactionButton.user.id
					};
					panier.push(command);
					const confirmationEmbed = new EmbedBuilder()
						.setTitle('Confirmation')
						.setDescription(`La commande de **${quantity.content}x ${selectedArticle.name}** a été ajoutée à votre panier ! Voulez-vous rajouter un autre article ?`)
						.setColor('#0099ff');

					await interactionButton.update({
						embeds: [confirmationEmbed],
						components: [redoRaw]
					});
				} else if (interactionButton.customId === 'cancel') {
					const cancellationEmbed = new EmbedBuilder()
						.setTitle('Annulation')
						.setDescription(`La commande de **${quantity.content}x ${selectedArticle.name}** n'a pas été ajoutée à votre panier. Voulez-vous rajouter un autre article ?`)
						.setColor('#0099ff');

					await interactionButton.update({
						embeds: [cancellationEmbed],
						components: [redoRaw]
					});
				} else if (interactionButton.customId === 'yes') {
                    await interactionButton.update({
                        content: "Article ajouté !",
						embeds: [],
						components: []
					});
                    commande(interactionButton,channelU);
                } else if (interactionButton.customId === 'no') {
                    const panierFields = [];
                    let total = 0;
                    for (const item of panier) {
                        if(item.id === interactionButton.user.id) {
                            const subtotal = item.quantity * item.price;
                            total += subtotal;
                            panierFields.push({
                                name: `${item.quantity} x ${item.article}`,
                                value: `${subtotal}$`
                            });
                            panier = panier.filter((item) => item.id !== interactionButton.user.id)
                        }
                    }
                    const embedPanier = new EmbedBuilder()
                        .setTitle('Récapitulatif')
                        .setColor('#0099ff')
                        .addFields(...panierFields,
                            {name: 'Total :', value: `${total}$`}    
                        )
                    interactionButton.update({
                        embeds: [embedPanier],
                        components: []
                    })
                }
			});
			collector.on('end', collected => {
				channelU.send("Cette commande a été fermé pour inactivité de la part du client ! Veuillez effecture la commande **/close** afin d'ouvrir une nouvelle commande par la suite !")
			});
		}
	})
	collector.on('end', collected => {
		channelU.send("Cette commande a été fermé pour inactivité de la part du client ! Veuillez effecture la commande **/close** afin d'ouvrir une nouvelle commande par la suite !")
	});
}

async function commande(interaction, channelU) {
	const categoryMenu = new StringSelectMenuBuilder()
		.setCustomId('catalogue-category-menu')
		.setPlaceholder('Sélectionnez une catégorie')
		.addOptions(categories.map((category) => {
			return {
				label: category,
				value: category
			};
		}));

	const embedCategory = new EmbedBuilder()
		.setTitle('Catalogue')
		.setDescription('Sélectionnez une catégorie pour voir les articles correspondants')
		.setColor('#0099ff');

	const rowCategory = new ActionRowBuilder()
		.addComponents(categoryMenu);

	const messageCategory = await channelU.send({
		embeds: [embedCategory],
		components: [rowCategory],
	});

	const articleMenu = new StringSelectMenuBuilder()
		.setCustomId('catalogue-article-menu')
		.setPlaceholder('Sélectionnez un article');

	const collector = messageCategory.createMessageComponentCollector({
		filter: (interaction) => interaction.user.id,
		time: 120000
	});

	collector.on('collect', async (interactionMenu) => {
		if (interactionMenu.customId === 'catalogue-category-menu') {
			const selectedCategory = interactionMenu.values[0];
			const selectedArticles = catalogue.filter(article => article.category === selectedCategory);

			selectedArticles.forEach((article) => {
				articleMenu.addOptions(
					new StringSelectMenuOptionBuilder()
					.setLabel(`${article.name} (${article.price}$/u)`)
					.setValue(article.name)
				);
			});

			const articleRow = new ActionRowBuilder()
				.addComponents(articleMenu);

			const newEmbed = new EmbedBuilder()
				.setTitle(selectedCategory)
				.setDescription('Sélectionnez un article pour le commander')
				.setColor('#0099ff')

			await interactionMenu.update({
				embeds: [newEmbed],
				components: [articleRow]
			});
		} else if (interactionMenu.customId === 'catalogue-article-menu') {
			const selectedArticle = catalogue.find(article => article.name === interactionMenu.values[0]);

			const quantityEmbed = new EmbedBuilder()
				.setTitle('Confirmation de commande')
				.setDescription(`Combien de **${selectedArticle.name}** voulez-vous commander ?`)
				.setColor('#0099ff');

			const quantityMessage = await interactionMenu.update({
				embeds: [quantityEmbed],
				components: []
			});
			const messageCollector = await channelU.createMessageCollector({
				filter: (msg) => msg.author.id === interaction.user.id,
				time: 120000,
				max: 1,
			});
			await new Promise((resolve) => {
				messageCollector.on('collect', (msg) => {
					quantity = msg
                    msg.delete()
                    quantityMessage.delete()
					resolve();
				});
				messageCollector.on('end', collected => {
					channelU.send("Cette commande a été fermé pour inactivité de la part du client ! Veuillez effecture la commande **/close** afin d'ouvrir une nouvelle commande par la suite !")
					resolve();
				});
			});
			const confirmAddEmbed = new EmbedBuilder()
				.setTitle("Confirmation")
				.setDescription(`Voulez-vous vraiment ajouter **${quantity.content}x ${selectedArticle.name}** à votre panier ?`);

			const confirmButton = new ButtonBuilder()
				.setLabel("Confirmer l'ajout !")
				.setCustomId('confirm')
				.setStyle(ButtonStyle.Success);

			const cancelButton = new ButtonBuilder()
				.setLabel("Annuler l'ajout !")
				.setCustomId('cancel')
				.setStyle(ButtonStyle.Secondary);

			const confirmRaw = new ActionRowBuilder()
				.addComponents(confirmButton, cancelButton);

			const confirmMessage = await channelU.send({
				embeds: [confirmAddEmbed],
				components: [confirmRaw]
			})

			const collector = confirmMessage.createMessageComponentCollector({
				filter: (interaction) => interaction.user.id,
				time: 120000
			});

			collector.on('collect', async (interactionButton) => {
                const redoYesButton = new ButtonBuilder()
				    .setLabel("Oui !")
				    .setCustomId('yes')
				    .setStyle(ButtonStyle.Success);

			    const redoNoButton = new ButtonBuilder()
				    .setLabel("Non !")
				    .setCustomId('no')
				    .setStyle(ButtonStyle.Danger);

			    const redoRaw = new ActionRowBuilder()
				    .addComponents(redoYesButton, redoNoButton);
				if (interactionButton.customId === 'confirm') {
					const command = {
						article: selectedArticle.name,
						quantity: parseInt(quantity.content),
						price: selectedArticle.price,
                        id: interactionButton.user.id
					};
					panier.push(command);
					const confirmationEmbed = new EmbedBuilder()
						.setTitle('Confirmation')
						.setDescription(`La commande de **${quantity.content}x ${selectedArticle.name}** a été ajoutée à votre panier ! Voulez-vous rajouter un autre article ?`)
						.setColor('#0099ff');

					await interactionButton.update({
						embeds: [confirmationEmbed],
						components: [redoRaw]
					});
				} else if (interactionButton.customId === 'cancel') {
					const cancellationEmbed = new EmbedBuilder()
						.setTitle('Annulation')
						.setDescription(`La commande de **${quantity.content}x ${selectedArticle.name}** n'a pas été ajoutée à votre panier. Voulez-vous rajouter un autre article ?`)
						.setColor('#0099ff');

					await interactionButton.update({
						embeds: [cancellationEmbed],
						components: [redoRaw]
					});
				} else if (interactionButton.customId === 'yes') {
                    await interactionButton.update({
                        content: "Article ajouté !",
						embeds: [],
						components: []
					});
                    commande(interactionButton,channelU);
                } else if (interactionButton.customId === 'no') {
                    const panierFields = [];
                    let total = 0;
                    for (const item of panier) {
                        if(item.id === interactionButton.user.id) {
                            const subtotal = item.quantity * item.price;
                            total += subtotal;
                            panierFields.push({
                                name: `${item.quantity} x ${item.article}`,
                                value: `${subtotal}$`
                            });
                            panier = panier.filter((item) => item.id !== interactionButton.user.id)
                        }
                    }
                    const embedPanier = new EmbedBuilder()
                        .setTitle('Récapitulatif')
                        .setColor('#0099ff')
                        .addFields(...panierFields,
                            {name: 'Total :', value: `${total}$`}    
                        )
                    interactionButton.update({
                        embeds: [embedPanier],
                        components: []
                    })
                }
			});
			collector.on('end', collected => {
				channelU.send("Cette commande a été fermé pour inactivité de la part du client ! Veuillez effecture la commande **/close** afin d'ouvrir une nouvelle commande par la suite !")
			});
		}
	})
	collector.on('end', collected => {
		channelU.send("Cette commande a été fermé pour inactivité de la part du client ! Veuillez effecture la commande **/close** afin d'ouvrir une nouvelle commande par la suite !")
	});
}

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

client.once(Events.ClientReady, () => {
	console.log('Ready!');
});

client.on('channelDelete', channel => {
	const member = channel.guild.members.cache.get(channel.topic);
	if (member && channel.parent.id === openedCategory) {
		const userId = channel.topic;
        let data = fs.readFileSync('commands/tickets/ticket-opened.json');
        let userIds = JSON.parse(data);
        if (userIds.includes(userId)) {
            userIds = userIds.filter(id => id !== userId);
            fs.writeFileSync('commands/tickets/ticket-opened.json', JSON.stringify(userIds));
        } 
    }
});

client.on('interactionCreate', async interaction => {
	if (interaction.customId == 'ouvrir_commande') {
		const userId = interaction.user.id;
        let data = fs.readFileSync('commands/tickets/ticket-opened.json');
        let userIds = JSON.parse(data);
		if (!userIds.includes(userId)) {
			try {
				const channelCreated = await interaction.guild.channels.create({
					name: "commande-" + interaction.user.username,
					type: 0,
					permissionOverwrites: [{
					id: interaction.guild.id,
					deny: [PermissionsBitField.Flags.ViewChannel],
					},
					{
					id: interaction.user.id,
					allow: [PermissionsBitField.Flags.ViewChannel],
					}, ],
            		parent: openedCategory,
				})
				channelCreated.send(`${interaction.user}, Passez votre commande ici !`)
        		channelCreated.setTopic(interaction.user.id,)
        		if (!userIds.includes(userId)) {
            		userIds.push(userId);
        		}
        		fs.writeFileSync('commands/tickets/ticket-opened.json', JSON.stringify(userIds));
				interaction.reply({
					content: `Votre commande a été ouverte ! ${channelCreated}`,
					ephemeral: true
				});
				commande(interaction, channelCreated)
			} catch (e) {
				interaction.reply({
					content:"La catégorie des tickets ouverts spécifié n'est pas valide !",
					ephemeral:true
				})
			}
		
	} else if (userIds.includes(userId)) {
		interaction.reply({content: "Vous avez déjà une commande ouverte !", ephemeral: true})
	}
	}
});
client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;
	const command = client.commands.get(interaction.commandName);
	if (!command) return;
	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({
				content: 'Il y a eu une erreur lors de l\'execution de la commande !',
				ephemeral: true
			});
		} else {
			await interaction.reply({
				content: 'Il y a eu une erreur lors de l\'execution de la commande !',
				ephemeral: true
			});
		}
	}
});
client.login(token);