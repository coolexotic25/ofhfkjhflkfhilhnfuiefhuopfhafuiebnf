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
const yaml = require('js-yaml');
const fs = require('fs');
const config = yaml.load(fs.readFileSync('././config.yml', 'utf8'))
const lang = yaml.load(fs.readFileSync('././lang.yml', 'utf8'))

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Set slowmode in a channel')
        .addNumberOption(option => option.setName('amount').setDescription('Slowmode time in seconds (1-21600 Seconds), Set to 0 to disable.').setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const requiredRoles = config.ModerationRoles.slowmode;
        const hasPermission = requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId));

        if (!hasPermission) {
            return interaction.editReply({ content: lang.NoPermsMessage, ephemeral: true });
        }

        let amount = interaction.options.getNumber("amount");
        amount = Math.max(0, Math.min(amount, 21600)); 

        try {
            await interaction.channel.setRateLimitPerUser(amount);
            const responseMessage = amount === 0 ? lang.SlowmodeReset : lang.SlowmodeSuccess.replace(/{time}/g, `${amount}`);
            const successEmbed = createResponseEmbed(responseMessage, true);
            await interaction.editReply({ embeds: [successEmbed], ephemeral: true });
        } catch (error) {
            console.error('Slowmode Error:', error);
            const errorEmbed = createResponseEmbed(lang.SlowmodeFailed, false);
            await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
        }
    }

};

function createResponseEmbed(message, isSuccess) {
    return new EmbedBuilder()
        .setAuthor({ name: isSuccess ? lang.SuccessEmbedTitle : lang.ErrorEmbedTitle, iconURL: isSuccess ? 'https://i.imgur.com/7SlmRRa.png' : 'https://i.imgur.com/MdiCK2c.png' })
        .setColor(isSuccess ? config.SuccessEmbedColor : config.ErrorEmbedColor)
        .setDescription(message);
}