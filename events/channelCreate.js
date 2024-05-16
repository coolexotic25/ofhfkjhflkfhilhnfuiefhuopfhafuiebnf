const { EmbedBuilder, AuditLogEvent, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const moment = require('moment-timezone');
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

module.exports = async (client, channel) => {
    if (!channel.guild) return;
    if (!config.ChannelCreatedLogs.Enabled) return;

    if (!channel.guild.members.me.permissions.has(PermissionsBitField.Flags.ViewAuditLog)) return;

    try {
        const fetchedLogs = await channel.guild.fetchAuditLogs({
            limit: 1,
            type: AuditLogEvent.ChannelCreate,
        });

        const creationLog = fetchedLogs.entries.first();
        if (!creationLog) return;
        const { executor } = creationLog;

        if (executor.bot) return;

        let embedData = config.ChannelCreatedLogs.Embed;
        const currentTime = moment().tz(config.Timezone).format("HH:mm");
        const longTime = moment().tz(config.Timezone).format("MMMM Do YYYY");
        var embed = new EmbedBuilder()
            .setColor(embedData.Color || "Green")
            .setTitle(replacePlaceholders(embedData.Title, channel, executor, currentTime, longTime))
            .setDescription(replacePlaceholders(embedData.Description.join('\n'), channel, executor, currentTime, longTime))
            .setFooter({ text: replacePlaceholders(embedData.Footer, channel, executor, currentTime, longTime) })

        if (config.ChannelCreatedLogs.Thumbnail) {
            embed.setThumbnail(executor.displayAvatarURL({ format: 'png', dynamic: true }));
        }

        let createLogChannel = channel.guild.channels.cache.get(config.ChannelCreatedLogs.LogsChannelID);
        if (createLogChannel) createLogChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error("Error in channel create event handler:", error);
    }
};

function replacePlaceholders(text, channel, executor, currentTime, longTime) {
    return text
        .replace(/{channelName}/g, channel.name)
        .replace(/{executor}/g, `<@${executor.id}>`)
        .replace(/{shorttime}/g, currentTime)
        .replace(/{longtime}/g, longTime);
}