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

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const yaml = require('js-yaml');
const fs = require('fs');
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
const lang = yaml.load(fs.readFileSync('./lang.yml', 'utf8'));
const moment = require('moment');
const UserData = require('../../models/UserData');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('history')
        .setDescription('View a user\'s history')
        .addUserOption(option => option.setName('user').setDescription('The user to view history').setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const requiredRoles = config.ModerationRoles.history;
        const hasPermission = requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId));

        if (!hasPermission) {
            return interaction.editReply({ content: lang.NoPermsMessage, ephemeral: true });
        }

        const user = interaction.options.getUser('user');
        const userData = await getUserHistory(user.id);

        const historyEmbed = createHistoryEmbed(user, userData, interaction);
        interaction.editReply({ embeds: [historyEmbed], ephemeral: true });
    }
};

async function getUserHistory(userId) {
    const userData = await UserData.findOne({ userId: userId });
    return userData || {};
}

function createHistoryEmbed(user, userData, interaction) {
    const avatarUrl = user.displayAvatarURL({ format: 'png', dynamic: true, size: 1024 });
    const member = interaction.guild.members.cache.get(user.id);
    const joinDate = member ? moment(member.joinedAt).format('DD/MM/YYYY') : 'Not in server';

    return new EmbedBuilder()
        .setColor("#000000")
        .setTitle(lang.History.HistoryEmbedTitle.replace(/{user-tag}/g, user.username))
        .setThumbnail(avatarUrl)
        .addFields(
            { name: lang.History.HistoryEmbedUserInfo, value: `\`\`${lang.History.HistoryEmbedName}\`\` <@!${user.id}>\n\`\`${lang.History.HistoryEmbedJoinedServer}\`\` ${joinDate}\n\`\`${lang.History.HistoryTotalMessages}\`\` ${userData.totalMessages?.toLocaleString() || '0'}\n\`\`${lang.History.HistoryEmbedNote}\`\` ${userData.note || 'None'}`, inline: true },
            { name: lang.History.HistoryEmbedWarnings, value: `${userData.warns || 0}`, inline: true },
            { name: lang.History.HistoryEmbedTimeouts, value: `${userData.timeouts || 0}`, inline: true },
            { name: lang.History.HistoryEmbedKicks, value: `${userData.kicks || 0}`, inline: true },
            { name: lang.History.HistoryEmbedBans, value: `${userData.bans || 0}`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: interaction.guild.name });
}