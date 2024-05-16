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
const moment = require('moment-timezone');
const yaml = require("js-yaml");
const fs = require('fs');
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
const lang = yaml.load(fs.readFileSync('./lang.yml', 'utf8'));
const UserData = require('../../models/UserData');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tempban')
        .setDescription('Temporarily ban a user')
        .addStringOption(option => option.setName('duration').setDescription('Ban duration (e.g., 1d 2h 15m)').setRequired(true))
        .addUserOption(option => option.setName('user').setDescription('The user to ban'))
        .addStringOption(option => option.setName('userid').setDescription('The user ID to ban'))
        .addStringOption(option => option.setName('reason').setDescription('Reason for the ban')),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const requiredRoles = config.ModerationRoles.tempban;
        if (!requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId))) {
            await interaction.editReply({ content: lang.TempBan.NoPermsMessage, ephemeral: true });
            return;
        }

        const userOption = interaction.options.getUser('user');
        const userIdOption = interaction.options.getString('userid');
        const durationStr = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        let user = userOption;
        if (!user && userIdOption) {
            user = await interaction.client.users.fetch(userIdOption).catch(() => null);
        }

        if (!user) {
            await interaction.editReply({ content: lang.TempBan.UserNotFound, ephemeral: true });
            console.log("User not found");
            return;
        }

        const totalSeconds = parseDuration(durationStr);
        if (totalSeconds === null) {
            await interaction.editReply({ content: lang.TempBan.InvalidDuration, ephemeral: true });
            return;
        }

        const banEndTime = moment().add(totalSeconds, 'seconds').toDate();

        try {
            const member = await interaction.guild.members.fetch(user.id);

            if (!member.bannable) {
                await interaction.editReply({ content: lang.TempBan.CantBanUser, ephemeral: true });
                return;
            }

            const dmSuccess = await sendBanDM(member, reason, interaction);
            await member.ban({ reason });

            let userData = await UserData.findOne({ userId: user.id, guildId: interaction.guild.id });
            if (!userData) {
                userData = new UserData({ userId: user.id, guildId: interaction.guild.id });
            }

            userData.tempBans.push({
                endTime: banEndTime,
                reason,
                moderatorId: interaction.user.id,
            });

            await userData.save();

            let replyContent = lang.TempBan.Success.replace('{userTag}', user.tag)
                .replace('{duration}', durationStr)
                .replace('{reason}', reason);

            if (!dmSuccess) {
                replyContent += "\nNote: Unable to send DM to user.";
            }

            await interaction.editReply({ content: replyContent, ephemeral: true });

        } catch (error) {
            console.error("TempBan Error:", error);
            await interaction.editReply({ content: lang.TempBan.Error, ephemeral: true });
        }
    }
};

function parseDuration(durationStr) {
    const regex = /(\d+)([smhd])/g;
    let totalSeconds = 0;
    let match;

    while ((match = regex.exec(durationStr)) !== null) {
        const value = parseInt(match[1], 10);
        const unit = match[2];

        switch (unit) {
            case 's':
                totalSeconds += value;
                break;
            case 'm':
                totalSeconds += value * 60;
                break;
            case 'h':
                totalSeconds += value * 3600;
                break;
            case 'd':
                totalSeconds += value * 86400;
                break;
            default:
                return null;
        }
    }

    return totalSeconds > 0 ? totalSeconds : null;
}

async function sendBanDM(member, reason, interaction) {
    try {
        if (config.BanLogs.DM.Enabled) {
            const dmEmbedConfig = config.BanLogs.DM.Embed;
            const currentTime = moment().tz(config.Timezone);
            const placeholders = {
                user: `<@${member.id}>`,
                userName: member.user.username,
                userTag: member.user.tag,
                userId: member.id,
                moderator: `<@${interaction.user.id}> (${interaction.user.tag})`,
                reason,
                guildName: interaction.guild.name,
                longtime: currentTime.format('MMMM Do YYYY'),
                shorttime: currentTime.format("HH:mm")
            };

            const color = dmEmbedConfig.Color
                ? parseInt(dmEmbedConfig.Color.replace('#', ''), 16)
                : 0xFF5555;

            const dmMessageEmbed = new EmbedBuilder()
                .setColor(color)
                .setTitle(replacePlaceholders(dmEmbedConfig.Title, placeholders))
                .setDescription(dmEmbedConfig.Description.map(line => replacePlaceholders(line, placeholders)).join('\n'))
                .setFooter({ text: replacePlaceholders(dmEmbedConfig.Footer, placeholders) });

            await member.send({ embeds: [dmMessageEmbed] });
            return true;
        }
    } catch (error) {
   //     console.error("Failed to send DM:", error);
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
        .replace(/{guildName}/g, placeholders.guildName)
        .replace(/{longtime}/g, placeholders.longtime)
        .replace(/{shorttime}/g, placeholders.shorttime);
}