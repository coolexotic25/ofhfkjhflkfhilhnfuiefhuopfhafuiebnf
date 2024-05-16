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
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder  } = require("discord.js")
const fs = require('fs');
const yaml = require("js-yaml")
const config = yaml.load(fs.readFileSync('././config.yml', 'utf8'))
const lang = yaml.load(fs.readFileSync('././lang.yml', 'utf8'))
const { useMainPlayer, QueryType, useHistory, QueueRepeatMode } = require('discord-player');
const { createCanvas, loadImage } = require('canvas');
const getColors = require('get-image-colors');
const { Query } = require('mongoose');
const moment = require('moment');


async function autocompleteRun(interaction) {
    try {
        const player = useMainPlayer();
        const query = interaction.options.getString('query', true);
        let choices = [];

        const searchResult = await player.search(query, { requestedBy: interaction.member, searchEngine: QueryType.YOUTUBE });

        let artistQuery = '';
        const artistMatch = query.match(/artist:([^\s]+)/);
        if (artistMatch && artistMatch[1]) {
            artistQuery = artistMatch[1].toLowerCase();
        }

        searchResult._data.tracks.forEach(track => {
            const trackTitle = track.title.toLowerCase();
            const trackArtist = track.author ? track.author.toLowerCase() : '';
            if (trackTitle.includes(query.toLowerCase()) && (!artistQuery || trackArtist.includes(artistQuery))) {
                const choice = `${track.title} - ${track.source}`;
                if (choice.length <= 100) { 
                    choices.push(choice);
                }
            }
        });

        const filteredChoices = choices.slice(0, 5);

        await interaction.respond(filteredChoices.map(choice => ({ name: choice, value: choice })));
    } catch (error) {
     }
}
 
