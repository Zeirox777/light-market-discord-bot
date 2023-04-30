const { SlashCommandBuilder , PermissionsBitField , ButtonBuilder , EmbedBuilder , ButtonStyle , ActionRowBuilder } = require('discord.js');
const { closedCategory , openedCategory } = require('./config-ticket.json');
const fs = require('fs');

const confirmButton = new ButtonBuilder()
	.setLabel("Confirmer")
	.setCustomId('confirm')
	.setStyle(ButtonStyle.Success);

const cancelButton = new ButtonBuilder()
	.setLabel("Annuler")
	.setCustomId('cancel')
	.setStyle(ButtonStyle.Secondary);

const confirmRaw = new ActionRowBuilder()
	.addComponents(confirmButton, cancelButton);

module.exports = {
    data: new SlashCommandBuilder()
      .setName('close')
      .setDescription("Fermer un ticket !"),
    async execute(interaction) {
        try {
        const permissions = interaction.channel.permissionsFor(interaction.user);
        if(interaction.channel.parent.id === openedCategory) {
        if(interaction.user.id === interaction.channel.topic || permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            const confirmAddEmbed = new EmbedBuilder()
	            .setTitle("Confirmation")
	            .setDescription(`Voulez vous vraiment fermer la commande : ${interaction.channel}`);
            const confirmMessage = await interaction.reply({
                embeds: [confirmAddEmbed],
                components: [confirmRaw],
                ephemeral: true
            })
            const collector = confirmMessage.createMessageComponentCollector({
				filter: (interactionButton) => interactionButton.user.id === interaction.user.id,
				time: 60000
			});
			collector.on('collect', async (interactionButton) => {
                if (interactionButton.customId === 'confirm') {
                    const userInteraction = await interaction.guild.members.fetch(interaction.channel.topic);
                    await interaction.channel.permissionOverwrites.set([
                        {
                        id: userInteraction.id,
				        deny: [PermissionsBitField.Flags.ViewChannel],
                        }
                    ])
                    await userInteraction.send("Votre commande a été fermée !")
                    try {
                        await interaction.channel.setParent(closedCategory);
                        interaction.user.send("Commande fermée avec succès !")
                        interactionButton.reply({
                        content:"Commande fermée avec succès !",
                        ephemeral: true})
                        const userId = interaction.channel.topic;
                        let data = fs.readFileSync('commands/tickets/ticket-opened.json');
                        let userIds = JSON.parse(data);
                        if (userIds.includes(userId)) {
                            userIds = userIds.filter(id => id !== userId);
                            fs.writeFileSync('commands/tickets/ticket-opened.json', JSON.stringify(userIds));
                        } 
                    return
                    } catch (e) {
                        interaction.reply({
                            content:"La catégorie des tickets fermés spécifié n'est pas valide !",
                            ephemeral:true
                        })
                    }
                    
                } else if (interactionButton.customId === 'cancel') {
                    interactionButton.reply({
                        content:"Fermeture annulée !",
                        ephemeral: true})
                    return
                }
            })
        }
    } else if (interaction.channel.parent.id === closedCategory) {
        interaction.reply({content: "Cette commande est déjà fermée !", ephemeral: true})
    } else {
        interaction.reply({content: "Ce salon n'est pas une commande ! Il se peut que la catégorie des tickets ouvert spécifié ne soit pas valide !", ephemeral: true})
    }
    } catch (e) {
        interaction.reply({
            content: `Il y a eu une erreur lors de l'execution de la commande ! Contactez un modérateur ! \n\n**Erreur** :\n\n${e}`,
            ephemeral:true
        })
    }
}
}