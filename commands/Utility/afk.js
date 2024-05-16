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
const fs = require('fs');
const yaml = require("js-yaml")
const config = yaml.load(fs.readFileSync('././config.yml', 'utf8'))
const lang = yaml.load(fs.readFileSync('././lang.yml', 'utf8'))
const ms = require("parse-duration");
const AFK = require('../../models/afkSchema');  
const { EmbedBuilder } = require('discord.js');

function isValidHttpUrl(string) {
    let url;
  
    try {
      url = new URL(string);
    } catch (_) {
      return false;  
    }
  
    return url.protocol === "https:" && (url.pathname.endsWith('.png') || url.pathname.endsWith('.jpg') || url.pathname.endsWith('.jpeg') || url.pathname.endsWith('.gif'));
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

module.exports = {
    data: new SlashCommandBuilder()
      .setName('afk')
      .setDescription('Set an AFK status with a message and duration')
      .addStringOption(option =>
        option.setName('message')
          .setDescription('Your AFK message')
          .setRequired(true))
      .addStringOption(option =>
        option.setName('time')
          .setDescription('How long you will be AFK: 1m (minutes), 1h (hours), 1d (days)'))
          
      ,
    async execute(interaction) {

      let backTimeBool = true;
      const timeInput = interaction.options.getString('time');

      if(timeInput === null) {

      }
 
      if(!config.AFK.AllowAnyone) {
        const allowedRoles = config.AFK.AllowRoles; 
        const userRoles = interaction.member.roles.cache.map((role) => role.id);
        const hasPermission = userRoles.some((role) =>
            allowedRoles.includes(role)
        );
  
        if (!hasPermission) {
          return interaction.reply({
              content: lang.AFK.ErrorMessges.NoPermission,
              ephemeral: true,
          });
      }
      }

        const existingAfkStatus = await AFK.findOne({ userId: interaction.user.id, afk: true });
        if (existingAfkStatus) {
            return interaction.reply({
                content: lang.AFK.ErrorMessges.AlreadyMarkedAFK,
                ephemeral: true,
            });
        }
 
        let afkTime = 0;  
        if (timeInput) {
            const timeFormatRegex = /^(\d+)(s|m|h|d)$/;
            if (!timeFormatRegex.test(timeInput)) {
                await interaction.reply({ content: lang.AFK.ErrorMessges.TimeFormat, ephemeral: true });
                return;
            }

            backTimeBool = false;  
            afkTime = ms(timeInput);
            if (!afkTime) {
                await interaction.reply({ content: lang.AFK.ErrorMessges.TimeParseError, ephemeral: true });
                return;
            }
        }
         
        const afkMessage = interaction.options.getString('message');
        const backTime = Date.now() + afkTime;
        const notifyChannel = interaction.channel;
      await AFK.findOneAndUpdate(
        { userId: interaction.user.id },
        { userId: interaction.user.id, afkMessage, backTime, noBackTime: backTimeBool, afk: true, notifyMessageId: notifyChannel.id},  
        { upsert: true, new: true }
      );
  
      let replySent = false;

      const placeholders = {
        user: interaction.user.username, 
        username: interaction.user.displayName,
        reason: afkMessage, 
        backTime: `<t:${Math.floor(backTime / 1000)}:R>`, 
    };
      if (config.AFK.AfktagInDisplayName) {
        const member = await interaction.guild.members.fetch(interaction.user.id);
        const originalNickname = member.displayName ? member.displayName : member.user.username;
        const afkTag = `${originalNickname} ${config.AFK.AfkTag}`;
        if (interaction.guild.ownerId === interaction.user.id) {
          await AFK.findOneAndUpdate(
            { userId: interaction.user.id },
            { userId: interaction.user.id, afkMessage, backTime, noBackTime: backTimeBool, afk: true, oldDisplayName: originalNickname },
            { upsert: true, new: true }
        );
            await interaction.reply({ content: lang.AFK.ErrorMessges.NickNameOwner, ephemeral: true });
            replySent = true;
        } else {
            
            try {
                await member.setNickname(afkTag);
                await AFK.findOneAndUpdate(
                    { userId: interaction.user.id },
                    { userId: interaction.user.id, afkMessage, backTime, noBackTime: backTimeBool, afk: true, oldDisplayName: originalNickname },
                    { upsert: true, new: true }
                );
    
                if (!replySent) {
                    await interaction.reply({ content: replacePlaceholders(lang.AFK.Success,placeholders), ephemeral: true });
                    replySent = true;
                }
            } catch (error) {
                if (!replySent) {
                  await AFK.findOneAndUpdate(
                    { userId: interaction.user.id },
                    { userId: interaction.user.id, afkMessage, backTime, noBackTime: backTimeBool, afk: true, oldDisplayName: originalNickname },
                    { upsert: true, new: true }
                );
    
                    await interaction.reply({ content: lang.AFK.ErrorMessges.NickNameMissingPermissions, ephemeral: true });
                    replySent = true;
                }
            }
        }
    }
  
      if (config.AFK.EnableAfkRole) {
        let afkRole = interaction.guild.roles.cache.find(role => role.name === config.AFK.AfkRoleName);
      
         if (!afkRole) {
          try {
            afkRole = await interaction.guild.roles.create({
              name: config.AFK.AfkRoleName,
              color: config.AFK.AfkRoleColor, 
              reason: 'Needed an AFK role',

            });
          } catch (error) {
            await interaction.followUp({ content: lang.AFK.ErrorMessges.RoleCreate, ephemeral: true });
            return; 
          }
        }
       
        const member = await interaction.guild.members.fetch(interaction.user.id);
        
        member.roles.add(afkRole);
      }

      if (config.AFK.NotifyChannel) {
        let notifyMessage;
        if (config.AFK.UseNotifyEmbed) {
            const notifyEmbed = new EmbedBuilder();

            if(config.AFK.NotifyEmbed.EmbedColor) {
                notifyEmbed.setColor(config.AFK.NotifyEmbed.EmbedColor);
            }
 
            if (config.AFK.NotifyEmbed.Description) {
              let descriptionLines = config.AFK.NotifyEmbed.Description.map(line =>
                  replacePlaceholders(line, placeholders)
              );
          
              if (backTimeBool) {
                  descriptionLines.pop();
              }
          
              notifyEmbed.setDescription(descriptionLines.join('\n'));
            }

            if(config.AFK.NotifyEmbed.Title) {
                notifyEmbed.setTitle(replacePlaceholders(config.AFK.NotifyEmbed.Title, placeholders));
            }

            if(config.AFK.NotifyEmbed.EmbedImage) {
               notifyEmbed.setImage(config.AFK.NotifyEmbed.EmbedImage);
            }

            if(config.AFK.NotifyEmbed.EmbedThumbnail) {
                notifyEmbed.setThumbnail(config.AFK.NotifyEmbed.EmbedThumbnail);
            }

            notifyMessage = await interaction.channel.send({ embeds: [notifyEmbed] });
        } else {
            const simpleNotifyMessage = replacePlaceholders(config.AFK.NotifyMessage, placeholders);
            notifyMessage = await interaction.channel.send(simpleNotifyMessage);
        }

         await AFK.findOneAndUpdate(
            { userId: interaction.user.id },
            { notifyMessageId: notifyMessage.id, notifyChannelId: interaction.channel.id },
            { new: true }
        );
    }
   
    },
};