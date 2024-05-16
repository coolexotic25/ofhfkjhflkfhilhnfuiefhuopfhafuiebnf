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
const Discord = require("discord.js")
const fs = require('fs');
const yaml = require("js-yaml")
const config = yaml.load(fs.readFileSync('././config.yml', 'utf8'))
const lang = yaml.load(fs.readFileSync('././lang.yml', 'utf8'))

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription(`Create a poll for users to vote on`)
        .addStringOption(option => option.setName('question').setDescription('The poll question').setRequired(true)),
    async execute(interaction, client) {
        const requiredRoles = config.ModerationRoles.poll;
        if (!requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId))) {
            return interaction.reply({ content: lang.NoPermsMessage, ephemeral: true });
        }

        let question = interaction.options.getString("question");

        var userIcon = interaction.user.displayAvatarURL({ format: 'png', dynamic: true, size: 1024 });
        const pollembed = new Discord.EmbedBuilder()
            .setTitle(lang.PollEmbedTitle)
            .setColor(config.EmbedColors)
            .setDescription(question)
            .setFooter({ text: `${lang.PollEmbedFooter} ${interaction.user.username}`, iconURL: `${userIcon}` })

        interaction.reply({ embeds: [pollembed], fetchReply: true }).then(function (message) {
            message.react("👍")
            message.react("👎")
        }).catch(function () {
        });
    }
}