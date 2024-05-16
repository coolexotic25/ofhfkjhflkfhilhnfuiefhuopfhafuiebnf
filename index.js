if (process.platform !== "win32") require("child_process").exec("npm install");

const colors = require('ansi-colors');
console.log(`${colors.yellow(`Starting bot, this can take a while..`)}`);

const fs = require('fs');
const packageFile = require('./package.json');
let logMsg = `\n\n[${new Date().toLocaleString()}] [STARTING] Attempting to start the bot..\nNodeJS Version: ${process.version}\nBot Version: ${packageFile.version}`;
fs.appendFile("./logs.txt", logMsg, (e) => { 
  if(e) console.log(e);
});

const version = Number(process.version.split('.')[0].replace('v', ''));
if (version < 18) {
  console.log(`${colors.red(`[ERROR] Drako Bot requires a NodeJS version of 18 or higher!\nYou can check your NodeJS by running the "node -v" command in your terminal.`)}`);

  console.log(`${colors.blue(`\n[INFO] To update Node.js, follow the instructions below for your operating system:`)}`);
  console.log(`${colors.green(`- Windows:`)} Download and run the installer from ${colors.cyan(`https://nodejs.org/`)}`);
  console.log(`${colors.green(`- Ubuntu/Debian:`)} Run the following commands in the Terminal:`);
  console.log(`${colors.cyan(`  - sudo apt update`)}`);
  console.log(`${colors.cyan(`  - sudo apt upgrade nodejs`)}`);
  console.log(`${colors.green(`- CentOS:`)} Run the following commands in the Terminal:`);
  console.log(`${colors.cyan(`  - sudo yum update`)}`);
  console.log(`${colors.cyan(`  - sudo yum install -y nodejs`)}`);

  let logMsg = `\n\n[${new Date().toLocaleString()}] [ERROR] Drako Bot requires a NodeJS version of 18 or higher!`;
  fs.appendFile("./logs.txt", logMsg, (e) => { 
    if(e) console.log(e);
  });

  process.exit()
}

const { Collection, Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Discord = require('discord.js');
const backup = require("discord-backup");
const axios = require('axios');

const mongoManager = require('./models/manager.js');

mongoManager()
  .then(() => {
  })
  .catch((error) => {
    console.error(`Failed to connect to MongoDB: ${error.message}`);
  });
 

const client = new Client({ 
  restRequestTimeout: 60000,
  partials: [Partials.Reaction],
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.GuildMembers, 
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildPresences, 
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildModeration,
     
  ]
});

module.exports = client
require("./utils.js");

const yaml = require("js-yaml")
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'))
const lang = yaml.load(fs.readFileSync('././lang.yml', 'utf8'))


const filePath = './logs.txt';
const maxLength = 300; 

const { Player } = require('discord-player');
const { YouTubeExtractor, SpotifyExtractor, SoundCloudExtractor, AppleMusicExtractor, VimeoExtractor, AttachmentExtractor, ReverbnationExtractor } = require("@discord-player/extractor");

const player = new Player(client);

player.extractors.unregisterAll();
player.extractors.register(YouTubeExtractor, {});
player.extractors.register(SpotifyExtractor, {});
player.extractors.register(SoundCloudExtractor, {});
player.extractors.register(AppleMusicExtractor, {});
   
function replacePlaceholders(template, placeholders = {}) {
  if (!template) {
      return '\u200b'; 
  }

  return Object.keys(placeholders).reduce((acc, key) => {
      const regex = new RegExp(`{${key}}`, 'gi');
      return acc.replace(regex, placeholders[key] || '');
  }, template);
}
 
player.events.on('playerStart', (queue, track) => {
  try {

    const platformName = getPlatformName(track.extractor);
    const platformEmoji = getPlatformEmoji(platformName);

    const placeholders = {
        id: track.id,
        title: track?.title || "Track",
        description: track?.description || "None",
        author: (platformName === 'Spotify' || platformName === 'Apple Music') ? `${track?.author}` : "",
        url: track?.url || "None",
        thumbnail: track?.thumbnail || "None",
        duration: track?.duration || "00:00",
        durationMS: track?.durationMS || "0000",
        views: track?.views || "0",
        requestedByMention: track?.requestedBy || "Nobody",
        requestedByDisplayName: track?.requestedBy.globalName || "Nobody",
        playlistName: track?.playlist?.title || "None",
        playlistUrl: track?.playlist?.url || "None",
        playlistThumbnail: track?.playlist?.thumbnail || "None",
        platform: platformName || "Discord",
        platformEmoji: platformEmoji || "https://imgur.com/csAsSqY",
        queueCount: queue?.tracks.data.length || "0",
        queueDuration: queue?.durationFormatted || "00:00",
    };

    // console.log(placeholders)
    const currentTrackConfig = config.MusicCommand.CurrentTrack;

    if (currentTrackConfig.Enabled) {

        if (currentTrackConfig && currentTrackConfig.Type.toUpperCase() === "EMBED") {

            const embed = new EmbedBuilder();

            if (currentTrackConfig.Embed.Color) {
                embed.setColor(currentTrackConfig.Embed.Color);
            }

            if (currentTrackConfig.Embed.Title) {
                embed.setTitle(replacePlaceholders(currentTrackConfig.Embed.Title, placeholders));
            }

            if (currentTrackConfig.Embed.Description) {
                embed.setDescription(
                    replacePlaceholders(currentTrackConfig.Embed.Description.replace((platformName !== 'Spotify' && platformName !== 'Apple Music') ? "-" : "", ""), placeholders)
                );
            }

            if (currentTrackConfig.Embed.Fields) {
                currentTrackConfig.Embed.Fields.forEach(field => {
                    const fieldName = replacePlaceholders(field.Name, placeholders);
                    const fieldValue = replacePlaceholders(field.Value, placeholders);
                    embed.addFields({
                        name: fieldName,
                        value: fieldValue,
                        inline: field.Inline ?? false
                    });
                });
            }

            if (currentTrackConfig.Embed.Thumbnail && isValidHttpUrl(replacePlaceholders(currentTrackConfig.Embed.Thumbnail, placeholders))) {
                embed.setThumbnail(replacePlaceholders(currentTrackConfig.Embed.Thumbnail, placeholders));
            }

            if (currentTrackConfig.Embed.Image && isValidHttpUrl(replacePlaceholders(currentTrackConfig.Embed.Image, placeholders))) {
                embed.setImage(replacePlaceholders(currentTrackConfig.Embed.Image, placeholders));
            }

            if (currentTrackConfig.Embed.Author && currentTrackConfig.Embed.Author.Text) {
                const authorIconUrl = replacePlaceholders(currentTrackConfig.Embed.Author.Icon, placeholders);
                embed.setAuthor({
                    name: replacePlaceholders(currentTrackConfig.Embed.Author.Text, placeholders),
                    iconURL: isValidHttpUrl(authorIconUrl) ? authorIconUrl : undefined,
                    url: placeholders.url
                });
            }

            if (currentTrackConfig.Embed.Footer && currentTrackConfig.Embed.Footer.Text) {
                const footerIconUrl = currentTrackConfig.Embed.Footer.Icon;
                embed.setFooter({
                    text: replacePlaceholders(currentTrackConfig.Embed.Footer.Text, placeholders),
                    iconURL: isValidHttpUrl(footerIconUrl) ? footerIconUrl : undefined
                });
            }

            const row = new ActionRowBuilder();
            row.addComponents(
                new ButtonBuilder()
                .setCustomId('music_back')
                .setEmoji(config.MusicCommand.Emojis.Back)
                .setStyle(ButtonStyle.Secondary)
            );

            row.addComponents(
                new ButtonBuilder()
                .setCustomId('music_play_pause')
                .setEmoji(config.MusicCommand.Emojis.Pause)
                .setStyle(ButtonStyle.Secondary)
            );

            row.addComponents(
                new ButtonBuilder()
                .setCustomId('music_next')
                .setEmoji(config.MusicCommand.Emojis.Next)
                .setStyle(ButtonStyle.Secondary)
            );

            // row.addComponents(
            //   new ButtonBuilder()
            //     .setCustomId('music_shuffle')
            //     .setEmoji(config.MusicCommand.Emojis.Shuffle)
            //     .setStyle(ButtonStyle.Secondary)
            // );

            row.addComponents(
                new ButtonBuilder()
                .setCustomId('music_loop')
                .setEmoji(config.MusicCommand.Emojis.Repeat)
                .setStyle(ButtonStyle.Secondary)
            );

            queue.metadata.channel.send({
                embeds: [embed],
                components: [row]
            });
        } else {
            if (currentTrackConfig.Message) {
                const message = replacePlaceholders(currentTrackConfig.Message, placeholders);
                queue.metadata.channel.send(message);
            }
        }
    }
} catch (error) {
    console.error('Error in playerStart event handler:', error);
}
});

player.events.on('audioTrackAdd', (queue,track) => {
  try {

    const platformName = getPlatformName(track.extractor);
    const platformEmoji = getPlatformEmoji(platformName);

    const placeholders = {
        id: track.id,
        title: track?.title || "Track",
        description: track?.description || "None",
        author: (platformName === 'Spotify' || platformName === 'Apple Music') ? `${track?.author}` : "",
        url: track?.url || "None",
        thumbnail: track?.thumbnail || "None",
        duration: track?.duration || "00:00",
        durationMS: track?.durationMS || "0000",
        views: track?.views || "0",
        requestedByMention: track?.requestedBy || "Nobody",
        requestedByDisplayName: track?.requestedBy.globalName || "Nobody",
        playlistName: track?.playlist?.title || "None",
        playlistUrl: track?.playlist?.url || "None",
        playlistThumbnail: track?.playlist?.thumbnail || "None",
        platform: platformName || "Discord",
        platformEmoji: platformEmoji || "https://imgur.com/csAsSqY",
        queueCount: queue?.tracks.data.length || "0",
        queueDuration: queue?.durationFormatted || "00:00",
    };

    // console.log(placeholders)
    const addedTrackConfig = config.MusicCommand.AddedTrack;

    if (addedTrackConfig.Enabled) {

        if (addedTrackConfig && addedTrackConfig.Type.toUpperCase() === "EMBED") {

            const embed = new EmbedBuilder();

            if (addedTrackConfig.Embed.Color) {
                embed.setColor(addedTrackConfig.Embed.Color);
            }

            if (addedTrackConfig.Embed.Title) {
                embed.setTitle(replacePlaceholders(addedTrackConfig.Embed.Title, placeholders));
            }

            if (addedTrackConfig.Embed.Description) {
                embed.setDescription(
                    replacePlaceholders(addedTrackConfig.Embed.Description.replace((platformName !== 'Spotify' && platformName !== 'Apple Music') ? "-" : "", ""), placeholders)
                );
            }

            if (addedTrackConfig.Embed.Fields) {
                addedTrackConfig.Embed.Fields.forEach(field => {
                    const fieldName = replacePlaceholders(field.Name, placeholders);
                    const fieldValue = replacePlaceholders(field.Value, placeholders);
                    embed.addFields({
                        name: fieldName,
                        value: fieldValue,
                        inline: field.Inline ?? false
                    });
                });
            }

            if (addedTrackConfig.Embed.Thumbnail && isValidHttpUrl(replacePlaceholders(addedTrackConfig.Embed.Thumbnail, placeholders))) {
                embed.setThumbnail(replacePlaceholders(addedTrackConfig.Embed.Thumbnail, placeholders));
            }

            if (addedTrackConfig.Embed.Image && isValidHttpUrl(replacePlaceholders(addedTrackConfig.Embed.Image, placeholders))) {
                embed.setImage(replacePlaceholders(addedTrackConfig.Embed.Image, placeholders));
            }

            if (addedTrackConfig.Embed.Author && addedTrackConfig.Embed.Author.Text) {
                const authorIconUrl = replacePlaceholders(addedTrackConfig.Embed.Author.Icon, placeholders);
                embed.setAuthor({
                    name: replacePlaceholders(addedTrackConfig.Embed.Author.Text, placeholders),
                    iconURL: isValidHttpUrl(authorIconUrl) ? authorIconUrl : undefined,
                    url: placeholders.url
                });
            }

            if (addedTrackConfig.Embed.Footer && addedTrackConfig.Embed.Footer.Text) {
                const footerIconUrl = addedTrackConfig.Embed.Footer.Icon;
                embed.setFooter({
                    text: replacePlaceholders(addedTrackConfig.Embed.Footer.Text, placeholders),
                    iconURL: isValidHttpUrl(footerIconUrl) ? footerIconUrl : undefined
                });
            }

            queue.metadata.channel.send({
                embeds: [embed]
            });
        } else {
            if (addedTrackConfig.Message) {
                const message = replacePlaceholders(addedTrackConfig.Message, placeholders);
                queue.metadata.channel.send(message);
            }
        }
    }
} catch (error) {
    console.error('Error in audioTrackAdd event handler:', error);
}
})

player.events.on('audioTracksAdd', (queue, tracks) => {
 
  try {
 
    const placeholders = {
        id: tracks.id,
        url: tracks?.url || "None",
        requestedByMention: tracks?.requestedBy || "Nobody",
        requestedByDisplayName: tracks?.requestedBy || "Nobody",
        playlistName: tracks?.playlist?.title || "None",
        playlistUrl: tracks?.playlist?.url || "None",
        playlistThumbnail: tracks?.playlist?.thumbnail || "None",
        trackCount: tracks?.length,
        queueCount: queue?.tracks.data.length || "0",
        queueDuration: queue?.durationFormatted || "00:00",
    };

    // console.log("Tracks added: " + placeholders.trackCount)

    const addedtracksConfig = config.MusicCommand.AddedTracks;

    if (addedtracksConfig.Enabled) {

        if (addedtracksConfig && addedtracksConfig.Type.toUpperCase() === "EMBED") {

            const embed = new EmbedBuilder();

            if (addedtracksConfig.Embed.Color) {
                embed.setColor(addedtracksConfig.Embed.Color);
            }

            if (addedtracksConfig.Embed.Title) {
                embed.setTitle(replacePlaceholders(addedtracksConfig.Embed.Title, placeholders));
            }

            if (addedtracksConfig.Embed.Description) {
                embed.setDescription(
                    replacePlaceholders(addedtracksConfig.Embed.Description.replace((platformName !== 'Spotify' && platformName !== 'Apple Music') ? "-" : "", ""), placeholders)
                );
            }

            if (addedtracksConfig.Embed.Fields) {
                addedtracksConfig.Embed.Fields.forEach(field => {
                    const fieldName = replacePlaceholders(field.Name, placeholders);
                    const fieldValue = replacePlaceholders(field.Value, placeholders);
                    embed.addFields({
                        name: fieldName,
                        value: fieldValue,
                        inline: field.Inline ?? false
                    });
                });
            }

            if (addedtracksConfig.Embed.Thumbnail && isValidHttpUrl(replacePlaceholders(addedtracksConfig.Embed.Thumbnail, placeholders))) {
                embed.setThumbnail(replacePlaceholders(addedtracksConfig.Embed.Thumbnail, placeholders));
            }

            if (addedtracksConfig.Embed.Image && isValidHttpUrl(replacePlaceholders(addedtracksConfig.Embed.Image, placeholders))) {
                embed.setImage(replacePlaceholders(addedtracksConfig.Embed.Image, placeholders));
            }

            if (addedtracksConfig.Embed.Author && addedtracksConfig.Embed.Author.Text) {
                const authorIconUrl = replacePlaceholders(addedtracksConfig.Embed.Author.Icon, placeholders);
                embed.setAuthor({
                    name: replacePlaceholders(addedtracksConfig.Embed.Author.Text, placeholders),
                    iconURL: isValidHttpUrl(authorIconUrl) ? authorIconUrl : undefined,
                    url: placeholders.url
                });
            }

            if (addedtracksConfig.Embed.Footer && addedtracksConfig.Embed.Footer.Text) {
                const footerIconUrl = addedtracksConfig.Embed.Footer.Icon;
                embed.setFooter({
                    text: replacePlaceholders(addedtracksConfig.Embed.Footer.Text, placeholders),
                    iconURL: isValidHttpUrl(footerIconUrl) ? footerIconUrl : undefined
                });
            }
  
            queue.metadata.channel.send({
                embeds: [embed]
            });
        } else {
            if (addedtracksConfig.Message) {
                const message = replacePlaceholders(addedtracksConfig.Message, placeholders);
                queue.metadata.channel.send(message);
            }
        }
    }
} catch (error) {
    console.error('Error in audioTracksAdd event handler:', error);
}  

//  console.log("New queue count " + queue?.tracks.data.length)

});

player.events.on('playerFinish', (queue, track) => {
  try {

    const platformName = getPlatformName(track.extractor);
    const platformEmoji = getPlatformEmoji(platformName);

    const placeholders = {
        id: track.id,
        title: track?.title || "Track",
        description: track?.description || "None",
        author: (platformName === 'Spotify' || platformName === 'Apple Music') ? `${track?.author}` : "",
        url: track?.url || "None",
        thumbnail: track?.thumbnail || "None",
        duration: track?.duration || "00:00",
        durationMS: track?.durationMS || "0000",
        views: track?.views || "0",
        requestedByMention: track?.requestedBy || "Nobody",
        requestedByDisplayName: track?.requestedBy.globalName || "Nobody",
        playlistName: track?.playlist?.title || "None",
        playlistUrl: track?.playlist?.url || "None",
        playlistThumbnail: track?.playlist?.thumbnail || "None",
        platform: platformName || "Discord",
        platformEmoji: platformEmoji || "https://imgur.com/csAsSqY",
        queueCount: queue?.tracks.data.length || "0",
        queueDuration: queue?.durationFormatted || "00:00",
    };

    const finishedTrackConfig = config.MusicCommand.TrackFinished;

    if (finishedTrackConfig.Enabled) {

        if (finishedTrackConfig && finishedTrackConfig.Type.toUpperCase() === "EMBED") {

            const embed = new EmbedBuilder();

            if (finishedTrackConfig.Embed.Color) {
                embed.setColor(finishedTrackConfig.Embed.Color);
            }

            if (finishedTrackConfig.Embed.Title) {
                embed.setTitle(replacePlaceholders(finishedTrackConfig.Embed.Title, placeholders));
            }

            if (finishedTrackConfig.Embed.Description) {
                embed.setDescription(
                    replacePlaceholders(finishedTrackConfig.Embed.Description.replace((platformName !== 'Spotify' && platformName !== 'Apple Music') ? "-" : "", ""), placeholders)
                );
            }

            if (finishedTrackConfig.Embed.Fields) {
                finishedTrackConfig.Embed.Fields.forEach(field => {
                    const fieldName = replacePlaceholders(field.Name, placeholders);
                    const fieldValue = replacePlaceholders(field.Value, placeholders);
                    embed.addFields({
                        name: fieldName,
                        value: fieldValue,
                        inline: field.Inline ?? false
                    });
                });
            }

            if (finishedTrackConfig.Embed.Thumbnail && isValidHttpUrl(replacePlaceholders(finishedTrackConfig.Embed.Thumbnail, placeholders))) {
                embed.setThumbnail(replacePlaceholders(finishedTrackConfig.Embed.Thumbnail, placeholders));
            }

            if (finishedTrackConfig.Embed.Image && isValidHttpUrl(replacePlaceholders(finishedTrackConfig.Embed.Image, placeholders))) {
                embed.setImage(replacePlaceholders(finishedTrackConfig.Embed.Image, placeholders));
            }

            if (finishedTrackConfig.Embed.Author && finishedTrackConfig.Embed.Author.Text) {
                const authorIconUrl = replacePlaceholders(finishedTrackConfig.Embed.Author.Icon, placeholders);
                embed.setAuthor({
                    name: replacePlaceholders(finishedTrackConfig.Embed.Author.Text, placeholders),
                    iconURL: isValidHttpUrl(authorIconUrl) ? authorIconUrl : undefined,
                    url: placeholders.url
                });
            }

            if (finishedTrackConfig.Embed.Footer && finishedTrackConfig.Embed.Footer.Text) {
                const footerIconUrl = finishedTrackConfig.Embed.Footer.Icon;
                embed.setFooter({
                    text: replacePlaceholders(finishedTrackConfig.Embed.Footer.Text, placeholders),
                    iconURL: isValidHttpUrl(footerIconUrl) ? footerIconUrl : undefined
                });
            }
 
            queue.metadata.channel.send({
                embeds: [embed]
            });
        } else {
            if (finishedTrackConfig.Message) {
                const message = replacePlaceholders(finishedTrackConfig.Message, placeholders);
                queue.metadata.channel.send(message);
            }
        }
    }
} catch (error) {
    console.error('Error in playerFinish event handler:', error);
} 
});

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
        emoji = "https://imgur.com/csAsSqY"
        break;  
  }

  return emoji;
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