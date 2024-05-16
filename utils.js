const { Collection, Client, GatewayIntentBits, Discord, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ActivityType, SlashCommandBuilder, ApplicationCommandType, ContextMenuCommandBuilder } = require('discord.js');
const { Font } = require('canvacord');
const fs = require('fs');
const yaml = require("js-yaml")
const path = require('path');
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'))
const commandConfig = yaml.load(fs.readFileSync('./commands.yml', 'utf8'));
const client = require("./index.js")
const colors = require('ansi-colors');
const axios = require('axios')
const glob = require("glob");
const UserData = require('./models/UserData.js');
const packageJson = require('./package.json');
client.commands = new Collection();
client.slashCommands = new Collection();
client.snipes = new Collection();

const startGiveawayScheduler = require('./events/Giveaways/giveawayScheduler.js');
const startAfkScheduler = require('./events/AFK/afkScheduler.js');
const { handleUserJoiningTriggerChannel, handleUserLeavingChannel } = require('./events/voiceStateUpdate');
const TempVoiceChannel = require('./models/TempVoiceChannel')
const TempRole = require('./models/TempRole');
const TwitchStreamers = require('./models/twitch.js');
const Reminder = require('./models/reminder');

client.on('messageDelete', message => {
    if (!message.guild || message.author.bot) return;

    if (!client.snipes.has(message.guild.id)) {
        client.snipes.set(message.guild.id, new Collection());
    }

    const guildSnipes = client.snipes.get(message.guild.id);
    guildSnipes.set(message.channel.id, {
        content: message.content,
        author: message.author.tag,
        member: message.member,
        timestamp: new Date()
    });
});

client.on('presenceUpdate', async (oldPresence, newPresence) => {
    if (!newPresence.guild || !config.statusRoles.Log.Enabled) return;

    Object.entries(config.statusRoles.status).forEach(async ([statusText, roleIds]) => {
        const hasDefinedStatus = newPresence.activities.some(activity =>
            activity.type === ActivityType.Custom &&
            activity.state &&
            activity.state.includes(statusText));

        const member = await newPresence.guild.members.fetch(newPresence.userId);
        if (!member) return;

        roleIds.forEach(async (roleId) => {
            const role = newPresence.guild.roles.cache.get(roleId);
            if (!role) return;

            if (hasDefinedStatus) {
                if (!member.roles.cache.has(role.id)) {
                    await member.roles.add(role).catch(console.error);
                    logRoleChange(member, role, true, statusText);
                }
            } else if (oldPresence) {
                const hadDefinedStatus = oldPresence.activities.some(activity =>
                    activity.type === ActivityType.Custom &&
                    activity.state &&
                    activity.state.includes(statusText));
                if (hadDefinedStatus && member.roles.cache.has(role.id)) {
                    await member.roles.remove(role).catch(console.error);
                    logRoleChange(member, role, false, statusText);
                }
            }
        });
    });
});

function logRoleChange(member, role, added, statusText) {
    const logChannel = member.guild.channels.cache.get(config.statusRoles.Log.channelID);
    if (!logChannel) {
        console.error("Log channel not found. Check the provided channel ID.");
        return;
    }

    const roleMention = `<@&${role.id}>`;

    const descriptionArray = added
        ? config.statusRoles.Log.Description.roleAdded
        : config.statusRoles.Log.Description.roleRemoved;

    const formattedDescription = descriptionArray
        .map(line => line
            .replace('{userName}', member.displayName)
            .replace('{role}', roleMention)
            .replace('{status}', statusText))
        .join('\n');

    const embed = new EmbedBuilder()
        .setTitle(config.statusRoles.Log.Title)
        .setDescription(formattedDescription)
        .setColor(config.statusRoles.Log.Color)
        .setFooter({ text: config.statusRoles.Log.Footer })
        .setTimestamp();

    if (config.statusRoles.Log.Thumbnail) {
        embed.setThumbnail(member.user.displayAvatarURL());
    }

    if (config.statusRoles.Log.Image) {
        embed.setImage(config.statusRoles.Log.Image);
    }

    logChannel.send({ embeds: [embed] });
}

