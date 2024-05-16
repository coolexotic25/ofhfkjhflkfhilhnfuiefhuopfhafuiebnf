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

const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const suggestionActions = require('../../events/Suggestions/suggestionActions');
const yaml = require('js-yaml');
const fs = require('fs');
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
const lang = yaml.load(fs.readFileSync('././lang.yml', 'utf8'));


async function openQuestionModal(interaction) {
    try {
        const modal = new ModalBuilder()
            .setCustomId('suggestionModal')
            .setTitle(lang.Suggestion.ModalTitle);

        const suggestionInput = new TextInputBuilder()
            .setCustomId('suggestionText')
            .setLabel(lang.Suggestion.ModalQuestion)
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const firstActionRow = new ActionRowBuilder().addComponents(suggestionInput);
        modal.addComponents(firstActionRow);

        await interaction.showModal(modal);
    } catch (error) {
        console.error("Error in openQuestionModal: ", error);
        await interaction.reply({ content: lang.Suggestion.Error, ephemeral: true });
    }
}

const command = new SlashCommandBuilder()
    .setName('suggestion')
    .setDescription('Manage suggestions');

const useQuestionModal = config.SuggestionSettings.UseQuestionModal;

if (!useQuestionModal) {
    command.addSubcommand(subcommand =>
        subcommand
            .setName('create')
            .setDescription('Create a new suggestion')
            .addStringOption(option =>
                option.setName('text')
                    .setDescription('The suggestion text')
                    .setRequired(true)
            )
    );
} else {
    command.addSubcommand(subcommand =>
        subcommand
            .setName('create')
            .setDescription('Create a new suggestion')
    );
}

command.addSubcommand(subcommand =>
    subcommand
        .setName('accept')
        .setDescription('Accept a suggestion')
        .addStringOption(option =>
            option.setName('id')
                .setDescription('The ID of the suggestion to accept')
                .setRequired(true)
        )
)
    .addSubcommand(subcommand =>
        subcommand
            .setName('deny')
            .setDescription('Deny a suggestion')
            .addStringOption(option =>
                option.setName('id')
                    .setDescription('The ID of the suggestion to deny')
                    .setRequired(true)
            )
    );

module.exports = {
    data: command,
    async execute(interaction, client) {
        try {
            if (!config.SuggestionSettings.Enabled) {
                await interaction.reply({ content: lang.Suggestion.SuggestionsDisabled, ephemeral: true });
                return;
            }
            const subcommand = interaction.options.getSubcommand();
            if (subcommand === 'create') {
                const allowedRoles = config.SuggestionSettings.AllowedRoles;
                const hasAllowedRole = allowedRoles.length === 0 || allowedRoles[0] === "" || allowedRoles.some(roleId => interaction.member.roles.cache.has(roleId));

                if (!hasAllowedRole && allowedRoles[0] !== "") {
                    await interaction.reply({ content: lang.NoPermsMessage, ephemeral: true });
                    return;
                }
                if (useQuestionModal) {
                    await openQuestionModal(interaction);
                } else {
                    const suggestionText = interaction.options.getString('text');
                    await suggestionActions.createSuggestion(client, interaction, suggestionText);
                }
            } else if (subcommand === 'accept' || subcommand === 'deny') {
                const acceptDenyRoles = config.SuggestionSettings.SuggestionAcceptDenyRoles;
                const hasAcceptDenyRole = acceptDenyRoles.some(roleId => interaction.member.roles.cache.has(roleId));

                if (!hasAcceptDenyRole) {
                    await interaction.reply({ content: lang.NoPermsMessage, ephemeral: true });
                    return;
                }
                const suggestionId = interaction.options.getString('id');
                if (subcommand === 'accept') {
                    await suggestionActions.acceptSuggestion(client, interaction, suggestionId);
                } else {
                    await suggestionActions.denySuggestion(client, interaction, suggestionId);
                }
            }
        } catch (error) {
            console.error("Error in suggest command: ", error);
            await interaction.reply({ content: lang.Suggestion.Error, ephemeral: true });
        }
    },
};