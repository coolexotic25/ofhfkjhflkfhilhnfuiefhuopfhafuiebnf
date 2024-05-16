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
        .setName('avatar')
        .setDescription('Get a user\'s avatar')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to get the avatar from')
                .setRequired(false)), 
    async execute(interaction) {
        try {
            const user = interaction.options.getUser('user') || interaction.user;
            const avatarUrl = user.displayAvatarURL({ format: 'png', dynamic: true, size: 1024 });

            const embed = new EmbedBuilder()
                .setImage(avatarUrl)
                .setColor(config.EmbedColors)
                .setTitle(`${user.username}'s Avatar`)
                .setFooter({ text: `${lang.AvatarSearchedBy} ${interaction.user.username}` })
                .setDescription(`[${lang.AvatarClickHere}](${avatarUrl})`);

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error("Error in avatar command: ", error);
            await interaction.reply({ content: 'Sorry, there was an error processing your request.', ephemeral: true });
        }
    },
};