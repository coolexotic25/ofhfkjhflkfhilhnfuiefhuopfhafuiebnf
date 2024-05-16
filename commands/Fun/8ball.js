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
        .setName('8ball')
        .setDescription('Ask the bot a question')
        .addStringOption(option => option.setName('question').setDescription('The question to ask the bot').setRequired(true)),
    async execute(interaction, client) {
        try {
            let replies = lang.EightBallReplies;
            let result = Math.floor((Math.random() * replies.length));
            let question = interaction.options.getString("question");

            let ballembed = new EmbedBuilder()
                .setColor(config.EmbedColors)
                .setTitle('🔮 8Ball')
                .addFields([
                    { name: 'Question', value: question },
                    { name: 'Answer', value: replies[result] },
                ])
                .setFooter({ text: `Magic Ball`, iconURL: interaction.user.avatarURL() })
                .setTimestamp();

            interaction.reply({ embeds: [ballembed] });

        } catch (error) {
            console.error("Error in 8ball command: ", error);
            interaction.reply({ content: 'Sorry, there was an error processing your question.', ephemeral: true });
        }
    }
};