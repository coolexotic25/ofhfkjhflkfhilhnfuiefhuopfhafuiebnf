/*
  _____            _           ____        _   
 |  __ \          | |         |  _ \      | |  
 | |  | |_ __ __ _| | _____   | |_) | ___ | |_ 
 | |  | | '__/ _` | |/ / _ \  |  _ < / _ \| __|
 | |__| | | | (_| |   < (_) | | |_) | (_) | |_ 
 |_____/|_|  \__,_|_|\_\___/  |____/ \___/ \__|
                                             
                                        
 Thank you for choosing Drako Bot!

 Should you encounter any issues, require assistance, or have suggestions for improving the bot,
 we invite you to connect with us on our Discord server and create a support ticket: 

 http://discord.drakodevelopment.net
 
*/

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
const lang = yaml.load(fs.readFileSync('./lang.yml', 'utf8'));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('banner')
        .setDescription('Get a user\'s banner')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to get the banner from')
                .setRequired(false)),
    async execute(interaction) {
        try {
            const user = interaction.options.getUser('user') || interaction.user;

            const fullUser = await interaction.client.users.fetch(user.id, { force: true });

            const bannerUrl = fullUser.bannerURL({ format: 'png', dynamic: true, size: 1024 });

            if (bannerUrl) {
                const embed = new EmbedBuilder()
                    .setImage(bannerUrl)
                    .setColor(config.EmbedColors)
                    .setTitle(`${fullUser.username}'s Banner`)
                    .setFooter({ text: `${lang.BannerSearchedBy} ${interaction.user.username}` })
                    .setDescription(`[${lang.BannerClickHere}](${bannerUrl})`);

                await interaction.reply({ embeds: [embed] });
            } else {
                await interaction.reply({ content: lang.NoBannerSet, ephemeral: true });
            }
        } catch (error) {
            console.error("Error in banner command: ", error);
            await interaction.reply({ content: 'Sorry, there was an error processing your request.', ephemeral: true });
        }
    },
};