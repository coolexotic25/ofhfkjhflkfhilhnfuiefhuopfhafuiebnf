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

const { SlashCommandBuilder } = require('@discordjs/builders');
const fetch = require('node-fetch');
const { EmbedBuilder } = require('discord.js');  

module.exports = {
    data: new SlashCommandBuilder()
        .setName('duck')
        .setDescription('Gets a random duck picture!'),
    async execute(interaction, client) {
        try {
            await interaction.deferReply();
            const response = await fetch('https://random-d.uk/api/v2/random');
            const data = await response.json();
            const duckImageUrl = data.url;

            const embed = new EmbedBuilder()
                .setImage(duckImageUrl)
                .setColor('#000000'); 

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({ content: 'ccouldnt get a duck' });
        }
    }
};