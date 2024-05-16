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
const Discord = require("discord.js");
const fs = require('fs');
const yaml = require("js-yaml");
const moment = require('moment-timezone');
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
const lang = yaml.load(fs.readFileSync('./lang.yml', 'utf8'));
const UserData = require('../../models/UserData');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('birthday')
        .setDescription('Manage your birthday settings')
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set your birthday')
                .addStringOption(option => option.setName('date').setDescription('Your birthday, Example: May 4 2004').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('update')
                .setDescription('Update your birthday')
                .addStringOption(option => option.setName('date').setDescription('Your new birthday, Example: May 4 2004').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('check')
                .setDescription('Check your set birthday')),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });

        if (config.BirthdaySystem.Enabled === false) {
            return interaction.editReply({ content: "The birthday system is disabled in the config!", ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();
        const dateString = interaction.options.getString("date");
        const timezone = config.Timezone || 'UTC';
        const parsedDate = dateString ? moment.tz(dateString, 'MMMM D YYYY', timezone) : null;

        switch (subcommand) {
            case 'set':
            case 'update':
                if (!parsedDate.isValid()) {
                    return interaction.editReply({ content: "Invalid date format! Please use 'Month Day Year', e.g., 'May 4 2004'.", ephemeral: true });
                }

                const userData = await UserData.findOneAndUpdate(
                    { userId: interaction.user.id, guildId: interaction.guild.id },
                    { $set: { birthday: parsedDate.toDate() } },
                    { new: true, upsert: true, setDefaultsOnInsert: true }
                );

                return interaction.editReply({ content: `Your birthday has been ${subcommand === 'set' ? 'set' : 'updated'} to ${parsedDate.format('MMMM D, YYYY')}.`, ephemeral: true });

            case 'check':
                const userBirthday = await UserData.findOne({ userId: interaction.user.id, guildId: interaction.guild.id });
                if (!userBirthday || !userBirthday.birthday) {
                    return interaction.editReply({ content: "You haven't set your birthday yet.", ephemeral: true });
                }

                const birthday = moment(userBirthday.birthday).tz(timezone).format('MMMM D, YYYY');
                return interaction.editReply({ content: `Your set birthday is ${birthday}.`, ephemeral: true });

            default:
                return interaction.editReply({ content: "Invalid subcommand.", ephemeral: true });
        }
    }
};
