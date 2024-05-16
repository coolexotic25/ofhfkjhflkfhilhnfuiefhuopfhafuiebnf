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
const Discord = require ("discord.js")
const fs = require('fs');
const yaml = require("js-yaml")
const config = yaml.load(fs.readFileSync('././config.yml', 'utf8'))
const lang = yaml.load(fs.readFileSync('././lang.yml', 'utf8'))
const fetch = require('node-fetch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fact')
        .setDescription(`Get a random general fact`),
    async execute(interaction, client) {
        try {
            await interaction.deferReply({ ephemeral: false });
            let infoWeb = await fetch(`https://api.popcat.xyz/fact`);
            let randomFact = await infoWeb.json();
            interaction.editReply({ content: `**🎲 RANDOM FACT**\n${randomFact.fact}` });
        } catch (error) {
            console.error("Error fetching random fact: ", error);
            interaction.editReply({ content: 'Sorry, I couldn\'t fetch a fact at the moment.' });
        }
    }
}