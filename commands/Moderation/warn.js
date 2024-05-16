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
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const yaml = require('js-yaml');
const fs = require('fs');
const moment = require('moment-timezone');
const UserData = require('../../models/UserData');
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
const lang = yaml.load(fs.readFileSync('./lang.yml', 'utf8'));

const MAX_WARNINGS_PER_PAGE = 5;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a user or list warnings')
        .addSubcommand(subcommand =>
            subcommand
                .setName('user')
                .setDescription('Warn a user')
                .addUserOption(option => option.setName('user').setDescription('The user to warn').setRequired(true))
                .addStringOption(option => option.setName('reason').setDescription('The reason for the warn').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List warnings for a user')
                .addUserOption(option => option.setName('user').setDescription('The user to list warnings for').setRequired(true))
        ),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const requiredRoles = config.ModerationRoles.warn;
        if (!requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId))) {
            return interaction.editReply({ content: lang.NoPermsMessage, ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'user') {
            const user = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason');
            const member = interaction.guild.members.cache.get(user.id);

            if (!member || member.user.bot || user.id === interaction.user.id) {
                return interaction.editReply({ content: lang.Warn.BotOrSelf, ephemeral: true });
            }

            try {
                const updatedUser = await updateWarningCount(member, reason, interaction);
                await warnMember(member, reason, interaction);
                interaction.editReply({ content: replacePlaceholders(lang.Warn.Success, member, interaction.member, moment(), updatedUser.warnings.length, reason), ephemeral: true });
            } catch (error) {
                console.error('Error warning user:', error);
                interaction.editReply({ content: lang.Warn.Error, ephemeral: true });
            }
        } else if (subcommand === 'list') {
            const user = interaction.options.getUser('user');
            try {
                const userData = await UserData.findOne({ userId: user.id, guildId: interaction.guild.id });
                if (userData && userData.warnings.length > 0) {
                    const totalPages = Math.ceil(userData.warnings.length / MAX_WARNINGS_PER_PAGE);

                    let currentPage = 0;
                    const sendPage = async (page) => {
                        const start = page * MAX_WARNINGS_PER_PAGE;
                        const end = start + MAX_WARNINGS_PER_PAGE;
                        const warningsForPage = userData.warnings.slice(start, end);

                        const warningEntries = warningsForPage.map((warn, index) => {
                            const formattedLongTime = moment(warn.date).format("MMMM Do YYYY");
                            const formattedShortTime = moment(warn.date).format("HH:mm");

                            return config.WarnList.Embed.EntryFormat.map(line =>
                                line.replace('{index}', start + index + 1)
                                    .replace('{longtime}', formattedLongTime)
                                    .replace('{shorttime}', formattedShortTime)
                                    .replace('{reason}', warn.reason)
                                    .replace('{moderatorId}', warn.moderatorId)
                            ).join('\n');
                        }).join('\n\n');

                        const embed = new EmbedBuilder()
                            .setTitle(config.WarnList.Embed.Title.replace('{userName}', user.username))
                            .setDescription(warningEntries)
                            .setColor(config.WarnList.Embed.Color);

                        if (config.WarnList.Embed.Thumbnail) {
                            embed.setThumbnail(user.displayAvatarURL());
                        }

                        const buttons = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId('previous')
                                    .setLabel('Previous')
                                    .setStyle(ButtonStyle.Primary)
                                    .setDisabled(page === 0),
                                new ButtonBuilder()
                                    .setCustomId('next')
                                    .setLabel('Next')
                                    .setStyle(ButtonStyle.Primary)
                                    .setDisabled(page === totalPages - 1)
                            );

                        await interaction.editReply({ embeds: [embed], components: [buttons] });
                    };

                    await sendPage(currentPage);

                    const filter = i => ['previous', 'next'].includes(i.customId) && i.user.id === interaction.user.id;
                    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

                    collector.on('collect', async i => {
                        try {
                            await i.deferUpdate();

                            if (i.customId === 'previous' && currentPage > 0) {
                                currentPage--;
                            } else if (i.customId === 'next' && currentPage < totalPages - 1) {
                                currentPage++;
                            }

                            await sendPage(currentPage);
                        } catch (error) {
                            console.error('Error handling button interaction:', error);
                        }
                    });


                    collector.on('end', () => interaction.editReply({ components: [] }));
                } else {
                    await interaction.editReply(`No warnings found for ${user.username}.`);
                }
            } catch (error) {
                console.error('Error listing warnings:', error);
                await interaction.editReply({ content: lang.Warn.Error, ephemeral: true });
            }
        }

    }
};

async function warnMember(member, reason, interaction) {
    const currentTime = moment().tz(config.Timezone);
    const warnEmbed = new EmbedBuilder()
        .setTitle(replacePlaceholders(config.WarnLogs.Embed.Title, member, interaction.member, currentTime, '', reason))
        .setColor(config.WarnLogs.Embed.Color)
        .setDescription(replacePlaceholders(config.WarnLogs.Embed.Description.join('\n'), member, interaction.member, currentTime, '', reason))
        .setFooter({ text: replacePlaceholders(config.WarnLogs.Embed.Footer, member, interaction.member, currentTime, '', '') });

    if (config.WarnLogs.Embed.Thumbnail) {
        warnEmbed.setThumbnail(member.user.displayAvatarURL());
    }

    try {
        await member.send({ embeds: [warnEmbed] });
    } catch (error) {
    }

    if (config.WarnLogs.Enabled) {
        logWarning(interaction, member, reason, currentTime);
    }
}


async function logWarning(interaction, member, reason, currentTime) {
    const description = replacePlaceholders(config.WarnLogs.Embed.Description.join('\n'), member, interaction.member, currentTime, '', reason);
    const logEmbed = new EmbedBuilder()
        .setTitle(replacePlaceholders(config.WarnLogs.Embed.Title, member, interaction.member, currentTime, '', reason))
        .setColor(config.WarnLogs.Embed.Color)
        .setDescription(description)
        .setFooter({ text: replacePlaceholders(config.WarnLogs.Embed.Footer, member, interaction.member, currentTime, '', '') });

    if (config.WarnLogs.Embed.Thumbnail) {
        logEmbed.setThumbnail(member.user.displayAvatarURL());
    }



    const logsChannel = interaction.guild.channels.cache.get(config.WarnLogs.LogsChannelID);
    if (logsChannel) {
        logsChannel.send({ embeds: [logEmbed] });
    }
}


async function updateWarningCount(member, reason, interaction) {
    const newWarning = {
        reason: reason,
        date: new Date(),
        moderatorId: interaction.user.id
    };

    return await UserData.findOneAndUpdate(
        { userId: member.id, guildId: interaction.guild.id },
        { $push: { warnings: newWarning }, $inc: { warns: 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
}

function replacePlaceholders(text, user, moderator, currentTime, extraInfo, reason) {
    return text
        .replace(/{user}/g, `<@${user.id}>`)
        .replace(/{userName}/g, user.user.username)
        .replace(/{userTag}/g, user.user.tag)
        .replace(/{userId}/g, user.user.id)
        .replace(/{moderator}/g, `<@${moderator.id}>`)
        .replace(/{moderatorName}/g, moderator.user.username)
        .replace(/{moderatorTag}/g, moderator.user.tag)
        .replace(/{moderatorId}/g, moderator.user.id)
        .replace(/{extraInfo}/g, extraInfo)
        .replace(/{reason}/g, reason || 'No reason provided')
        .replace(/{shorttime}/g, currentTime.format("HH:mm"))
        .replace(/{longtime}/g, currentTime.format('MMMM Do YYYY'));
}