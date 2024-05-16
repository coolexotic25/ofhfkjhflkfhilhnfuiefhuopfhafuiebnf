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

http://discord.drakodevelopment.net/
 
*/

const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const UserData = require('../../models/UserData');
const yaml = require('js-yaml');
const fs = require('fs');
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
const lang = yaml.load(fs.readFileSync('./lang.yml', 'utf8'));
const moment = require('moment-timezone');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unwarn')
        .setDescription('Remove a warning from a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to unwarn')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('warning_id')
                .setDescription('The ID of the warning to remove')
                .setRequired(true)),

    async execute(interaction) {
        const requiredRoles = config.ModerationRoles.unwarn;
        const hasPermission = requiredRoles.some(role => interaction.member.roles.cache.has(role));

        if (!hasPermission) {
            return interaction.reply({ content: lang.NoPermsMessage, ephemeral: true });
        }


        const user = interaction.options.getUser('user');
        const warningId = interaction.options.getInteger('warning_id');

        const userData = await UserData.findOne({ userId: user.id, guildId: interaction.guild.id });
        if (!userData || userData.warnings.length === 0) {
            return interaction.reply({ content: lang.Unwarn.NoWarnings, ephemeral: true });
        }

        if (warningId < 1 || warningId > userData.warnings.length) {
            return interaction.reply({ content: lang.Unwarn.InvalidWarningID, ephemeral: true });
        }

        const removedWarning = userData.warnings.splice(warningId - 1, 1)[0];
        await userData.save();

        interaction.reply({
            content: lang.Unwarn.WarningRemoved.replace('{userTag}', user.tag).replace('{reason}', removedWarning.reason),
            ephemeral: true
        });

        const modLogChannel = interaction.guild.channels.cache.get(config.ModLogsChannelID);
        if (modLogChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle('Warning Removed')
                .setDescription(`A warning was removed from ${user.tag} (\`${user.id}\`).\n\n**Reason for Removal:** ${removedWarning.reason}`)
                .setColor('#FFA500')
                .setTimestamp();
            modLogChannel.send({ embeds: [logEmbed] });
        }
    }
};