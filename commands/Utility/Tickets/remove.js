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
        .setName('remove')
        .setDescription(`Remove a user from a ticket`)
        .addUserOption(option => option.setName('user').setDescription('The user to add to the ticket').setRequired(true)),
    async execute(interaction, client) {
        if(config.TicketSettings.Enabled === false) return interaction.reply({ content: "This command has been disabled in the config!", ephemeral: true })
        if(!interaction.channel.name.startsWith(`ticket-`)) return interaction.reply({ content: lang.NotInTicketChannel, ephemeral: true  })

        let user = interaction.options.getUser("user");
        interaction.channel.permissionOverwrites.create(user, {
            SendMessages: false,
            ViewChannel: false,
            ReadMessageHistory: false
        });

        let logsChannel = interaction.guild.channels.cache.get(config.TicketSettings.LogsChannelID);
        const log = new Discord.EmbedBuilder()
        .setColor(config.ErrorEmbedColor)
        .setTitle(lang.TicketLogUserRemoveEmbedTitle)
        .setDescription(`**${lang.TicketLogUser}** - ${message.author}\n**${lang.TicketLogTicket}** - ${message.channel.name}\n**${lang.TicketLogRemoved}** - ${aUser}`)
        .setTimestamp(message.createdAt)

        let ticketRemoveMsgVariable = lang.TicketUserRemoved.replace(/{user}/g, `${aUser}`).replace(/{user-tag}/g, `${aUser.username}`)
        const embed = new Discord.EmbedBuilder()
        .setColor(config.ErrorEmbedColor)
        .setDescription(ticketRemoveMsgVariable)
    
        interaction.reply({ embeds: [embed] })
        if(logsChannel) return logsChannel.send({ embeds: [log] })

    }

}