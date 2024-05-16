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
const Discord = require('discord.js');
const fs = require('fs');
const axios = require('axios');
const yaml = require('js-yaml');
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
const lang = yaml.load(fs.readFileSync('./lang.yml', 'utf8'));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stealemoji')
        .setDescription('Borrows emojis from other servers')
        .addStringOption(option =>
            option.setName('emoji')
                .setDescription('The emoji you want to borrow')
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('addtoserver')
                .setDescription('Optionally add the emoji to your server')),
    async execute(interaction, client) {
        const emoji = interaction.options.getString('emoji');
        const addToServer = interaction.options.getBoolean('addtoserver');

        const allowedRoles = config.StealEmoji.WhitelistRoles; 
        const userRoles = interaction.member.roles.cache.map((role) => role.id);
        const hasPermission = userRoles.some((role) =>
            allowedRoles.includes(role)
        );

        if (!hasPermission) {
          return interaction.reply({
              content: "You do not have permission to use this command.",
              ephemeral: true,
          });
        }  

        if (emoji.startsWith('<:') || emoji.startsWith('<a:')) {
            const emojiName = emoji.split(':')[1];
            const emojiId = emoji.split(':')[2].split('>')[0];
            const isAnimated = emoji.startsWith('<a:');
            const emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}`;

            if (addToServer) {
                const response = await axios.get(emojiUrl, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(response.data, 'binary');

                try {
                    const addedEmoji = await interaction.guild.emojis.create({
                        attachment: buffer,
                        name: emojiName
                    });
                    await interaction.reply({ content: `Emoji added to the server! ${addedEmoji.toString()}`, ephemeral: true });
                } catch (error) {
                    console.error('Error adding emoji:', error);
                    await interaction.reply({ content: 'Failed to add emoji. missing permissions.', ephemeral: true });
                }
            } else {
                await interaction.reply({ content: `Here is your emoji: ${emojiUrl}`, ephemeral: true });
            }
        } else {
            await interaction.reply({ content: 'Please provide a custom emoji from another server.', ephemeral: true });
        }
    }
};