const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getTopRichest, getTopWagered } = require("../db");

function generateLeaderboardEmbed(type) {
  const embed = new EmbedBuilder();
  let desc = "";

  if (type === "richest") {
    embed.setTitle("💰 Global Leaderboard — Richest Players");
    embed.setColor("#f1c40f"); // Gold
    const top = getTopRichest(10);
    if (top.length === 0) {
      desc = "No players found yet.";
    } else {
      top.forEach((u, i) => {
        desc += `**${i + 1}.** <@${u.userId}> — **${u.total.toLocaleString()}** coins\n`;
      });
    }
  } else if (type === "wagered") {
    embed.setTitle("🎲 Global Leaderboard — Biggest Gamblers");
    embed.setColor("#e74c3c"); // Casino Red
    const top = getTopWagered(10);
    if (top.length === 0) {
      desc = "No players found yet.";
    } else {
      top.forEach((u, i) => {
        desc += `**${i + 1}.** <@${u.userId}> — **${u.wagered.toLocaleString()}** coins wagered\n`;
      });
    }
  }

  embed.setDescription(desc);
  embed.setFooter({ text: "CoinCrown Official Metrics" });
  embed.setTimestamp();
  
  return embed;
}

function getLeaderboardComponents(activeType) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("lb:richest")
      .setLabel("💰 Richest Players")
      .setStyle(activeType === "richest" ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("lb:wagered")
      .setLabel("🎲 Biggest Gamblers")
      .setStyle(activeType === "wagered" ? ButtonStyle.Success : ButtonStyle.Secondary)
  );
}

async function handleLeaderboard(cmd, args, msg) {
  if (cmd !== "!leaderboard" && cmd !== "!lb" && cmd !== "!top") return false;

  const defaultType = "richest";
  const embed = generateLeaderboardEmbed(defaultType);
  const row = getLeaderboardComponents(defaultType);

  await msg.reply({ embeds: [embed], components: [row] });
  return true;
}

async function handleLeaderboardInteraction(interaction) {
  if (!interaction.isButton()) return false;
  if (!interaction.customId.startsWith("lb:")) return false;

  const type = interaction.customId.split(":")[1]; // 'richest' or 'wagered'
  const embed = generateLeaderboardEmbed(type);
  const row = getLeaderboardComponents(type);

  await interaction.update({ embeds: [embed], components: [row] });
  return true;
}

module.exports = {
  handleLeaderboard,
  handleLeaderboardInteraction
};
