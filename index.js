require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");

const { handleEconomy } = require("./src/commands/economy");
const { handleRtp } = require("./src/commands/rtp");
const { handleCoinflip } = require("./src/commands/coinflip");
const { handleSlots } = require("./src/commands/slots");
const { handleDice } = require("./src/commands/dice");
const { handleHigherLower, handleHigherLowerInteraction } = require("./src/commands/higherLower");
const { handleMines, handleMinesInteraction } = require("./src/commands/mines");
const { handleBlackjack, handleBlackjackInteraction } = require("./src/commands/blackjack");
const { handleRoulette, handleRouletteInteraction } = require("./src/commands/roulette");
const { handleCrash, handleCrashInteraction } = require("./src/commands/crash");
const { handleLeaderboard, handleLeaderboardInteraction } = require("./src/commands/leaderboard");
const { handleHelp } = require("./src/commands/help");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.once("clientReady", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;
  if (!msg.content.startsWith("!")) return;
  if (process.env.ALLOWED_SERVER_ID && msg.guildId !== process.env.ALLOWED_SERVER_ID) return;

  try {
    const args = msg.content.trim().split(/\s+/);
    const cmd = args[0].toLowerCase();

    if (await handleEconomy(cmd, args, msg)) return;
    if (await handleRtp(cmd, args, msg)) return;
    if (await handleCoinflip(cmd, args, msg)) return;
    if (await handleSlots(cmd, args, msg)) return;
    if (await handleDice(cmd, args, msg)) return;
    if (await handleHigherLower(cmd, args, msg)) return;
    if (await handleMines(cmd, args, msg)) return;
    if (await handleBlackjack(cmd, args, msg)) return;
    if (await handleRoulette(cmd, args, msg)) return;
    if (await handleCrash(cmd, args, msg)) return;
    if (await handleLeaderboard(cmd, args, msg)) return;
    if (await handleHelp(cmd, args, msg)) return;
  } catch (err) {
    if (err.code === 50013) return; // Prevent crashing when the bot is denied "Send Messages"
    console.error("Message handling error:", err);
    try {
      await msg.reply("Something went wrong running that command.");
    } catch (replyErr) {}
  }
});

client.on("interactionCreate", async (interaction) => {
  if (process.env.ALLOWED_SERVER_ID && interaction.guildId !== process.env.ALLOWED_SERVER_ID) return;
  try {
    if (await handleHigherLowerInteraction(interaction)) return;
    if (await handleMinesInteraction(interaction)) return;
    if (await handleBlackjackInteraction(interaction)) return;
    if (await handleRouletteInteraction(interaction)) return;
    if (await handleCrashInteraction(interaction)) return;
    if (await handleLeaderboardInteraction(interaction)) return;
  } catch (err) {
    console.error("Interaction handling error:", err);
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({ content: "Something went wrong handling this action.", ephemeral: true });
      } catch (replyErr) {
        // Ignore follow-up failures for expired/already-acknowledged interactions.
        const code = replyErr?.code;
        if (code !== 10062 && code !== 40060) {
          console.error("Failed to send interaction error reply:", replyErr);
        }
      }
    }
  }
});

client.login(process.env.DISCORD_TOKEN);