const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  SlashCommandBuilder,
  StringSelectMenuOptionBuilder
} = require('discord.js');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
      .setName('catalogue')
      .setDescription('Affiche le catalogue d\'articles'),
  async execute(interaction) {
      const catalogue = JSON.parse(fs.readFileSync('./catalogue/catalogue.json'));

      const categories = [...new Set(catalogue.map((element) => element.category))];

      const categoryMenu = new StringSelectMenuBuilder()
          .setCustomId('catalogue-category-menu')
          .setPlaceholder('Sélectionnez une catégorie')
          .addOptions(categories.map((category) => {
              return {
                  label: category,
                  value: category
              };
          }));

      const embed = new EmbedBuilder()
          .setTitle('Catalogue')
          .setDescription('Sélectionnez une catégorie pour voir les articles correspondants')
          .setColor('#0099ff')
          .addFields({
              name: 'Catégories',
              value: 'Sélectionnez une catégorie',
              inline: false
          });

      const row = new ActionRowBuilder()
          .addComponents(categoryMenu);

      const message = await interaction.reply({
          embeds: [embed],
          components: [row],
          ephemeral: true
      });

      const articleMenu = new StringSelectMenuBuilder()
          .setCustomId('catalogue-article-menu')
          .setPlaceholder('Sélectionnez un article');

      const collector = message.createMessageComponentCollector({
          filter: (interaction) => interaction.user.id,
          time: 60000
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
            console.log(selectedArticle)
      
            const confirmationEmbed = new EmbedBuilder()
                .setTitle('Confirmation de commande')
                .setDescription(`Combien de ${selectedArticle.name} voulez-vous commander ?`)
                .setColor('#0099ff');
      
            await interactionMenu.update({
                embeds: [confirmationEmbed],
                components: []
            });
            
            const messageCollector = interaction.channel.createMessageCollector({
              filter: (msg) => msg.author.id === interaction.user.id,
              time: 60000
            });

            messageCollector.on('collect', (msg) => {
              console.log(`Collected ${msg.content}`);
            });
          
          }
      });
  }
};