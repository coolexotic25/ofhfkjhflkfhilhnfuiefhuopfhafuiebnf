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

const hugDescriptions = [
    "wraps their arms around you in a warm, comforting hug.",
    "gives you a gentle, reassuring hug.",
    "hugs you tightly, spreading warmth and joy.",
    "sends you a big, heartfelt hug from across the digital space.",
    "shares a cozy hug with you, making you feel valued.",
    "embraces you in a long, meaningful hug.",
    "pulls you into a bear hug, lifting you off your feet with their enthusiasm.",
    "sneaks up and surprises you with a friendly back hug.",
    "gives you a quick, cheerful side hug, brightening your day.",
    "wraps you in a blanket and hugs you, creating a snug and comfy moment.",
    "holds you close, swaying gently as if to a slow, silent song.",
    "offers a group hug, inviting others to join and spread the love.",
    "squeezes you in a playful, energetic hug, laughing all the while."
];


module.exports = {
    data: new SlashCommandBuilder()
        .setName('hug')
        .setDescription('Send a hug to someone to brighten their day!')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to hug')
                .setRequired(true)),
    async execute(interaction, client) {
        const target = interaction.options.getUser('target');
        const description = hugDescriptions[Math.floor(Math.random() * hugDescriptions.length)];

        await interaction.reply(`<@${interaction.user.id}> ${description} <@${target.id}>.`);
    }
};