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

const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const yaml = require("js-yaml")
const lang = yaml.load(fs.readFileSync('././lang.yml', 'utf8'))

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roll')
        .setDescription('Rolls a dice up to the specified number.')
        .addIntegerOption(option =>
            option.setName('max')
                .setDescription('Maximum number to roll up to (default is 6)')
                .setRequired(false)),
    async execute(interaction) {
        const maxNumber = interaction.options.getInteger('max_number') || 10;
        const safeMaxNumber = Math.max(1, maxNumber);
        const rollResult = Math.floor(Math.random() * safeMaxNumber) + 1;

        const rollMessageTemplate = lang.Roll;
        const rollMessage = rollMessageTemplate.replace('${rollResult}', rollResult);

        await interaction.reply(rollMessage);
    },
};
