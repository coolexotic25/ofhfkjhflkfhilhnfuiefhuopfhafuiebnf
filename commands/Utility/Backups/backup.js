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

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const BackupModel = require('../../../models/Backup');
const backup = require('discord-backup');
const yaml = require("js-yaml");
const fs = require('fs');
const config = yaml.load(fs.readFileSync('././config.yml', 'utf8'));
const lang = yaml.load(fs.readFileSync('././lang.yml', 'utf8'));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('backup')
        .setDescription(`Manage server backups`)
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a backup of the server'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete a backup')
                .addStringOption(option => option.setName('id').setDescription('The backup ID').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('load')
                .setDescription('Load a backup')
                .addStringOption(option => option.setName('id').setDescription('The backup ID').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all server backups'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Get information about a backup')
                .addStringOption(option => option.setName('id').setDescription('The backup ID').setRequired(true))),

    async execute(interaction, client) {
        const requiredRoles = config.Backups.backup;
        const hasPermission = requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId));

        if (!hasPermission) {
            return interaction.reply({ content: lang.NoPermsMessage, ephemeral: true });
        }

        const subCmd = interaction.options.getSubcommand();
        const backupID = interaction.options.getString("id");

        switch (subCmd) {
            case 'create':
                await createBackup(interaction);
                break;
            case 'delete':
                await deleteBackup(interaction, backupID);
                break;
            case 'load':
                await loadBackup(interaction, backupID);
                break;
            case 'list':
                await listBackups(interaction);
                break;
            case 'info':
                await backupInfo(interaction, backupID);
                break;
            default:
                await interaction.reply({ content: "Unknown subcommand", ephemeral: true });
        }
    }
};

async function createBackup(interaction) {
    await interaction.reply({ content: lang.BackupCreating, ephemeral: true });
    try {
        const backupOptions = {
            maxMessagesPerChannel: 1000,
            jsonBeautify: true,
            saveImages: "base64", 
            doNotBackup: [], 
            doNotSave: []
        };
        const backupData = await backup.create(interaction.guild, backupOptions);
        const newBackup = new BackupModel({
            backupId: backupData.id,
            guildId: interaction.guild.id,
            data: backupData,
            createdAt: new Date()
        });
        await newBackup.save();
        const successEmbed = new EmbedBuilder()
            .setAuthor({ name: lang.SuccessEmbedTitle, iconURL: 'https://i.imgur.com/7SlmRRa.png' })
            .setColor(config.SuccessEmbedColor)
            .setDescription(`Backup created successfully. Backup ID: ${backupData.id}`);
        await interaction.followUp({ embeds: [successEmbed], ephemeral: true });
    } catch (err) {
        console.error('Error creating backup:', err);
        await interaction.followUp({ content: 'An error occurred while creating the backup.', ephemeral: true });
    }
}


async function deleteBackup(interaction, backupID) {
    try {
        const deletedBackup = await BackupModel.findOneAndDelete({ backupId: backupID });
        if (!deletedBackup) {
            const errorEmbed = new EmbedBuilder()
                .setAuthor({ name: lang.ErrorEmbedTitle, iconURL: 'https://i.imgur.com/MdiCK2c.png' })
                .setColor(config.ErrorEmbedColor)
                .setDescription(`No backup found with ID: ${backupID}`);
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        const successEmbed = new EmbedBuilder()
            .setAuthor({ name: lang.SuccessEmbedTitle, iconURL: 'https://i.imgur.com/7SlmRRa.png' })
            .setColor(config.SuccessEmbedColor)
            .setDescription(`Backup deleted successfully.`);
        await interaction.reply({ embeds: [successEmbed], ephemeral: true });
    } catch (err) {
        console.error('Error deleting backup:', err);
        const errorEmbed = new EmbedBuilder()
            .setAuthor({ name: lang.ErrorEmbedTitle, iconURL: 'https://i.imgur.com/MdiCK2c.png' })
            .setColor(config.ErrorEmbedColor)
            .setDescription(`An error occurred while trying to delete the backup: ${err.message}`);
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
}



async function loadBackup(interaction, backupID) {
    try {
        const backupDoc = await BackupModel.findOne({ backupId: backupID });
        if (!backupDoc) {
            await interaction.reply({ content: `No backup found with ID: ${backupID}`, ephemeral: true });
            return;
        }
        await backup.load(backupID, interaction.guild);
        await interaction.reply({ content: 'Backup loaded successfully.', ephemeral: true });
    } catch (err) {
        console.error('Error loading backup:', err);
        await interaction.reply({ content: `An error occurred while loading the backup: ${err.message}`, ephemeral: true });
    }
}

async function listBackups(interaction) {
    try {
        const backups = await BackupModel.find({ guildId: interaction.guild.id });
        if (backups.length === 0) {
            await interaction.reply({ content: 'No backups available.', ephemeral: true });
            return;
        }
        const backupList = backups.map((backup, index) => {
            return `ID: ${backup.backupId}, Created: ${backup.createdAt.toLocaleDateString()}`;
        }).join('\n');
        await interaction.reply({ content: `Available Backups:\n${backupList}`, ephemeral: true });
    } catch (err) {
        console.error('Error listing backups:', err);
        await interaction.reply({ content: 'An error occurred while listing the backups.', ephemeral: true });
    }
}

async function backupInfo(interaction, backupID) {
    try {
        const backupDoc = await BackupModel.findOne({ backupId: backupID });
        if (!backupDoc) {
            await interaction.reply({ content: `No backup found with ID: ${backupID}`, ephemeral: true });
            return;
        }
        const infoMessage = `Backup ID: ${backupDoc.backupId}\nCreated: ${backupDoc.createdAt.toLocaleDateString()}\nGuild ID: ${backupDoc.guildId}`;
        await interaction.reply({ content: infoMessage, ephemeral: true });
    } catch (err) {
        console.error('Error retrieving backup info:', err);
        await interaction.reply({ content: `An error occurred while retrieving backup information: ${err.message}`, ephemeral: true });
    }
}