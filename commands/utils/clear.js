const { SlashCommandBuilder , PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clear des messages')
        .addNumberOption(option =>
            option
            .setName('count')
            .setDescription('Nombre de message à supprimer')
            .setRequired(true)),
    async execute(interaction) {
        const permissions = interaction.channel.permissionsFor(interaction.user);
        if(permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            const count = interaction.options.getNumber('count');
            if (count > 100) {
                interaction.reply({ content: ":x: " + "| Erreur ! Vous ne pouvez supprimer que entre 2 et 100 messages à la fois !",  ephemeral: true })
            } else if (count < 2) {
                interaction.reply({ content: ":x: " + "| Erreur ! Vous ne pouvez supprimer que entre 2 et 100 messages à la fois !",  ephemeral: true })
            } else {} { 
                interaction.channel.messages.fetch({ limit: count })
                    .then(messages => {
                    interaction.channel.bulkDelete(messages)
                    interaction.reply({ content: `${count} messages ont été supprimé !`, ephemeral: true })
                })
            }
        } else {
            await interaction.reply({content:"Vous n'avez pas la permission d'utiliser cette commande !", ephemeral:true})
        }
    }
}