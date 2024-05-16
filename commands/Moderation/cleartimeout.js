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
const yaml = require('js-yaml');
const fs = require('fs');
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
const lang = yaml.load(fs.readFileSync('./lang.yml', 'utf8'));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cleartimeout')
        .setDescription('Remove timeout from a user')
        .addUserOption(option => option.setName('user').setDescription('The user to remove the timeout from').setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const requiredRoles = config.ModerationRoles.cleartimeout;
        if (!requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId))) {
            await interaction.editReply({ content: lang.NoPermsMessage, ephemeral: true });
            return;
        }

        const user = interaction.options.getUser("user");
        const member = interaction.guild.members.cache.get(user.id);

        if (!member) {
            await interaction.editReply({ content: lang.ClearTimeout.UserNotFound, ephemeral: true });
            return;
        }

        if (!member.communicationDisabledUntil || new Date(member.communicationDisabledUntil) < new Date()) {
            await interaction.editReply({ content: lang.ClearTimeout.NoTimeout.replace('{userTag}', member.user.tag), ephemeral: true });
            return;
        }

        try {
            await member.timeout(null, "Timeout cleared by moderator.");
            await interaction.editReply({ content: lang.ClearTimeout.TimeoutCleared.replace('{userTag}', member.user.tag), ephemeral: true });
        } catch (error) {
            console.error('Clear Timeout Error:', error);
            await interaction.editReply({ content: lang.ClearTimeout.Error, ephemeral: true });
        }
    }
};