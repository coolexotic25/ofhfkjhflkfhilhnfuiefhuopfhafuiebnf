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
const TempRole = require('../../models/TempRole');
const yaml = require('js-yaml');
const fs = require('fs');

const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
const lang = yaml.load(fs.readFileSync('./lang.yml', 'utf8'));

function parseDuration(durationStr) {
    const regex = /(\d+)(w|d|h|m|s|y)/g;
    let totalMilliseconds = 0;
    const timeUnits = {
        w: 604800000,
        d: 86400000,
        h: 3600000,
        m: 60000,
        s: 1000,
        y: 31536000000,
    };

    let match;
    while ((match = regex.exec(durationStr)) !== null) {
        const value = parseInt(match[1], 10);
        const unit = match[2];
        totalMilliseconds += value * (timeUnits[unit] || 0);
    }

    return totalMilliseconds;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('temprole')
        .setDescription('Assign a temporary role to a user')
        .addUserOption(option =>
            option.setName('user').setDescription('The user to assign the role to').setRequired(true))
        .addRoleOption(option =>
            option.setName('role').setDescription('The role to assign').setRequired(true))
        .addStringOption(option =>
            option.setName('duration').setDescription('Duration (e.g., 1s, 15m, 1h, 2d, 1w, 1y)').setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const requiredRoles = config.ModerationRoles.temprole || [];
        const hasPermission = requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId));

        if (!hasPermission) {
            return interaction.editReply({ content: lang.NoPermsMessage, ephemeral: true });
        }

        const user = interaction.options.getUser('user');
        const role = interaction.options.getRole('role');
        const moderatorHighestRolePosition = interaction.member.roles.highest.position;
        const targetRolePosition = role.position;

        if (targetRolePosition >= moderatorHighestRolePosition) {
            return interaction.editReply({ content: lang.Temprole.SameOrHigherRoleError, ephemeral: true });
        }

        if (!role || role.id === interaction.guild.id) {
            return interaction.editReply({ content: lang.Temprole.UnknownRoleError, ephemeral: true });
        }

        const durationStr = interaction.options.getString('duration');
        const durationMs = parseDuration(durationStr);

        if (durationMs <= 0) {
            return interaction.editReply({ content: lang.Temprole.InvalidDurationFormat, ephemeral: true });
        }

        const expirationDate = new Date();
        expirationDate.setTime(expirationDate.getTime() + durationMs);

        try {
            const member = await interaction.guild.members.fetch(user.id);
            await member.roles.add(role);
            await TempRole.create({
                userId: user.id,
                guildId: interaction.guild.id,
                roleId: role.id,
                expiration: expirationDate,
            });
            const confirmationMessage = lang.Temprole.RoleAssigned
                .replace('{role}', role.name)
                .replace('{user}', user.username)
                .replace('{duration}', durationStr);

            await interaction.editReply({ content: confirmationMessage, ephemeral: true });
        } catch (error) {
            if (error.code === 50013) {
                await interaction.editReply({ content: lang.Temprole.MissingPermissionsError, ephemeral: true });
            } else {
                await interaction.editReply({ content: lang.Temprole.ErrorAssigningRole, ephemeral: true });
            }
        }
    }
};