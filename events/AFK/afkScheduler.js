const { ChannelType } = require('discord.js'); 
const cron = require('node-cron');
const AFK = require('../../models/afkSchema'); 
const fs = require("fs");
const yaml = require("js-yaml");
const config = yaml.load(fs.readFileSync("./config.yml", "utf8"));
const client = require("../../index.js")
 
async function checkForAfkStatuses() {

    if (!config.AFK.Enabled) return; 

    try {
        const afkStatuses = await AFK.find({ afk: true, noBackTime: false });
        const now = new Date().getTime();

        for (const afkStatus of afkStatuses) {
            if (now > afkStatus.backTime) {
 
                const guild = client.guilds.cache.get(config.GuildID); 
                const member = await guild.members.fetch(afkStatus.userId);

                if(guild.ownerId != member.id) {
                  await member.setNickname(afkStatus.oldDisplayName);
                }

                await AFK.updateOne({ _id: afkStatus._id }, { $set: { afk: false }, $unset: { oldDisplayName: 1 } });

                if (config.AFK.EnableAfkRole) {
                    const afkRole = guild.roles.cache.find(role => role.name === config.AFK.AfkRoleName);
                    if (afkRole && member.roles.cache.has(afkRole.id)) {
                        await member.roles.remove(afkRole);
                    }
                }
   
                if (afkStatus.notifyMessageId) {
                    const guilds = client.guilds.cache;
            
                    for (const guild of guilds.values()) {
                      let channels = await guild.channels.fetch();
                      channels = channels.filter(channel => channel.type === ChannelType.GuildText); 
            
                      for (const channel of channels.values()) {
                        try {
                          const message = await channel.messages.fetch(afkStatus.notifyMessageId);
                          await message.delete();
                          break; 
                        } catch (error) {
                          
                        }
                      }
                    }
                  }
            }
        }
    } catch (error) {
      // console.log(error)
    }
}

function startAfkScheduler() {
  const checkIntervalInSeconds = config.AFK.AFKStatusCheck / 1000;
  const cronPattern = `*/${checkIntervalInSeconds} * * * * *`;
  cron.schedule(cronPattern, checkForAfkStatuses);
}

module.exports = startAfkScheduler;
