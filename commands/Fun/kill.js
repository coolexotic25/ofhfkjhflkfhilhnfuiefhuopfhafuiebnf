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

const killScenarios = [
    "zaps you with a ray of harmless, glittery light.",
    "throws a soft, plush pillow at you, 'eliminating' you in jest.",
    "defeats you in a friendly duel with foam swords.",
    "sends a horde of cute puppies to overwhelm you with cuddles.",
    "uses a pretend laser gun, making 'pew pew' sounds as you play along and fall down.",
    "casts a playful hex, making you dance uncontrollably for a few seconds.",
    "summons a giant, friendly dragon to give you a gentle nudge off the virtual cliff.",
    "challenges you to a karaoke battle, singing so powerfully you 'collapse' in admiration.",
    "pulls out a comic book-style giant mallet and comically 'bonks' you on the head.",
    "traps you in a bubble of laughter, floating you away to the clouds.",
    "shoots a web of confetti at you, tangling you in a colorful mess.",
    "fires a harmless, imaginary cannonball, which theatrically 'blasts' you off your feet.",
    "enlists the help of a virtual wizard who casts a 'freeze' spell, pausing you in place."
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kill')
        .setDescription('Pretend to eliminate another user in a fun and harmless way!')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to eliminate')
                .setRequired(true)),
    async execute(interaction, client) {
        const target = interaction.options.getUser('target');
        const scenario = killScenarios[Math.floor(Math.random() * killScenarios.length)];

        await interaction.reply(`<@${target.id}> ${scenario} <@${interaction.user.id}>.`);
    }
};