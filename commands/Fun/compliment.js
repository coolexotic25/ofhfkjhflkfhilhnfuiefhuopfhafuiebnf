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
    
const compliments = [
    "You're more helpful than you realize.",
    "Your talent for kindness is unmatched.",
    "You have an amazing sense of humor.",
    "You bring out the best in other people.",
    "Your perspective is refreshing.",
    "You light up the room.",
    "You have a great sense of style.",
    "Your kindness is a balm to all who encounter it.",
    "You're like a ray of sunshine on a really dreary day.",
    "You're a smart cookie.",
    "I bet you do the crossword puzzle in ink.",
    "You're someone's reason to smile.",
    "You have the best ideas.",
    "You always know how to find that silver lining.",
    "Everyone gets knocked down sometimes; only people like you get back up again and keep going.",
    "You're a candle in the darkness.",
    "You're a great example to others.",
    "Being around you is like being on a happy little vacation.",
    "You always know just what to say.",
    "You're always learning new things and trying to better yourself, which is awesome.",
    "Your creativity is contagious.",
    "You have a natural grace and elegance.",
    "Your kindness is a treasure to all who know you.",
    "You have an incredible work ethic.",
    "Your positivity is inspiring.",
    "You have a way of making everything better.",
    "You're braver than you believe, and stronger than you seem.",
    "You're a true problem-solver, always finding a way through.",
    "Your smile is contagious.",
    "You light up any room you're in.",
    "Your energy is infectious.",
    "You have a great sense of humor that brightens everyone's day.",
    "You're all kinds of awesome.",
    "You have such a great heart.",
    "Your passion for what you love is admirable.",
    "You're making a difference in the world.",
    "You're more fun than bubble wrap.",
    "On a scale from 1 to 10, you're an 11.",
    "You're like a breath of fresh air.",
    "You're someone's reason to smile.",
    "You're even better than a unicorn because you're real.",
    "How do you keep being so funny and making everyone laugh?",
    "You have a really good taste in [music/books/movies].",
    "Your ability to recall random factoids at just the right times is impressive.",
    "You're always learning new things and trying to better yourself, which is awesome.",
    "You could survive a zombie apocalypse.",
    "You're more fun than a ball pit filled with candy.",
    "You're the most perfect you there is.",
    "Your kindness is a balm to all who encounter it."
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('compliment')
        .setDescription('Send a random compliment to someone!')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to compliment')
                .setRequired(true)),
    async execute(interaction, client) {
        const user = interaction.options.getUser('user');

        const compliment = compliments[Math.floor(Math.random() * compliments.length)];

        await interaction.reply(`${user}, ${compliment}`);
    }
};