const { EmbedBuilder } = require("discord.js");

const RTP_TABLE = [
  { game: "Slots", rtp: "98.2%" },
  { game: "Coinflip", rtp: "100%" },
  { game: "Dice", rtp: "98.8%" },
  { game: "Higher/Lower", rtp: "97.8%" },
  { game: "Mines", rtp: "95.2%-99.8%" },
  { game: "Roulette", rtp: "97.3%" },
  { game: "Crash", rtp: "95.0%" },
  { game: "Blackjack", rtp: "99.5%" },
];

async function handleRtp(cmd, args, msg) {
  if (cmd !== "!rtp" && cmd !== "!rates") return false;

  const lines = RTP_TABLE.map((row) => `• **${row.game}**: ${row.rtp}`).join("\n");

  const embed = new EmbedBuilder()
    .setColor(0xffd54a)
    .setTitle("CoinCrown | RTP Rates")
    .setDescription("Displayed rates are fixed platform values.")
    .addFields({ name: "Games", value: lines })
    .setFooter({ text: "RTP = Return To Player" })
    .setTimestamp();

  await msg.reply({ embeds: [embed] });
  return true;
}

module.exports = { handleRtp };
