const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

const embedTicket = new EmbedBuilder()
  .setColor(0x0099FF)
  .setTitle('Passer Commande !')
  .setDescription("Utiliser le bouton si dessous pour ouvrir un ticket. Utilisez l'interface du bot pour passer votre commande !")
  .setFooter({ text: 'LightShop', iconURL: 'https://cdn.discordapp.com/attachments/1097125675208556564/1098233411824517170/IMG_0546.png' });

const confirm = new ButtonBuilder()
  .setCustomId('ouvrir_commande')
  .setLabel('Passer Commande !')
  .setStyle(ButtonStyle.Success);

const row = new ActionRowBuilder()
  .addComponents(confirm);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed-ticket')
    .setDescription("Publier l'embed pour créer un ticket"),
  async execute(interaction) {
    const message = await interaction.channel.send({ embeds: [embedTicket], components: [row] });
    interaction.reply({ content: 'Embed Publié !', ephemeral: true });
  },
};
