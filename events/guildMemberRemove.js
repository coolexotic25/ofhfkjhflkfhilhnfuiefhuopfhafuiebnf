const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const moment = require('moment-timezone');
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
const UserData = require('../models/UserData');
const GuildData = require('../models/guildDataSchema');

module.exports = async (client, member) => {
    if (!member || member.id === client.user.id) return;

    sendLeaveMessage(member);
    updateMemberCount(member);
    processKickEvent(member);

    if (config.LevelingSystem.Enabled && config.LevelingSystem.ResetDataOnLeave) {
        resetUserDataOnLeave(member);
    }
};

async function sendLeaveMessage(member) {
    let leaveChannel = member.guild.channels.cache.get(config.LeaveChannel);
    if (leaveChannel) {
        let leaveEmbed = new EmbedBuilder()
            .setColor(config.LeaveMessage.Embed.Color || "#FF0000")
            .setTitle(replacePlaceholders(config.LeaveMessage.Embed.Title, member))
            .setDescription(replacePlaceholders(config.LeaveMessage.Embed.Description.join('\n'), member))
            .setFooter({ text: replacePlaceholders(config.LeaveMessage.Embed.Footer, member) })
            .setThumbnail(member.user.displayAvatarURL({ format: 'png', dynamic: true }));

        if (config.LeaveMessage.Embed.Image) {
            leaveEmbed.setImage(config.LeaveMessage.Embed.Image);
        }

        leaveChannel.send({ embeds: [leaveEmbed] });
    }
}


async function updateMemberCount(member) {
    let memberCountChannel = member.guild.channels.cache.get(config.MemberCountChannel);
    if (memberCountChannel) {
        let memberCountMsg = replacePlaceholders(config.MemberCountChannelName, member);
        memberCountChannel.setName(memberCountMsg).catch(console.error);
    }
}

async function resetUserDataOnLeave(member) {
    try {
        await UserData.findOneAndUpdate(
            { userId: member.id, guildId: member.guild.id },
            { xp: 0, level: 0 },
            { new: true }
        );
    } catch (error) {
        console.error('Error resetting user data on leave:', error);
    }
}

async function processKickEvent(member) {
    const timeWindowMs = 1000 * 2;
    const now = Date.now();

    try {
        const fetchedLogs = await member.guild.fetchAuditLogs({
            limit: 20,
            type: AuditLogEvent.MemberKick,
        });

        const relevantLogs = fetchedLogs.entries.filter(entry =>
            (now - entry.createdTimestamp < timeWindowMs) &&
            entry.target.id === member.id
        );

        const kickLog = relevantLogs.sort((a, b) => b.createdTimestamp - a.createdTimestamp).first();

        if (kickLog) {
            const updatedGuildData = await GuildData.findOneAndUpdate(
                { guildID: member.guild.id },
                { $inc: { cases: 1 } },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            const caseNumber = updatedGuildData ? updatedGuildData.cases : 'N/A';

            await UserData.findOneAndUpdate(
                { userId: member.id, guildId: member.guild.id },
                { $inc: { kicks: 1 } },
                { upsert: true, new: true }
            );

            logKick(member, kickLog.reason || "No reason specified", kickLog.executor, caseNumber);
        }
    } catch (error) {
        console.error('Error processing kick event:', error);
    }
}

function logKick(member, reason, moderator, caseNumber) {
    let description = replacePlaceholders(config.KickLogs.Embed.Description.join('\n'), member, reason, moderator, caseNumber);

    let kickEmbed = new EmbedBuilder()
        .setColor(config.KickLogs.Embed.Color || "#FF5555")
        .setTitle(replacePlaceholders(config.KickLogs.Embed.Title, member, reason, moderator, caseNumber))
        .setDescription(description)
        .setFooter({ text: replacePlaceholders(config.KickLogs.Embed.Footer, member, reason, moderator, caseNumber) })
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }));

    const logsChannel = member.guild.channels.cache.get(config.KickLogs.LogsChannelID);
    if (logsChannel) {
        logsChannel.send({ embeds: [kickEmbed] });
    }
}

function replacePlaceholders(text, member, reason = '', moderator = {}, caseNumber = '') {
    const currentTime = moment().tz(config.Timezone);
    return text
        .replace(/{user}/g, `<@${member.id}>`)
        .replace(/{userName}/g, member.user.username)
        .replace(/{userTag}/g, member.user.tag)
        .replace(/{userId}/g, member.user.id)
        .replace(/{user-createdAt}/g, moment(member.user.createdAt).tz(config.Timezone).format('MM/DD/YYYY'))
        .replace(/{user-joinedAt}/g, moment(member.joinedAt).tz(config.Timezone).format('MM/DD/YYYY'))
        .replace(/{reason}/g, reason)
        .replace(/{moderator}/g, moderator ? `<@${moderator.id}>` : 'Unknown')
        .replace(/{caseNumber}/g, caseNumber)
        .replace(/{memberCount}/g, member.guild.memberCount)
        .replace(/{guildName}/g, member.guild.name)
        .replace(/{shorttime}/g, currentTime.format("HH:mm"))
        .replace(/{longtime}/g, currentTime.format('MMMM Do YYYY'));
}