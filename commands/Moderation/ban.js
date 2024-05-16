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
const moment = require('moment-timezone');
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
const lang = yaml.load(fs.readFileSync('./lang.yml', 'utf8'));
const UserData = require('../../models/UserData');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user by mention or ID')
        .addUserOption(option => option.setName('user').setDescription('The user to ban').setRequired(false))
        .addStringOption(option => option.setName('user_id').setDescription('The Discord ID of the user to ban').setRequired(false))
        .addStringOption(option => option.setName('reason').setDescription('The reason for the ban').setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const requiredRoles = config.ModerationRoles.ban;
        if (!requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId))) {
            await interaction.editReply({ content: lang.NoPermsMessage, ephemeral: true });
            return;
        }

        const user = interaction.options.getUser('user');
        const userId = interaction.options.getString('user_id');
        const reason = interaction.options.getString('reason') || 'Not specified';

        let member;
        if (user) {
            member = await interaction.guild.members.fetch(user.id).catch(() => null);
        } else if (userId) {
            member = await interaction.guild.members.fetch(userId).catch(() => null);
        }

        if (!member) {
            await interaction.editReply({ content: lang.Ban.UserNotFound, ephemeral: true });
            return;
        }

        if (member.user.id === interaction.user.id) {
            await interaction.editReply({ content: lang.Ban.CantBanSelf, ephemeral: true });
            return;
        }

        if (!member.bannable) {
            await interaction.editReply({ content: lang.Ban.CantBanUser, ephemeral: true });
            return;
        }

        const dmSuccess = await sendBanDM(member, reason, interaction, interaction.guild);
        await banMember(member, reason, interaction);

        let replyContent = lang.Ban.Success.replace('{userTag}', member.user.tag).replace('{reason}', reason);
        if (!dmSuccess) {
            replyContent += "\n" + "Note: Unable to send DM to user.";
        }

        await interaction.editReply({ content: replyContent, ephemeral: true });
    }
};

async function sendBanDM(member, reason, interaction, guild) {
    if (!member || !interaction || guild == null) {
        return false;
    }

    try {
        if (config.BanLogs.DM.Enabled) {
            const dmEmbedConfig = config.BanLogs.DM.Embed;
            const currentTime = moment().tz(config.Timezone);

            const placeholders = {
                user: `<@${member.user.id}>`,
                userName: member.user.username,
                userTag: member.user.tag,
                userId: member.user.id,
                moderator: `<@${interaction.user.id}> (${interaction.user.tag})`,
                reason,
                guildName: guild.name,
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
        console.error('SendBanDM Error:', error);
        return false;
    }
}

async function banMember(member, reason, interaction) {
    await member.ban({ reason: reason });
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