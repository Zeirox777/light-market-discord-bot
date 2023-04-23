const { SlashCommandBuilder , PermissionsBitField } = require('discord.js');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
      .setName('edit-closed')
      .setDescription("Modifer la catégorie des tickets fermés !")
      .addStringOption(option =>
        option
        .setName('id')
        .setDescription('ID de la catégorie des tickets fermés !')
        .setRequired(true)),
    async execute(interaction) {
        const permissions = interaction.channel.permissionsFor(interaction.user);
        if(permissions.has(PermissionsBitField.Flags.Administrator)) {
            const closedCategoryId = interaction.options.getString('id');
            let configData = fs.readFileSync('commands/tickets/config-ticket.json');
            configData = JSON.parse(configData);
            configData.closedCategory = closedCategoryId.toString();
            fs.writeFileSync('commands/tickets/config-ticket.json', JSON.stringify(configData));
            await interaction.reply({content :`La catégorie des tickets fermés a été mise à jour avec succès avec l'ID ${openedCategoryId} !`, ephemeral: true});
        } else {
            await interaction.reply({content:"Vous n'avez pas la permission d'utiliser cette commande !", ephemeral:true})
        }
    }
}