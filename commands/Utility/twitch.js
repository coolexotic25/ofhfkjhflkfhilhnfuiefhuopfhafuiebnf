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

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const TwitchStreamers = require('../../models/twitch');

const twitchCommand = {
    data: new SlashCommandBuilder()
        .setName('twitch')
        .setDescription('Manage Twitch streamers')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a Twitch streamer to monitor')
                .addStringOption(option =>
                    option
                        .setName('streamer')
                        .setDescription('Name of the Twitch streamer to add')
                        .setRequired(true)
                )
                .addUserOption(option =>
                    option
                        .setName('discord_user')
                        .setDescription('Select the Discord user of the streamer')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a Twitch streamer from monitoring')
                .addStringOption(option =>
                    option
                        .setName('streamer')
                        .setDescription('Name of the Twitch streamer to remove')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all monitored Twitch streamers')
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const subcommand = interaction.options.getSubcommand();
        const streamerName = interaction.options.getString('streamer', false);
        const discordUser = interaction.options.getUser('discord_user', false);

        try {
            if (subcommand === 'add') {
                const existingStreamer = await TwitchStreamers.findOne({ name: streamerName });

                if (existingStreamer) {
                    return interaction.editReply({
                        content: `Streamer **${streamerName}** is already being monitored.`,
                        ephemeral: true,
                    });
                }

                const newStreamer = new TwitchStreamers({
                    name: streamerName,
                    discordUserId: discordUser ? discordUser.id : undefined,
                    discordUsername: discordUser ? `${discordUser.username}#${discordUser.discriminator}` : undefined
                });
                await newStreamer.save();
                return interaction.editReply({
                    content: `Streamer **${streamerName}** has been added to monitoring.`,
                    ephemeral: true,
                });

            } else if (subcommand === 'remove') {
                const removedStreamer = await TwitchStreamers.findOneAndDelete({ name: streamerName });

                if (!removedStreamer) {
                    return interaction.editReply({
                        content: `Streamer **${streamerName}** not found.`,
                        ephemeral: true,
                    });
                }

                return interaction.editReply({
                    content: `Streamer **${streamerName}** has been removed from monitoring.`,
                    ephemeral: true,
                });

            } else if (subcommand === 'list') {
                const streamers = await TwitchStreamers.find({});
                const streamerNames = streamers.map(s => `${s.name} (Discord ID: ${s.discordUserId || 'Not Linked'})`);

                const embed = new EmbedBuilder()
                    .setTitle("Monitored Twitch Streamers")
                    .setDescription(streamerNames.length > 0 ? streamerNames.join('\n') : "No Twitch streamers are being monitored.")
                    .setColor("#1E90FF")
                    .setFooter({ text: "Twitch Streamer List" });

                return interaction.editReply({
                    embeds: [embed],
                    ephemeral: true,
                });

            }
        } catch (error) {
            console.error('Error executing Twitch command:', error);
            return interaction.editReply({
                content: 'An error occurred while executing the command. Please try again later.',
                ephemeral: true,
            });
        }
    },
};

module.exports = twitchCommand;