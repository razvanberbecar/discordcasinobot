const { ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require("discord.js");
const { placeBet, settleBet } = require("../balanceStore");
const { createCrashImage } = require("../utils/crashImage");

const activeSessions = new Map();

function generateCrashPoint() {
  const e = 0.95; // 5% House Edge
  const val = e / (1 - Math.random());
  return Math.max(1.00, val);
}

async function handleCrash(cmd, args, msg) {
  if (cmd !== "!crash" && cmd !== "!c") return false;

  if (activeSessions.has(msg.author.id)) {
    await msg.reply("You already have a crash game running! Finish it first.");
    return true;
  }

  const amount = parseInt(args[1]);
  if (isNaN(amount) || amount <= 0) {
    await msg.reply("Usage: `!crash <amount>`");
    return true;
  }

  const betContext = await placeBet(msg.author.id, amount);
  if (!betContext.ok) {
    await msg.reply(`Not enough coins! You have **${betContext.balance}**.`);
    return true;
  }

  const crashPoint = generateCrashPoint();
  const session = {
    userId: msg.author.id,
    betAmount: amount,
    betContext,
    crashPoint,
    currentM: 1.00,
    startTime: Date.now(),
    elapsed: 0,
    finished: false,
    intervalId: null,
    messageId: null
  };

  activeSessions.set(msg.author.id, session);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`cr:cashout:${msg.author.id}`).setLabel("💰 CASH OUT").setStyle(ButtonStyle.Success)
  );

  // Instant crash check
  if (crashPoint <= 1.01) { // 1.00 effectively
    return endCrashGame(session, msg, true, false);
  }

  const botMsg = await msg.reply({
    content: `🚀 **Current Multiplier: 1.00x**\n(Bet: ${amount})`,
    components: [row]
  });

  session.botMsg = botMsg;

  // The Game Loop
  session.intervalId = setInterval(async () => {
    if (session.finished) return;

    session.elapsed += 1.5; // Every 1.5 seconds
    const newM = Math.exp(0.069 * session.elapsed);

    if (newM >= session.crashPoint) {
      clearInterval(session.intervalId);
      await endCrashGame(session, botMsg, true, false);
    } else {
      session.currentM = newM;
      try {
        await botMsg.edit({
          content: `🚀 **Current Multiplier: ${session.currentM.toFixed(2)}x**\n(Bet: ${amount})`,
          components: [row]
        });
      } catch (err) {
        console.error("Crash edit error:", err);
      }
    }
  }, 1500);

  return true;
}

async function handleCrashInteraction(interaction) {
  if (!interaction.isButton()) return false;
  if (!interaction.customId.startsWith("cr:cashout:")) return false;

  const targetUserId = interaction.customId.split(":")[2];
  if (interaction.user.id !== targetUserId) {
    await interaction.reply({ content: "This is not your Crash game!", ephemeral: true });
    return true;
  }

  const session = activeSessions.get(targetUserId);
  if (!session || session.finished) {
    // If the session is gone, the interaction may have fired late. Just ignore or ephem error.
    await interaction.reply({ content: "Game already finished!", ephemeral: true });
    return true;
  }

  // User cashed out!
  clearInterval(session.intervalId);
  await endCrashGame(session, interaction, false, true);
  return true;
}

async function endCrashGame(session, context, didCrash, cashedOut) {
  if (session.finished) return;
  session.finished = true;
  activeSessions.delete(session.userId);

  if (session.intervalId) clearInterval(session.intervalId);

  let finalM = session.crashPoint;
  let payout = 0;
  let resultMsg = "";

  if (didCrash) {
    // Math ensures they lost
    await settleBet(session.userId, session.betContext, 0);
    resultMsg = `💥 **CRASHED at ${finalM.toFixed(2)}x!**\nYou lost **${session.betAmount}** coins.`;
  } else if (cashedOut) {
    // They cashed out at session.currentM safely
    payout = Math.floor(session.betAmount * session.currentM);
    await settleBet(session.userId, session.betContext, payout);
    const profit = payout - session.betAmount;
    resultMsg = `✅ **CASHED OUT at ${session.currentM.toFixed(2)}x!**\nProfit: **+${profit}** coins!`;
  }

  const imageBuffer = createCrashImage({
    finalMultiplier: session.crashPoint,
    cashedOutAt: cashedOut ? session.currentM : null,
    didCrash
  });

  const attachment = new AttachmentBuilder(imageBuffer, { name: "crash.png" });

  const payload = {
    content: resultMsg,
    components: [],
    files: [attachment]
  };

  try {
    if (context.isButton) {
      await context.update(payload);
    } else if (context.edit) {
      await context.edit(payload);
    } else if (context.reply) {
      await context.reply(payload);
    }
  } catch (err) {
    console.error("Failed final crash render:", err);
  }
}

module.exports = {
  handleCrash,
  handleCrashInteraction
};
