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

const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const Discord = require("discord.js");
const fs = require('fs');
const yaml = require("js-yaml");
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
const lang = yaml.load(fs.readFileSync('./lang.yml', 'utf8'));
const moment = require('moment-timezone');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('antihoist')
        .setDescription('Removes disallowed characters set in config'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const allowedRoles = config.AntiHoist.AllowRoles;
        const userRoles = interaction.member.roles.cache.map(role => role.id);
        const hasPermission = userRoles.some(role => allowedRoles.includes(role));

        if (!hasPermission) {
            return interaction.editReply({
                content: lang.AntiHoist.NoPermission,
                ephemeral: true,
            });
        }

        const allowedRolesObjects = allowedRoles.map(roleId => interaction.guild.roles.cache.get(roleId));
        const highestAllowedRolePosition = Math.max(...allowedRolesObjects.map(role => role?.position || 0));

        const members = await interaction.guild.members.fetch();
        members.forEach(async member => {
            if (member.user.bot) return;

            const memberHighestRolePosition = Math.max(...member.roles.cache.map(role => role.position));
            if (memberHighestRolePosition >= highestAllowedRolePosition) return;

            let displayName = member.displayName;
            let originalDisplayName = displayName; 
    
            while (displayName.length > 0 && (config.AntiHoist.DisallowedCharacters.includes(displayName.charAt(0)) || displayName.charAt(0) === ' ')) {
                displayName = displayName.substring(1); 
            };
    
    
            if (displayName !== originalDisplayName) {
            try {
                await member.setNickname(displayName.trim());
     
                let logChannel = member.guild.channels.cache.get(config.AntiHoist.LogsChannelID);
                if (logChannel) {
                    let logEmbed = new EmbedBuilder()
                        .setColor(parseInt(config.AntiHoist.LogEmbed.Color.replace("#", ""), 16))
                        .setTitle(replacePlaceholders(config.AntiHoist.LogEmbed.Title, member).replace("{oldDisplayName}", originalDisplayName))
                        .setDescription(replacePlaceholders(config.AntiHoist.LogEmbed.Description.join('\n'), member).replace("{oldDisplayName}", originalDisplayName))
                        .setFooter({ text: replacePlaceholders(config.AntiHoist.LogEmbed.Footer, member).replace("{oldDisplayName}", originalDisplayName) })
                        .setTimestamp();
    
                await logChannel.send({ embeds: [logEmbed] });
    
                }
            } catch (error) {
            }
        }
        });

        await interaction.editReply({
            content: lang.AntiHoist.CommandCompleted,
            ephemeral: true,
        });
    }
};


function replacePlaceholders(text, member) {
    const currentTime = moment().tz(config.Timezone);

    return text
        .replace(/{user}/g, `<@${member.id}>`)
        .replace(/{newDisplayName}/g, member.displayName)
        .replace(/{userName}/g, member.user.username)
        .replace(/{userTag}/g, member.user.tag)
        .replace(/{userId}/g, member.user.id)
        .replace(/{user-createdAt}/g, moment(member.user.createdAt).tz(config.Timezone).format('MM/DD/YYYY'))
        .replace(/{user-joinedAt}/g, moment(member.joinedAt).tz(config.Timezone).format('MM/DD/YYYY'))
        .replace(/{memberCount}/g, member.guild.memberCount)
        .replace(/{guildName}/g, member.guild.name)
        .replace(/{shorttime}/g, currentTime.format("HH:mm"))
        .replace(/{longtime}/g, currentTime.format('MMMM Do YYYY'));
}