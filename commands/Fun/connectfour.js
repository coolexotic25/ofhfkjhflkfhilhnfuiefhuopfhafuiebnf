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

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const lang = yaml.load(fs.readFileSync('./lang.yml', 'utf8'));
const config = yaml.load(fs.readFileSync('././config.yml', 'utf8'))

function getButtonStyle(color) {
	const colorMap = {
		'PRIMARY': ButtonStyle.Primary,
		'SECONDARY': ButtonStyle.Secondary,
		'SUCCESS': ButtonStyle.Success,
		'DANGER': ButtonStyle.Danger,
	};
	return colorMap[color] || ButtonStyle.Success;
}


module.exports = {
	data: new SlashCommandBuilder()
		.setName('connectfour')
		.setDescription('Start a game of Connect Four against the bot.'),
	async execute(interaction) {
		const blankBoardEmoji = config.Connectfour.Board.Emojis.Blank;

		const gameBoard = Array(6).fill().map(() => Array(7).fill(blankBoardEmoji));
		const gameId = `connectfour-${Date.now()}-${interaction.user.id}`;

		const playerEmoji = config.Connectfour.Board.Emojis.Player;
		const botEmoji = config.Connectfour.Board.Emojis.Bot;

		await interaction.reply({
			content: createGameBoardMessage(gameBoard),
			components: createBoardComponents(false),
		});

		const message = await interaction.fetchReply();
		const originalMessageId = message.id;
		console.log(`Original Message ID: ${originalMessageId}`);

		const collector = interaction.channel.createMessageComponentCollector({
			time: 600000,
			filter: i => i.customId.startsWith(gameId) && i.user.id === interaction.user.id  

		});

		collector.on('collect', async i => {
			await i.deferUpdate();
			if (i.user.id !== interaction.user.id) {
				await i.followUp({
					content: lang.ConnectFour.OwnGame,
					ephemeral: true
				});
				return;
			}
			const parts = i.customId.split('_');
			const column = parseInt(parts[2]);  

			if (!makeMove(gameBoard, column, playerEmoji)) {
				await i.followUp({
					content: lang.ConnectFour.ColumnFull,
					ephemeral: true
				});
				return;
			}

			if (checkWin(gameBoard, playerEmoji)) {
				await interaction.followUp({
					embeds: [createGameEndEmbed("win", gameBoard)],
					components: []
				});
				collector.stop();
				 deleteOriginalMessage(interaction.channelId, originalMessageId);

				return;
			} else if (isBoardFull(gameBoard)) {
				await interaction.followUp({
					embeds: [createGameEndEmbed("tie", gameBoard)],
					components: []
				});
				collector.stop();
				deleteOriginalMessage(interaction.channelId, originalMessageId);


				return;
			}

			botMove(gameBoard, botEmoji);

			if (checkWin(gameBoard, botEmoji)) {
				await interaction.followUp({
					embeds: [createGameEndEmbed("lost", gameBoard)],
					components: []
				});
				collector.stop();
				deleteOriginalMessage(interaction.channelId, originalMessageId);

				return;
			} else if (isBoardFull(gameBoard)) {
				await interaction.followUp({
					embeds: [createGameEndEmbed("tie", gameBoard)],
					components: []
				});
				collector.stop();
				deleteOriginalMessage(interaction.channelId, originalMessageId);

			} else {
				await interaction.editReply({
					content: createGameBoardMessage(gameBoard),
					components: createBoardComponents(false)
				});
			};
		});

		function createGameBoardEmbed(gameBoard) {
			const boardConfig = config.Connectfour.Board.Emojis;
		
			const numberedRow = [1, 2, 3, 4, 5, 6, 7]
				.map(number => boardConfig[number] || number)  
				.join('');
		
			const embed = new EmbedBuilder()
				.setColor('#000000')  
				.setTitle('Connect Four')
				.setDescription(`${gameBoard.map(row => row.join('')).join('\n')}\n${numberedRow}`)
				.setFooter({
					text: "Choose a column to play"  
				});
		
			return embed;
		}

		function createGameBoardMessage(gameBoard) {
            const boardConfig = config.Connectfour.Board.Emojis;

            const numberedRow = [1, 2, 3, 4, 5, 6, 7]
                .map(number => boardConfig[number] || number)
                .join('');

            return `${gameBoard.map(row => row.join('')).join('\n')}\n${numberedRow}\n`;
        }
		

		function simulateMove(board, column, piece) {
			for (let row = board.length - 1; row >= 0; row--) {
				if (board[row][column] === blankBoardEmoji) {
					board[row][column] = piece;
					return {
						row,
						column,
						removed: false
					};
				}
			}
			return {
				row: -1,
				column,
				removed: true
			};
		}

		function createBoardComponents(disabled) {
			const buttonConfig = config.Connectfour.Buttons;
			const boardConfig = config.Connectfour.Board.Emojis;
		
			const rows = [];
			for (let i = 0; i < 7; i += 5) {
				const actionRow = new ActionRowBuilder();
				for (let j = i; j < i + 5 && j < 7; j++) {
					let label = `${j + 1}`;
					let emoji = null;
		
					if (buttonConfig.Numbers && buttonConfig.Numbers[j + 1]) {
						const buttonNumberConfig = buttonConfig.Numbers[j + 1];
						if (buttonNumberConfig.Text) {
							label = buttonNumberConfig.Text;
						} else if (buttonNumberConfig.Emoji) {
							label = "";
							emoji = buttonNumberConfig.Emoji;
						}
					} else if (boardConfig[j + 1]) {
						label = "";
						emoji = boardConfig[j + 1];
					}
					
					const buttonBuilder = new ButtonBuilder()
						.setCustomId(`${gameId}_column_${j}`)  
						.setStyle(getButtonStyle(buttonConfig.Style.toUpperCase()) || ButtonStyle.Primary) 
						.setDisabled(disabled);
		
					if (label) buttonBuilder.setLabel(label);
					if (emoji) buttonBuilder.setEmoji(emoji);
		
					actionRow.addComponents(buttonBuilder);
				}
				rows.push(actionRow);
			}
			return rows;
		}

		function makeMove(board, column, piece) {
			for (let row = 5; row >= 0; row--) {
				if (board[row][column] === blankBoardEmoji) {
					board[row][column] = piece;
					return true;
				}
			}
			return false;
		}

		function botMove(board, piece) {
			const opponentPiece = playerEmoji;
			for (let strategy of [piece, opponentPiece]) {
				for (let col = 0; col < 7; col++) {
					const simulationResult = simulateMove(board, col, strategy);
					if (!simulationResult.removed && checkWin(board, strategy)) {
						if (strategy === piece) {
							return true;
						} else {
							undoMove(board, simulationResult);
							makeMove(board, col, piece);
							return true;
						}
					}
					undoMove(board, simulationResult);
				}
			}

			let moveMade = false;
			while (!moveMade) {
				const randomCol = Math.floor(Math.random() * 7);
				moveMade = makeMove(board, randomCol, piece);
			}
			return moveMade;
		}

		function isBoardFull(board) {
			return board.every(row => row.every(cell => cell !== blankBoardEmoji));
		}

		function undoMove(board, {
			row,
			column,
			removed
		}) {
			if (!removed && row !== -1 && board[row] && board[row][column] !== blankBoardEmoji) {
				board[row][column] = blankBoardEmoji;
			}
		}

		function checkWin(board, piece) {
			const ROWS = board.length;
			const COLS = board[0].length;

			for (let row = 0; row < ROWS; row++) {
				for (let col = 0; col < COLS - 3; col++) {
					if (board[row][col] == piece &&
						board[row][col + 1] == piece &&
						board[row][col + 2] == piece &&
						board[row][col + 3] == piece) {
						return true;
					}
				}
			}

			for (let row = 0; row < ROWS - 3; row++) {
				for (let col = 0; col < COLS; col++) {
					if (board[row][col] == piece &&
						board[row + 1][col] == piece &&
						board[row + 2][col] == piece &&
						board[row + 3][col] == piece) {
						return true;
					}
				}
			}

			for (let row = 0; row < ROWS - 3; row++) {
				for (let col = 0; col < COLS - 3; col++) {
					if (board[row][col] == piece &&
						board[row + 1][col + 1] == piece &&
						board[row + 2][col + 2] == piece &&
						board[row + 3][col + 3] == piece) {
						return true;
					}
				}
			}

			for (let row = 3; row < ROWS; row++) {
				for (let col = 0; col < COLS - 3; col++) {
					if (board[row][col] == piece &&
						board[row - 1][col + 1] == piece &&
						board[row - 2][col + 2] == piece &&
						board[row - 3][col + 3] == piece) {
						return true;
					}
				}
			}

			return false;
		}

		function createGameEndEmbed(outcome, gameBoard) {
			const winColor = config.Connectfour.Colors.Win;
			const loseColor = config.Connectfour.Colors.Lose;
			const tieColor = config.Connectfour.Colors.Tie;
			let result
			let color;
		if(outcome == "win") {
			color = winColor;
			result = lang.ConnectFour.Win;
		} else if(outcome == "lost"){
			color = loseColor;
			result = lang.ConnectFour.Lost;
		} else {
			color = tieColor;
			result = lang.ConnectFour.Tie;
		}
			const embed = new EmbedBuilder()
				.setColor(color)  
				.setTitle(lang.ConnectFour.GameOver)
				.setDescription(`${result.replace(`{user}`, `<@${interaction.user.id}>`)}\n\n${gameBoard.map(row => row.join(' ')).join('\n')}`)  
				.setFooter({ text: lang.ConnectFour.ThanksForPlaying, iconURL: interaction.user.displayAvatarURL() });
		
			return embed;
		}
  
		async function deleteOriginalMessage(channelId, messageId) {
			const channel = await interaction.client.channels.fetch(channelId).catch(console.error);
			if (!channel) {
				return;
			}
			
			const message = await channel.messages.fetch(messageId).catch(console.error);
			if (!message) {
				return;
			}
		
			message.delete().catch(console.error);
		}
	}
}