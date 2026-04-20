const { EmbedBuilder } = require("discord.js");
const { getBalance, placeBet, settleBet } = require("../balanceStore");

async function handleCoinflip(cmd, args, msg) {
  if (cmd !== "!coinflip" && cmd !== "!cf") return false;

  const amount = Number(args[1]);
  const choice = (args[2] || "").toLowerCase();

  if (!Number.isInteger(amount) || amount <= 0) {
    await msg.reply("Usage: `!coinflip <amount> <heads/tails>`");
    return true;
  }

  if (choice !== "heads" && choice !== "tails") {
    await msg.reply("You must choose **heads** or **tails**.\nUsage: `!coinflip <amount> <heads/tails>`");
    return true;
  }

  const bal = await getBalance(msg.author.id);
  if (amount > bal) {
    await msg.reply(`You only have ${bal} coins.`);
    return true;
  }

  const betContext = await placeBet(msg.author.id, amount);
  if (!betContext.ok) {
    await msg.reply(`You only have ${betContext.balance ?? bal} coins.`);
    return true;
  }

  const result = Math.random() < 0.5 ? "heads" : "tails";
  const win = choice === result;

  if (win) {
    await settleBet(msg.author.id, betContext, amount * 2);
  }

  const embed = new EmbedBuilder()
    .setColor(0xffd54a)
    .setTitle("CoinCrown | Coinflip")
    .setDescription(win ? "✅ **YOU WON**" : "❌ **YOU LOST**")
    .addFields(
      { name: "Result", value: `**${result}**`, inline: true },
      { name: win ? "Won" : "Lost", value: `**${amount}** coins`, inline: true }
    )
    .setFooter({ text: `Player: ${msg.author.username}` })
    .setTimestamp();

  await msg.reply({ embeds: [embed] });

  return true;
}

module.exports = { handleCoinflip };