const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');

const slashCommands = [];

let giveawayCommandEnabled = false;
let afkCommandEnabled = false;

function loadSlashCommands(directory) {
    const items = fs.readdirSync(directory, { withFileTypes: true });

    for (const item of items) {
        const itemPath = path.join(directory, item.name);

        if (item.isDirectory()) {
            loadSlashCommands(itemPath);
        } else if (item.isFile() && item.name.endsWith('.js')) {
            try {
                const command = require(itemPath);

                if (command.data instanceof SlashCommandBuilder) {
                    if (commandConfig[command.data.name]) {
                        console.log(`${colors.green('[SLASH COMMAND]')} ${command.data.name} loaded!`);
                        slashCommands.push(command.data.toJSON());
                        client.slashCommands.set(command.data.name, command);
                    } else {
                        console.log(`${colors.yellow('[SLASH COMMAND]')} ${command.data.name} is disabled! (Commands.yml)`);
                    }
                }
                else if (command.data instanceof ContextMenuCommandBuilder && (command.data.type === ApplicationCommandType.User || command.data.type === ApplicationCommandType.Message)) {
                    if (commandConfig[command.data.name]) {
                        console.log(`${colors.green('[CONTEXT MENU COMMAND]')} ${command.data.name} loaded!`);
                        slashCommands.push(command.data.toJSON());
                        client.slashCommands.set(command.data.name, command);
                    } else {
                        console.log(`${colors.yellow('[CONTEXT MENU COMMAND]')} ${command.data.name} is disabled! (Commands.yml)`);
                    }
                }
            } catch (error) {
                console.error(`${colors.red('[ERROR]')} Error loading ${item.name}:`, error);
            }
        }
    }
}

function checkAndRunSchedulers() {
    if (giveawayCommandEnabled) {
        console.log(`${colors.green('[SCHEDULER]')} Giveaway scheduler enabled!`);
        startGiveawayScheduler();
    }

    if (afkCommandEnabled) {
        console.log(`${colors.green('[SCHEDULER]')} AFK scheduler enabled!`);
        startAfkScheduler();
    }
}

loadSlashCommands(path.join(__dirname, 'commands'));

glob('./addons/**/*.js', function (err, files) {
    if (err) return console.error(err);

    const loadedAddons = [];

    files.forEach(file => {
        if (file.endsWith('.js')) {
            const folderName = file.match(/\/addons\/([^/]+)/)[1];

            if (!loadedAddons.includes(folderName)) {
                loadedAddons.push(folderName);
                console.log(`${colors.green('[ADDON]')} ${folderName} loaded!`);
            }

            try {
                if (file.search("cmd_") >= 0) {
                    let comm = require(file);
                    if (comm && comm.data && comm.data.toJSON && typeof comm.data.toJSON === 'function') {
                        slashCommands.push(comm.data.toJSON());
                        client.slashCommands.set(comm.data.name, comm);
                    }
                } else {
                    let event = require(file);
                    if (event && event.run && typeof event.run === 'function') {
                        event.run(client);
                    }
                }
            } catch (addonError) {
                console.error(`${colors.red(`[ERROR] ${folderName}: ${addonError.message}`)}`);
                console.error(addonError.stack);
            }
        }
    });
    checkAndRunSchedulers();
});


const announcedStreams = new Set();

function fetchTwitchToken() {
    return axios.post(
        `https://id.twitch.tv/oauth2/token?client_id=${config.Twitch.ClientID}&client_secret=${config.Twitch.ClientSecret}&grant_type=client_credentials`
    ).then((response) => response.data.access_token).catch((error) => {
        console.error('Error fetching Twitch token:', error);
        return null;
    });
}

