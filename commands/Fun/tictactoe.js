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

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const fs = require('fs');
const yaml = require('js-yaml');
const lang = yaml.load(fs.readFileSync('./lang.yml', 'utf8'));
const config = yaml.load(fs.readFileSync('././config.yml', 'utf8'))


module.exports = {
    data: new SlashCommandBuilder()
        .setName('tictactoe')
        .setDescription('Play Tic-Tac-Toe against a smarter bot!')
        .setDMPermission(false),
    async execute(interaction) {
        const emojis = {
            x: config.TicTacToe.Board.Emojis.X,
            o: config.TicTacToe.Board.Emojis.O,
            blank: config.TicTacToe.Board.Emojis.Blank
        };
        const gameId = `ttt-${Date.now()}-${interaction.user.id}`;

        const gameBoard = Array(3).fill().map(() => Array(3).fill(emojis.blank));
 
        await interaction.reply({
            content:  createGameMessage(interaction.user.username, gameBoard, emojis.blank),
            components: createBoardComponents(gameBoard, emojis, gameId)
        });

        const message = await interaction.fetchReply();
		const originalMessageId = message.id;

        const collector = interaction.channel.createMessageComponentCollector({ 
            componentType: 2, 
            time: 60000 * 5,
            filter: i => i.customId.startsWith(gameId) && i.user.id === interaction.user.id 
        });

        console.log(lang.TicTacToe)

        collector.on('collect', async i => {
            const parts = i.customId.split('-');
            const rowIndex = parseInt(parts[3], 10);
            const cellIndex = parseInt(parts[4], 10);
        
            if (typeof gameBoard[rowIndex] === 'undefined' || typeof gameBoard[rowIndex][cellIndex] === 'undefined') {
                return;
            }
            gameBoard[rowIndex][cellIndex] = emojis.x;

            if (checkWin(gameBoard, emojis.x)) {
                await endGame(interaction, `${interaction.user.username} has won!`, gameBoard, emojis); //dont touch
                collector.stop();
                deleteOriginalMessage(interaction.channelId, originalMessageId, interaction);

                return;
            } else if (isBoardFull(gameBoard, emojis.blank)) {
                await endGame(interaction, "It's a draw!", gameBoard, emojis); //dont touch
                collector.stop();
                deleteOriginalMessage(interaction.channelId, originalMessageId, interaction);

                return;
            }

            smarterBotMove(gameBoard, emojis);
            if (checkWin(gameBoard, emojis.o)) {
                await endGame(interaction, "Bot has won!", gameBoard, emojis); //dont touch
                collector.stop();
                deleteOriginalMessage(interaction.channelId, originalMessageId, interaction);

            } else if (isBoardFull(gameBoard, emojis.blank)) {
                await endGame(interaction, "It's a draw!", gameBoard, emojis); //dont touch
                collector.stop();
                deleteOriginalMessage(interaction.channelId, originalMessageId, interaction);

            } else {
                await i.update({
                    content: createGameMessage(interaction.user.username, gameBoard, emojis.blank),
                    components: createBoardComponents(gameBoard, emojis, gameId)
                });
            }
        });
    },
};

function createBoardComponents(board, emojis, gameId) {
    return board.map((row, rowIndex) =>
        new ActionRowBuilder().addComponents(
            row.map((cell, cellIndex) => new ButtonBuilder()
                .setCustomId(`${gameId}-${rowIndex}-${cellIndex}`) 
                .setEmoji(cell)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(cell !== emojis.blank)
            )
        )
    );
}

function checkWin(board, mark) {
    const lines = [
        [[0, 0], [0, 1], [0, 2]], [[1, 0], [1, 1], [1, 2]], [[2, 0], [2, 1], [2, 2]],
        [[0, 0], [1, 0], [2, 0]], [[0, 1], [1, 1], [2, 1]], [[0, 2], [1, 2], [2, 2]],
        [[0, 0], [1, 1], [2, 2]], [[2, 0], [1, 1], [0, 2]]
    ];
    return lines.some(line => line.every(([r, c]) => board[r][c] === mark));
}

function isBoardFull(board, blank) {
    return board.every(row => row.every(cell => cell !== blank));
}

function smarterBotMove(board, emojis) {
    const canWinNext = (mark) => {
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                if (board[r][c] === emojis.blank) {
                    board[r][c] = mark;
                    const win = checkWin(board, mark);
                    board[r][c] = emojis.blank;
                    if (win) return [r, c];
                }
            }
        }
        return null;
    };

    let move = canWinNext(emojis.o);
    if (move) {
        board[move[0]][move[1]] = emojis.o;
        return;
    }

    move = canWinNext(emojis.x);
    if (move) {
        board[move[0]][move[1]] = emojis.o;
        return;
    }

    if (board[1][1] === emojis.blank) {
        board[1][1] = emojis.o;
        return;
    }

    const corners = [[0, 0], [0, 2], [2, 0], [2, 2]];
    const oppositeCorners = corners.filter(([r, c]) => board[r][c] === emojis.x).map(([r, c]) => [2 - r, 2 - c]);
    for (let [r, c] of oppositeCorners) {
        if (board[r][c] === emojis.blank) {
            board[r][c] = emojis.o;
            return;
        }   
    }

    const emptyCorners = corners.filter(([r, c]) => board[r][c] === emojis.blank);
    if (emptyCorners.length > 0) {
        const [r, c] = emptyCorners[Math.floor(Math.random() * emptyCorners.length)];
        board[r][c] = emojis.o;
        return;
    }

    const sides = [[0, 1], [1, 0], [1, 2], [2, 1]];
    const emptySides = sides.filter(([r, c]) => board[r][c] === emojis.blank);
    if (emptySides.length > 0) {
        const [r, c] = emptySides[Math.floor(Math.random() * emptySides.length)];
        board[r][c] = emojis.o;
        return;
    }
}
 
function createGameMessage(username, board, blank) {
    const boardString = formatBoard(board, blank);
    return `${boardString}`;
}

function formatBoard(board) {
    return board.map(row =>
        row.map(cell => cell === '' ? '⬜️' : cell)
            .join('')
    ).join('\n');
}
 
async function endGame(interaction, resultMessage, gameBoard, emojis) {
    const boardString = formatBoard(gameBoard, emojis);
    let color = '#0000FF';
    let description;

    if (resultMessage.includes("has won!")) {
        if (resultMessage.includes(interaction.user.username)) {
            color = config.TicTacToe.Colors.Win;
            description = lang.TicTacToe.Win.replace(`{user}`, `<@${interaction.user.id}>`);
        } else {
            color = config.TicTacToe.Colors.Lose;
            description = lang.TicTacToe.Lost.replace(`{user}`, `<@${interaction.user.id}>`);
        }
    } else {
        color = config.TicTacToe.Colors.Tie;

        description = lang.TicTacToe.Tie.replace(`{user}`, `<@${interaction.user.id}>`);
    }

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(lang.TicTacToe.GameOver)
        .setDescription(description + "\n" + `${boardString}`)
        .setFooter({ text: lang.TicTacToe.ThanksForPlaying, iconURL: interaction.user.displayAvatarURL() });

    await interaction.followUp({ embeds: [embed], components: [] }).catch(console.error);
 
}

async function deleteOriginalMessage(channelId, messageId, interaction) {
    const channel = await interaction.client.channels.fetch(channelId).catch(console.error);
    if (!channel) {
        console.log('Channel not found.');
        return;
    }
    
    const message = await channel.messages.fetch(messageId).catch(console.error);
    if (!message) {
        console.log('Message not found.');
        return;
    }

    message.delete().catch(console.error);
}
