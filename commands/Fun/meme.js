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
const fetch = require('node-fetch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('meme')
        .setDescription('Get a random meme from r/dankmemes'),
    async execute(interaction) {
        await interaction.deferReply();

        fetch('https://www.reddit.com/r/dankmemes/random/.json')
            .then(res => {
                if (!res.ok) {
                    throw new Error('Failed to fetch meme, Reddit API might be down or busy.');
                }
                return res.json();
            })
            .then(json => {
                const data = json[0].data.children[0].data;
                const memeUrl = `https://reddit.com${data.permalink}`;
                const memeImage = data.url;
                const memeTitle = data.title;
                const memeUpvotes = data.ups;
                const memeDownvotes = data.downs;
                const memeNumComments = data.num_comments;

                const embed = new EmbedBuilder()
                    .setTitle(memeTitle)
                    .setURL(memeUrl)
                    .setImage(memeImage)
                    .setColor("#000000")
                    .setFooter({ text: `👍 ${memeUpvotes} 👎 ${memeDownvotes} 💬 ${memeNumComments}` });

                interaction.editReply({ embeds: [embed] });
            })
            .catch(error => {
                console.error('Error fetching meme:', error);
                interaction.editReply({
                    content: 'Sorry, I couldn\'t fetch a meme at the moment. Please try again later.',
                });
            });
    },
};