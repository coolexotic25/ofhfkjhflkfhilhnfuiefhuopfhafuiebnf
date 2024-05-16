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

const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { Font } = require('canvacord');
const canvacord = require('canvacord');
const path = require('path');
const yaml = require('js-yaml');
const fs = require('fs');
const UserData = require('../../../models/UserData')
const config = yaml.load(fs.readFileSync(path.join(__dirname, '../../../config.yml'), 'utf8'));
const fetch = require('node-fetch');
const sharp = require('sharp');

const rankCardConfig = config.RankCard;
const avatarCache = new Map();

async function fetchAndConvertAvatar(url) {
    if (avatarCache.has(url)) {
        return avatarCache.get(url);
    }

    const response = await fetch(url);
    const buffer = await response.buffer();
    const convertedBuffer = await sharp(buffer)
        .resize(128, 128)
        .toFormat('png')
        .toBuffer();

    avatarCache.set(url, convertedBuffer);
    return convertedBuffer;
}

async function generateRankCard(interaction, user) {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const userStatus = member.presence ? member.presence.status : 'offline';

    const users = await UserData.find({ guildId: interaction.guild.id }).sort({ level: -1, xp: -1 });
    const rank = users.findIndex(u => u.userId === user.userId) + 1;

    const avatarUrl = interaction.user.displayAvatarURL({ format: "gif", dynamic: true, size: 1024 });
    const avatarBuffer = await fetchAndConvertAvatar(avatarUrl);

    const xpNeeded = (user.level + 1) * config.LevelingSystem.XPNeeded;
    const backgroundImage = path.join(__dirname, 'backgrounds', rankCardConfig.Background);

    const rankCard = new canvacord.RankCardBuilder()
        .setBackground(backgroundImage)
        .setAvatar(avatarBuffer)
        .setDisplayName(interaction.user.username.toUpperCase())
        .setCurrentXP(user.xp)
        .setRequiredXP(xpNeeded)
        .setLevel(user.level)
        .setRank(rank)
        .setStatus(userStatus)
        .setOverlay(rankCardConfig.OverlayOpacity)
        .setStyles({
            username: {
                name: {
                    className: `text-[${rankCardConfig.UsernameColor}] text-${rankCardConfig.UsernameSize} ${rankCardConfig.UsernameFontWeight}`
                }
            },
            statistics: {
                level: {
                    text: {
                        className: `text-[${rankCardConfig.LevelTextColor}] text-${rankCardConfig.LevelTextSize}`
                    },
                    value: {
                        className: `text-[${rankCardConfig.LevelValueColor}] text-${rankCardConfig.LevelTextSize}`
                    }
                },
                rank: {
                    text: {
                        className: `text-[${rankCardConfig.RankTextColor}] text-${rankCardConfig.RankTextSize}`
                    },
                    value: {
                        className: `text-[${rankCardConfig.RankValueColor}] text-${rankCardConfig.RankTextSize}`
                    }
                },
                xp: {
                    text: {
                        className: `text-[${rankCardConfig.XPTextColor}] text-${rankCardConfig.XPTextSize}`
                    },
                    value: {
                        className: `text-[${rankCardConfig.XPValueColor}] text-${rankCardConfig.XPTextSize}`
                    }
                }
            },
            progressbar: {
                track: {
                    className: `bg-[${rankCardConfig.ProgressBarColor}]`
                }
            }
        });
    const buffer = await rankCard.build({ format: 'png' });
    return buffer;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Check your level and xp'),
    async execute(interaction) {
        await interaction.deferReply();

        const user = await UserData.findOne({
            userId: interaction.user.id,
            guildId: interaction.guild.id
        });

        if (!user) {
            return interaction.followUp({ content: "It looks like you don't have any level data.", ephemeral: true });
        }

        const buffer = await generateRankCard(interaction, user);
        const attachment = new AttachmentBuilder(buffer, { name: 'rank-card.png' });

        await interaction.followUp({ files: [attachment] });
    }
};