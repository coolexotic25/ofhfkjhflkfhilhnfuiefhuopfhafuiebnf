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
const yaml = require("js-yaml");
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
const lang = yaml.load(fs.readFileSync('./lang.yml', 'utf8'));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addrole')
        .setDescription('Add a role to a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to add the role to')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('The role to add to the user')
                .setRequired(true)),

    async execute(interaction) {
        const requiredRoles = config.ModerationRoles.addrole;
        const hasPermission = requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId));

        if (!hasPermission) {
            await interaction.reply({ content: lang.NoPermsMessage, ephemeral: true });
            return;
        }

        const user = interaction.options.getUser("user");
        const role = interaction.options.getRole("role");
        const member = await interaction.guild.members.fetch(user.id);

        if (user.id === interaction.user.id) {
            await interaction.reply({ content: lang.AddRole.AddroleSelfRole, ephemeral: true });
            return;
        }

        const botHighestRole = interaction.guild.members.resolve(interaction.client.user.id).roles.highest.position;
        const rolePosition = role.position;

        if (rolePosition >= botHighestRole) {
            await interaction.reply({ content: lang.AddRole.AddroleHighestRole, ephemeral: true });
            return;
        }

        const userHighestRole = interaction.member.roles.highest.position;

        if (rolePosition >= userHighestRole) {
            await interaction.reply({ content: lang.AddRole.AddroleUserRoleNotAbove, ephemeral: true });
            return;
        }

        if (member.roles.cache.has(role.id)) {
            await interaction.reply({ content: lang.AddRole.AddroleAlreadyHave, ephemeral: true });
            return;
        }

        try {
            await member.roles.add(role);
            await interaction.reply({
                content: lang.AddRole.AddroleSuccess.replace('{role}', role.toString()).replace('{user}', user.toString()),
                ephemeral: true
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: lang.AddRole.AddroleError, ephemeral: true });
        }
    }
};