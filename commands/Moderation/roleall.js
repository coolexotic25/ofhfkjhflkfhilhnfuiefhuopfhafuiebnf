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

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
const lang = yaml.load(fs.readFileSync('./lang.yml', 'utf8'));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roleall')
        .setDescription('Add or remove a role from all users in the guild')
        .addStringOption(option =>
            option.setName('action')
                .setDescription('The action to perform: add or remove')
                .setRequired(true)
                .addChoices(
                    { name: 'add', value: 'add' },
                    { name: 'remove', value: 'remove' }
                )
        )
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('The role to add or remove from all users')
                .setRequired(true)
        ),

    async execute(interaction) {
        try {
            const requiredRoles = config.ModerationRoles.roleall;
            const hasPermission = requiredRoles.some(roleId => interaction.member.roles.cache.has(roleId));

            if (!hasPermission) {
                await interaction.reply({ content: lang.NoPermsMessage, ephemeral: true });
                return;
            }

            const action = interaction.options.getString('action');
            const role = interaction.options.getRole('role');

            const bot = interaction.guild.members.resolve(interaction.client.user.id);
            const botHighestRole = bot.roles.highest.position;
            const rolePosition = role.position;
            const userHighestRole = interaction.member.roles.highest.position;

            if (rolePosition >= botHighestRole) {
                await interaction.reply({ content: lang.RoleAll.RoleAllHighestRole, ephemeral: true });
                console.error(`Bot doesn't have high enough role to perform the action. Bot Highest Role Position: ${botHighestRole}, Target Role Position: ${rolePosition}`);
                return;
            }

            if (rolePosition >= userHighestRole) {
                await interaction.reply({ content: lang.RoleAll.RoleAllUserHighestRole, ephemeral: true });
                console.error(`User doesn't have high enough role to perform the action. User Highest Role Position: ${userHighestRole}, Target Role Position: ${rolePosition}`);
                return;
            }

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirm')
                        .setLabel('Confirm')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('cancel')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Danger)
                );

            const confirmationMessage =
                action === 'add'
                    ? lang.RoleAll.RoleAllConfirmationAdd.replace('{role}', role.toString())
                    : lang.RoleAll.RoleAllConfirmationRemove.replace('{role}', role.toString());

            await interaction.reply({ content: confirmationMessage, components: [row], ephemeral: true });

            const filter = (i) => i.user.id === interaction.user.id;

            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

            collector.on('collect', async (i) => {
                if (i.customId === 'confirm') {
                    try {
                        const members = await interaction.guild.members.fetch();
                        const promises = members.map((member) => {
                            if (action === 'add' && !member.roles.cache.has(role.id) && !member.user.bot) {
                                return member.roles.add(role);
                            } else if (action === 'remove' && member.roles.cache.has(role.id) && !member.user.bot) {
                                return member.roles.remove(role);
                            }
                        });

                        await Promise.all(promises);
                        const successMessage = action === 'add'
                            ? lang.RoleAll.RoleAllSuccessAdd.replace('{role}', role.toString())
                            : lang.RoleAll.RoleAllSuccessRemove.replace('{role}', role.toString());


                        await i.update({ content: successMessage, components: [], ephemeral: true });
                    } catch (error) {
                        console.error(`Error in executing action: ${error.message}`);
                        await i.update({ content: lang.RoleAll.RoleAllError, components: [], ephemeral: true });
                    }
                } else {
                    await i.update({ content: lang.RoleAll.RoleAllCancelled, components: [], ephemeral: true });
                }
            });

            collector.on('end', async (collected) => {
                if (!collected.size) {
                    await interaction.editReply({ content: lang.RoleAll.RoleAllTimeOut, components: [], ephemeral: true });
                }
            });
        } catch (error) {
            console.error(`An error occurred during command execution: ${error.message}`);
            if (error.code === 10062) {
                await interaction.followUp({ content: 'The interaction has expired or is no longer valid.', ephemeral: true });
            } else {
                await interaction.followUp({ content: 'An error occurred while processing your request.', ephemeral: true });
            }
        }
    }
};