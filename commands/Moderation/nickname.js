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

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nickname')
        .setDescription(lang.Nickname.Description)
        .addUserOption(option =>
            option.setName('user')
                .setDescription(lang.Nickname.UserOptionDescription)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('nickname')
                .setDescription(lang.Nickname.NicknameOptionDescription)
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: false });

        const requiredRoles = config.ModerationRoles.nickname;
        const hasPermission = requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId));

        if (!hasPermission) {
            return interaction.editReply({ content: lang.Nickname.NoPermsMessage, ephemeral: true });
        }

        const user = interaction.options.getUser('user');
        const nickname = interaction.options.getString('nickname');
        const member = interaction.guild.members.cache.get(user.id);

        if (!member) {
            return interaction.editReply({ content: lang.Nickname.UserNotFound, ephemeral: true });
        }

        try {
            await member.setNickname(nickname);
            interaction.editReply({ content: lang.Nickname.NicknameChangeSuccess.replace('{user}', user.username).replace('{nickname}', nickname), ephemeral: false });
        } catch (error) {
            console.error(error);
            interaction.editReply({ content: lang.Nickname.NicknameChangeFailure, ephemeral: true });
        }
    }
};