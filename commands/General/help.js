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
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

const commandsConfig = yaml.load(fs.readFileSync('./commands.yml', 'utf8'));

const categoryEmojis = {
    Fun: '🎮',
    General: '📜',
    Moderation: '🔨',
    Utility: '⚙️'
};

function getCommands(directory, parentCategory = null, commands = {}) {
    const filesOrDirectories = fs.readdirSync(directory, { withFileTypes: true });

    for (const item of filesOrDirectories) {
        const fullPath = path.join(directory, item.name);

        if (item.isDirectory()) {
            let currentCategory;
            switch (item.name) {
                case 'Music':
                case 'Leveling':
                    currentCategory = 'Fun';
                    break;
                case 'Backups':
                case 'Tickets':
                    currentCategory = 'Utility';
                    break;
                default:
                    currentCategory = item.name;
                    break;
            }
            getCommands(fullPath, currentCategory, commands);
        } else if (item.name.endsWith('.js')) {
            const commandName = item.name.replace('.js', '');
            if (commandsConfig[commandName] !== false) {
                const categoryName = parentCategory || path.basename(path.dirname(fullPath));
                if (!commands[categoryName]) commands[categoryName] = [];
                commands[categoryName].push(commandName);
            }
        }
    }

    return commands;
}

function validateURL(url) {
    return url && url.trim().length > 0;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('View a list of all the commands'),
    async execute(interaction) {
        try {
            const commandsPath = path.resolve(__dirname, '../');
            const commandCategories = getCommands(commandsPath);

            const helpEmbed = new EmbedBuilder()
                .setDescription('## **Drako Bot Commands List**')
                .setColor('#000000');

            const thumbnailUrl = "https://i.imgur.com/iaQjt2f.png";
            if (validateURL(thumbnailUrl)) {
                helpEmbed.setThumbnail(thumbnailUrl);
            }

            const footerIconUrl = "https://i.imgur.com/iaQjt2f.png";
            if (validateURL(footerIconUrl)) {
                helpEmbed.setFooter({ text: "Drako Bot", iconURL: footerIconUrl });
            }

            Object.entries(commandCategories).forEach(([category, commands]) => {
                if (commands.length) {
                    commands.sort();
                    const emoji = categoryEmojis[category] || '';
                    helpEmbed.addFields({ name: `**${emoji} ${category}**`, value: `\`${commands.join('`, `')}\``, inline: false });
                }
            });

            await interaction.reply({ embeds: [helpEmbed] });
        } catch (error) {
            console.error(`An error occurred while executing the help command: ${error.message}`);
            await interaction.reply('There was an error trying to execute that command! Please try again later.');
        }
    }
};
