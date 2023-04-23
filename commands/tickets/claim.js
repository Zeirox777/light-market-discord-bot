const { SlashCommandBuilder , PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
      .setName('claim')
      .setDescription("Définir la commande comme prise !"),
    async execute(interaction) {
        const permissions = interaction.channel.permissionsFor(interaction.user);
        if(permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            const member = interaction.guild.members.cache.get(interaction.channel.topic);
            if (!member) {
                interaction.reply({content: 'Ce salon n\'est pas une commande !', ephemeral: true});
            } else if (member) {
                interaction.reply({content: 'Vous avez claim cette commande, bonne chance à vous !', ephemeral: true})
                const embedClaim = new EmbedBuilder()
                    .setTitle(`Votre commande va être traité par ${interaction.user.tag} !`)
                interaction.channel.send({content: `${member}`,embeds: [embedClaim]})
            }
        } else {
            await interaction.reply({content:"Vous n'avez pas la permission d'utiliser cette commande !", ephemeral:true})
        }
    }
}