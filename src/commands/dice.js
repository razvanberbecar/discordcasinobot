const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const { getBalance, placeBet, settleBet } = require("../balanceStore");
const { createDiceFaceImage } = require("../utils/diceImage");

async function handleDice(cmd, args, msg) {
  if (cmd !== "!dice" && cmd !== "!d") return false;

  const bet = Number(args[1]);
  const prediction = (args[2] || "").toLowerCase();

  const validPredictions = ["1", "2", "3", "4", "5", "6", "even", "odd", "high", "low"];

  if (!Number.isInteger(bet) || bet <= 0) {
    await msg.reply("Usage: `!dice <bet> <prediction>`\nPredictions: 1-6, even, odd, high, low");
    return true;
  }

  if (!validPredictions.includes(prediction)) {
    await msg.reply("Invalid prediction. Use: 1-6, even, odd, high, or low");
    return true;
  }

  const bal = await getBalance(msg.author.id);
  if (bet > bal) {
    await msg.reply(`You only have **${bal}** coins.`);
    return true;
  }

  const betContext = await placeBet(msg.author.id, bet);
  if (!betContext.ok) {
    await msg.reply(`You only have **${betContext.balance ?? bal}** coins.`);
    return true;
  }

  const roll = Math.floor(Math.random() * 6) + 1;
  let win = false;
  let payout = 0;
  let multiplier = 0;

  if (prediction >= "1" && prediction <= "6") {
    const targetNumber = Number(prediction);
    win = roll === targetNumber;
    multiplier = 5;
  } else if (prediction === "even") {
    win = roll % 2 === 0;
    multiplier = 1.86;
  } else if (prediction === "odd") {
    win = roll % 2 === 1;
    multiplier = 1.86;
  } else if (prediction === "high") {
    win = roll >= 4;
    multiplier = 1.86;
  } else if (prediction === "low") {
    win = roll <= 3;
    multiplier = 1.86;
  }

  if (win) {
    payout = Math.floor(bet * multiplier);
    await settleBet(msg.author.id, betContext, payout);
  } else {
    payout = 0;
  }

  const net = payout - bet;

  const rollingMessage = await msg.reply("🎲 Rolling...");

  try {
    const imageBuffer = createDiceFaceImage(roll);
    const attachment = new AttachmentBuilder(imageBuffer, { name: "dice-result.png" });
    
    const embed = new EmbedBuilder()
      .setColor(0xffd54a)
      .setTitle(win ? "🎲 **YOU WON**" : "🎲 **YOU LOST**")
      .addFields(
        { name: "Your Prediction", value: `**${prediction}**`, inline: true },
        { name: "Roll Result", value: `**${roll}**`, inline: true },
        { name: "Bet", value: `**${bet}**`, inline: true },
        { name: "Payout", value: `**${payout}**`, inline: true },
        { name: "Net", value: `**${net >= 0 ? "+" : ""}${net}**`, inline: true }
      )
      .setFooter({ text: `Player: ${msg.author.username}` })
      .setTimestamp();
    
    await rollingMessage.edit({ content: "", files: [attachment], embeds: [embed] });
  } catch (err) {
    console.error("Failed to render dice image:", err);
    const embed = new EmbedBuilder()
      .setColor(0xffd54a)
      .setTitle("CoinCrown | Dice Roll")
      .setDescription(win ? "🎲 **YOU WON**" : "🎲 **YOU LOST**")
      .addFields(
        { name: "Your Prediction", value: `**${prediction}**`, inline: true },
        { name: "Roll Result", value: `**${roll}**`, inline: true },
        { name: "Bet", value: `**${bet}**`, inline: true },
        { name: "Payout", value: `**${payout}**`, inline: true },
        { name: "Net", value: `**${net >= 0 ? "+" : ""}${net}**`, inline: true }
      )
      .setFooter({ text: `Player: ${msg.author.username}` })
      .setTimestamp();
    await rollingMessage.edit({ content: "", embeds: [embed], files: [] });
  }

  return true;
}

module.exports = { handleDice };
