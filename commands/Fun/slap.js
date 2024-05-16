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

const slapActions = [
    "was slapped with a virtual reality glove. Ouch!",
    "received a quick, sharp slap from a digital hand!",
    "got a playful smack with a soft, stuffed emoji pillow.",
    "was hit by a rogue drone carrying a soft boxing glove.",
    "felt the sting of a comedic slap from an oversized foam finger.",
    "was given a gentle but firm slap with a virtual newspaper.",
    "got a surprise slap from a sneaky digital shadow.",
    "was mockingly slapped with an imaginary velvet glove.",
    "was struck by a phantom slap—did that really happen?",
    "received a slap delivered with pixel-perfect precision.",
    "was caught off-guard by a slap from an online meme.",
    "felt the swift smack of a digital pancake.",
    "was slapped with a classic, cartoon-style rubber chicken.",
    "got a well-timed slap from a virtual high-five gone wrong.",
    "was humorously slapped by an unseen, mischievous digital hand."
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slap')
        .setDescription('Slap another user for fun!')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to slap')
                .setRequired(true)),
    async execute(interaction, client) {
        const user = interaction.options.getUser('user');
        const slapAction = slapActions[Math.floor(Math.random() * slapActions.length)];

        await interaction.reply(`${user}, ${slapAction}`);
    }
};