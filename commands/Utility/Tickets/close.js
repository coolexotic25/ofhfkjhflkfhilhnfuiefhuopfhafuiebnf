const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');

const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
const lang = yaml.load(fs.readFileSync('./lang.yml', 'utf8'));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('close')
        .setDescription('Close and delete the current ticket channel'),

    async execute(interaction) {
        if (config.TicketSettings.Enabled === false) {
            return interaction.reply({ content: "This command has been disabled in the config!", ephemeral: true });
        }

        if (!interaction.channel.name.startsWith('ticket-')) {
            return interaction.reply({ content: lang.NotInTicketChannel, ephemeral: true });
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('close_confirm')
                .setLabel('Close Ticket')
                .setStyle(ButtonStyle.Danger)
        );

        await interaction.reply({
            content: "Click the button below to close this ticket. This action cannot be undone.",
            components: [row],
            ephemeral: true,
        });

        const filter = (i) => i.customId === 'close_confirm' && i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

        collector.on('collect', async (i) => {
            if (i.customId === 'close_confirm') {
                const logsChannel = interaction.guild.channels.cache.get(config.TicketSettings.LogsChannelID);

                const log = new EmbedBuilder()
                    .setColor(config.SuccessEmbedColor)
                    .setTitle(lang.TicketLogChannelClosedEmbedTitle)
                    .setDescription(`**${lang.TicketLogClosedBy}** - ${i.user}\n**${lang.TicketLogTicket}** - ${interaction.channel.name}`)
                    .setTimestamp();

                if (logsChannel) {
                    await logsChannel.send({ embeds: [log] });
                }

                await interaction.channel.delete();
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                interaction.followUp({ content: "Ticket close command timed out.", ephemeral: true });
            }
        });
    },
};