async function fetchTwitchGameIcon(gameId, accessToken) {
    try {
        const response = await axios.get(
            `https://api.twitch.tv/helix/games?id=${gameId}`,
            {
                headers: {
                    'Client-ID': config.Twitch.ClientID,
                    'Authorization': `Bearer ${accessToken}`,
                },
            }
        );
        const gameData = response.data.data[0];
        if (gameData) {
            const baseIconURL = gameData.box_art_url.replace("{width}", "144").replace("{height}", "192");
            return baseIconURL;
        }
        return null;
    } catch (error) {
        console.error(`Error fetching game icon for game ID: ${gameId}`, error);
        return null;
    }
}

async function fetchTwitchProfileIcon(userId, accessToken) {
    try {
        const response = await axios.get(
            `https://api.twitch.tv/helix/users?id=${userId}`,
            {
                headers: {
                    'Client-ID': config.Twitch.ClientID,
                    'Authorization': `Bearer ${accessToken}`,
                },
            }
        );
        return response.data.data[0]?.profile_image_url;
    } catch (error) {
        console.error(`Error fetching Twitch user profile for user ID: ${userId}`, error);
        return null;
    }
}

async function fetchTwitchStreamInfo(streamerName, accessToken) {
    try {
        const response = await axios.get(
            `https://api.twitch.tv/helix/streams?user_login=${streamerName}`,
            {
                headers: {
                    'Client-ID': config.Twitch.ClientID,
                    'Authorization': `Bearer ${accessToken}`,
                },
            }
        );
        return response.data.data[0];
    } catch (error) {
        console.error(`Error fetching Twitch stream info for ${streamerName}:`, error);
        return null;
    }
}

async function announceTwitchStreams() {
    const { AnnouncementChannelID, Streamers, AssignRole } = config.Twitch;
    const channel = client.channels.cache.get(AnnouncementChannelID);

    if (!channel) {
     //   console.error(`Announcement channel with ID ${AnnouncementChannelID} not found.`);
        return;
    }

    const accessToken = await fetchTwitchToken();
    if (!accessToken) {
        console.error('Failed to obtain Twitch access token.');
        return;
    }

    const twitchStreamers = await TwitchStreamers.find();

    for (const streamer of twitchStreamers) {
        const streamInfo = await fetchTwitchStreamInfo(streamer.name, accessToken);
        const member = await channel.guild.members.fetch(streamer.discordUserId).catch(console.error);

        if (!streamInfo) {
            if (announcedStreams.has(streamer.name) && member && member.roles.cache.has(AssignRole)) {
                await member.roles.remove(AssignRole).catch(console.error);
            }
            announcedStreams.delete(streamer.name);
            continue;
        }

        if (announcedStreams.has(streamer.name)) {
            continue;
        }

        const streamerConfig = config.Streamers[streamer.name] || config.Streamers.Default;
        const description = streamerConfig.Embed.Description
            .map((desc) => desc.replace('{streamTitle}', streamInfo.title))
            .filter((desc) => desc.trim().length > 0);

        const thumbnailURL = streamInfo.thumbnail_url.replace("{width}", "320").replace("{height}", "180");
        const gameIconURL = await fetchTwitchGameIcon(streamInfo.game_id, accessToken);
        const streamerIconURL = await fetchTwitchProfileIcon(streamInfo.user_id, accessToken);

        const embed = new EmbedBuilder()
            .setColor(streamerConfig.Embed.Color || "#FF4500")
            .setTitle(streamerConfig.Embed.Title.replace('{streamer}', streamer.name))
            .setAuthor({ name: streamerConfig.Embed.AuthorName.replace('{streamer}', streamer.name), iconURL: streamerIconURL })
            .setDescription(description.join('\n'))
            .setThumbnail(gameIconURL)
            .setImage(streamerConfig.Embed.Image.replace('{streamThumbnail}', thumbnailURL))
            .setFooter({ text: streamerConfig.Embed.Footer, iconURL: streamerConfig.Embed.FooterIcon });

        const actionRow = new ActionRowBuilder();
        streamerConfig.Embed.Components.forEach(component => {
            const button = new ButtonBuilder()
                .setLabel(component.Label || "Join the fun!")
                .setStyle(ButtonStyle.Link)
                .setURL(component.Link.replace('{streamURL}', `https://www.twitch.tv/${streamer.name}`))
                .setEmoji(component.Emoji);
            actionRow.addComponents(button);
        });

        await channel.send({
            content: streamerConfig.Message.Content.replace('{streamer}', streamer.name),
            embeds: [embed],
            components: [actionRow],
        });

        announcedStreams.add(streamer.name);

        if (member && !member.roles.cache.has(AssignRole)) {
            await member.roles.add(AssignRole).catch(console.error);
        }
    }
}



