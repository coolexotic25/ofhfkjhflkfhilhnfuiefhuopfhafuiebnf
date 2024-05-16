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
const Discord = require("discord.js");
const fs = require('fs');
const yaml = require("js-yaml");
const config = yaml.load(fs.readFileSync('././config.yml', 'utf8'));
const lang = yaml.load(fs.readFileSync('././lang.yml', 'utf8'));
const moment = require('moment');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription(`Get detailed information about the server`),
    async execute(interaction, client) {
        try {
            const guild = interaction.guild;

            const date = guild.createdAt;
            const nowDate = new Date();
            const timeDifference = Math.abs(nowDate.getTime() - date.getTime());
            const dayDifference = Math.floor(timeDifference / (1000 * 3600 * 24));

            const verificationLevels = {
                "NONE": "None",
                "LOW": "Low",
                "MEDIUM": "Medium",
                "HIGH": "High",
                "VERY_HIGH": "Very High"
            };
            const verificationLevel = verificationLevels[guild.verificationLevel] || "0";

            const notificationLevels = {
                "ALL_MESSAGES": "All Messages",
                "ONLY_MENTIONS": "Only Mentions"
            };
            const defaultMessageNotifications = notificationLevels[guild.defaultMessageNotifications] || "0";

            const icon = guild.iconURL();

            const serverInfo = new Discord.EmbedBuilder();
            serverInfo.setAuthor({ name: `${guild.name}`, iconURL: icon });
            serverInfo.setTitle("Server Information");

            if (icon) {
                serverInfo.setThumbnail(icon);
            }

            let channelCount;
            try {
                const channels = await guild.channels.fetch();
                channelCount = channels.size;
            } catch (error) {
                console.error("Error fetching channels: ", error);
                channelCount = "Error fetching";
            }

            serverInfo.addFields([
                {
                    name: "Server Details",
                    value: `> **Name:** ${guild.name}\n> **ID:** ${guild.id}\n> **Owner:** <@!${guild.ownerId}>\n> **Created at:** ${moment(date).format('DD/MM/YY')} (${dayDifference} days)`
                },
                {
                    name: "Server Stats",
                    value: `> **Members:** ${guild.memberCount}\n> **Roles:** ${guild.roles.cache.size}\n> **Channels:** ${channelCount}\n> **Emojis:** ${guild.emojis.cache.size}\n> **Stickers:** ${guild.stickers.cache.size}`
                },
                {
                    name: "Boosting",
                    value: `> **Level:** ${guild.premiumTier}\n> **Boost Count:** ${guild.premiumSubscriptionCount}`
                },
                {
                    name: "Additional Info",
                    value: `> **Region:** ${guild.preferredLocale}\n> **AFK Channel:** ${guild.afkChannel ? guild.afkChannel.name : "None"}\n> **System Channel:** ${guild.systemChannel ? guild.systemChannel.name : "None"}`
                }
            ]);

            serverInfo.setColor(config.EmbedColors);
            serverInfo.setFooter({
                text: `Requested by: ${interaction.user.username}`,
                iconURL: interaction.user.displayAvatarURL({ format: 'png', dynamic: true, size: 1024 })
            });
            serverInfo.setTimestamp();

            interaction.reply({ embeds: [serverInfo] });

        } catch (error) {
            console.error("Error in serverinfo command: ", error);
            interaction.reply({ content: 'Sorry, there was an error retrieving the server information.', ephemeral: true });
        }
    }
};