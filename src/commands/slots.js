const { getBalance, placeBet, settleBet } = require("../balanceStore");
const { AttachmentBuilder, EmbedBuilder } = require("discord.js");
const { sleep } = require("../utils/render");
const { createSlotsResultImage } = require("../utils/slotsImage");

async function handleSlots(cmd, args, msg) {
  if (cmd !== "!slots" && cmd !== "!sl") return false;

  const totalBet = Number(args[1]);
  const selectedPaylines = Number(args[2] || 20); // default all paylines
  const renderModeRaw = (args[3] || "image").toLowerCase();
  const MAX_PAYLINES = 20;
  const renderMode = renderModeRaw === "img" ? "image" : renderModeRaw;
  const renderAsImage = renderMode !== "text" && renderMode !== "embed";

  if (!Number.isInteger(totalBet) || totalBet <= 0) {
    await msg.reply("Usage: `!slots <bet> <paylines> [image|text]`\nExample: `!slots 200 10 image`");
    return true;
  }

  if (!Number.isInteger(selectedPaylines) || selectedPaylines < 1 || selectedPaylines > MAX_PAYLINES) {
    await msg.reply(`Paylines must be between 1 and ${MAX_PAYLINES}.\nUsage: \`!slots <bet> <paylines> [image|text]\``);
    return true;
  }

  if (!["image", "text", "embed"].includes(renderMode)) {
    await msg.reply("Display mode must be `image` or `text`.\nUsage: `!slots <bet> <paylines> [image|text]`");
    return true;
  }

  const bal = await getBalance(msg.author.id);
  if (totalBet > bal) {
    await msg.reply(`You only have **${bal}** coins.`);
    return true;
  }

  const betContext = await placeBet(msg.author.id, totalBet);
  if (!betContext.ok) {
    await msg.reply(`You only have **${betContext.balance ?? bal}** coins.`);
    return true;
  }

  const betPerPayline = totalBet / selectedPaylines;

  const reelStrip = [
    "🍒","🍒","🍒","🍒","🍒","🍒","🍒","🍒","🍒",
    "🍋","🍋","🍋","🍋","🍋","🍋","🍋",
    "🔔","🔔","🔔","🔔","🔔",
    "⭐","⭐","⭐",
    "💎","💎",
    "7️⃣",
  ];

  function spinReel() {
    const stop = Math.floor(Math.random() * reelStrip.length);
    return [
      reelStrip[stop % reelStrip.length],
      reelStrip[(stop + 1) % reelStrip.length],
      reelStrip[(stop + 2) % reelStrip.length],
    ];
  }

  const reels = [spinReel(), spinReel(), spinReel(), spinReel(), spinReel()];
  const grid = [
    [reels[0][0], reels[1][0], reels[2][0], reels[3][0], reels[4][0]],
    [reels[0][1], reels[1][1], reels[2][1], reels[3][1], reels[4][1]],
    [reels[0][2], reels[1][2], reels[2][2], reels[3][2], reels[4][2]],
  ];

  const paylines = [
    [0, 0, 0, 0, 0],
    [1, 1, 1, 1, 1],
    [2, 2, 2, 2, 2],
    [0, 1, 2, 1, 0],
    [2, 1, 0, 1, 2],
    [0, 0, 1, 0, 0],
    [2, 2, 1, 2, 2],
    [1, 0, 0, 0, 1],
    [1, 2, 2, 2, 1],
    [0, 1, 1, 1, 0],
    [2, 1, 1, 1, 2],
    [1, 0, 1, 2, 1],
    [1, 2, 1, 0, 1],
    [0, 1, 0, 1, 0],
    [2, 1, 2, 1, 2],
    [0, 2, 0, 2, 0],
    [2, 0, 2, 0, 2],
    [1, 1, 0, 1, 1],
    [1, 1, 2, 1, 1],
    [0, 2, 1, 2, 0],
  ];

  const paytable = {
    "🍒": { 3: 7, 4: 17, 5: 34 },
    "🍋": { 3: 10, 4: 24, 5: 48 },
    "🔔": { 3: 17, 4: 41, 5: 85 },
    "⭐": { 3: 27, 4: 68, 5: 136 },
    "💎": { 3: 41, 4: 119, 5: 272 },
    "7️⃣": { 3: 68, 4: 255, 5: 680 },
  };

  function evalPayline(paylinePattern) {
    const paylineSymbols = paylinePattern.map((row, col) => grid[row][col]);
    const first = paylineSymbols[0];

    let count = 1;
    for (let i = 1; i < paylineSymbols.length; i++) {
      if (paylineSymbols[i] === first) count++;
      else break;
    }

    if (count >= 3) {
      const mult = paytable[first]?.[count] || 0;
      const payout = Math.floor(mult * betPerPayline);
      return { win: payout > 0, payout };
    }

    return { win: false, payout: 0 };
  }

  let totalPayout = 0;
  const winningPaylineIndexes = [];
  for (let i = 0; i < selectedPaylines; i++) {
    const res = evalPayline(paylines[i]);
    if (res.win) {
      totalPayout += res.payout;
      winningPaylineIndexes.push(i);
    }
  }

  await settleBet(msg.author.id, betContext, totalPayout);

  const spinMsg = (await msg.reply("Good luck."));
  await sleep(100);
  await spinMsg.edit("🎰 Spinning...\n1... ✅");
  await sleep(220);
  await spinMsg.edit("🎰 Spinning...\n1... ✅\n2... ✅");
  await sleep(220);
  await spinMsg.edit("🎰 Spinning...\n1... ✅\n2... ✅\n3... ✅");
  await sleep(220);
  await spinMsg.edit("🎰 Spinning...\n1... ✅\n2... ✅\n3... ✅\n4... ✅");
  await sleep(220);
  await spinMsg.edit("🎰 Spinning...\n1... ✅\n2... ✅\n3... ✅\n4... ✅\n5... ✅");
  await sleep(220);

  const gridText =
    `${grid[0].join("  ")}\n` +
    `${grid[1].join("  ")}\n` +
    `${grid[2].join("  ")}`;

  const net = totalPayout - totalBet;
  const statusTitle = net >= 0 ? "SPIN WIN" : "SPIN LOSS";
  const statusIcon = net >= 0 ? "✅" : "❌";

  let imageAttachment = null;
  if (renderAsImage) {
    try {
      const imageBuffer = createSlotsResultImage({
        grid,
        paylines,
        winningPaylineIndexes,
        statusText: statusTitle,
        totalBet,
        totalPayout,
        net,
        selectedPaylines,
      });
      imageAttachment = new AttachmentBuilder(imageBuffer, { name: "slots-result.png" });
    } catch (err) {
      console.error("Failed to render slots image:", err);
    }
  }

  if (imageAttachment) {
    await spinMsg.edit({
      content: "",
      embeds: [],
      files: [imageAttachment],
    });
    return true;
  }

  const embed = new EmbedBuilder()
    .setColor(0xffd54a)
    .setTitle("CoinCrown | Slots")
    .setDescription(
      `${statusIcon} **${statusTitle}**\n` +
      `🎰 **5x3 Grid**\n${gridText}`
    )
    .addFields(
      { name: "Bet", value: `**${totalBet}**`, inline: true },
      { name: "Payout", value: `**${totalPayout}**`, inline: true },
      { name: "Net", value: `**${net >= 0 ? "+" : ""}${net}**`, inline: true },
      { name: "Paylines", value: `**${selectedPaylines}**`, inline: true },
      { name: "Mode", value: `**Text**`, inline: true }
    )
    .setFooter({ text: `Player: ${msg.author.username}` })
    .setTimestamp();

  await spinMsg.edit({
    content: "",
    embeds: [embed],
    files: [],
  });

  return true;
}

module.exports = { handleSlots };