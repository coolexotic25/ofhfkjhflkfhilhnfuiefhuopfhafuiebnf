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

const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const yaml = require('js-yaml');
const fs = require('fs');
const config = yaml.load(fs.readFileSync('././config.yml', 'utf8'));
const lang = yaml.load(fs.readFileSync('././lang.yml', 'utf8'));
const UserData = require('../../models/UserData');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clearhistory')
        .setDescription('Clear a user\'s history')
        .addUserOption(option => option.setName('user').setDescription('The user to clear history from').setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const requiredRoles = config.ModerationRoles.clearhistory;
        const hasPermission = requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId));

        if (!hasPermission) {
            return interaction.editReply({ content: lang.NoPermsMessage, ephemeral: true });
        }

        const user = interaction.options.getUser('user');
        await clearUserHistory(user.id, interaction.guild.id);

        const successMessage = lang.ClearhistorySuccess.replace(/{user}/g, user.tag);
        const successEmbed = new EmbedBuilder()
            .setAuthor({ name: lang.SuccessEmbedTitle, iconURL: 'https://i.imgur.com/7SlmRRa.png' })
            .setColor(config.SuccessEmbedColor)
            .setDescription(successMessage);

        interaction.editReply({ embeds: [successEmbed], ephemeral: true });
    }
};

async function clearUserHistory(userId, guildId) {
    await UserData.findOneAndUpdate(
        { userId: userId, guildId: guildId },
        { $set: { warns: 0, bans: 0, kicks: 0, timeouts: 0, note: "", warnings: [] } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
}