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

const { SlashCommandBuilder, ChannelType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const TempVoiceChannel = require("../../models/TempVoiceChannel");
const TriggerChannel = require("../../models/TriggerChannel");
const TempVoiceBans = require('../../models/TempVoiceBans');
const fs = require('fs');
const yaml = require('js-yaml');
const config = yaml.load(fs.readFileSync('././config.yml', 'utf8'));
const lang = yaml.load(fs.readFileSync('./lang.yml', 'utf8'));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tempvoice')
        .setDescription('Manage temporary voice channels')
        .addSubcommand(subcommand =>
            subcommand
                .setName('configure')
                .setDescription('Configure a temporary voice channel creator.')
                .addChannelOption(option =>
                    option.setName('triggerchannel')
                        .setDescription('The voice channel that triggers creation of a temporary channel.')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildVoice))
                .addStringOption(option =>
                    option.setName('namepattern')
                        .setDescription('Pattern for the temporary channel name, use {user} as placeholder for username.')
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('category')
                        .setDescription('Category under which the temporary channel will be created.')
                        .addChannelTypes(ChannelType.GuildCategory))
        )

        
        .addSubcommand(subcommand =>
            subcommand.setName('lock')
                .setDescription('Locks your temporary voice channel'))
        .addSubcommand(subcommand =>
            subcommand.setName('unlock')
                .setDescription('Unlocks your temporary voice channel'))
        .addSubcommand(subcommand =>
            subcommand.setName('list')
                .setDescription('Lists all configured temporary voice channels'))
        .addSubcommand(subcommand =>
            subcommand.setName('hide')
                .setDescription('Hides your temporary voice channel'))
        .addSubcommand(subcommand =>
            subcommand.setName('unhide')
                .setDescription('Unhides your temporary voice channel'))
        .addSubcommand(subcommand =>
            subcommand.setName('limit')
                .setDescription('Sets a user limit for your temporary voice channel')
                .addIntegerOption(option =>
                    option.setName('number')
                        .setDescription('The maximum number of users (0 for no limit, up to 99)')
                        .setRequired(true)
                        .setMinValue(0)
                        .setMaxValue(99)))
        .addSubcommand(subcommand =>
            subcommand.setName('name')
                .setDescription('Renames your temporary voice channel')
                .addStringOption(option =>
                    option.setName('newname')
                        .setDescription('The new name for the voice channel')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('permit')
                .setDescription('Allows a user to connect to your temporary voice channel')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to allow')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('unpermit')
                .setDescription('Revokes permission from a user to connect to your temporary voice channel')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to unpermit')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('kick')
                .setDescription('Disconnects a user from your temporary voice channel')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to disconnect')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('ban')
                .setDescription('Ban a user from joining all of your temp voice channels')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to ban')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('unban')
                .setDescription('Unban a user to allow them to join your temp voice channels')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to ban')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('delete')
                .setDescription('Deletes a configured trigger channel')
                .addStringOption(option =>
                    option.setName('id')
                        .setDescription('The ID of the trigger channel to delete')
                        .setRequired(true))),


    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const subcommand = interaction.options.getSubcommand();

            const actionMap = {
                'configure': handleConfigure,
                'lock': handleLock,
                'unlock': handleUnlock,
                'list': handleList,
                'hide': handleHide,
                'unhide': handleUnhide,
                'limit': handleLimit,
                'name': handleRename,
                'permit': handlePermit,
                'unpermit': handleUnpermit,
                'kick': handleKick,
                'ban': handleBan,
                'unban': handleUnban,
                'delete': handleDelete
            };

            if (actionMap[subcommand]) {
                await actionMap[subcommand](interaction);
            } else {
                await interaction.editReply({ content: "Invalid command" });
            }
        } catch (error) {
            console.error("Error in execute function:", error);
        }
    }
};

async function getVerifiedVoiceChannel(interaction) {
    try {
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            await interaction.editReply({ content: lang.tempVoice.userNotInVoiceChannel, ephemeral: true });
            return null;
        }

        const tempChannel = await TempVoiceChannel.findOne({ tempChannelId: voiceChannel.id });

        if (!tempChannel || tempChannel.creatorId !== interaction.user.id) {
            await interaction.editReply({ content: lang.tempVoice.channelNotTemporary, ephemeral: true });
            return null;
        }

        return voiceChannel;
    } catch (error) {
        console.error('Error verifying voice channel:', error);
        return null;
    }
}



