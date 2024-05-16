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
const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const fetch = require('node-fetch');

const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
const lang = yaml.load(fs.readFileSync('./lang.yml', 'utf8'));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cat')
        .setDescription('Get a random picture of a cat'),
    async execute(interaction, client) {
        try {
            await interaction.deferReply();
            const infoWeb = await fetch('http://edgecats.net/random');
            const catimg = await infoWeb.text();

            const embed = new EmbedBuilder()
                .setImage(catimg)
                .setColor(config.EmbedColors);

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("Error fetching cat image: ", error);
            await interaction.editReply({ content: "Couldn't fetch a cat image at the moment." });
        }
    }
};