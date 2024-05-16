const { ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require("discord.js");
const fs = require('fs');
const yaml = require("js-yaml");
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
const lang = yaml.load(fs.readFileSync('./lang.yml', 'utf8'));
const { handleVerificationInteraction } = require('../events/Verification/VerificationEvent');
const suggestionActions = require('../events/Suggestions/suggestionActions');
const giveawayActions = require('../events/Giveaways/giveawayActions');
const client = require("../index")

module.exports = async (client, interaction) => {

    if (interaction.isButton()) {
        const [action, uniqueId] = interaction.customId.split('-');

        switch (action) {
            case 'verifyButton':
                await handleVerificationInteraction(client, interaction);
                break;
            case 'upvote':
                await suggestionActions.upvoteSuggestion(client, interaction, uniqueId);
                break;
            case 'downvote':
                await suggestionActions.downvoteSuggestion(client, interaction, uniqueId);
                break;
            case 'ticketcreate':
                await handleTicketCreate(client, interaction);
                break;
            case 'ticketdelete':
                await handleTicketDelete(client, interaction);
                break;
            case 'join_giveaway':
                await handleJoinGiveaway(client, interaction);
                break;
            default:
                break;
        }
    } else if (interaction.isModalSubmit()) {
        await handleModalSubmit(client, interaction);
    }
};

async function handleModalSubmit(client, interaction) {
    try {
        if (interaction.customId === 'suggestionModal') {
            const suggestionText = interaction.fields.getTextInputValue('suggestionText');
            await suggestionActions.createSuggestion(client, interaction, suggestionText);
        }
    } catch (error) {
        console.error('Error handling modal submission:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'An error occurred while processing your modal submission. Please try again later.', ephemeral: true }).catch(e => console.error('Error sending reply:', e));
        } else {
            await interaction.followUp({ content: 'An error occurred while processing your modal submission. Please try again later.', ephemeral: true }).catch(e => console.error('Error sending follow-up:', e));
        }
    }
}




async function handleJoinGiveaway(client, interaction) {
    try {

        const member = interaction.member;
        const userId = interaction.user.id;
        const username = interaction.user.username;
        const channelId = interaction.channelId;
        const messageId = interaction.message.id;


        await giveawayActions.joinGiveaway(client, userId, username, member, interaction, channelId, messageId);


    } catch (error) {
        console.error('Error in interactionCreate:', error);
    }
}

async function handleSuggestionInteraction(client, interaction, action, uniqueId) {
    try {
        if (action === 'upvote') {
            await suggestionActions.upvoteSuggestion(client, interaction, uniqueId);
        } else if (action === 'downvote') {
            await suggestionActions.downvoteSuggestion(client, interaction, uniqueId);
        }
    } catch (error) {
        console.error('Error handling suggestion interaction:', error);
        await interaction.reply({ content: 'An error occurred while processing your request. Please try again later.', ephemeral: true });
    }
}



async function handleTicketCreate(client, interaction) {
    if (interaction.guild.channels.cache.find(ch => ch.name === `ticket-${interaction.user.username.toLowerCase()}`)) {
        await interaction.reply({ content: "You already have a ticket open! Close it before opening another.", ephemeral: true });
        return;
    }

    let permissionOverwriteArray = [{
        id: interaction.member.id,
        allow: ['SendMessages', 'ViewChannel', 'AttachFiles', 'EmbedLinks', 'ReadMessageHistory']
    },
    {
        id: interaction.guild.id,
        deny: ['SendMessages', 'ViewChannel']
    },
    {
        id: client.user.id,
        allow: ['SendMessages', 'ViewChannel']
    }];

    await config.TicketSettings.SupportRoles.forEach(roleid => {
        let role = interaction.guild.roles.cache.get(roleid);
        if (role) {
            let tempArray = {
                id: role.id,
                allow: ['SendMessages', 'ViewChannel', 'AttachFiles', 'EmbedLinks', 'ReadMessageHistory']
            };
            permissionOverwriteArray.push(tempArray);
        } else {
            console.log(`[WARNING] Role ID ${roleid} from config.TicketSettings.SupportRoles is not valid!`);
        }
    });

    const channel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: 0,
        parent: config.TicketSettings.CategoryID,
        permissionOverwrites: permissionOverwriteArray
    });

    channel.setTopic(`Creator: <@!${interaction.user.id}>`);
    await interaction.reply({ content: `${lang.TicketCreatedMsg} <#${channel.id}>`, ephemeral: true });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('ticketdelete')
                .setLabel(lang.TicketCloseButton)
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔒')
        );

    const embed = new EmbedBuilder()
        .setAuthor({ name: `${config.TicketSettings.NewTicketTitle}`, iconURL: interaction.user.displayAvatarURL({ format: 'png', dynamic: true, size: 1024 }) })
        .setColor(config.EmbedColors)
        .setThumbnail(interaction.user.displayAvatarURL({ format: 'png', dynamic: true, size: 1024 }))
        .setDescription(`${config.TicketSettings.NewTicketMessage}`)
        .setTimestamp();

    await channel.send({ embeds: [embed], components: [row] });
}


async function handleTicketDelete(client, interaction) {
    const fetchedMessages = await interaction.channel.messages.fetch({ limit: 100 });
    const transcript = fetchedMessages
        .filter(m => !m.author.bot)
        .map(m => `${new Date(m.createdTimestamp).toLocaleString()} - ${m.author.tag}: ${m.content}`)
        .reverse()
        .join('\n');
    const transcriptContent = transcript.length > 0 ? transcript : "No messages in this ticket.";

    const transcriptAttachment = new AttachmentBuilder(Buffer.from(transcriptContent), { name: `${interaction.channel.name}-transcript.txt` });

    const logEmbed = new EmbedBuilder()
        .setAuthor({ name: `${lang.TicketClosedTitle}` })
        .setColor("Red")
        .addFields([
            { name: "User", value: `<@!${interaction.user.id}>` },
            { name: "Channel", value: `${interaction.channel.name}` },
        ])
        .setTimestamp();

    const logsChannel = interaction.guild.channels.cache.get(config.TicketSettings.LogsChannelID);
    if (logsChannel) {
        await logsChannel.send({ embeds: [logEmbed], files: [transcriptAttachment] });
    }

    const deleteConfirmationEmbed = new EmbedBuilder()
        .setDescription(lang.DeletingTicket)
        .setColor(config.ErrorEmbedColor);

    await interaction.reply({ embeds: [deleteConfirmationEmbed] });
    setTimeout(() => interaction.channel.delete(), 5000);
}