async function handleConfigure(interaction) {
    if (!hasRole(interaction, config.TempVoiceChannels.Roles.configure)) {
        await interaction.editReply({ content: 'You do not have permission to configure.', ephemeral: true });
        return;
    }

    const triggerChannel = interaction.options.getChannel('triggerchannel');
    const namePattern = interaction.options.getString('namepattern');
    const category = interaction.options.getChannel('category');

    try {
        const existingConfig = await TriggerChannel.findOne({ triggerChannelId: triggerChannel.id });
        if (existingConfig) {
            await interaction.editReply({
                content: `A configuration already exists for the channel ${triggerChannel.name}. Please delete the existing configuration first.`,
                ephemeral: true
            });
            return;
        }
        await TriggerChannel.create({
            triggerChannelId: triggerChannel.id,
            namePattern: namePattern,
            categoryId: category ? category.id : null
        });
        await interaction.editReply({
            content: `Configuration saved for ${triggerChannel.name}.`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Error saving trigger channel configuration:', error);
        await interaction.followUp({
            content: 'There was an error saving the configuration.',
            ephemeral: true
        });
    }
}

async function handleLock(interaction) {
    if (!hasRole(interaction, config.TempVoiceChannels.Roles.lock)) {
        await interaction.editReply({ content: 'You do not have permission to lock.', ephemeral: true });
        return;
    }

    const voiceChannel = await getVerifiedVoiceChannel(interaction);
    if (!voiceChannel) return;

    try {
        await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            [PermissionFlagsBits.Connect]: false
        });
        await voiceChannel.permissionOverwrites.edit(interaction.user.id, {
            [PermissionFlagsBits.Connect]: true
        });

        await interaction.editReply({ content: lang.tempVoice.channelLocked, ephemeral: true });
    } catch (error) {
        console.error('Error locking the voice channel:', error);
        await interaction.editReply({ content: lang.tempVoice.errorOccurred.replace("{error}", error.message), ephemeral: true });
    }
}


async function handleUnlock(interaction) {
    if (!hasRole(interaction, config.TempVoiceChannels.Roles.unlock)) {
        await interaction.editReply({ content: 'You do not have permission to unlock.', ephemeral: true });
        return;
    }

    const voiceChannel = await getVerifiedVoiceChannel(interaction);
    if (!voiceChannel) return;

    try {
        await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            [PermissionFlagsBits.Connect]: null
        });
        await voiceChannel.permissionOverwrites.edit(interaction.user.id, {
            [PermissionFlagsBits.Connect]: null
        });

        await interaction.editReply({ content: lang.tempVoice.channelUnlocked, ephemeral: true });
    } catch (error) {
        console.error('Error unlocking the voice channel:', error);
        await interaction.editReply({ content: lang.tempVoice.errorOccurred.replace("{error}", error.message), ephemeral: true });
    }
}


async function handleList(interaction) {
    if (!hasRole(interaction, config.TempVoiceChannels.Roles.list)) {
        await interaction.editReply({ content: 'You do not have permission to list configurations.', ephemeral: true });
        return;
    }

    try {
        const triggers = await TriggerChannel.find({});
        if (triggers.length === 0) {
            await interaction.editReply({ content: 'No trigger channels are configured.' });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('Configured Trigger Channels')
            .setColor('Blue')
            .setTimestamp();

        for (const trigger of triggers) {
            const channel = await interaction.guild.channels.fetch(trigger.triggerChannelId).catch(console.error);
            const channelName = channel ? channel.name : 'Channel Not Found';
            embed.addFields({
                name: `Channel Name:`,
                value: channelName,
                inline: true
            }, {
                name: `Channel ID:`,
                value: trigger.triggerChannelId,
                inline: true
            }, {
                name: `Pattern:`,
                value: trigger.namePattern,
                inline: false
            }, {
                name: `Category ID:`,
                value: trigger.categoryId || 'None',
                inline: true
            });
        }

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error fetching trigger channel configurations:', error);
        await interaction.editReply({ content: 'There was an error fetching the configurations.' });
    }
}


async function handleHide(interaction) {
    if (!hasRole(interaction, config.TempVoiceChannels.Roles.hide)) {
        await interaction.editReply({ content: 'You do not have permission to hide.', ephemeral: true });
        return;
    }

    const voiceChannel = await getVerifiedVoiceChannel(interaction);
    if (!voiceChannel) return;

    try {
        await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            [PermissionFlagsBits.ViewChannel]: false
        });

        await interaction.editReply({ content: lang.tempVoice.channelHidden, ephemeral: true });
    } catch (error) {
        console.error('Error hiding the voice channel:', error);
        await interaction.editReply({ content: lang.tempVoice.errorOccurred.replace("{error}", error.message), ephemeral: true });
    }
}


