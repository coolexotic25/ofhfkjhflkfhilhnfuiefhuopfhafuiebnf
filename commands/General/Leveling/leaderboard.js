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

const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const moment = require('moment-timezone');
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
const lang = yaml.load(fs.readFileSync('./lang.yml', 'utf8'));
const UserData = require('../../../models/UserData');
const { LeaderboardBuilder, Font } = require('canvacord');

const defaultAvatarUrl = "https://i.imgur.com/yygn7ni.png";

const defaultUser = {
    avatar: defaultAvatarUrl,
    username: "Unknown",
    displayName: "Unknown User",
    level: 0,
    xp: 0,
    rank: 0
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View leaderboards')
        .addSubcommand(subcommand =>
            subcommand
                .setName('levels')
                .setDescription('View the top 5 users with the highest level')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('messages')
                .setDescription('View the top 5 users with the most messages')
        ),

    async execute(interaction) {
        try {
            let subCmd = interaction.options.getSubcommand();
            const guildName = interaction.guild.name;
            const guildIconUrl = interaction.guild.iconURL() ? interaction.guild.iconURL({ size: 512 }) : defaultAvatarUrl;

            await interaction.deferReply();

            Font.loadDefault();
            const users = await UserData.find({ guildId: interaction.guild.id })
                .sort(subCmd === 'levels' ? { level: -1, xp: -1 } : { totalMessages: -1 })
                .limit(5);

            if (subCmd === 'levels') {
                const lb = new LeaderboardBuilder()
                    .setHeader({
                        title: guildName,
                        image: guildIconUrl,
                        subtitle: "Top 5 Levels"
                    })
                    .setVariant("default");

                let players = await Promise.all(users.map(async (user, index) => {
                    try {
                        const member = await interaction.guild.members.fetch(user.userId);
                        return {
                            avatar: member.user.displayAvatarURL({ dynamic: true, size: 512 }),
                            username: member.user.tag,
                            displayName: member.displayName || member.user.username,
                            level: user.level,
                            xp: user.xp,
                            rank: index + 1
                        };
                    } catch {
                        return { ...defaultUser, rank: index + 1 };
                    }
                }));

                for (let i = players.length; i < 5; i++) {
                    players.push({ ...defaultUser, rank: i + 1 });
                }

                lb.setPlayers(players);
                const image = await lb.build({ extension: 'png' });
                const attachment = new AttachmentBuilder(image, { name: 'leaderboard.png' });
                await interaction.editReply({ files: [attachment] });
            } else if (subCmd === 'messages') {
                let embedContent = users.map((user, index) => `${index + 1}. <@${user.userId}> - ${user.totalMessages} messages`).join('\n');

                for (let i = users.length; i < 5; i++) {
                    embedContent += `\n${i + 1}. Unknown User - 0 messages`;
                }

                const embed = new EmbedBuilder()
                    .setTitle(`Top 5 Users By Messages in ${guildName}`)
                    .setColor(0x0099FF)
                    .setDescription(embedContent)
                    .setFooter({
                        text: `Data as of ${moment().tz(config.Timezone).format('MMMM Do YYYY, HH:mm')}`,
                        iconURL: guildIconUrl
                    });

                await interaction.editReply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error in leaderboard command: ', error);
            await interaction.editReply({
                content: lang.Leaderboard.Error.replace(/{guild}/g, guildName),
                ephemeral: true,
            });
        }
    },
};