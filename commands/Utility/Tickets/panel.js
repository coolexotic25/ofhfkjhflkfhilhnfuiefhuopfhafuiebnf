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
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const yaml = require("js-yaml");
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
const lang = yaml.load(fs.readFileSync('./lang.yml', 'utf8'));

function isValidHttpUrl(string) {
    let url;
    try {
        url = new URL(string);
    } catch (_) {
        return false;
    }
    return url.protocol === "http:" || url.protocol === "https:";
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('panel')
        .setDescription(`Send the ticket panel`),
    async execute(interaction) {
        if (config.TicketSettings.Enabled === false) return interaction.reply({ content: "This command has been disabled in the config!", ephemeral: true });
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: lang.NoPermsMessage, ephemeral: true });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('ticketcreate')
                    .setEmoji(config.TicketPanelSettings.ButtonEmoji)
                    .setLabel(config.TicketPanelSettings.ButtonName)
                    .setStyle(config.TicketPanelSettings.ButtonColor)
            );

        const ticketEmbed = new EmbedBuilder()
            .setDescription(config.TicketPanelSettings.PanelMessage)
            .setColor(config.EmbedColors)
            .setTimestamp();

        if (isValidHttpUrl(config.TicketPanelSettings.AuthorIconURL)) {
            ticketEmbed.setAuthor({ name: config.TicketPanelSettings.PanelAuthor, iconURL: config.TicketPanelSettings.AuthorIconURL });
        }

        if (isValidHttpUrl(config.TicketPanelSettings.ThumbnailURL)) {
            ticketEmbed.setThumbnail(config.TicketPanelSettings.ThumbnailURL);
        }

        if (isValidHttpUrl(config.TicketPanelSettings.PanelImageURL)) {
            ticketEmbed.setImage(config.TicketPanelSettings.PanelImageURL);
        }

        if (config.TicketPanelSettings.FooterText && isValidHttpUrl(config.TicketPanelSettings.FooterIconURL)) {
            ticketEmbed.setFooter({ text: config.TicketPanelSettings.FooterText, iconURL: config.TicketPanelSettings.FooterIconURL });
        }

        interaction.reply({ content: `You successfully sent the ticket panel to this channel!`, ephemeral: true });
        interaction.channel.send({ embeds: [ticketEmbed], components: [row] });
    }
};