async function handleUnhide(interaction) {
    if (!hasRole(interaction, config.TempVoiceChannels.Roles.unhide)) {
        await interaction.editReply({ content: 'You do not have permission to unhide.', ephemeral: true });
        return;
    }

    const voiceChannel = await getVerifiedVoiceChannel(interaction);
    if (!voiceChannel) return;

    try {
        await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            [PermissionFlagsBits.ViewChannel]: null
        });

        await interaction.editReply({ content: lang.tempVoice.channelVisible, ephemeral: true });
    } catch (error) {
        console.error('Error unhiding the voice channel:', error);
        await interaction.editReply({ content: lang.tempVoice.errorOccurred.replace("{error}", error.message), ephemeral: true });
    }
}



async function handleLimit(interaction) {
    if (!hasRole(interaction, config.TempVoiceChannels.Roles.limit)) {
        await interaction.editReply({ content: 'You do not have permission to set a limit.', ephemeral: true });
        return;
    }

    const voiceChannel = await getVerifiedVoiceChannel(interaction);
    if (!voiceChannel) return;

    const userLimit = interaction.options.getInteger('number');
    try {
        await voiceChannel.setUserLimit(userLimit);

        await interaction.editReply({
            content: userLimit === 0 ?
                lang.tempVoice.noUserLimit :
                lang.tempVoice.userLimitSet.replace("{limit}", userLimit),
            ephemeral: true
        });
    } catch (error) {
        console.error('Error setting the user limit for the voice channel:', error);
        await interaction.reply({ content: lang.tempVoice.errorOccurred.replace("{error}", error.message), ephemeral: true });
    }
}


async function handleRename(interaction) {
    if (!hasRole(interaction, config.TempVoiceChannels.Roles.name)) {
        await interaction.editReply({ content: 'You do not have permission to rename.', ephemeral: true });
        return;
    }

    const voiceChannel = await getVerifiedVoiceChannel(interaction);
    if (!voiceChannel) return;

    const newName = interaction.options.getString('newname');
    try {
        await voiceChannel.setName(newName);
        await interaction.editReply({
            content: lang.tempVoice.channelRenamed.replace("{newname}", newName),
            ephemeral: true
        });
    } catch (error) {
        console.error('Error renaming the voice channel:', error);
        await interaction.editReply({
            content: lang.tempVoice.errorOccurred.replace("{error}", error.message),
            ephemeral: true
        });
    }
}


async function handlePermit(interaction) {
    if (!hasRole(interaction, config.TempVoiceChannels.Roles.permit)) {
        await interaction.editReply({ content: 'You do not have permission to permit.', ephemeral: true });
        return;
    }

    const voiceChannel = await getVerifiedVoiceChannel(interaction);
    if (!voiceChannel) return;

    const userToPermit = interaction.options.getUser('user');
    try {
        await voiceChannel.permissionOverwrites.edit(userToPermit.id, {
            [PermissionFlagsBits.Connect]: true
        });

        await interaction.editReply({
            content: lang.tempVoice.userPermitted.replace("{user}", userToPermit.username),
            ephemeral: true
        });
    } catch (error) {
        console.error('Error modifying permissions:', error);
        await interaction.editReply({
            content: lang.tempVoice.errorOccurred.replace("{error}", error.message),
            ephemeral: true
        });
    }
}


async function handleUnpermit(interaction) {
    if (!hasRole(interaction, config.TempVoiceChannels.Roles.unpermit)) {
        await interaction.editReply({ content: 'You do not have permission to unpermit.', ephemeral: true });
        return;
    }

    const voiceChannel = await getVerifiedVoiceChannel(interaction);
    if (!voiceChannel) return;

    const userToUnpermit = interaction.options.getUser('user');
    try {
        await voiceChannel.permissionOverwrites.edit(userToUnpermit.id, {
            [PermissionFlagsBits.Connect]: false
        });

        await interaction.editReply({
            content: lang.tempVoice.userUnpermitted.replace("{user}", userToUnpermit.username),
            ephemeral: true
        });
    } catch (error) {
        console.error('Error modifying permissions:', error);
        await interaction.editReply({
            content: lang.tempVoice.errorOccurred.replace("{error}", error.message),
            ephemeral: true
        });
    }
}


