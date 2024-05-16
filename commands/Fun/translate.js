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

const { ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js');
const { translate } = require('@vitalets/google-translate-api');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('translate')
        .setType(ApplicationCommandType.Message),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const message = await interaction.channel.messages.fetch(interaction.targetId);
        const text = message.content;

        try {
            const result = await translate(text, { to: 'en' });
            if (result && result.text) {
                if (result.text.trim().toLowerCase() === text.trim().toLowerCase()) {
                    await interaction.editReply({
                        content: `**Original Text:**\n${text}\n\n**Note:** The original text isn't complex enough or is already in English, resulting in an identical translation.`,
                        ephemeral: true
                    });
                } else {
                    await interaction.editReply({
                        content: `**Original Text:**\n${text}\n\n**Translated Text:**\n${result.text}`,
                        ephemeral: true
                    });
                }
            } else {
                throw new Error('No translation returned.');
            }
        } catch (error) {
            console.error("Error in translate command: ", error);
            await interaction.editReply({
                content: `Sorry, there was an error translating the text. Please try again later. Error: ${error.message}`,
                ephemeral: true
            });
        }
    }
};