async function preloadResources() {
    const fontPath = path.join(__dirname, 'commands', 'General', 'Leveling', 'fonts', config.RankCard.Font);
    const backgroundPath = path.join(__dirname, 'commands', 'General', 'Leveling', 'backgrounds', config.RankCard.Background);

    if (fs.existsSync(fontPath)) {
        Font.fromFile(fontPath, path.parse(fontPath).name);
    } else {
        console.error(`${config.RankCard.Font} font file not found. Please check the file path.`);
    }

    if (fs.existsSync(backgroundPath)) {
    } else {
        console.error(`${config.RankCard.Background} background file not found. Please check the file path.`);
    }
}

function checkAndRemoveExpiredTempBans() {
    const now = new Date();

    UserData.find({
        'tempBans.endTime': { $lte: now },
        'tempBans.lifted': false,
    })
        .then(async (expiredTempBans) => {
            for (const userData of expiredTempBans) {
                for (const tempBan of userData.tempBans) {
                    if (tempBan.endTime <= now && !tempBan.lifted) {
                        const guild = client.guilds.cache.get(userData.guildId);
                        if (guild) {
                            try {
                                await guild.members.unban(userData.userId);
                                tempBan.lifted = true;
                            } catch (error) {
                                console.error(`Failed to unban user ${userData.userId}:`, error);
                            }
                        }
                    }
                }
                await userData.save();
            }
        })
        .catch((error) => {
            console.error('Error checking expired tempbans:', error);
        });
}


function startTempBanScheduler() {
    console.log(`${colors.green('[SCHEDULER]')} Tempban scheduler started!`);
    setInterval(checkAndRemoveExpiredTempBans, 60000);
}