module.exports = {
    data: new SlashCommandBuilder()
        .setName('music')
        .setDescription('Music related commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('play')
                .setDescription('Play a song')
                .addStringOption(option =>
                    option.setName('query')
                        .setDescription('The song to play')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('pause')
                .setDescription('Pause the current song'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('resume')
                .setDescription('Resume the current song'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('skip')
                .setDescription('Skip the current song'))
                // .addIntegerOption(option =>
                //     option.setName('skipcount')
                //         .setDescription('The amount of songs to skip')
                //         .setRequired(false))
        .addSubcommand(subcommand =>
            subcommand
                .setName('back')
                .setDescription('Go back a song'))
        // .addSubcommand(subcommand =>
        //     subcommand
        //         .setName('shuffle')
        //         .setDescription('Shuffle the queue'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('loop')
                .setDescription('Toggle loop for the current song or queue')
                .addStringOption(option =>
                    option.setName('mode')
                        .setDescription('Select loop mode')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Off', value: 'OFF' },
                            { name: 'Track', value: 'TRACK' },
                            { name: 'Queue', value: 'QUEUE' },
                            { name: 'Autoplay', value: 'AUTOPLAY' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('queue')
                .setDescription('List the songs next in queue'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('playingnow')
                .setDescription('Information about the current song'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Clear the queue'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('filters')
                .setDescription('Shows the filters control embed'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('seek')
                .setDescription('Skip to a certain part of the current song')
                .addStringOption(option =>
                    option.setName('time')
                        .setDescription('Format: HH:MM:SS')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('move')
                .setDescription('Move a song to a specific postion in queue')
                .addIntegerOption(option =>
                    option.setName('songtomove')
                        .setDescription('The position of the song to move')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('moveposition')
                        .setDescription('The new position of the song to move')
                        .setRequired(true))),

    async execute(interaction, client) {
        const player = useMainPlayer();

        const whitelistRoles = config.MusicCommand.WhitelistRoles;
        const blacklistRoles = config.MusicCommand.BlacklistRoles;
        const userRoles = interaction.member.roles.cache.map(role => role.id);

        if(config.MusicCommand.EnableWhitelist) {
            const isBlacklisted = userRoles.some(roleId => blacklistRoles.includes(roleId));
            if (isBlacklisted) {
                await interaction.editReply({
                    content: lang.Music.NoPermission,
                    ephemeral: true,
                });
                return;
            }

            const isWhitelisted = userRoles.some(roleId => whitelistRoles.includes(roleId));
            if (!isWhitelisted) {
                await interaction.editReply({
                    content: lang.Music.NoPermission,
                    ephemeral: true,
                });
                return;
            }
 
        }
 
        if (!interaction.member.voice.channel) {
            await interaction.editReply({
                content: lang.Music.NotInVoiceChannel,
                ephemeral: true
            });
            return;
        }

        if (interaction.guild.members.me.voice.channel && interaction.member.voice.channel.id !== interaction.guild.members.me.voice.channel.id) {
            await interaction.editReply({
                content: lang.Music.NotInSameVoiceChannel,
                ephemeral: true
            });
            return;
        }

        const channel = interaction.member.voice.channel;
        if (!channel) {
            await interaction.editReply({ content: lang.Music.NotInVoiceChannel, ephemeral: true });
            return;
        }
 
        // await interaction.editReply({ content: "Loading", ephemeral: true });

        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'back':
                await back(interaction, player);
                break;
            case 'play':
                await play(interaction, player, channel);
                break;
            case 'pause':
                await pause(interaction, player, channel);
                break;
            case 'resume':
                await resume(interaction, player, channel);
                break;
            case 'skip':
                await skip(interaction, player);
                break;
            case 'loop':  
                await loop(interaction, player, client);
                break;
            case 'playingnow':  
                await nowplaying(interaction, player, client);
                break;
            case 'seek':  
                await seek(interaction, player, client);
                break;
            case 'clear':
                await clear(interaction, player, channel);
                break;
            case 'queue':  
                await queue(interaction, player);
                break;
            case 'move':  
                await move(interaction, player);
                break;
            // case 'shuffle':  
            //     await shuffle(interaction, player);
            //     break;
            case 'filters':
                await filters(interaction,player);
                break;
            default:
                await interaction.editReply({ content: 'Invalid command', ephemeral: true });
        }
    },
    autocompleteRun: autocompleteRun

}

async function play(interaction, player, channel) {
    const query = interaction.options.getString('query', true);
    const queue = player.nodes.get(interaction.guild.id);
  
    try {
        await interaction.editReply({
            content: lang.Music.AddingTrack
        });

        await player.play(channel, query, {
            requestedBy: interaction.user,
            nodeOptions: {
                leaveOnEnd: false,
                leaveOnEmpty: config.MusicCommand.LeaveOnEmpty,
                leaveOnEmptyCooldown: config.MusicCommand.LeaveOnEmptyTimer,
                metadata: interaction,
                requestedByUser: interaction.user
            }
        });
 
        //  return interaction.editReply(lang.Music.AddedToQueue);
    } catch (e) {
        if (e.message && e.message.includes('ERR_NO_RESULT')) {
            return interaction.editReply({ content: lang.Music.QueryNotFound, ephemeral: true} );
        }

        return interaction.editReply( {content: lang.Music.Error, ephemeral: true} );
    }
}

async function pause(interaction, player) {
    try {

        const queue = player.nodes.get(interaction.guild.id);
        // console.log(queue)
        if (!queue || !queue.tracks || queue.tracks.data.length === 0) {
            await interaction.followUp({ content: lang.Music.NoMusicInQueue  });
            return;
        }
        
        if(!queue.node.isPaused()) {
            queue.node.pause();
            await interaction.editReply({ content:  lang.Music.Paused.replace("{title}", queue.currentTrack.title) });
            return;
        } else {
            await interaction.editReply({ content: lang.Music.AlreadyPaused.replace("{title}", queue.currentTrack.title) });

        }
 
    } catch (error) {
        if (!interaction.replied) { 
            await interaction.followUp({ content: lang.Music.Error });
            console.log(error)
        }
    }
}

async function resume(interaction, player) {
    try {
        const queue = player.nodes.get(interaction.guild.id);
        if (!queue || !queue.tracks || queue.tracks.data.length === 0) {
            await interaction.editReply({ content: lang.Music.NoMusicInQueue, ephemeral: true });
            return;
        }

        if(!queue.node.isPlaying()) {
            queue.node.resume();
            await interaction.editReply({ content:  lang.Music.Resumed.replace("{title}", queue.currentTrack.title) });
            return;
        } else {
            await interaction.editReply({ content: lang.Music.AlreadyResumed.replace("{title}", queue.currentTrack.title) });
        }
  
    } catch (error) {
        if (!interaction.replied) { 
            await interaction.followUp({ content: lang.Music.Error, ephemeral: true });
        }
    }
}

// async function shuffle(interaction, player) {
//     try {
//         const queue = player.nodes.get(interaction.guild.id);

//         if (!queue) {
//             await interaction.editReply({ content: "No music in queue." });
//             return;
//         }
  
//         queue.toggleShuffle()
//         console.log("shuffling:" +   queue.isShuffling);
//         const trackList = queue.tracks.store;
              
//         trackList.forEach((track, index) => {
//            console.log(index + ". " + track.title);
//         });

//         await interaction.editReply({ content: `Shuffle: ${queue.isShuffling ? "Enabled" : "Disabled"}`});
//     } catch (error) {
//         console.error("Error toggling shuffle:", error);
//         if (!interaction.replied) {
//             await interaction.followUp({ content: "Something went wrong.", ephemeral: true });
//         }
//     }
// }

async function clear(interaction, player) {
    try {
        const queue = player.nodes.get(interaction.guild.id);
        if (!queue) {
            await interaction.editReply({ content: lang.Music.NoMusicInQueue, ephemeral: true });
        }

        queue.clear();
        await interaction.editReply({ content: lang.Music.QueueCleared, ephemeral: true });
    
    } catch (error) {
        if (!interaction.replied) { 
            await interaction.followUp({ content: lang.Music.Error, ephemeral: true });
        }
    }
}

async function skip(interaction, player) {
    try {
        const queue = player.nodes.get(interaction.guild.id);
        if (!queue) {
            await interaction.editReply({ content: lang.Music.NoMusicInQueue, ephemeral: true });
        }

        if(!queue.node.isIdle()) {
            queue.node.skip();
            await interaction.editReply({ content: lang.Music.Skipped.replace("{title}", queue.currentTrack.title), ephemeral: true });
            return;

        } else {
            await interaction.editReply({ content: lang.Music.NothingToSkip, ephemeral: true });
        }

    } catch (error) {
        if (!interaction.replied) { 
            await interaction.followUp({ content: lang.Music.Error, ephemeral: true });
        }
    }
}

async function back(interaction, player) {
    try {
        const queue = player.nodes.get(interaction.guild.id);
        if (!queue || !queue.tracks || queue.tracks.data.length === 0) {
            await interaction.editReply({ content: lang.Music.NoMusicInQueue, ephemeral: true });
            return;
        }

        const history = useHistory(interaction.guild.id);
        if (!history || history.isEmpty()) {
            await interaction.editReply({
                content: lang.Music.NoPreviousMusic,
                ephemeral: true
            });
            return;
        }

        await history.previous();
        await interaction.editReply({ content: lang.Music.WentBackATrack, ephemeral: true});
    } catch (error) {
        if (!interaction.replied) {
            await interaction.followUp({ content: lang.Music.Error, ephemeral: true });
        }
    }
}
  
async function loop(interaction, player, client) {
    try {
        const guildId = interaction.guild.id;
        const queue = player.nodes.get(guildId);

        if (!queue) {
            await interaction.editReply({ content: lang.Music.NoMusicInQueue, ephemeral: true });
            return;
        }

        const loopMode = interaction.options.getString('mode');

        let mode;
        switch(loopMode.toUpperCase()) {
            case 'OFF':
                mode = QueueRepeatMode.OFF;
                break;
            case 'TRACK':
                mode = QueueRepeatMode.TRACK;
                break;
            case 'QUEUE':
                mode = QueueRepeatMode.QUEUE;
                break;
            case 'AUTOPLAY':
                mode = QueueRepeatMode.AUTOPLAY;
                break;
            default:
                mode = QueueRepeatMode.OFF;
        }
        queue.setRepeatMode(mode);

        let loopModeMessage;
        let loopType;
        switch (mode) {
            case 0:
                loopModeMessage = lang.Music.Looping.Off;
                loopType = "Off";
                break;
            case 1:
                loopModeMessage = lang.Music.Looping.Track;
                loopType = "Track";
                break;
            case 2:
                loopModeMessage = lang.Music.Looping.Queue;
                loopType = "Queue";
                break;
            case 3:
                loopModeMessage = lang.Music.Looping.Autoplay;
                loopType = "Autoplay";
                break;
        }
    
        await interaction.editReply({content: loopModeMessage.replace("{state}", loopType), ephemeral: true });

    } catch (error) {
        console.log(error)
        await interaction.followUp({ content: lang.Music.Error, ephemeral: true });
    }
}

async function queue(interaction, player) {
    try {
        const queue = player.nodes.get(interaction.guild.id);
        if (!queue || queue.tracks.data.length === 0) {
            await interaction.editReply({ content: lang.Music.NoMusicInQueue, ephemeral: true });
            return;
        }
        const placeholders = {
            title: queue.currentTrack?.title,
            author: queue.currentTrack?.author,
            duration: queue.currentTrack?.estimatedDuration,
            queueDuration: queue.durationFormatted
        };
        const { Embed: embedConfig, SongsPerPage: maxTracksPerPage } = config.MusicCommand.Queue || {};
        const totalPages = Math.ceil(queue.tracks.data.length / maxTracksPerPage);
        let currentPage = 0;
 
        const buildDescription = (page) => {
            const trackListStart = page * maxTracksPerPage;
            const trackListEnd = Math.min(trackListStart + maxTracksPerPage, queue.tracks.data.length);
            const trackList = queue.tracks.data.slice(trackListStart, trackListEnd);
        
            let description = replacePlaceholders(embedConfig.Description[0], placeholders);
            description += embedConfig.Description[1];            

            trackList.forEach((track, index) => {
                const trackPlaceholders = {
                    numberInQueue: trackListStart + index + 1,
                    title: track.title,
                    author: track.author,
                    duration: track.duration,
                };
                description += replacePlaceholders(embedConfig.Description[2], trackPlaceholders) + '\n';
            });
        
            const pagePlaceholders = {
                currentPage: page + 1,
                totalPages: totalPages,
            };
            description += replacePlaceholders(embedConfig.Description[3], pagePlaceholders);
        
            return description;
        };

        const generateEmbed = (page) => {
            const embed = new EmbedBuilder();
            embed.setDescription(buildDescription(page));
            embed.setColor(embedConfig?.Color || "#000000");
            if (embedConfig?.Title) embed.setTitle(replacePlaceholders(embedConfig.Title, placeholders));
            if (embedConfig?.Footer?.Text) embed.setFooter({ text: embedConfig.Footer.Text, iconURL: isValidHttpUrl(embedConfig.Footer.Icon) ? embedConfig.Footer.Icon : undefined });
            if (embedConfig?.Image) embed.setImage(isValidHttpUrl(embedConfig.Image) ? embedConfig.Image : undefined);
            if (embedConfig?.Thumbnail) embed.setThumbnail(isValidHttpUrl(embedConfig.Thumbnail) ? embedConfig.Thumbnail : undefined);
            return embed;
        };

        const createButton = (id, buttonConfig, disabled) => {
            const button = new ButtonBuilder().setCustomId(id).setDisabled(disabled);
            if (buttonConfig?.Style) button.setStyle(buttonConfig.Style);
            if (buttonConfig?.Text) button.setLabel(buttonConfig.Text || '');
            if (buttonConfig?.Emoji) button.setEmoji(buttonConfig.Emoji);
            return button;
        };

        const row = new ActionRowBuilder().addComponents(
            createButton('queue_first_page', embedConfig.Buttons.Start, currentPage === 0),
            createButton(`queue_previous_${currentPage}`, embedConfig.Buttons.Back, currentPage === 0),  
            createButton(`queue_next_${currentPage}`, embedConfig.Buttons.Next, currentPage >= totalPages - 1),  
            createButton('queue_last_page', embedConfig.Buttons.End, currentPage >= totalPages - 1)
        );
         
        await interaction.followUp({ embeds: [generateEmbed(currentPage)], components: [row], ephemeral: true });
    } catch (error) {
        await interaction.followUp({ content: lang.Music.Error, ephemeral: true });
        console.log("Error with music queue command:" + error)
    }
}

async function move(interaction, player) {
    let movedTrack;
    try {
        const queue = player.nodes.get(interaction.guild.id);
        if (!queue || !queue.tracks || queue.tracks.data.length === 0) {
            await interaction.editReply({ content: lang.Music.NoMusicInQueue, ephemeral: true });
            return;
        }

        const songToMoveIndex  = interaction.options.getInteger('songtomove', true) - 1;  
        const newPosition = interaction.options.getInteger('moveposition', true) - 1; 

        if (songToMoveIndex < 0 || songToMoveIndex >= queue.tracks.data.length || newPosition < 0 || newPosition >= queue.tracks.data.length) {
            await interaction.editReply({ content: lang.Music.Move.InvalidPosition, ephemeral: true });
            return;
        }
        [movedTrack] = queue.tracks.data.splice(songToMoveIndex, 1);
        queue.swapTracks(movedTrack, newPosition); 

        await interaction.editReply({ content: lang.Music.Move.Success.replace("{track}",movedTrack.title).replace("{newPosition}", newPosition + 1) });
    } catch (error) {
        console.error(error);
        await interaction.editReply({ content: lang.Music.Move.Error.replace("{track}",movedTrack.title), ephemeral: true });
    }
}

async function filters(interaction, player) {
    try {
        const queue = player.nodes.get(interaction.guild.id);

        if (!queue || !queue.currentTrack) {
            await interaction.editReply({ content: lang.Music.NoMusicPlaying, ephemeral: true });
            return;
        }

        const specificFilters = [
            'bassboost',
            '8D',
            'vaporwave',
            'nightcore',
            'lofi',
            'reverse',
            'treble',
            'karaoke',
            'earrape'
        ];

        const disabledFilters = queue.filters.ffmpeg.getFiltersDisabled();
        const disabledSpecificFilters = disabledFilters.filter(filter => specificFilters.includes(filter));

        let numbers = '```\n',
        filtersList = '```\n',
        statuses = '```ansi\n';

    specificFilters.forEach((filter, index) => {
      const status = disabledSpecificFilters.includes(filter) ?  `[2;31m${lang.Music.Filters.Fields.Disabled}[0m` :`[2;34m${lang.Music.Filters.Fields.Enabled}[0m`;
        numbers += `${index + 1}\n`;
        filtersList += `${filter.charAt(0).toUpperCase() + filter.slice(1)}\n`;
        statuses += `${status}\n`;
    });
     numbers += '```';
     filtersList += '```';
     statuses += '```';

    const embedConfig = config.MusicCommand.Filters.Embed;

     const filtersEmbed = new EmbedBuilder();
        filtersEmbed.addFields(
             { name: embedConfig.Fields.Number, value: numbers, inline: true },
             { name: embedConfig.Fields.Filter, value: filtersList, inline: true },
             { name: embedConfig.Fields.Enabled, value: statuses, inline: true }
        );

        filtersEmbed.setTitle("`This command is Experimental!`")

        if(embedConfig.Title) {
            filtersEmbed.setDescription(embedConfig.Title)
        }

        if (embedConfig.Thumbnail && isValidHttpUrl(embedConfig.Thumbnail)) {
            filtersEmbed.setThumbnail(embedConfig.Thumbnail);
        }
 
        if (embedConfig.Footer && embedConfig.Footer.Text) {
            const footerIconUrl = embedConfig.Footer.Icon; 
            filtersEmbed.setFooter({
              text: embedConfig.Footer.Text,
              iconURL: isValidHttpUrl(footerIconUrl) ? footerIconUrl : undefined
            });
        }

        const rows = [];
        const updatedDisabledFilters = queue.filters.ffmpeg.getFiltersDisabled();
        const updatedDisabledSpecificFilters = updatedDisabledFilters.filter(filter => specificFilters.includes(filter));
        
        for (let i = 0; i < specificFilters.length; i += 3) {
            const row = new ActionRowBuilder();
            specificFilters.slice(i, i + 3).forEach(filter => {
                const isFilterDisabled = updatedDisabledSpecificFilters.includes(filter);
                const buttonStyle = isFilterDisabled ? embedConfig.Fields.Buttons.Disabled.Style : embedConfig.Fields.Buttons.Enabled.Style;
                const button = new ButtonBuilder()
                    .setCustomId(`toggle_filter_${filter}`)
                    .setLabel(filter.charAt(0).toUpperCase() + filter.slice(1))
                    .setStyle(buttonStyle);
        
                row.addComponents(button);
            });
            rows.push(row);
        }

        await interaction.followUp({ embeds: [filtersEmbed], components: rows, ephemeral: true });
    } catch (error) {
        console.log(error)
        await interaction.followUp({ content: lang.Music.Filters.EmbedError, ephemeral: true });
    }
}
 
async function nowplaying(interaction, player) {
    try {
        const queue = player.nodes.get(interaction.guild.id);
        if (!queue || !queue.currentTrack) {
            return interaction.editReply({ content: lang.Music.NoMusicPlaying, ephemeral: true });
        }
    
        const track = queue.currentTrack;
        const timestamps = queue.node.getTimestamp();
        const progressPercentage = (timestamps.current.value / timestamps.total.value) * 100;
    
       const queueCount = queue?.tracks.data.length || "0";
       const queueDuration = queue?.estimatedDuration || "00:00";
       const duration = moment.duration(queueDuration);

       let formattedDuration;
       
       if (duration.days() > 0) {
         formattedDuration = `${duration.days()}d ${duration.hours()}h`; 
       } else if (duration.hours() > 0) {
         formattedDuration = `${duration.hours()}h`;
       } else if (duration.minutes() > 0) {
         formattedDuration = `${duration.minutes()}m`; 
       } else {
         formattedDuration = `${duration.seconds()}s`;
       }
       
        const canvas = createCanvas(800, 250);
        const ctx = canvas.getContext('2d');
        const colors = await getColors(track.thumbnail);

        drawBackground(ctx, colors);
        await drawThumbnail(ctx, track);
        drawProgressBar(ctx, progressPercentage, colors);
        await drawIcon(ctx);
        let yposnthat = 42;  

        if(config.MusicCommand.NowPlaying.TracksRemaining.Enabled) {
            drawText(ctx, config.MusicCommand.NowPlaying.TracksRemaining.Text.Text, 260, yposnthat, 500, {
                size: config.MusicCommand.NowPlaying.TracksRemaining.Text.FontSize,
                weight: config.MusicCommand.NowPlaying.TracksRemaining.Text.FontWeight,
                family: config.MusicCommand.NowPlaying.TracksRemaining.Text.Font,
                textAlign: 'left',
                fillStyle: config.MusicCommand.NowPlaying.TracksRemaining.Text.Color,
                transform: config.MusicCommand.NowPlaying.TracksRemaining.Text.Uppercase ? "uppercase" : "normal"
            });
            const queueCountPadding = config.MusicCommand.NowPlaying.TracksRemaining.Value.Padding;
    
            const queueCountGradientParams = {
                x0: queueCountPadding, 
                y0: 0, 
                x1: 43, 
                y1: 0, 
                colorStops: [  
                    [0, config.MusicCommand.NowPlaying.TracksRemaining.Value.Color.Color1], 
                    [1, config.MusicCommand.NowPlaying.TracksRemaining.Value.Color.Color2]  
                ]
            };
            
            drawText(ctx, queueCount.toString(), queueCountPadding, yposnthat, 500, {
                size: config.MusicCommand.NowPlaying.TracksRemaining.Value.FontSize,
                weight: config.MusicCommand.NowPlaying.TracksRemaining.Value.FontWeight,
                family: config.MusicCommand.NowPlaying.TracksRemaining.Value.Font,
                textAlign: 'left',
                fillStyle: config.MusicCommand.NowPlaying.TracksRemaining.Value.Color.Color1,
                transform: config.MusicCommand.NowPlaying.TracksRemaining.Value.Uppercase ? "uppercase" : "normal",
                queueCountGradientParams
            });

            yposnthat += 28;
    
        }
        if(config.MusicCommand.NowPlaying.TimeRemaining.Enabled) 
        {

            drawText(ctx, config.MusicCommand.NowPlaying.TimeRemaining.Text.Text, 260, yposnthat, 500, {
                size: config.MusicCommand.NowPlaying.TimeRemaining.Text.FontSize,
                weight: config.MusicCommand.NowPlaying.TimeRemaining.Text.FontWeight,
                family: config.MusicCommand.NowPlaying.TimeRemaining.Text.Font,
                textAlign: 'left',
                fillStyle: config.MusicCommand.NowPlaying.TimeRemaining.Text.Color,
                transform: config.MusicCommand.NowPlaying.TimeRemaining.Text.Uppercase ? "uppercase" : "normal"
            });
            const timeRemainingGradientParams = {
                x0: 30, 
                y0: 0, 
                x1: 200, 
                y1: 0, 
                colorStops: [  
                    [0, config.MusicCommand.NowPlaying.TimeRemaining.Value.Color.Color1], 
                    [1, config.MusicCommand.NowPlaying.TimeRemaining.Value.Color.Color2]  
                ]
            };
            const timeRemainingCountPadding = config.MusicCommand.NowPlaying.TimeRemaining.Value.Padding;
            drawText(ctx, formattedDuration, timeRemainingCountPadding, yposnthat, 500, {
                size: config.MusicCommand.NowPlaying.TimeRemaining.Value.FontSize,
                weight: config.MusicCommand.NowPlaying.TimeRemaining.Value.FontWeight,
                family: config.MusicCommand.NowPlaying.TimeRemaining.Value.Font,
                textAlign: 'left',
                fillStyle: config.MusicCommand.NowPlaying.TimeRemaining.Value.Color.Color1,
                transform: config.MusicCommand.NowPlaying.TimeRemaining.Value.Uppercase ? "uppercase" : "normal",
                timeRemainingGradientParams
            });
    
        }

        drawText(ctx, config.MusicCommand.NowPlaying.Header.Text.Text, 60, 42, 500, {
            size: config.MusicCommand.NowPlaying.Header.Text.FontSize,
            weight: config.MusicCommand.NowPlaying.Header.Text.FontWeight,
            family: config.MusicCommand.NowPlaying.Header.Text.Font,
            textAlign: 'left',
            fillStyle: config.MusicCommand.NowPlaying.Header.Text.Color,
            transform: config.MusicCommand.NowPlaying.Header.Text.Uppercase ? "uppercase" : "normal"
        });

        drawText(ctx, timestamps.current.label, 25, 180, 500, {
            size: config.MusicCommand.NowPlaying.Durations.Start.FontSize,
            weight: config.MusicCommand.NowPlaying.Durations.Start.FontWeight,
            family: config.MusicCommand.NowPlaying.Durations.Start.Font,
            textAlign: 'left',
            fillStyle: config.MusicCommand.NowPlaying.Durations.Start.Color,
            transform: config.MusicCommand.NowPlaying.Durations.Start.Uppercase ? "uppercase" : "normal"
        });

        drawText(ctx, timestamps.total.label, 550, 180, 500, {
            size: config.MusicCommand.NowPlaying.Durations.End.FontSize,
            weight: config.MusicCommand.NowPlaying.Durations.End.FontWeight,
            family: config.MusicCommand.NowPlaying.Durations.End.Font,
            textAlign: 'right',
            fillStyle: config.MusicCommand.NowPlaying.Durations.End.Color,
            transform: config.MusicCommand.NowPlaying.Durations.End.Uppercase ? "uppercase" : "normal"
        });

        drawText(ctx, track.author, 26, 110, 500, {
            size: config.MusicCommand.NowPlaying.Author.FontSize,
            weight: config.MusicCommand.NowPlaying.Author.FontWeight,
            family: config.MusicCommand.NowPlaying.Author.Font,
            textAlign: 'left',
            fillStyle: config.MusicCommand.NowPlaying.Author.Color,
            transform: config.MusicCommand.NowPlaying.Author.Uppercase ? "uppercase" : "normal"
        });
 
        const titleGradientParams = {
            x0: 30, 
            y0: 0, 
            x1: 200, 
            y1: 0, 
            colorStops: [  
                [0, config.MusicCommand.NowPlaying.Track.Color.Color1], 
                [1, config.MusicCommand.NowPlaying.Track.Color.Color2]  
            ]
        };
 
        drawText(ctx, track.title, 26, 139, 500, {
            size: config.MusicCommand.NowPlaying.Track.FontSize,
            weight: config.MusicCommand.NowPlaying.Track.FontWeight,
            family: config.MusicCommand.NowPlaying.Track.Font,
            textAlign: 'left',
            fillStyle: config.MusicCommand.NowPlaying.Track.Color.Color1,
            transform: config.MusicCommand.NowPlaying.Track.Uppercase ? "uppercase" : "normal",
            gradient: titleGradientParams 
        });

        const buffer = canvas.toBuffer();
        const attachment = new AttachmentBuilder(buffer, { name: 'nowplaying.png' });
        await interaction.followUp({ files: [attachment], ephemeral: false });
    } catch (error) {
        if (!interaction.replied) {
            console.log(error)
            await interaction.followUp({ content: lang.Music.NowPlaying.GeneratingError, ephemeral: true });
        }
    }
}
  
function drawBackground(ctx, colors) {
    ctx.fillStyle = config.MusicCommand.NowPlaying.Background.Color;
    roundRect(ctx, 0, 0, ctx.canvas.width, ctx.canvas.height, config.MusicCommand.NowPlaying.Background.BorderRadius);
    ctx.fill();
}

async function drawThumbnail(ctx, track) {
    if (track.thumbnail) {
        const img = await loadImage(track.thumbnail);
        ctx.save(); 
        const thumbX = 575;
        const thumbY = 25;
        const thumbWidth = 200;
        const thumbHeight = 200;
        const thumbBorderRadius = config.MusicCommand.NowPlaying.Cover.BorderRadius;

        roundRect(ctx, thumbX, thumbY, thumbWidth, thumbHeight, {
            tl: thumbBorderRadius,
            tr: thumbBorderRadius,
            br: thumbBorderRadius,
            bl: thumbBorderRadius
        });
        ctx.clip();
        ctx.drawImage(img, thumbX, thumbY, thumbWidth, thumbHeight);
        ctx.restore();
    }
}

async function drawIcon(ctx) {
        const img = await loadImage(config.MusicCommand.NowPlaying.Header.Icon.Url);
        ctx.save(); 
        const iconX = 5;
        const iconY = 5;
        const iconWidth = 60;
        const iconHeight = 60;
        const iconBorderRadius = 10;

        roundRect(ctx, iconX, iconY, iconWidth, iconHeight, {
            tl: iconBorderRadius,
            tr: iconBorderRadius,
            br: iconBorderRadius,
            bl: iconBorderRadius
        });
        ctx.clip();
        ctx.drawImage(img, iconX, iconY, iconWidth, iconHeight);
        ctx.restore();
}

function drawProgressBar(ctx, progressPercentage, colors) {
    const progress = { x: 25, y: 190, width: 525, height: 35, borderRadius: config.MusicCommand.NowPlaying.ProgressBar.BorderRadius };
    ctx.fillStyle = config.MusicCommand.NowPlaying.ProgressBar.Colors.BackgroundColor;
    roundRect(ctx, progress.x, progress.y, progress.width, progress.height, progress.borderRadius);
    ctx.fill();

    const filledWidth = Math.max(progress.width * (progressPercentage / 100), 22);
    if(config.MusicCommand.NowPlaying.ProgressBar.Colors.UseDynamicColors) {
        const gradient = ctx.createLinearGradient(progress.x, progress.y, progress.x + progress.width, progress.y);
        colors.forEach((color, index) => gradient.addColorStop(index / (colors.length - 1), color.hex()));
        ctx.fillStyle = gradient;
    } else {
        const gradient = ctx.createLinearGradient(progress.x, progress.y, progress.x + progress.width, progress.y);
        gradient.addColorStop(0, config.MusicCommand.NowPlaying.ProgressBar.Colors.Color1); 
        gradient.addColorStop(1, config.MusicCommand.NowPlaying.ProgressBar.Colors.Color2); 
        ctx.fillStyle = gradient;
    }
  
    roundRect(ctx, progress.x, progress.y, filledWidth, progress.height, { tl: progress.borderRadius, tr: 0, br: 0, bl: progress.borderRadius });
    ctx.fill();
}

function drawText(ctx, text, x, y, maxWidth,{
    size = '20px', 
    weight = 'normal', 
    style = 'normal', 
    family = 'Sans', 
    textAlign = 'left', 
    fillStyle = '#FFFFFF',
    transform = 'none',
    gradient = null
} = {}) {
    text = transform === 'uppercase' ? text.toUpperCase() :
           transform === 'lowercase' ? text.toLowerCase() : text;

    ctx.font = `${style} ${weight} ${size} ${family}`;
    ctx.textAlign = textAlign;

    if (gradient && Array.isArray(gradient.colorStops)) {
        const textGradient = ctx.createLinearGradient(gradient.x0, gradient.y0, gradient.x1, gradient.y1);
        gradient.colorStops.forEach(stop => {
            if (Array.isArray(stop) && stop.length === 2) {
                textGradient.addColorStop(stop[0], stop[1]);
            }
        });
        ctx.fillStyle = textGradient;
    } else {
        ctx.fillStyle = fillStyle;
    }

    if (maxWidth && ctx.measureText(text).width > maxWidth) {
        let truncatedText = text;
        while (ctx.measureText(`${truncatedText}...`).width > maxWidth) {
            truncatedText = truncatedText.slice(0, -1);
        }
        text = `${truncatedText}...`;
    }

    ctx.fillText(text, x, y);
}
 
function roundRect(ctx, x, y, width, height, radius) {
    if (typeof radius === 'number') {
        radius = { tl: radius, tr: radius, br: radius, bl: radius };
    } else {
        var defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 };
        for (var side in defaultRadius) {
            radius[side] = radius[side] || defaultRadius[side];
        }
    }

    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
}
 
async function seek(interaction, player) {
    try {
        const queue = player.nodes.get(interaction.guild.id);

        if (!queue || !queue.currentTrack) {
            await interaction.editReply({ content: lang.Music.NoMusicPlaying, ephemeral: true });
            return;
        }

        const timeString = interaction.options.getString('time', true);
        const timeParts = timeString.split(':').reverse();
        const seconds = timeParts.reduce((acc, timePart, index) => {
            return acc + parseInt(timePart, 10) * Math.pow(60, index);
        }, 0);

        const seekResult = queue.node.seek(seconds * 1000);

        if (seekResult) {
            await interaction.editReply({ content: lang.Music.Seeked.Success.replace("{time}", timeString) , ephemeral: false });
        } else {
            await interaction.editReply({ content: lang.Music.Seeked.Error.replace("{time}", timeString), ephemeral: true });
        }
    } catch (error) {
        if (!interaction.replied) {
            await interaction.followUp({ content: lang.Music.Error, ephemeral: true }).catch(console.error);
        }
    }
}
 
  function getPlatformName(details) {
    let platformName = 'Unknown Platform';
  
    for (const protocol of details.protocols) {
      switch (protocol) {
        case 'ytsearch':
        case 'youtube':
          platformName = 'YouTube';
          break; 
  
        case 'spsearch':
        case 'spotify':
          platformName = 'Spotify';
          break;
  
        case 'scsearch':
        case 'soundcloud':
          platformName = 'SoundCloud';
          break; 
  
        case 'amsearch':
        case 'applemusic':
          platformName = 'Apple Music';
          break; 
  
        default:
          continue; 
      }
  
      if (platformName !== 'Unknown Platform') {
        break;
      }
    }
  
    return platformName;
  }
  
  function getPlatformEmoji(platformName) {
   
      let emoji = "";
      switch (platformName) {
        case 'YouTube':
          emoji = config.MusicCommand.Emojis.Platform.YouTube;
          break; 
        case 'Spotify':
          emoji = config.MusicCommand.Emojis.Platform.Spotify;
          break; 
        case 'SoundCloud':
          emoji = config.MusicCommand.Emojis.Platform.SoundCloud;
          break; 
        case 'Apple Music':
          emoji = config.MusicCommand.Emojis.Platform.AppleMusic;
          break; 
        default:
          emoji = config.MusicCommand.Emojis.Music
          break; 
       
    }
  
    return emoji;
  }

  function replacePlaceholders(template, placeholders = {}) {
    if (!template) {
        return '\u200b'; 
    }
    return template.replace(/{([^}]+)}/g, (match, key) => {
        if (key in placeholders) {
            return placeholders[key] || '';
        } else {
            return match;
        }
    });
  }
   
  function isValidHttpUrl(string) {
    let url;
  
    try {
      url = new URL(string);
    } catch (_) {
      return false;  
    }
  
    return url.protocol === "http:" || url.protocol === "https:";
  }