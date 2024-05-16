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

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
const lang = yaml.load(fs.readFileSync('./lang.yml', 'utf8'));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Create an embed using buttons'),
    async execute(interaction) {
        if (!interaction.member.roles.cache.some(role => config.ModerationRoles.embed.includes(role.id))) {
            return interaction.reply({ content: lang.NoPermsMessage, ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setAuthor({ name: 'Embed Builder' })
            .setColor(config.EmbedColors)
            .setDescription('Welcome to the **interactive embed builder**. Use the buttons below to build the embed, when you\'re done click **Post Embed**!');

        const id = Date.now().toString();

        const components = [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`title_${id}`).setLabel('Title Text').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`description_${id}`).setLabel('Description Text').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`footer_${id}`).setLabel('Footer Text').setStyle(ButtonStyle.Secondary)
            ),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`thumbnail_${id}`).setLabel('Thumbnail Image').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`image_${id}`).setLabel('Large Image').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`footerimage_${id}`).setLabel('Footer Image').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`color_${id}`).setLabel('Embed Color').setStyle(ButtonStyle.Secondary)
            ),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`timestamp_${id}`).setLabel('Add Timestamp').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`post_${id}`).setLabel('Post Embed').setStyle(ButtonStyle.Danger)
            )
        ];

        await interaction.reply({ embeds: [embed], components, ephemeral: true });

        const filter = i => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 900000 });

        collector.on('collect', async i => {
            try {
                if (await handleButtonInteraction(i, embed, components, collector)) {
                    collector.stop();
                }
            } catch (error) {
                console.error('Error handling button interaction:', error);
                await i.reply({ content: 'An unexpected error occurred. Please try again.', ephemeral: true }).catch(console.error);
            }
        });
    }
};

async function handleButtonInteraction(i, embed, components, collector) {
    if (i.deferred || i.replied) return false;
    await i.deferUpdate();

    switch (i.customId.split('_')[0]) {
        case 'title':
        case 'description':
        case 'footer':
        case 'thumbnail':
        case 'image':
        case 'footerimage':
        case 'color':
            await promptAndApply(i, i.customId.split('_')[0], embed, components);
            return false;
        case 'timestamp':
            embed.setTimestamp();
            await i.editReply({ embeds: [embed], components });
            return false;
        case 'post':
            await i.followUp({ embeds: [embed] });
            await i.editReply({ content: 'Successfully posted the embed!', components: [], embeds: [] });
            return true;
        default:
            return false;
    }
}


async function promptAndApply(interaction, fieldType, embed, components) {
    const msgFilter = m => m.author.id === interaction.user.id;
    await interaction.followUp({ content: `Please enter the ${fieldType} (must be a valid URL for images):`, ephemeral: true });
    const messages = await interaction.channel.awaitMessages({ filter: msgFilter, max: 1, time: 60000 });
    const message = messages.first();

    if (message) {
        const content = message.content;
        if (['thumbnail', 'image', 'footerimage'].includes(fieldType)) {
            if (!isValidHttpUrl(content) || !isImageUrl(content)) {
                await interaction.followUp({
                    content: 'You have entered an invalid URL or the URL does not point to an image file. URLs must end with .jpeg, .jpg, .gif, .png, or .svg.',
                    ephemeral: true
                });
                return;
            }
        }

        switch (fieldType) {
            case 'title':
                embed.setTitle(content);
                break;
            case 'description':
                embed.setDescription(content);
                break;
            case 'footer':
                embed.setFooter({ text: content });
                break;
            case 'thumbnail':
                embed.setThumbnail(content);
                break;
            case 'image':
                embed.setImage(content);
                break;
            case 'footerimage':
                embed.setFooter({ text: embed.data.footer?.text || 'Default footer text', iconURL: content });
             //   console.log('Setting footer image with URL:', content);
                break;
            case 'color':
                embed.setColor(content);
                break;
        }
        message.delete();
        await interaction.editReply({ embeds: [embed], components });
    } else {
        await interaction.followUp({ content: 'No input received, operation cancelled.', ephemeral: true });
    }
}

function isValidHttpUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch (_) {
        return false;
    }
}

function isImageUrl(url) {
    return /\.(jpeg|jpg|gif|png|svg)$/i.test(url);
}