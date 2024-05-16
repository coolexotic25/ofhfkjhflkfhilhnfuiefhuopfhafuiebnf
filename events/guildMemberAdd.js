const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const lang = yaml.load(fs.readFileSync('./lang.yml', 'utf8'));
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
const moment = require('moment-timezone');
const ms = require('ms');
const Verification = require('../models/verificationSchema');

module.exports = async (client, member) => {
    if (member.id === client.user.id || member.user.bot) return;

    if (!member.bot && config.AltPrevention.Enabled) {
        let logsChannel = member.guild.channels.cache.get(config.AltPrevention.LogsChannelID);
        if (Date.now() - member.user.createdAt < ms(config.AltPrevention.TimeLimit)) {
            let kickStatus = config.AltPrevention.KickAlts ? "Yes" : "No";

            let logEmbed = new EmbedBuilder()
                .setColor(config.AltPrevention.LogEmbed.Color || "#FFA500")
                .setTitle(replacePlaceholders(config.AltPrevention.LogEmbed.Title, member, kickStatus))
                .setDescription(replacePlaceholders(config.AltPrevention.LogEmbed.Description.join('\n'), member, kickStatus))
                .setFooter({ text: replacePlaceholders(config.AltPrevention.LogEmbed.Footer, member, kickStatus) })
                .setTimestamp();

            if (logsChannel) {
                await logsChannel.send({ embeds: [logEmbed] });
            }

            if (config.AltPrevention.DM.Enabled) {
                let dmEmbed = new EmbedBuilder()
                    .setColor(config.AltPrevention.DM.Embed.Color || "#FFA500")
                    .setTitle(replacePlaceholders(config.AltPrevention.DM.Embed.Title, member, kickStatus))
                    .setDescription(replacePlaceholders(config.AltPrevention.DM.Embed.Description.join('\n'), member, kickStatus))
                    .setFooter({ text: replacePlaceholders(config.AltPrevention.DM.Embed.Footer, member, kickStatus) })
                    .setTimestamp();

                try {
                    await member.send({ embeds: [dmEmbed] });
                } catch (e) {
                    console.log('\x1b[33m%s\x1b[0m', "[INFO] Failed to send DM: DMs may be locked.");
                }
            }

            if (config.AltPrevention.KickAlts) {
                await member.kick({ reason: 'Alt Account Detected' });
            }
        }
    }

    if (config.AntiHoist.EnableOnUserJoin) {
     
        let displayName = member.displayName;
        let originalDisplayName = displayName; 

        while (displayName.length > 0 && (config.AntiHoist.DisallowedCharacters.includes(displayName.charAt(0)) || displayName.charAt(0) === ' ')) {
            displayName = displayName.substring(1); 
            //console.log(displayName);
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
                    .setTitle(replacePlaceholders(config.AntiHoist.LogEmbed.Title, member).replace("{oldDisplayName}", originalDisplayName))
                    .setDescription(replacePlaceholders(config.AntiHoist.LogEmbed.Description.join('\n'), member).replace("{oldDisplayName}", originalDisplayName))
                    .setFooter({ text: replacePlaceholders(config.AntiHoist.LogEmbed.Footer, member).replace("{oldDisplayName}", originalDisplayName) })
                    .setTimestamp();

            await logChannel.send({ embeds: [logEmbed] });

            }
            } catch (error) {
                
            }
        }
 
    }  

    if (config.EnableWelcomeMessages) {
        let welcomeChannel = member.guild.channels.cache.get(config.WelcomeChannel);
        if (welcomeChannel) {
            let welcomeEmbed = new EmbedBuilder()
                .setColor(config.WelcomeMessage.Embed.Color)
                .setTitle(replacePlaceholders(config.WelcomeMessage.Embed.Title, member))
                .setDescription(replacePlaceholders(config.WelcomeMessage.Embed.Description.join('\n'), member));

            if (config.WelcomeMessage.Embed.AuthorName) {
                welcomeEmbed.setAuthor({
                    name: replacePlaceholders(config.WelcomeMessage.Embed.AuthorName, member),
                    iconURL: config.WelcomeMessage.Embed.AuthorIconURL ? config.WelcomeMessage.Embed.AuthorIconURL : undefined
                });
            }

            if (config.WelcomeMessage.Embed.Footer) {
                welcomeEmbed.setFooter({
                    text: replacePlaceholders(config.WelcomeMessage.Embed.Footer, member),
                    iconURL: config.WelcomeMessage.Embed.FooterIconURL ? config.WelcomeMessage.Embed.FooterIconURL : undefined
                });
            }
            if (config.WelcomeMessage.Thumbnail) {
                welcomeEmbed.setThumbnail(member.user.displayAvatarURL({ format: 'png', dynamic: true }));
            }
            if (config.WelcomeMessage.Embed.Image && config.WelcomeMessage.Embed.Image.trim() !== '') {
                welcomeEmbed.setImage(config.WelcomeMessage.Embed.Image);
            }

            await welcomeChannel.send({ embeds: [welcomeEmbed] });

            if (config.WelcomeMessage.DM.Enable) {
                let dmEmbed = new EmbedBuilder()
                    .setColor(config.WelcomeMessage.DM.Embed.Color)
                    .setTitle(replacePlaceholders(config.WelcomeMessage.DM.Embed.Title, member))
                    .setDescription(replacePlaceholders(config.WelcomeMessage.DM.Embed.Description.join('\n'), member));

                if (config.WelcomeMessage.DM.Embed.AuthorName) {
                    dmEmbed.setAuthor({
                        name: replacePlaceholders(config.WelcomeMessage.DM.Embed.AuthorName, member),
                        iconURL: config.WelcomeMessage.DM.Embed.AuthorIconURL ? config.WelcomeMessage.DM.Embed.AuthorIconURL : undefined
                    });
                }
                if (config.WelcomeMessage.DM.Embed.Footer) {
                    dmEmbed.setFooter({
                        text: replacePlaceholders(config.WelcomeMessage.DM.Embed.Footer, member),
                        iconURL: config.WelcomeMessage.DM.Embed.FooterIconURL ? config.WelcomeMessage.DM.Embed.FooterIconURL : undefined
                    });
                }
                if (config.WelcomeMessage.DM.Embed.Thumbnail) {
                    dmEmbed.setThumbnail(member.user.displayAvatarURL({ format: 'png', dynamic: true }));
                }
                if (config.WelcomeMessage.DM.Embed.Image && config.WelcomeMessage.DM.Embed.Image.trim() !== '') {
                    dmEmbed.setImage(config.WelcomeMessage.DM.Embed.Image);
                }

                member.send({ embeds: [dmEmbed] }).catch(err => console.log(`Could not send DM to ${member.user.tag}.`));
            }
        } else {
            console.log('[ERROR] Welcome Message enabled but the Channel ID is incorrect!');
        }
    }

    if (config.JoinRoleSettings.Enabled) {
        for (const roleid of config.JoinRoleSettings.JoinRoles) {
            let role = member.guild.roles.cache.get(roleid);
            if (role) {
                try {
                    await member.roles.add(role);
                } catch (error) {
                    if (error.code === 10007) {
                    } else {
                        console.error(`[WARNING] Failed to add role: ${error}`);
                    }
                }
            }
        }
    }

    if (config.VerificationSettings.Enabled && config.VerificationSettings.EnableUnverifiedRole) {
        let verificationData = await Verification.findOne({ guildID: member.guild.id });
        if (verificationData && verificationData.unverifiedRoleID) {
            let unverifiedRole = member.guild.roles.cache.get(verificationData.unverifiedRoleID);
            if (unverifiedRole) {
                await member.roles.add(unverifiedRole).catch(console.error);
            }
        }
    }

    function replacePlaceholders(text, member, kickStatus) {
        const currentTime = moment().tz(config.Timezone);
        return text
            .replace(/{user}/g, `<@${member.id}>`)
            .replace(/{newDisplayName}/g, member.displayName)
            .replace(/{userName}/g, member.user.username)
            .replace(/{userTag}/g, member.user.tag)
            .replace(/{userId}/g, member.user.id)
            .replace(/{user-createdAt}/g, moment(member.user.createdAt).tz(config.Timezone).format('MM/DD/YYYY'))
            .replace(/{user-joinedAt}/g, moment(member.joinedAt).tz(config.Timezone).format('MM/DD/YYYY'))
            .replace(/{kickStatus}/g, kickStatus)
            .replace(/{memberCount}/g, member.guild.memberCount)
            .replace(/{guildName}/g, member.guild.name)
            .replace(/{shorttime}/g, currentTime.format("HH:mm"))
            .replace(/{longtime}/g, currentTime.format('MMMM Do YYYY'));
    }
};