async function handleKick(interaction) {
    if (!hasRole(interaction, config.TempVoiceChannels.Roles.kick)) {
        await interaction.editReply({ content: 'You do not have permission to kick.', ephemeral: true });
        return;
    }

    const voiceChannel = await getVerifiedVoiceChannel(interaction);
    if (!voiceChannel) return;

    const userToKick = interaction.options.getUser('user');
    const memberToKick = voiceChannel.guild.members.cache.get(userToKick.id);
    if (!memberToKick || memberToKick.voice.channelId !== voiceChannel.id) {
        await interaction.editReply({
            content: lang.tempVoice.userNotInChannel.replace("{user}", userToKick.username),
            ephemeral: true
        });
        return;
    }

    try {
        await memberToKick.voice.disconnect(`Kicked by ${interaction.user.tag}`);
        await interaction.editReply({
            content: lang.tempVoice.userKicked.replace("{user}", userToKick.username),
            ephemeral: true
        });
    } catch (error) {
        console.error('Error kicking user from the channel:', error);
        await interaction.editReply({
            content: lang.tempVoice.errorOccurred.replace("{error}", error.message),
            ephemeral: true
        });
    }
}


async function handleBan(interaction) {
    if (!hasRole(interaction, config.TempVoiceChannels.Roles.ban)) {
        await interaction.editReply({ content: 'You do not have permission to ban.', ephemeral: true });
        return;
    }

    const userToBan = interaction.options.getUser('user');
    const banningUser = interaction.user;
    let banList = await TempVoiceBans.findOne({ discordId: banningUser.id });

    if (!banList) {
        banList = new TempVoiceBans({ discordId: banningUser.id, bannedUsers: [] });
    }

    if (!banList.bannedUsers.includes(userToBan.id)) {
        banList.bannedUsers.push(userToBan.id);
        await banList.save();

        const tempChannels = await TempVoiceChannel.find({ creatorId: banningUser.id });
        for (const tempChannel of tempChannels) {
            const channel = await interaction.guild.channels.fetch(tempChannel.tempChannelId).catch(console.error);
            if (channel) {
                await channel.permissionOverwrites.edit(userToBan.id, {
                    [PermissionFlagsBits.Connect]: false
                });
            }
        }

        await interaction.editReply({
            content: lang.tempVoice.userBanned.replace("{user}", userToBan.username),
            ephemeral: true
        });
    } else {
        await interaction.editReply({
            content: lang.tempVoice.userAlreadyBanned.replace("{user}", userToBan.username),
            ephemeral: true
        });
    }
}


async function handleUnban(interaction) {
    if (!hasRole(interaction, config.TempVoiceChannels.Roles.unban)) {
        await interaction.editReply({ content: 'You do not have permission to unban.', ephemeral: true });
        return;
    }

    const userToUnban = interaction.options.getUser('user');
    const unbanningUser = interaction.user;
    let banList = await TempVoiceBans.findOne({ discordId: unbanningUser.id });

    if (banList && banList.bannedUsers.includes(userToUnban.id)) {
        banList.bannedUsers = banList.bannedUsers.filter(userId => userId !== userToUnban.id);
        await banList.save();

        await interaction.editReply({
            content: lang.tempVoice.userUnbanned.replace("{user}", userToUnban.username),
            ephemeral: true
        });
    } else {
        await interaction.editReply({
            content: lang.tempVoice.userNotBanned.replace("{user}", userToUnban.username),
            ephemeral: true
        });
    }
}


async function handleDelete(interaction) {
    if (!hasRole(interaction, config.TempVoiceChannels.Roles.delete)) {
        await interaction.editReply({ content: 'You do not have permission to delete.', ephemeral: true });
        return;
    }

    const channelId = interaction.options.getString('id');

    try {
        const result = await TriggerChannel.findOneAndDelete({ triggerChannelId: channelId });
        if (result) {
            await interaction.editReply({
                content: lang.tempVoice.triggerChannelDeleted.replace("{id}", channelId),
                ephemeral: true
            });
        } else {
            await interaction.editReply({
                content: lang.tempVoice.noTriggerChannels,
                ephemeral: true
            });
        }
    } catch (error) {
        console.error('Error deleting trigger channel:', error);
        await interaction.editReply({
            content: lang.tempVoice.errorOccurred.replace("{error}", error.message),
            ephemeral: true
        });
    }
}


function hasRole(interaction, requiredRoles) {
    if (!requiredRoles) return true;
    return requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId));
}