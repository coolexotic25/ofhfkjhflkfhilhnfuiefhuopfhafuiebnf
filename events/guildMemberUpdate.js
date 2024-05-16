const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const lang = yaml.load(fs.readFileSync('./lang.yml', 'utf8'));
const moment = require('moment-timezone');
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

module.exports = async (client, oldMember, newMember) => {
    if (newMember.user.bot || !config.UserUpdateLogs.Enabled) return;

    const logChannel = newMember.guild.channels.cache.get(config.UserUpdateLogs.LogsChannelID);
    const currentTime = moment().tz(config.Timezone);

    if (config.AntiHoist.EnableOnUserUpdate) {
     
        let member = newMember;
        let displayName = member.displayName;
        let originalDisplayName = displayName; 

        while (displayName.length > 0 && (config.AntiHoist.DisallowedCharacters.includes(displayName.charAt(0)) || displayName.charAt(0) === ' ')) {
            displayName = displayName.substring(1); 
      //      console.log(displayName);
        };

        if (displayName.length === 0) {
            displayName = config.AntiHoist.DefaultDisplayName;
        }
 
        if (displayName !== originalDisplayName) {
        try {
            await member.setNickname(displayName.trim());
 
            let logChannel = member.guild.channels.cache.get(config.AntiHoist.LogsChannelID);
            if (logChannel) {
                let logEmbed = new EmbedBuilder()
                    .setColor(parseInt(config.AntiHoist.LogEmbed.Color.replace("#", ""), 16))
                    .setTitle(replaceAntiHoistPlaceholders(config.AntiHoist.LogEmbed.Title, member).replace("{oldDisplayName}", originalDisplayName))
                    .setDescription(replaceAntiHoistPlaceholders(config.AntiHoist.LogEmbed.Description.join('\n'), member).replace("{oldDisplayName}", originalDisplayName))
                    .setFooter({ text: replaceAntiHoistPlaceholders(config.AntiHoist.LogEmbed.Footer, member).replace("{oldDisplayName}", originalDisplayName) })
                    .setTimestamp();

            await logChannel.send({ embeds: [logEmbed] });

            }
            } catch (error) {
            }
        }
 
    }  

    try {
        if (oldMember.nickname !== newMember.nickname) {
            handleNicknameChange(oldMember, newMember, logChannel, currentTime);
        }

        const oldTimeout = oldMember.communicationDisabledUntil;
        const newTimeout = newMember.communicationDisabledUntil;
        const timeoutChanged = oldTimeout !== newTimeout;
        const isTimeout = newTimeout && (!oldTimeout || newTimeout > oldTimeout);
        const isUntime = oldTimeout && !newTimeout;

        if (timeoutChanged && (isTimeout || isUntime) && (config.TimeoutLogs.Enabled || config.UntimeLogs.Enabled)) {
            const moderator = await fetchModeratorForTimeoutChange(newMember);
            handleTimeoutChange(oldMember, newMember, logChannel, currentTime, moderator, isTimeout);
        }

        if (hasRoleChanged(oldMember, newMember)) {
            handleRoleChange(oldMember, newMember, logChannel, currentTime);
        }
    } catch (error) {
        console.error('Error handling guild member update:', error);
    }
};


function handleRoleChange(oldMember, newMember, logChannel, currentTime) {
    const oldRoles = new Set(oldMember.roles.cache.map(role => role.id));
    const newRoles = new Set(newMember.roles.cache.map(role => role.id));

    const addedRoles = newMember.roles.cache.filter(role => !oldRoles.has(role.id));
    const removedRoles = oldMember.roles.cache.filter(role => !newRoles.has(role.id));

    if (addedRoles.size > 0) {
        handleAddRole(newMember, Array.from(addedRoles.values()), logChannel, currentTime);
    }

    if (removedRoles.size > 0) {
        handleRemoveRole(newMember, Array.from(removedRoles.values()), logChannel, currentTime);
    }
}


