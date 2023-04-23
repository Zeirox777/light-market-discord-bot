const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { openedCategory } = require('./config-ticket.json');
const moduleCommande = require('../../index.js');
const fs = require('fs');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('open')
		.setDescription('Ouvrir un salon privé'),
	async execute(interaction) {
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
		const userId = interaction.user.id;
        let data = fs.readFileSync('commands/tickets/ticket-opened.json');
        let userIds = JSON.parse(data);
        if (!userIds.includes(userId)) {
            userIds.push(userId);
        }
        fs.writeFileSync('commands/tickets/ticket-opened.json', JSON.stringify(userIds));
		interaction.reply({
			content: `Votre commande a été ouverte ! ${channelCreated}`,
			ephemeral: true
		});
        moduleCommande.commande(interaction, channelCreated)
	},
};
