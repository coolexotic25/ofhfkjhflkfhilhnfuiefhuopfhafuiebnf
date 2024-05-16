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
const fs = require('fs');
const yaml = require("js-yaml");
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
const lang = yaml.load(fs.readFileSync('./lang.yml', 'utf8'));
const moment = require('moment');

const badgesFlags = {
    Discord_Employee: 1,
    Partnered_Server_Owner: 2,
    HypeSquad_Events: 4,
    Bug_Hunter_Level_1: 8,
    House_Bravery: 64,
    House_Brilliance: 128,
    House_Balance: 256,
    Early_Supporter: 512,
    Bug_Hunter_Level_2: 16384,
    Early_Verified_Bot_Developer: 131072,
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription(`Get information about a certain user`)
        .addUserOption(option => option.setName('user').setDescription('The user to get information from')),
    async execute(interaction) {
        try {
            let user = interaction.options.getUser("user") || interaction.user;
            let member = await interaction.guild.members.fetch(user.id);
            const flags = member.user.flags?.bitfield ?? 0;
            let badges = Object.keys(badgesFlags).filter(badge => (flags & badgesFlags[badge]) === badgesFlags[badge])
                .map(badge => badge.replace(/_/g, ' ')); 

            if (badges.length === 0) badges = ['None'];

            let userInfo = new EmbedBuilder()
                .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ format: 'png', dynamic: true, size: 1024 }) })
                .addFields([
                    { name: "Member Details:", value: `> **Nickname:** ${member.nickname || "*None*"}\n> **Joined at:** ${moment.utc(member.joinedAt).format("dddd, MMMM Do YYYY")}\n> **Highest Role:** ${member.roles.highest}` },
                    { name: "User Details:", value: `> **ID:** ${user.id}\n> **Username:** ${user.username}\n> **Created at:** ${moment(user.createdAt).format('DD/MM/YY')} (${moment().diff(moment(user.createdAt), 'days')} days ago)\n> **Badges:** ${badges.join(', ')}\n> **Bot:** ${user.bot ? "Yes" : "No"}` },
                ])
                .setColor(config.EmbedColors)
                .setThumbnail(user.displayAvatarURL({ format: 'png', dynamic: true, size: 1024 }))
                .setFooter({ text: `Requested by: ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL({ format: 'png', dynamic: true, size: 1024 }) })
                .setTimestamp();

            await interaction.reply({ embeds: [userInfo] });
        } catch (error) {
            console.error("Error in profile command: ", error);
            await interaction.reply({ content: 'Sorry, there was an error retrieving the profile information.', ephemeral: true });
        }
    },
};