const { EmbedBuilder } = require("discord.js");
const {
  getBalance,
  setBalance,
  getLastDailyClaim,
  setLastDailyClaim,
  getProfile,
  addDepositUsd,
  addWithdrawalUsd,
  addWageredCoins,
  getWithdrawalEligibility,
} = require("../balanceStore");

const OWNER_ID = "1491506919171559425";
const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
}

function parseTargetUserId(raw) {
  if (!raw) return null;
  const mentionMatch = raw.match(/^<@!?(\d+)>$/);
  if (mentionMatch) return mentionMatch[1];
  if (/^\d+$/.test(raw)) return raw;
  return null;
}

function parsePositiveNumber(raw) {
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return null;
  return num;
}

async function handleEconomy(cmd, args, msg) {
  if (cmd === "!addbalance" || cmd === "!removebalance") {
    // Keep commands hidden: silently ignore non-owner attempts.
    if (msg.author.id !== OWNER_ID) return true;

    const amount = Number(args[1]);
    const targetUserId = parseTargetUserId(args[2]);

    if (!Number.isInteger(amount) || amount <= 0 || !targetUserId) {
      await msg.reply(`Usage: \`${cmd} <amount> <userId>\``);
      return true;
    }

    const current = await getBalance(targetUserId);

    if (cmd === "!addbalance") {
      const updated = current + amount;
      await setBalance(targetUserId, updated);
      await msg.reply(`Updated <@${targetUserId}> balance: **${current}** -> **${updated}**`);
      return true;
    }

    const updated = Math.max(0, current - amount);
    await setBalance(targetUserId, updated);
    await msg.reply(`Updated <@${targetUserId}> balance: **${current}** -> **${updated}**`);
    return true;
  }

  if (cmd === "!adddeposit" || cmd === "!addwithdrawal" || cmd === "!addwager" || cmd === "!checkwithdraw") {
    // Keep commands hidden: silently ignore non-owner attempts.
    if (msg.author.id !== OWNER_ID) return true;

    if (cmd === "!checkwithdraw") {
      const amountUsd = parsePositiveNumber(args[1]);
      const targetUserId = parseTargetUserId(args[2]);

      if (!amountUsd || !targetUserId) {
        await msg.reply("Usage: `!checkwithdraw <usdAmount> <userId>`");
        return true;
      }

      const eligibility = await getWithdrawalEligibility(targetUserId, amountUsd);
      const profile = await getProfile(targetUserId);

      await msg.reply(
        [
          `Withdraw check for <@${targetUserId}> (${amountUsd.toFixed(2)} USD):`,
          `• Eligible: **${eligibility.eligible ? "YES" : "NO"}**`,
          `• Deposit unlocked (>= $5): **${eligibility.checks.depositOk ? "YES" : "NO"}**`,
          `• Minimum amount (>= $20): **${eligibility.checks.minOk ? "YES" : "NO"}**`,
          `• Wager requirement met: **${eligibility.checks.wagerOk ? "YES" : "NO"}**`,
          `• Balance covers request: **${eligibility.checks.balanceOk ? "YES" : "NO"}**`,
          `• Deposited: **$${profile.totalDepositedUsd.toFixed(2)}**`,
          `• Balance: **${eligibility.current.balanceCoins}** coins`,
          `• Requested: **${eligibility.current.requestedCoins}** coins`,
          `• Wagered: **${profile.totalWageredCoins}** / **${eligibility.current.requiredWageredCoins}** coins`,
        ].join("\n")
      );
      return true;
    }

    const amount = parsePositiveNumber(args[1]);
    const targetUserId = parseTargetUserId(args[2]);

    if (!amount || !targetUserId) {
      await msg.reply(`Usage: \`${cmd} <amount> <userId>\``);
      return true;
    }

    if (cmd === "!adddeposit") {
      const profile = await addDepositUsd(targetUserId, amount);
      await msg.reply(
        `Deposit logged for <@${targetUserId}>: **+$${amount.toFixed(2)}** (total deposited: **$${profile.totalDepositedUsd.toFixed(2)}**)`
      );
      return true;
    }

    if (cmd === "!addwithdrawal") {
      const profile = await addWithdrawalUsd(targetUserId, amount);
      await msg.reply(
        `Withdrawal logged for <@${targetUserId}>: **+$${amount.toFixed(2)}** (total withdrawn: **$${profile.totalWithdrawnUsd.toFixed(2)}**)`
      );
      return true;
    }

    const profile = await addWageredCoins(targetUserId, amount);
    await msg.reply(
      `Wager logged for <@${targetUserId}>: **+${Math.floor(amount)}** coins (total wagered: **${profile.totalWageredCoins}** coins)`
    );
    return true;
  }

  if (cmd === "!profile") {
    let targetUserId = msg.author.id;

    if (args[1] && msg.author.id === OWNER_ID) {
      const parsed = parseTargetUserId(args[1]);
      if (parsed) {
        targetUserId = parsed;
      } else {
        await msg.reply("Usage: `!profile [userId]`");
        return true;
      }
    }

    const profile = await getProfile(targetUserId);
    const balance = await getBalance(targetUserId);
    await msg.reply(
      [
        `Profile for <@${targetUserId}>:`,
        `• Balance: **${balance}** coins`,
        `• Real Balance: **${profile.realBalanceCoins}** coins`,
        `• Total Deposited: **$${profile.totalDepositedUsd.toFixed(2)}**`,
        `• Total Withdrawn: **$${profile.totalWithdrawnUsd.toFixed(2)}**`,
        `• Total Wagered (eligible): **${profile.totalWageredCoins}** coins`,
      ].join("\n")
    );
    return true;
  }

  if (cmd === "!balance" || cmd === "!bal") {
    const bal = await getBalance(msg.author.id);
    const embed = new EmbedBuilder()
      .setColor(0xffd54a)
      .setTitle("CoinCrown | Balance")
      .setDescription(`💰 You have **${bal}** coins`)
      .setFooter({ text: `Player: ${msg.author.username}` })
      .setTimestamp();
    await msg.reply({ embeds: [embed] });
    return true;
  }

  if (cmd === "!daily") {
    const now = Date.now();
    const lastClaimAt = await getLastDailyClaim(msg.author.id);

    if (lastClaimAt) {
      const elapsed = now - lastClaimAt;
      if (elapsed < DAILY_COOLDOWN_MS) {
        const remaining = DAILY_COOLDOWN_MS - elapsed;
        const embed = new EmbedBuilder()
          .setColor(0xffd54a)
          .setTitle("CoinCrown | Daily Reward")
          .setDescription("⏳ You already claimed your daily reward.")
          .addFields({ name: "Try Again In", value: `**${formatDuration(remaining)}**`, inline: true })
          .setFooter({ text: `Player: ${msg.author.username}` })
          .setTimestamp();
        await msg.reply({ embeds: [embed] });
        return true;
      }
    }

    const reward = 1000;
    const bal = (await getBalance(msg.author.id)) + reward;
    await setBalance(msg.author.id, bal);
    await setLastDailyClaim(msg.author.id, now);
    const embed = new EmbedBuilder()
      .setColor(0xffd54a)
      .setTitle("CoinCrown | Daily Reward")
      .setDescription(`🎁 Daily claimed: **+${reward}** coins`)
      .addFields({ name: "New Balance", value: `**${bal}**`, inline: true })
      .setFooter({ text: `Player: ${msg.author.username}` })
      .setTimestamp();
    await msg.reply({ embeds: [embed] });
    return true;
  }

  return false;
}

module.exports = { handleEconomy };