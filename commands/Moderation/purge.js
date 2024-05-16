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
        .setName('purge')
        .setDescription('Purge specific messages in a channel')
        .addNumberOption((option) =>
            option.setName('amount')
                .setDescription('The number of messages to purge')
                .setRequired(true)
        )
        .addStringOption((option) =>
            option.setName('type')
                .setDescription('Type of messages to purge')
                .addChoices(
                    { name: 'All', value: 'all' },
                    { name: 'Links', value: 'links' },
                    { name: 'Text', value: 'text' },
                    { name: 'Bots', value: 'bots' },
                    { name: 'Embeds', value: 'embeds' },
                    { name: 'Images', value: 'images' }
                )
        ),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const requiredRoles = config.ModerationRoles.purge;
        const hasPermission = requiredRoles.some((roleId) =>
            interaction.member.roles.cache.has(roleId)
        );

        if (!hasPermission) {
            return interaction.editReply({ content: lang.NoPermsMessage, ephemeral: true });
        }

        let amount = interaction.options.getNumber('amount');
        amount = Math.min(amount, 100);
        const type = interaction.options.getString('type') || 'all';

        try {
            const messages = await interaction.channel.messages.fetch({ limit: 100 });
            let filteredMessages = filterMessages(messages, type, amount);

            filteredMessages = Array.isArray(filteredMessages) ? filteredMessages : [...filteredMessages.values()];

            const deletedMessages = await interaction.channel.bulkDelete(filteredMessages, true);
            const logEmbed = createLogEmbed(interaction, deletedMessages.size, type);
            await sendLogMessage(interaction, logEmbed);

            await interaction.editReply({
                content: lang.Purge.PurgeCleared.replace(/{amount}/g, `${deletedMessages.size}`),
                ephemeral: true,
            });
        } catch (error) {
            console.error('Purge Error:', error);
            await interaction.editReply({ content: lang.Purge.PurgeOld, ephemeral: true });
        }
    },
}

function filterMessages(messages, type, limit) {
    const filtered = messages.filter((msg) => {
        switch (type) {
            case 'links':
                return msg.content.includes('http');
            case 'text':
                return !msg.embeds.length && !msg.attachments.size;
            case 'bots':
                return msg.author.bot;
            case 'embeds':
                return msg.embeds.length > 0;
            case 'images':
                return msg.attachments.some((att) => att.contentType?.startsWith('image/'));
            default:
                return true;
        }
    });

    return [...filtered.values()].slice(0, limit);
}


function createLogEmbed(interaction, amount, type) {
    return new EmbedBuilder()
        .setAuthor({ name: lang.Purge.ModerationEmbedTitle, iconURL: 'https://i.imgur.com/FxQkyLb.png' })
        .setColor('Red')
        .addFields([
            { name: lang.Purge.ModerationEmbedAction, value: 'Purge' },
            { name: 'Purged Type', value: type },
            {
                name: lang.Purge.ModerationEmbedDetails.replace(/{user-id}/g, interaction.user.id).replace(/{amount}/g, amount).replace(/{channel}/g, interaction.channel.toString()),
                value: '\u200B',
            },
        ])
        .setTimestamp();
}

async function sendLogMessage(interaction, logEmbed) {
    const logsChannelId = config.PurgeLogChannel;
    const logsChannel = interaction.guild.channels.cache.get(logsChannelId);
    if (logsChannel) {
        await logsChannel.send({ embeds: [logEmbed] });
    }
}