client.on('ready', async () => {
    const nodeVersion = process.version;
    const appVersion = packageJson.version;
    const date = new Date();
    const formattedDate = `${date.getHours()}:${date.getMinutes()} (${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()})`;
    fs.appendFile('logs.txt', `${formattedDate} - Bot started up - Node.js ${nodeVersion} - App Version ${appVersion}\n`, (err) => {
        if (err) {
            console.error('Failed to write to log file:', err);
        }
    });

    await announceTwitchStreams();
    await preloadResources();

    startTempBanScheduler();
    setInterval(checkAndRemoveExpiredRoles, 12500);
    setInterval(async () => {
     //   console.log("Checking for Twitch stream updates...");
        await announceTwitchStreams();
    }, 1 * 60 * 1000);

    try {
        const tempChannels = await TempVoiceChannel.find({});
        for (const tempChannel of tempChannels) {
            const guild = client.guilds.cache.get(tempChannel.guildId);
            if (guild) {
                const channel = guild.channels.cache.get(tempChannel.tempChannelId);
                if (!channel || channel.members.filter((member) => !member.user.bot).size === 0) {
                    if (channel) {
                        await channel.delete();
                    }
                    await TempVoiceChannel.deleteOne({ _id: tempChannel._id });
                    console.log(`Cleaned up temp voice channel: ${tempChannel.tempChannelId}`);
                }
            }
        }
    } catch (error) {
        console.error('Error during temp voice channel cleanup:', error);
    }

    const rest = new REST({ version: '10' }).setToken(config.BotToken);
    try {
        await rest.put(
            Routes.applicationGuildCommands(client.user.id, config.GuildID),
            { body: slashCommands }
        );
    } catch (error) {
        console.log('\x1b[31m%s\x1b[0m', `[ERROR] Slash commands are unavailable because application.commands scope wasn't selected when inviting the bot.`);
        console.log('\x1b[31m%s\x1b[0m', `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`);
    }

    setInterval(async () => {
        const now = new Date();
        const reminders = await Reminder.find({ reminderTime: { $lte: now }, sent: false });

        reminders.forEach(async (reminder) => {
            try {
                const channel = await client.channels.fetch(reminder.channelId);
                const user = await client.users.fetch(reminder.userId);

                const embed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setTitle('🔔 Reminder!')
                    .setDescription(reminder.message)
                    .setTimestamp()
                    .setFooter({ text: 'Reminder time', iconURL: 'https://i.imgur.com/yygn7ni.png' });

                await user.send({ embeds: [embed] }).catch(async error => {
                    if (error.code === 50007) {
                        await channel.send({ content: `<@${reminder.userId}>`, embeds: [embed] });
                    } else {
                        console.error('Failed to send reminder:', error);
                    }
                });

                reminder.sent = true;
                await reminder.save();
            } catch (error) {
                console.error('Failed to send reminder:', error);
            }
        });
    }, 30000);
});


async function checkAndRemoveExpiredRoles() {
    const now = new Date();
    const expiredRoles = await TempRole.find({ expiration: { $lte: now } });

    for (const tempRole of expiredRoles) {
        const guild = client.guilds.cache.get(tempRole.guildId);
        if (!guild) continue;

        try {
            const member = await guild.members.fetch(tempRole.userId);
            if (member) {
                await member.roles.remove(tempRole.roleId);
            }
        } catch (error) {
            console.error(`Failed to remove expired role: ${error}`);
        }
        await TempRole.deleteOne({ _id: tempRole._id });
    }
}


client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const command = client.slashCommands.get(interaction.commandName);
    if (!command) return;

    try {
        if (interaction.commandName == "music") {
            await interaction.deferReply({ ephemeral: false });
        }
    } catch (error) {
        // console.log("Error running music command: " + error)
    }


    let logMsg = `\n\n[${new Date().toLocaleString()}] [SLASH COMMAND] Command: ${interaction.commandName}, User: ${interaction.user.username}`;
    fs.appendFile("./logs.txt", logMsg, (e) => {
        if (e) console.log(e);
    });

    if (config.LogCommands) console.log(`${colors.yellow(`[SLASH COMMAND] ${colors.cyan(`${interaction.user.username}`)} used ${colors.cyan(`/${interaction.commandName}`)}`)}`);

    try {
        await command.execute(interaction, client);
    } catch (error) {
        // if (error) console.error(error);
    }
});


client.on('messageUpdate', (oldMessage, newMessage) => {
    if (!oldMessage.guild || oldMessage.author.bot) return;

    if (oldMessage.content === newMessage.content) return;

    if (!client.snipes.has(oldMessage.guild.id)) {
        client.snipes.set(oldMessage.guild.id, new Collection());
    }

    const guildSnipes = client.snipes.get(oldMessage.guild.id);
    guildSnipes.set(oldMessage.channel.id, {
        oldContent: oldMessage.content,
        newContent: newMessage.content,
        author: oldMessage.author.tag,
        member: oldMessage.member,
        timestamp: new Date(),
        edited: true
    });
});


client.on('error', (error) => {
    fs.appendFile('logs.txt', `${new Date().toISOString()} - ERROR: ${error}\n`, (err) => {
        if (err) {
            console.error('Failed to write to log file:', err);
        }
    });
});

