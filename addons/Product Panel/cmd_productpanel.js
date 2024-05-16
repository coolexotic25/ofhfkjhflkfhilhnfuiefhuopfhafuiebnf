const { SlashCommandBuilder } = require('discord.js');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const { handleProductPanelCommand } = require('./productpanel');

const configFile = path.join(__dirname, 'config.yml');
const config = yaml.load(fs.readFileSync(configFile, 'utf8'));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('productpanel')
        .setDescription('Post your product panels')
        .addStringOption((option) =>
            option.setName('panel')
                .setDescription('The panel to send')
                .setRequired(true)
                .setChoices(...Object.keys(config.panels).map(panelId => {
                    const panelName = config.panels[panelId].title || panelId;
                    return {
                        name: panelName,
                        value: panelId
                    };
                }))
        ),
    async execute(interaction) {
        const userRoles = interaction.member.roles.cache;
        const hasRequiredRole = config.ProductPanelRole.some(roleId => userRoles.has(roleId));

        if (!hasRequiredRole) {
            await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
            return;
        }

        await handleProductPanelCommand(interaction, config);
    },
};