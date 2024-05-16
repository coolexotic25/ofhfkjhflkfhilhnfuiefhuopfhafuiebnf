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
const moment = require('moment-timezone');
const ms = require('parse-duration');
const UserData = require('../../models/UserData');
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Timeout a user')
        .addUserOption(option => option.setName('user').setDescription('The user to timeout').setRequired(true))
        .addStringOption(option => option.setName('time').setDescription('How long the user should be timed out, for example: 1d, 1h, 1m, or "remove" to remove timeout').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('The reason for the timeout').setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const requiredRoles = config.ModerationRoles.timeout;
        if (!requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId))) {
            await interaction.editReply({ content: 'You do not have permission to use this command.', ephemeral: true });
            return;
        }

        const user = interaction.options.getUser("user");
        const timeInput = interaction.options.getString("time");
        const reason = interaction.options.getString("reason");
        const member = interaction.guild.members.cache.get(user.id);
        const timeInMs = timeInput.toLowerCase() === 'remove' ? 0 : ms(timeInput);

        if (timeInMs === undefined || (timeInMs < 10000 && timeInMs !== 0) || timeInMs > 2419200000) {
            await interaction.editReply({ content: 'Invalid time specified. Time must be between 10 seconds and 28 days.', ephemeral: true });
            return;
        }

        try {
            await member.timeout(timeInMs, reason);
            const responseMessage = `Successfully ${timeInMs === 0 ? 'removed timeout for' : 'timed out'} ${member.user.tag} for ${timeInput}. Reason: ${reason}`;
            await interaction.editReply({ content: responseMessage, ephemeral: true });
        } catch (error) {
            console.error('Timeout Error:', error);
            await interaction.editReply({ content: 'Failed to timeout user.', ephemeral: true });
        }
    }
};