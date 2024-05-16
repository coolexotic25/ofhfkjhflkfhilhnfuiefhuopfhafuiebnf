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
const { ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const yaml = require('js-yaml');
const fs = require('fs');
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
const lang = yaml.load(fs.readFileSync('./lang.yml', 'utf8'));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clearchannel')
        .setDescription('Delete all messages in a channel'),
    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });

        const requiredRoles = config.ModerationRoles.clearchannel;
        if (!requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId))) {
            return interaction.editReply({ content: lang.NoPermsMessage, ephemeral: true });
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirmClear')
                    .setLabel('Confirm')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('cancelClear')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.editReply({ content: lang.ClearChannel.ClearChannelPrompt, components: [row], ephemeral: true });

        const filter = (i) => i.customId === 'confirmClear' || i.customId === 'cancelClear';
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

        collector.on('collect', async i => {
            if (i.customId === 'confirmClear') {
                const position = interaction.channel.position;
                const newChannel = await interaction.channel.clone();
                await interaction.channel.delete();
                newChannel.setPosition(position);
                newChannel.send(lang.ClearChannel.ClearChannelCleared.replace('{user}', interaction.member));
                newChannel.send(lang.ClearChannel.ClearChannelGif);
            } else {
                interaction.editReply({ content: lang.ClearChannel.CancelClear, components: [] });
            }
        });

        collector.on('end', collected => {
            if (!collected.size) {
                interaction.editReply({ content: lang.ClearChannel.ClearTimeout, components: [] });
            }
        });
    }
};