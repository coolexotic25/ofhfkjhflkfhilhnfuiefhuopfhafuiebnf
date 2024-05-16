const { SlashCommandBuilder, EmbedBuilder } = require("@discordjs/builders");
const Discord = require("discord.js");
const fs = require("fs");
const yaml = require("js-yaml");
const config = yaml.load(fs.readFileSync("././config.yml", "utf8"));
const lang = yaml.load(fs.readFileSync("././lang.yml", "utf8"));
const ms = require("parse-duration");
const moment = require("moment-timezone");
const cron = require('node-cron');
const client = require("../../index.js")

const Giveaway = require("../../models/Giveaway.js");

  function getButtonStyle(styleString) {
    switch (styleString.toLowerCase()) {
      case "primary":
        return Discord.ButtonStyle.Primary;
      case "secondary":
        return Discord.ButtonStyle.Secondary;
      case "success":
        return Discord.ButtonStyle.Success;
      case "danger":
        return Discord.ButtonStyle.Danger;
      default:
        return Discord.ButtonStyle.Success;
    }
  }

  function parseColor(color) {
    if (typeof color === 'string' && color.startsWith('#')) {
        return parseInt(color.replace('#', ''), 16);
    } else {
        return color;
    }
}
 

function replacePlaceholders(template, placeholders = {}) {
    if (!template) {
        return '\u200b'; 
    }

    return Object.keys(placeholders).reduce((acc, key) => {
        const regex = new RegExp(`{${key}}`, 'gi');
        return acc.replace(regex, placeholders[key] || '');
    }, template);
}

  const giveawayActions = { 
    startGiveaway: async (interaction, giveawayDetails) => {
         const { giveawayId, time, prize, channel, winnerCount, description, whitelistRoles, blacklistRoles, minServerJoinDate, minAccountAge, hostedBy, notifyUsers } = giveawayDetails;
        const serverName = interaction.guild.name; 
        const giveawayEndsIn = `<t:${Math.floor((Date.now() + time) / 1000)}:R>`;

        const endAt = Date.now() + time;
        const whitelistRoleMentions = whitelistRoles.map(roleId => `<@&${roleId}>`).join(', ');
        const blacklistRoleMentions = blacklistRoles.map(roleId => `<@&${roleId}>`).join(', ');
        const placeholders = {
            prize: prize, 
            serverName: serverName, 
            hostedBy: hostedBy,
            whitelistRoles: whitelistRoleMentions,
            blacklistRoles: blacklistRoleMentions,
            channel:  `${channel}` ,
            winnerCount: winnerCount,
            endsIn: giveawayEndsIn
        };

        const embed = new Discord.EmbedBuilder()

        const prizeDescription = replacePlaceholders(lang.Giveaways.Embeds.ActiveGiveaway.Prize, placeholders);
        if(config.Giveaways.Embed.ActiveGiveaway.ShowTitle) {
            embed.setDescription(prizeDescription);
        }

        embed.setColor(config.Giveaways.Embed.ActiveGiveaway.EmbedColor);
             
        const additionalFields = [];
    
        let requirementsCount = 0;
        var entryCount = 0;

        if (config.Giveaways.Embed.ActiveGiveaway.ShowHostedBy) {
            additionalFields.push({ name: replacePlaceholders(lang.Giveaways.Embeds.ActiveGiveaway.HostedByField, placeholders), value: `${hostedBy}`, inline: true});
        }
    
        if (config.Giveaways.Embed.ActiveGiveaway.ShowEndsIn) {
            additionalFields.push({ name: replacePlaceholders(lang.Giveaways.Embeds.ActiveGiveaway.EndsInField, placeholders), value: `<t:${Math.floor((Date.now() + time) / 1000)}:R>`, inline: true});
        }

        if (config.Giveaways.Embed.ActiveGiveaway.ShowEntries) {
            additionalFields.push({ name: replacePlaceholders(lang.Giveaways.Embeds.ActiveGiveaway.EntriesField, placeholders), value: `**${entryCount}**`, inline: true});
        }
        
        if(config.Giveaways.Embed.ActiveGiveaway.ShowWhitelistRoles) {
            if (whitelistRoles && whitelistRoles.length > 0) {
                const whitelistMentions = whitelistRoles.map(roleId => `<@&${roleId}>`).join('\n');
                additionalFields.push({ name: replacePlaceholders(lang.Giveaways.Embeds.ActiveGiveaway.WhitelistRoleField, placeholders), value: whitelistMentions, inline: true });
                requirementsCount++;
            }
        }

        if(config.Giveaways.Embed.ActiveGiveaway.ShowBlacklistRoles ) {
                if (blacklistRoles && blacklistRoles.length > 0) {
                const blacklistMentions = blacklistRoles.map(roleId => `<@&${roleId}>`).join('\n');
                additionalFields.push({ name: replacePlaceholders(lang.Giveaways.Embeds.ActiveGiveaway.BlacklistRoleField, placeholders), value: blacklistMentions, inline: true });
                requirementsCount++;
            }
        }

        if(config.Giveaways.Embed.ActiveGiveaway.ShowMinimumServerJoinDate) {
            if (minServerJoinDate) {
                const serverJoinDate = new Date(minServerJoinDate);
                const discordTimestamp = `<t:${Math.floor(serverJoinDate.getTime() / 1000)}:D>`;
                additionalFields.push({ name: replacePlaceholders(lang.Giveaways.Embeds.ActiveGiveaway.MinimumSeverJoinDateField, placeholders), value: `${discordTimestamp}`, inline: true });
                requirementsCount++;
            }
        }

        if(config.Giveaways.Embed.ActiveGiveaway.ShowMinimumAccountAge) {
            if (minAccountAge) {
                const accountAgeDate = new Date(minAccountAge);
                const discordTimestamp = `<t:${Math.floor(accountAgeDate.getTime() / 1000)}:D>`;
                additionalFields.push({ name: replacePlaceholders(lang.Giveaways.Embeds.ActiveGiveaway.MinimumAccountAgeField, placeholders), value: `${discordTimestamp}`, inline: true });
                requirementsCount++;
            }
        }

        if (requirementsCount === 2) {
            additionalFields.push({ name: '\u200b', value: '\u200b', inline: true });
        }
            
        embed.addFields(additionalFields);

        if(config.Giveaways.Embed.ActiveGiveaway.ShowImage) {
            if (config.Giveaways.Embed.ActiveGiveaway.EmbedImage) {
                embed.setImage(config.Giveaways.Embed.ActiveGiveaway.EmbedImage);
            }
        }   

        if(config.Giveaways.Embed.ActiveGiveaway.ShowThumbnail) {
            if (config.Giveaways.Embed.ActiveGiveaway.EmbedThumbnail) {
                embed.setThumbnail(config.Giveaways.Embed.ActiveGiveaway.EmbedThumbnail);
            }
        }
        
        if(config.Giveaways.Embed.ActiveGiveaway.ShowFooter) {
            if (config.Giveaways.Embed.ActiveGiveaway.EmbedFooterIcon) {
                embed.setFooter({text: `Giveaway ID: ${giveawayId}`, iconURL: config.Giveaways.Embed.ActiveGiveaway.EmbedFooterIcon});
            }
        }

        if (!config.Giveaways.Embed.ActiveGiveaway.ShowTitle &&
            !config.Giveaways.Embed.ActiveGiveaway.ShowThumbnail &&
            !config.Giveaways.Embed.ActiveGiveaway.ShowHostedBy &&
            !config.Giveaways.Embed.ActiveGiveaway.ShowEndsIn &&
            !config.Giveaways.Embed.ActiveGiveaway.ShowEntries &&
            !config.Giveaways.Embed.ActiveGiveaway.ShowWhitelistRoles &&
            !config.Giveaways.Embed.ActiveGiveaway.ShowBlacklistRoles &&
            !config.Giveaways.Embed.ActiveGiveaway.ShowMinimumServerJoinDate &&
            !config.Giveaways.Embed.ActiveGiveaway.ShowMinimumAccountAge &&
            !config.Giveaways.Embed.ActiveGiveaway.ShowImage &&
            !config.Giveaways.Embed.ActiveGiveaway.ShowFooter) {
            embed.addFields({ name: '\u200b', value: '\u200b'});
        }

 
        const joinButton = new Discord.ButtonBuilder()
          .setLabel(config.Giveaways.Embed.ActiveGiveaway.Button.JoinButton.ButtonText)
          .setStyle(
            getButtonStyle(
              config.Giveaways.Embed.ActiveGiveaway.Button.JoinButton.ButtonStyle
            )
          )
          .setCustomId("join_giveaway")
          .setEmoji(config.Giveaways.Embed.ActiveGiveaway.Button.JoinButton.ButtonEmoji);

        const row = new Discord.ActionRowBuilder().addComponents(joinButton);
        let messageContent = '';

       
        if (typeof notifyUsers === 'string' && (notifyUsers === '@everyone' || notifyUsers === '')) {
            messageContent = notifyUsers;
        } else if (Array.isArray(notifyUsers) && notifyUsers.length > 0) {
            const roleMentions = notifyUsers.map(roleId => `<@&${roleId}>`).join(' ');
            messageContent = roleMentions;
        }
        const giveawayMessage = await channel.send({ content: messageContent, embeds: [embed], components: [row] });


        const successEmbed = new Discord.EmbedBuilder()
          .setAuthor({
            name: `${lang.SuccessEmbedTitle}`,
            iconURL: `https://i.imgur.com/7SlmRRa.png`,
          })
          .setColor(config.SuccessEmbedColor);

          const newGiveaway = new Giveaway({
            giveawayId: giveawayId,
            messageId: giveawayMessage.id,
            channelId: channel.id,
            guildId: interaction.guildId,
            startAt: Date.now(),
            endAt: endAt,
            ended: false,
            winnerCount: winnerCount,
            hostedBy: hostedBy,
            prize: prize,
            entries: 0,
            messageWinner: false,
            notifyEntrantOnEnter: false,
            requirements: {
                whitelistRoles: whitelistRoles,
                blacklistRoles: blacklistRoles,
                minServerJoinDate: minServerJoinDate,
                minAccountAge: minAccountAge,
            },
            winners: [], 
            entrants: [],  
        });


        await newGiveaway.save();

        if (config.GiveawayLogs.Enabled) {
            let embedData = config.GiveawayLogs.GiveawayStarted.Embed;
        

            let logEmbed = new EmbedBuilder()
                .setColor(parseColor(embedData.Color || "#00FF00"))
                .setTitle(replacePlaceholders(embedData.Title, placeholders))
                .setDescription(replacePlaceholders(embedData.Description.join('\n'), placeholders))
                .setFooter({ text: replacePlaceholders(embedData.Footer, placeholders) });
        
                if(config.GiveawayLogs.GiveawayStarted.Embed.Thumbnail && config.GiveawayLogs.GiveawayStarted.Embed.ThumbnailUrl) {
                    logEmbed.setThumbnail(config.GiveawayLogs.GiveawayStarted.Embed.ThumbnailUrl)
                }

            let giveawayStartedLog = interaction.guild.channels.cache.get(config.GiveawayLogs.LogsChannelID);
            if (giveawayStartedLog) giveawayStartedLog.send({ embeds: [logEmbed] });
        }

      

        await interaction.reply({embeds: [successEmbed], ephemeral: true });
    },

    joinGiveaway: async (client, userId, username, member, interaction, channelId, messageId) => {
        try {
            const giveaway = await Giveaway.findOne({ channelId: channelId, messageId: messageId });
            if (!giveaway) { 
                await interaction.reply({ content: lang.Giveaways.GiveawayNotFound, ephemeral: true });
                return;
            }
            const serverName = interaction.guild.name; 
            const requirements = giveaway.requirements;

            const whitelistRoleMentions = requirements.whitelistRoles.map(roleId => `<@&${roleId}>`).join(', ');
            const blacklistRoleMentions = requirements.blacklistRoles.map(roleId => `<@&${roleId}>`).join(', ');
            const placeholders = {
                prize: giveaway.prize, 
                serverName: serverName, 
                hostedBy: giveaway.hostedBy,
                whitelistRoles: whitelistRoleMentions,
                blacklistRoles: blacklistRoleMentions,
                channel:  `<#${giveaway.channelId}>` ,
                winnerCount: giveaway.winnerCount
            };
          
 
            try {

                if (!giveaway) {
                    const messageContent = replacePlaceholders(lang.Giveaways.GiveawayNotFound, placeholders);
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ content: messageContent, ephemeral: true });
                    } else {
                        await interaction.reply({ content: messageContent, ephemeral: true });
                    }
                    return;
                }

                if (giveaway.ended) {
                    await interaction.reply({ content:replacePlaceholders(lang.Giveaways.EndMessage, placeholders), ephemeral: true });
                    return;
                }
        
                if (requirements.whitelistRoles && requirements.whitelistRoles.length > 0 && !requirements.whitelistRoles.some(roleId => member.roles.cache.has(roleId))) {
                    await interaction.reply({ content: replacePlaceholders(lang.Giveaways.IncorrectRoleMessage, placeholders), ephemeral: true });
                    return;
                }

                if (requirements.blacklistRoles && requirements.blacklistRoles.length > 0 && requirements.blacklistRoles.some(roleId => member.roles.cache.has(roleId))) {
                    await interaction.reply({ content: replacePlaceholders(lang.Giveaways.IncorrectRoleMessage, placeholders), ephemeral: true });
                    return;
                }
        
                if (requirements.minServerJoinDate && member.joinedTimestamp > new Date(requirements.minServerJoinDate).getTime()) {
                    await interaction.reply({ content: replacePlaceholders(lang.Giveaways.IncorrectMinimumServerJoinDateMessage, placeholders), ephemeral: true });
                    return;
                }
        
                if (requirements.minAccountAge && member.user.createdTimestamp > new Date(requirements.minAccountAge).getTime()) {
                    await interaction.reply({ content: replacePlaceholders(lang.Giveaways.IncorrectMinimumAccountAgeMessage, placeholders), ephemeral: true });
                    return;
                }
        
                 if (giveaway.entrants.some(entrant => entrant.entrantId === userId)) {
            const messageContent = replacePlaceholders(lang.Giveaways.AlreadyEnteredMessage, placeholders);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: messageContent, ephemeral: true });
            } else {
                await interaction.reply({ content: messageContent, ephemeral: true });
            }
            return;
        }
        

                giveaway.entries++;
                giveaway.entrants.push({ entrantId: userId, entrantUsername: username });
                await giveaway.save();
        
                const channel = client.channels.cache.get(channelId);
                const message = await channel.messages.fetch(messageId);
                const embed = message.embeds[0];
                const newEmbed = new Discord.EmbedBuilder(embed)
                    .spliceFields(2, 1, { name: replacePlaceholders(lang.Giveaways.Embeds.ActiveGiveaway.EntriesField, placeholders), value: `**${giveaway.entrants.length}**`, inline: true });
        
                await message.edit({ embeds: [newEmbed] });

                const successMessageContent = replacePlaceholders(lang.Giveaways.EntrySuccessMessage, placeholders);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: successMessageContent, ephemeral: true });
                } else {
                    await interaction.reply({ content: successMessageContent, ephemeral: true });
                }           
             } catch(error) {
                const errorMessageContent = replacePlaceholders(lang.Giveaways.lang.Giveaways.EntryErrorMessage, placeholders);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: errorMessageContent, ephemeral: true });
                } else {
                    await interaction.reply({ content: errorMessageContent, ephemeral: true });
                }
            }

        } catch (error) {
            await interaction.reply({ content: errorMessageContent, ephemeral: true });
        }
    },

    endGiveaway: async (giveawayId) => {
        try {

            const giveaway = await Giveaway.findOne({ giveawayId: giveawayId});
            if (!giveaway) {
                return;
            }
 
            const guild = client.guilds.cache.get(giveaway.guildId);
            const serverName = guild.name;
            const requirements = giveaway.requirements;

            const whitelistRoleMentions = requirements.whitelistRoles.map(roleId => `<@&${roleId}>`).join(', ');
            const blacklistRoleMentions = requirements.blacklistRoles.map(roleId => `<@&${roleId}>`).join(', ');

            const placeholders = {
                prize: giveaway.prize, 
                serverName: serverName, 
                hostedBy: giveaway.hostedBy,
                whitelistRoles: whitelistRoleMentions,
                blacklistRoles: blacklistRoleMentions,
                channel:  `<#${giveaway.channelId}>`,
                winnerCount: giveaway.winnerCount
            };
  
            if (!giveaway) {
                const giveawayNotFound = replacePlaceholders(lang.Giveaways.GiveawayNotFound, placeholders);

                await interaction.reply({ content: giveawayNotFound, ephemeral: true });
                return;
            }    
            if (giveaway.ended) {
                const giveawayAlreadyEnded = replacePlaceholders(lang.Giveaways.GiveawayAlreadyEnded, placeholders);

                await interaction.reply({ content: giveawayAlreadyEnded, ephemeral: true });
                return;
            }
     
            
            const winnerCount = giveaway.winnerCount;
            const entrants = giveaway.entrants;
            let winners = [];
 
           
            for (let i = 0; i < winnerCount && entrants.length > 0; i++) {
                let randomIndex = Math.floor(Math.random() * entrants.length);
                winners.push({ winnerId: entrants[randomIndex].entrantId });
                entrants.splice(randomIndex, 1); 
            }
    
            giveaway.winners = winners;

            giveaway.ended = true;
            await giveaway.save();
    
            const channel = client.channels.cache.get(giveaway.channelId);
            if (!channel) {
                return;
            }
    
            const message = await channel.messages.fetch(giveaway.messageId);
            if (!message) {
                return;
            }
 
            let winnerList = winners.map(w => `<@${w.winnerId}>`).join('\n');
            if(winnerList.length === 0) {
                winnerList =  replacePlaceholders(lang.Giveaways.NoParticipationMessage, placeholders);
            }


            if(config.Giveaways.DirectMessageWinners) {
                 winners.forEach(async (winnerObj) => {
                const winnerId = winnerObj.winnerId;
                try {
                    const winner = await guild.members.fetch(winnerId);
                    if (!winner || !winner.user) {
                        return;
                    }
                    try {
                        await winner.user.send(replacePlaceholders(lang.Giveaways.WinnerDirectMessage, placeholders));
                    } catch (dmError) {
                    }
                } catch (fetchError) {
                }
            });
            }
           

            let winnerMentions = winners.map(winner => `<@${winner.winnerId}>`).join(', ');
            if (winnerMentions.length === 0) {
                await channel.send(replacePlaceholders(lang.Giveaways.NoParticipationMessage, placeholders));

            } else {
                await channel.send(replacePlaceholders(lang.Giveaways.WinMessage, placeholders).replace("{winners}", winnerMentions));

            }

            const embed = new Discord.EmbedBuilder(message.embeds[0])
            .setColor(null)
            .setImage(null)
            .setThumbnail(null)
            .setDescription(null)
            .setFooter(null)
            .setFields([])


            .setColor(config.Giveaways.Embed.EndedGiveaway.EmbedColor)

            if(config.Giveaways.Embed.EndedGiveaway.ShowTitle) {
                embed.setDescription(replacePlaceholders(lang.Giveaways.Embeds.EndedGiveaway.Title, placeholders))
            }
            if(config.Giveaways.Embed.EndedGiveaway.ShowThumbnail) {
                embed.setThumbnail(config.Giveaways.Embed.EndedGiveaway.EmbedThumbnail)
            }
            if(config.Giveaways.Embed.EndedGiveaway.ShowImage) {
                embed.setImage(config.Giveaways.Embed.EndedGiveaway.EmbedImage)

            }
            if(config.Giveaways.Embed.EndedGiveaway.ShowWinnersField) {
                embed.addFields({ name: replacePlaceholders(lang.Giveaways.Embeds.EndedGiveaway.WinnersField, placeholders), value: winnerList, inline: true})
            }
            if(config.Giveaways.Embed.EndedGiveaway.ShowEntriesField) {
                embed.addFields( {name: replacePlaceholders(lang.Giveaways.Embeds.EndedGiveaway.EntriesField, placeholders), value: `**${giveaway.entries}**`, inline: true})

            }

            embed.setFooter({ text: "Giveaway ID: " + giveaway.giveawayId, iconURL: config.Giveaways.Embed.EndedGiveaway.EmbedFooterIcon }) 

            await message.edit({ embeds: [embed], components: [] });
    
            if (config.GiveawayLogs.Enabled) {
                let embedData = config.GiveawayLogs.GiveawayEnded.Embed;
            
    
                let logEmbed = new EmbedBuilder()
                    .setColor(parseColor(embedData.Color || "#00FF00"))
                    .setTitle(replacePlaceholders(embedData.Title, placeholders))
                    .setDescription(replacePlaceholders(embedData.Description.join('\n'), placeholders).replace("{winners}", winnerMentions))
                    .setFooter({ text: replacePlaceholders(embedData.Footer, placeholders) });
            
                    if(config.GiveawayLogs.GiveawayEnded.Embed.Thumbnail && config.GiveawayLogs.GiveawayEnded.Embed.ThumbnailUrl) {
                        logEmbed.setThumbnail(config.GiveawayLogs.GiveawayEnded.Embed.ThumbnailUrl)
                    }
    
                let giveawayEndedLog = guild.channels.cache.get(config.GiveawayLogs.LogsChannelID);
                if (giveawayEndedLog) giveawayEndedLog.send({ embeds: [logEmbed] });
            }
    
          

            return 'Giveaway ended successfully.';
        } catch (error) {
            console.error('Error ending the giveaway with ID:', giveawayId, error);
            throw error;
        }
    },
    rerollGiveaway: async (interaction, giveawayId, userIdsToReroll = []) => {
        try {
            const giveaway = await Giveaway.findOne({ giveawayId: giveawayId });
            if (!giveaway) {
                return await interaction.reply({ content: lang.Giveaways.GiveawayNotFound, ephemeral: true });
            }
    
            if (!giveaway.ended) {
                return await interaction.reply({ content: lang.Giveaways.GiveawayHasntEnded, ephemeral: true });
            }
    
            if (userIdsToReroll.length > 0 && !giveaway.winners.some(winner => userIdsToReroll.includes(winner.winnerId))) {
                return await interaction.reply({ content: 'None of the specified users are previous winners.', ephemeral: true });
            }
    
            let eligibleEntrants = giveaway.entrants.filter(entrant =>
                !giveaway.winners.some(winner => winner.winnerId === entrant.entrantId)
            );
    
            let rerollCount = userIdsToReroll.length > 0 ? userIdsToReroll.length : giveaway.winnerCount;
            if (userIdsToReroll.length === 0) {
                giveaway.winners = [];
            } else {
                giveaway.winners = giveaway.winners.filter(winner => !userIdsToReroll.includes(winner.winnerId));
            }
    
            for (let i = 0; i < rerollCount && eligibleEntrants.length > 0; i++) {
                let randomIndex = Math.floor(Math.random() * eligibleEntrants.length);
                giveaway.winners.push({ winnerId: eligibleEntrants[randomIndex].entrantId });
                eligibleEntrants.splice(randomIndex, 1);
            }
    
            await giveaway.save();
    
            const guild = client.guilds.cache.get(giveaway.guildId);
            const channel = guild.channels.cache.get(giveaway.channelId);
            const message = await channel.messages.fetch(giveaway.messageId);
    
            let winnerMentions = giveaway.winners.map(winner => `<@${winner.winnerId}>`).join(', ');
         
            const placeholders = {
                prize: giveaway.prize,
                serverName: guild.name,
                hostedBy: giveaway.hostedBy,
                channel: `<#${giveaway.channelId}>`,
                winnerCount: giveaway.winnerCount,
                winners: winnerMentions
            };

            for (const winner of giveaway.winners) {
                try {
                    const user = await client.users.fetch(winner.winnerId);
                    await user.send(replacePlaceholders(lang.Giveaways.WinnerDirectMessage, placeholders)); 
                } catch (error) {
                  
                }
            }
      
            const updatedEmbed = new Discord.EmbedBuilder(message.embeds[0]);

            updatedEmbed.setFields([]);
            if (config.Giveaways.Embed.EndedGiveaway.ShowWinnersField) {
                const winnersFieldName = replacePlaceholders(lang.Giveaways.Embeds.EndedGiveaway.WinnersField, placeholders);
                const winnersFieldValue = winnerMentions.length > 0 ? winnerMentions : 'No winners selected';
                updatedEmbed.addFields({ name: winnersFieldName, value: winnersFieldValue, inline: true });
            }
        
            if (config.Giveaways.Embed.EndedGiveaway.ShowEntriesField) {
                const entriesFieldName = replacePlaceholders(lang.Giveaways.Embeds.EndedGiveaway.EntriesField, placeholders);
                const entriesFieldValue = `**${giveaway.entries}**`;
                updatedEmbed.addFields({ name: entriesFieldName, value: entriesFieldValue, inline: true });
            }
        
            await message.edit({ embeds: [updatedEmbed] });
    
            const rerollConfirmationMessage = `Giveaway rerolled! Congratulations to the new winners of the "${placeholders.prize}" giveaway: ${winnerMentions}`;
            await channel.send(rerollConfirmationMessage);
    
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Giveaway winners rerolled successfully.', ephemeral: true });
            }
    
            try {
                if (config.GiveawayLogs.Enabled) {
                    let embedData = config.GiveawayLogs.GiveawayRerolled.Embed;
                    let logEmbed = new Discord.EmbedBuilder()
                        .setColor(parseColor(embedData.Color || "#00FF00"))
                        .setTitle(replacePlaceholders(embedData.Title, placeholders))
                        .setDescription(replacePlaceholders(embedData.Description.join('\n'), placeholders).replace("{winners}", winnerMentions))
                        .setFooter({ text: replacePlaceholders(embedData.Footer, placeholders) });
            
                    if (config.GiveawayLogs.GiveawayRerolled.Embed.Thumbnail && config.GiveawayLogs.GiveawayRerolled.Embed.ThumbnailUrl) {
                        logEmbed.setThumbnail(config.GiveawayLogs.GiveawayRerolled.Embed.ThumbnailUrl);
                    }
            
                    const giveawayRerolledChannel = guild.channels.cache.get(config.GiveawayLogs.LogsChannelID);
                    if (giveawayRerolledChannel) {
                        giveawayRerolledChannel.send({ embeds: [logEmbed] });
                    }
                }
            } catch (error) {
                console.error('Error logging giveaway reroll:', error);
            }
    
        } catch (error) {
            console.error(`Error rerolling the giveaway with ID: ${giveawayId}`, error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'An error occurred while rerolling the giveaway.', ephemeral: true });
            }
        }
    }
    }
     


  module.exports = giveawayActions;
