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
const UserData = require('../../models/UserData');
const utils = require('../../utils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setnote')
        .setDescription('Set a note on a user')
        .addUserOption(option => option.setName('user').setDescription('The user to set the note on').setRequired(true))
        .addStringOption(option => option.setName('note').setDescription('The note to set on the user').setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const requiredRoles = config.ModerationRoles.setnote;
        const hasPermission = requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId));

        if (!hasPermission) {
            return interaction.editReply({ content: lang.NoPermsMessage, ephemeral: true });
        }

        const user = interaction.options.getUser('user');
        const noteText = interaction.options.getString('note');

        if (noteText.length > 250) {
            return interaction.editReply({ content: lang.SetNote.NoteLongerThan250, ephemeral: true });
        }

        if (user.bot) {
            return interaction.editReply({ content: lang.SetNote.NoteCantAddBot, ephemeral: true });
        }

        try {
            await UserData.findOneAndUpdate(
                { userId: user.id, guildId: interaction.guild.id },
                { $set: { note: noteText } },
                { new: true, upsert: true, setDefaultsOnInsert: true }
            );

            const successEmbed = new EmbedBuilder()
                .setAuthor({ name: lang.SuccessEmbedTitle, iconURL: 'https://i.imgur.com/7SlmRRa.png' })
                .setColor(config.SuccessEmbedColor)
                .setDescription(lang.SetNote.NoteSuccess.replace(/{user}/g, `<@!${user.id}>`));

            await interaction.editReply({ embeds: [successEmbed], ephemeral: true });
        } catch (error) {
            console.error('Error setting note:', error);
            await interaction.editReply({ content: 'There was an error setting the note.', ephemeral: true });
        }
    }
};