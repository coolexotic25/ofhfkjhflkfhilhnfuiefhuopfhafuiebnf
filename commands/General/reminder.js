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

const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const mongoose = require('mongoose');
const Reminder = require('../../models/reminder');

function parseTimeToMs(timeStr) {
    const regex = /(\d+)([hmd])/;
    const parts = timeStr.match(regex);
    if (!parts) return null;

    const value = parseInt(parts[1], 10);
    const unit = parts[2];

    switch (unit) {
        case 'h': return value * 60 * 60 * 1000;
        case 'm': return value * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return null;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reminder')
        .setDescription('Set a reminder')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('The reminder message')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('time')
                .setDescription('When to remind you (e.g., "10m", "1h", "2d")')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to remind')
                .setRequired(false)),

    async execute(interaction) {
        const message = interaction.options.getString('message');
        const timeInput = interaction.options.getString('time');
        const delay = parseTimeToMs(timeInput);

        if (/@everyone|@here|<@&\d+>/.test(message)) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('Invalid Reminder Message')
                .setDescription('Your message contains disallowed mentions. Please remove any `@everyone`, `@here`, or role mentions.');
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        if (!delay) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('Invalid Time Format')
                .setDescription('Please use a valid format such as "10m", "1h", "2d".');
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        const user = interaction.options.getUser('user') || interaction.user;
        const reminderTime = new Date(Date.now() + delay);

        const reminder = new Reminder({
            userId: user.id,
            channelId: interaction.channelId,
            message: message,
            reminderTime: reminderTime,
            sent: false
        });

        await reminder.save();

        const confirmationEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('Reminder Set Successfully')
            .setDescription(`Reminder set for **${user.tag}** in **${timeInput}**.`)
            .addFields({ name: 'Message', value: message })
            .setTimestamp(reminderTime)
            .setFooter({ text: 'Reminder will occur at' });

        await interaction.reply({ embeds: [confirmationEmbed], ephemeral: true });
    }
};