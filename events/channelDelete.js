const { EmbedBuilder, AuditLogEvent, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const moment = require('moment-timezone');
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

module.exports = async (client, channel) => {
    if (!channel.guild) return;
    if (!config.ChannelDeletedLogs.Enabled) return;

    const fetchedLogs = await channel.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.ChannelDelete,
    });

    const deletionLog = fetchedLogs.entries.first();
    if (!deletionLog) return;
    const { executor } = deletionLog;

    if (executor.bot) return;

    let embedData = config.ChannelDeletedLogs.Embed;
    const currentTime = moment().tz(config.Timezone).format("HH:mm");
    const longTime = moment().tz(config.Timezone).format("MMMM Do YYYY");

    let channelDeletedEmbed = new EmbedBuilder()
        .setColor(embedData.Color || "#FF0000")
        .setTitle(replacePlaceholders(embedData.Title, channel, executor, currentTime, longTime))
        .setDescription(replacePlaceholders(embedData.Description.join('\n'), channel, executor, currentTime, longTime))
        .setFooter({ text: replacePlaceholders(embedData.Footer, channel, executor, currentTime, longTime) })

    if (config.ChannelDeletedLogs.Thumbnail) {
        channelDeletedEmbed.setThumbnail(executor.displayAvatarURL({ format: 'png', dynamic: true }));
    }

    let deleteLogChannel = channel.guild.channels.cache.get(config.ChannelDeletedLogs.LogsChannelID);
    if (deleteLogChannel) deleteLogChannel.send({ embeds: [channelDeletedEmbed] });
};

function replacePlaceholders(text, channel, executor, currentTime, longTime) {
    return text
        .replace(/{executor}/g, `<@${executor.id}>`)
        .replace(/{channelName}/g, channel.name)
        .replace(/{shorttime}/g, currentTime)
        .replace(/{longtime}/g, longTime);
}