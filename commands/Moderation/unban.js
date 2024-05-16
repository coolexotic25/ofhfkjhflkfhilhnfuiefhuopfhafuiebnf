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

const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
const lang = yaml.load(fs.readFileSync('./lang.yml', 'utf8'));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unban a user')
        .addStringOption(option =>
            option.setName('userid')
                .setDescription('The user\'s Discord ID')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason for the unban')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        if (!hasPermissionToUnban(interaction)) {
            await interaction.editReply(lang.NoPermsMessage);
            return;
        }

        const userId = interaction.options.getString('userid');
        const reason = interaction.options.getString('reason');

        try {
            await unbanUser(interaction, userId, reason);
        } catch (e) {
            console.error('Unban Command Error:', e);
            await interaction.editReply(lang.Unban.UnbanError);
        }
    }
};

async function unbanUser(interaction, userId, reason) {
    const bans = await interaction.guild.bans.fetch();
    if (!bans.has(userId)) {
        await interaction.editReply(lang.Unban.UnbanUserNotBanned);
        return;
    }

    await interaction.guild.members.unban(userId, reason);
    const successMessage = lang.Unban.UnbanMsg.replace(/{user}/g, `<@!${userId}>`);
    await interaction.editReply(successMessage);

    const logsChannel = interaction.guild.channels.cache.get(config.UnbanLogs.LogsChannelID);
    if (logsChannel && config.UnbanLogs.Enabled) {
    }
}

function hasPermissionToUnban(interaction) {
    const requiredRoles = config.ModerationRoles.unban;
    return requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId));
}