client.on('warn', (info) => {
    fs.appendFile('logs.txt', `${new Date().toISOString()} - WARN: ${info}\n`, (err) => {
        if (err) {
            console.error('Failed to write to log file:', err);
        }
    });
});

client.on('guildMemberAdd', member => {
    const autoKickConfig = config.AutoKick;
    if (!autoKickConfig.Enabled || member.user.bot) return;

    const roleIDs = autoKickConfig.Role;
    const timeLimit = parseTimeToMs(autoKickConfig.Time);

    setTimeout(async () => {
        try {
            member = await member.guild.members.fetch(member.id);
            if (!member) return;

            const hasRequiredRole = roleIDs.some(role => member.roles.cache.has(role));

            if (!hasRequiredRole) {
                if (autoKickConfig.DM.Enabled) {
                    const embed = new EmbedBuilder()
                        .setTitle(autoKickConfig.DM.Embed.Title)
                        .setDescription(autoKickConfig.DM.Embed.Description.join('\n'))
                        .setColor(autoKickConfig.DM.Embed.Color)
                        .setFooter({ text: autoKickConfig.DM.Embed.Footer });

                    await member.send({ embeds: [embed] }).catch(err => {
                        if (err.code !== 50007) {
                            //    console.error(`Failed to send DM to ${member.displayName}: ${err}`);
                        }
                    });
                }

                await member.kick("Auto-Kick: Failed to acquire the required role in time.");
                //  console.log(`Auto-kicked ${member.displayName}. Did not acquire required role within ${autoKickConfig.Time}.`);
            }
        } catch (err) {
            console.error(`Failed to process auto-kick for ${member.displayName}: ${err}`);
        }
    }, timeLimit);
});

function parseTimeToMs(timeStr) {
    const timeRegex = /(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/;
    const matches = timeRegex.exec(timeStr);
    const hours = parseInt(matches[1]) || 0;
    const minutes = parseInt(matches[2]) || 0;
    const seconds = parseInt(matches[3]) || 0;
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
}

fs.readdir('./events/', async (err, files) => {
    if (err) return console.error;

    files.forEach(file => {
        if (!file.endsWith('.js')) return;

        const evt = require(`./events/${file}`);
        let evtName = file.split('.')[0];

        if (typeof evt !== 'function') {
            console.error(`[ERROR] Event file '${file}' does not export a function. Skipping...`);
            return;
        }

        client.on(evtName, evt.bind(null, client));
        console.log(`${colors.green('[EVENT]')} ${file} loaded!`);
    });
});

fs.readdir('./events/Music/', async (err, files) => {
    if (err) return console.error;

    files.forEach(file => {
        if (!file.endsWith('.js')) return;

        const evt = require(`./events/Music/${file}`);
        let evtName = file.split('.')[0];

        if (typeof evt !== 'function') {
            console.error(`[ERROR] Event file '${file}' does not export a function. Skipping...`);
            return;
        }

        client.on(evtName, evt.bind(null, client));
        console.log(`${colors.green('[EVENT]')} ${file} loaded!`);
    });
});

client.login(config.BotToken).catch(error => {
    if (error.message.includes("Used disallowed intents")) {
        console.log('\x1b[31m%s\x1b[0m', `Used disallowed intents (READ HOW TO FIX): \n\nYou did not enable Privileged Gateway Intents in the Discord Developer Portal!\nTo fix this, you have to enable all the privileged gateway intents in your discord developer portal, you can do this by opening the discord developer portal, go to your application, click on bot on the left side, scroll down and enable Presence Intent, Server Members Intent, and Message Content Intent`);
        process.exit();
    } else if (error.message.includes("An invalid token was provided")) {
        console.log('\x1b[31m%s\x1b[0m', `[ERROR] The bot token specified in the config is incorrect!`)
        process.exit()
    } else {
        console.log('\x1b[31m%s\x1b[0m', `[ERROR] An error occured while attempting to login to the bot`)
        console.log(error)
        process.exit()
    }
});