function hasRoleChanged(oldMember, newMember) {
    const oldRoles = oldMember.roles.cache.map(role => role.id).sort();
    const newRoles = newMember.roles.cache.map(role => role.id).sort();

    if (oldRoles.length !== newRoles.length) {
        return true;
    }

    for (let i = 0; i < oldRoles.length; i++) {
        if (oldRoles[i] !== newRoles[i]) {
            return true;
        }
    }

    return false;
}


function handleAddRole(member, addedRoles, logChannel, currentTime) {
    const roleAddLogChannelID = member.guild.channels.cache.get(config.RoleAddLogs.LogsChannelID);
    const embedData = config.RoleAddLogs.Embed;
    const addedRoleNames = formatRoles(addedRoles);

    let embed = new EmbedBuilder()
        .setColor(embedData.Color || "#1E90FF")
        .setTitle(replacePlaceholders(embedData.Title, member, null, null, addedRoleNames, null, null, null, currentTime))
        .setDescription(
            embedData.Description.map(line =>
                replacePlaceholders(line, member, null, null, addedRoleNames, null, null, null, currentTime)
            ).join('\n')
        )
        .setFooter({ text: replacePlaceholders(embedData.Footer, member, null, null, addedRoleNames, null, null, null, currentTime) });

    if (embedData.Thumbnail) {
        embed.setThumbnail(member.user.displayAvatarURL({ format: 'png', dynamic: true }));
    }

    if (roleAddLogChannelID) {
        roleAddLogChannelID.send({ embeds: [embed] });
    }
}


function handleRemoveRole(member, removedRoles, logChannel, currentTime) {
    const roleRemoveLogChannelID = member.guild.channels.cache.get(config.RoleRemoveLogs.LogsChannelID);
    const embedData = config.RoleRemoveLogs.Embed;
    const removedRoleNames = formatRoles(removedRoles);

    let embed = new EmbedBuilder()
        .setColor(embedData.Color || "#FF4500")
        .setTitle(replacePlaceholders(embedData.Title, member, null, null, null, removedRoleNames, null, null, currentTime))
        .setDescription(
            embedData.Description.map(line =>
                replacePlaceholders(line, member, null, null, null, removedRoleNames, null, null, currentTime)
            ).join('\n')
        )
        .setFooter({ text: replacePlaceholders(embedData.Footer, member, null, null, null, removedRoleNames, null, null, currentTime) });

    if (embedData.Thumbnail) {
        embed.setThumbnail(member.user.displayAvatarURL({ format: 'png', dynamic: true }));
    }

    if (roleRemoveLogChannelID) {
        roleRemoveLogChannelID.send({ embeds: [embed] });
    }
}



async function fetchModeratorForTimeoutChange(member) {
    try {
        const fetchedLogs = await member.guild.fetchAuditLogs({
            limit: 1,
            type: AuditLogEvent.MemberUpdate,
        });
        const timeoutLog = fetchedLogs.entries.first();
        if (!timeoutLog) return null;

        const { executor, target } = timeoutLog;
        if (target.id === member.id) {
            return executor;
        }
    } catch (error) {
        console.error('Error fetching audit logs:', error);
    }
    return null;
}


function handleNicknameChange(oldMember, newMember, logChannel, currentTime) {
    let oldNickname = oldMember.nickname || "None";
    let newNickname = newMember.nickname || "None";
    let embedData = config.UserUpdateLogs.Embed;

    let embed = new EmbedBuilder()
        .setColor(embedData.Color || "#00FF00")
        .setTitle(embedData.Title || "Nickname Change Detected")
        .setDescription(
            `**Member:** ${newMember.user.tag}\n**Old Nickname:** ${oldNickname}\n**New Nickname:** ${newNickname}\n**Time:** ${currentTime.format('MMMM Do YYYY, h:mm:ss a')}`
        )
        .setFooter({ text: `UserID: ${newMember.id}` })
        .setThumbnail(newMember.user.displayAvatarURL({ format: 'png', dynamic: true }));

    if (logChannel) {
        logChannel.send({ embeds: [embed] });
    }
}


