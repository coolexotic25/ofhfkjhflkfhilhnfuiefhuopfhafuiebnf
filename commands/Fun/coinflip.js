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

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription(`Flip a coin`),
    async execute(interaction, client) {
        try {
        let coinFlipTitle = lang.CoinflipMsg.replace(/{user-tag}/g, `${interaction.user.username}`);
        let coinFlipDesc = lang.CoinflipDone.replace(/{result}/g, `${Math.random() > 0.5 ? 'Heads' : 'Tails'}`);
        let embed = new Discord.EmbedBuilder()
        .setAuthor({ name: `${coinFlipTitle}`, iconURL: `${interaction.user.displayAvatarURL({ format: 'png', dynamic: true, size: 1024 })}` })
        .setColor(config.EmbedColors)  
        .setDescription(coinFlipDesc)
        .setTimestamp()
        interaction.reply({ embeds: [embed] })
        } catch (error) {
            console.error("Error in coinflip command: ", error);
            interaction.reply({ content: 'Sorry, there was an error flipping the coin.' });
        }
    }
}