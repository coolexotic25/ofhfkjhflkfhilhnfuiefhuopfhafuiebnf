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
const moment = require('moment-timezone');
const fs = require('fs');
const yaml = require("js-yaml");
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
const lang = yaml.load(fs.readFileSync('./lang.yml', 'utf8'));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a user')
        .addUserOption(option => option.setName('user').setDescription('The user to kick').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('The reason for the kick').setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const requiredRoles = config.ModerationRoles.kick;
        if (!requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId))) {
            return interaction.editReply({ content: lang.NoPermsMessage, ephemeral: true });
        }

        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');
        const member = interaction.guild.members.cache.get(user.id);

        if (!member) {
            return interaction.editReply({ content: lang.Kick.UserNotFoundInGuild });
        }

        if (user.id === interaction.user.id) {
            return interaction.editReply({ content: lang.Kick.CannotKickSelf });
        }

        if (!member.kickable || member.roles.highest.comparePositionTo(interaction.member.roles.highest) >= 0) {
            return interaction.editReply({ content: lang.Kick.CannotKickUser });
        }

        try {
            const dmSent = await sendKickDM(member, interaction);
            if (!dmSent) {
                return interaction.editReply({ content: lang.Kick.DMFailed });
            }

            await member.kick(reason);

            return interaction.editReply({ content: lang.Kick.KickSuccess.replace('{userTag}', member.user.tag).replace('{reason}', reason) });
        } catch (error) {
            return interaction.editReply({ content: lang.Kick.KickError });
        }
    }
};

async function sendKickDM(member, interaction) {
    try {
        if (config.KickLogs.DM.Enabled) {
            const dmEmbedConfig = config.KickLogs.DM.Embed;
            const currentTime = moment().tz(config.Timezone);
            const placeholders = {
                user: `<@${member.id}>`,
                userName: member.user.username,
                userTag: member.user.tag,
                userId: member.id,
                moderator: `<@${interaction.user.id}> (${interaction.user.tag})`,
                reason: interaction.options.getString('reason'),
                longtime: currentTime.format('MMMM Do YYYY'),
                shorttime: currentTime.format("HH:mm")
            };

            const color = dmEmbedConfig.Color ? parseInt(dmEmbedConfig.Color.replace('#', ''), 16) : 0xFF5555;

            const dmMessageEmbed = new EmbedBuilder()
                .setColor(color)
                .setTitle(replacePlaceholders(dmEmbedConfig.Title, placeholders))
                .setDescription(dmEmbedConfig.Description.map(line => replacePlaceholders(line, placeholders)).join('\n'))
                .setFooter({ text: replacePlaceholders(dmEmbedConfig.Footer, placeholders) });

            await member.send({ embeds: [dmMessageEmbed] });
            return true;
        }
    } catch (error) {
        return false;
    }
}

function replacePlaceholders(text, placeholders) {
    return text
        .replace(/{user}/g, placeholders.user)
        .replace(/{userName}/g, placeholders.userName)
        .replace(/{userTag}/g, placeholders.userTag)
        .replace(/{userId}/g, placeholders.userId)
        .replace(/{moderator}/g, placeholders.moderator)
        .replace(/{reason}/g, placeholders.reason)
        .replace(/{guildName}/g, placeholders.guild)
        .replace(/{shorttime}/g, placeholders.shorttime)
        .replace(/{longtime}/g, placeholders.longtime)
        .replace(/{caseNumber}/g, placeholders.caseNumber);
}