function sendRoleUpdateEmbed(member, addedRoles, removedRoles, logChannel, currentTime, config) {
    let embedData = config.Embed;
    let title = addedRoles.length > 0 ? 'Role Added' : 'Role Removed';
    let embed = new EmbedBuilder()
        .setColor(embedData.Color || "#1E90FF")
        .setTitle(embedData.Title.replace(':arrow_up_down:', title))
        .setDescription(
            `**Member:** ${member.user.tag}\n` +
            `**Added Roles:** ${formatRoles(addedRoles)}\n` +
            `**Removed Roles:** ${formatRoles(removedRoles)}\n` +
            `**Time:** ${currentTime.format('MMMM Do YYYY, h:mm:ss a')}`
        )
        .setFooter({ text: `UserID: ${member.id}` })
        .setThumbnail(member.user.displayAvatarURL({ format: 'png', dynamic: true }));

    if (logChannel) {
        logChannel.send({ embeds: [embed] });
    }
}


function formatRoles(roles) {
    if (!roles || roles.length === 0) {
        return 'None';
    }
    return roles.map(role => `<@&${role.id}>`).join(", ");
}


function handleTimeoutChange(oldMember, newMember, logChannel, currentTime, moderator, isTimeout) {
    const logConfig = isTimeout ? config.TimeoutLogs : config.UntimeLogs;
    const embedData = logConfig.Embed;
    const duration = isTimeout ? getFormattedDuration(newMember.communicationDisabledUntil) : null;

    let embed = new EmbedBuilder()
        .setColor(embedData.Color)
        .setTitle(replacePlaceholders(embedData.Title, newMember, null, null, null, null, moderator, duration, currentTime))
        .setDescription(
            embedData.Description.map(line =>
                replacePlaceholders(line, newMember, null, null, null, null, moderator, duration, currentTime)
            ).join('\n')
        )
        .setFooter({ text: replacePlaceholders(embedData.Footer, newMember, null, null, null, null, moderator, duration, currentTime) });

    if (logConfig.Thumbnail) {
        embed.setThumbnail(newMember.user.displayAvatarURL({ format: 'png', dynamic: true }));
    }

    if (logChannel) logChannel.send({ embeds: [embed] });
}


function getFormattedDuration(communicationDisabledUntil) {
    if (!communicationDisabledUntil) return "None";
    const duration = moment.duration(moment(communicationDisabledUntil).diff(moment()));
    const hours = Math.floor(duration.asHours());
    const minutes = duration.minutes();
    const seconds = duration.seconds();
    return `${hours}h ${minutes}m ${seconds}s`;
}



function replacePlaceholders(text, member, oldNickname, newNickname, addedRoleNames, removedRoleNames, moderator, duration, currentTime) {
    return text
        .replace(/{user}/g, `<@${member.id}>`)
        .replace(/{userName}/g, member.user.username)
        .replace(/{userTag}/g, member.user.tag)
        .replace(/{userId}/g, member.user.id)
        .replace(/{oldNickname}/g, oldNickname || 'None')
        .replace(/{newNickname}/g, newNickname || 'None')
        .replace(/{addedRoleNames}/g, addedRoleNames || 'None')
        .replace(/{removedRoleNames}/g, removedRoleNames || 'None')
        .replace(/{duration}/g, duration || 'None')
        .replace(/{moderator}/g, moderator ? `<@${moderator.id}>` : "Unknown")
        .replace(/{moderatorName}/g, moderator ? moderator.username : "Unknown")
        .replace(/{moderatorTag}/g, moderator ? `${moderator.username}#${moderator.discriminator}` : "Unknown")
        .replace(/{shorttime}/g, currentTime.format("HH:mm"))
        .replace(/{longtime}/g, currentTime.format('MMMM Do YYYY'));
}

function replaceAntiHoistPlaceholders(text, member) {
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