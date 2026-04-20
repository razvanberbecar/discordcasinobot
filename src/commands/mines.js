const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const { getBalance, placeBet, settleBet } = require("../balanceStore");

const HOUSE_FACTOR = 0.95;
const MAX_ACTIVE_MS = 5 * 60 * 1000;
const sessions = new Map();

function buildGrid(revealed, mineHits = new Set(), mineCells = new Set()) {
  const rows = [];
  for (let row = 0; row < 5; row += 1) {
    const cells = [];
    for (let col = 0; col < 5; col += 1) {
      const index = row * 5 + col;
      if (mineHits.has(index)) {
        cells.push("💣");
      } else if (revealed.has(index)) {
        cells.push("💎");
      } else if (mineCells.has(index) && mineHits.size > 0) {
        cells.push("💣");
      } else {
        cells.push("⬜");
      }
    }
    rows.push(cells.join("  "));
  }
  return rows.join("\n");
}

function formatProfit(value) {
  return `**${value >= 0 ? "+" : ""}${value}**`;
}

function createMineCountOptions() {
  const options = [];
  for (let mines = 1; mines <= 24; mines += 1) {
    options.push({
      label: `${mines} mine${mines === 1 ? "" : "s"}`,
      value: String(mines),
      description: mines === 24 ? "Highest risk" : undefined,
    });
  }
  return options;
}

function createMineSet(mineCount) {
  const cells = [...Array(25).keys()];
  const mines = new Set();
  for (let i = cells.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  for (let i = 0; i < mineCount; i += 1) mines.add(cells[i]);
  return mines;
}

function safeProbability(session) {
  return session.safeLeft / session.cellsLeft;
}

function applyStepMultiplier(session) {
  // Use probability BEFORE decrement for correct payout
  const probability = safeProbability(session);
  if (probability <= 0) return 0;
  
  const stepMultiplier = 1 / probability;
  session.rawMultiplier = (session.rawMultiplier || 1) * stepMultiplier;
  
  // Calculate standard casino payout (house edge applied to total multiplier)
  const classicPayout = session.bet * session.rawMultiplier * HOUSE_FACTOR;
  
  // Apply a minimum 1% profit floor so players never dip below their bet on a safe pick, 
  // while allowing the RTP to safely hover around 95-97% for small mine counts.
  const minPayout = session.bet + Math.max(1, Math.floor(session.bet * 0.01));
  session.currentPayout = Math.max(minPayout, classicPayout);
  
  // Now decrement for next pick
  session.safeLeft -= 1;
  session.cellsLeft -= 1;
  return stepMultiplier;
}

function createSetupEmbed(bet) {
  return new EmbedBuilder()
    .setColor(0xffd54a)
    .setTitle("CoinCrown | Mines")
    .setDescription("Choose how many mines you want to play with, then start clearing safe tiles.")
    .addFields(
      { name: "Bet", value: `**${bet}**`, inline: true },
      { name: "Mine Range", value: "**1 - 24**", inline: true },
      { name: "Board", value: "**5x5**", inline: true }
    )
    .setFooter({ text: "Select a mine count to begin" });
}

function createSetupComponents(sessionId) {
  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`mines:setup:${sessionId}`)
        .setPlaceholder("Select mine count")
        .addOptions(createMineCountOptions())
    ),
  ];
}

function createBoardEmbed(session, title) {
  const currentProfit = Math.floor(session.currentPayout - session.bet);
  const board = buildGrid(session.revealed, session.mineHit !== null ? new Set([session.mineHit]) : new Set(), session.mines);

  return new EmbedBuilder()
    .setColor(0xffd54a)
    .setTitle(title)
    .setDescription(`5x5 Mines\n\n${board}\n\nClick each tile on the board. Claim is in the control message below.`)
    .addFields(
      { name: "Bet", value: `**${session.bet}**`, inline: true },
      { name: "Mines", value: `**${session.mineCount}**`, inline: true },
      { name: "Safe Picks", value: `**${session.revealed.size}**`, inline: true },
      { name: "Current Total Profit", value: formatProfit(currentProfit), inline: true },
      { name: "Tiles Left", value: `**${session.cellsLeft}**`, inline: true },
      { name: "Safe Tiles Left", value: `**${session.safeLeft}**`, inline: true }
    )
    .setFooter({ text: "Claim anytime to cash out your current total profit" })
    .setTimestamp();
}

function createClaimEmbed(session) {
  const currentProfit = Math.floor(session.currentPayout - session.bet);

  return new EmbedBuilder()
    .setColor(0xffd54a)
    .setTitle("CoinCrown | Mines Controls")
    .setDescription("Press Claim to cash out your current total profit.")
    .addFields(
      { name: "Bet", value: `**${session.bet}**`, inline: true },
      { name: "Mines", value: `**${session.mineCount}**`, inline: true },
      { name: "Safe Picks", value: `**${session.revealed.size}**`, inline: true },
      { name: "Current Total Profit", value: formatProfit(currentProfit), inline: true }
    )
    .setFooter({ text: "The board buttons are in the message above" })
    .setTimestamp();
}

function createClaimComponents(session) {
  const currentProfit = Math.floor(session.currentPayout - session.bet);
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`mines:claim:${session.id}`)
        .setLabel(`Claim (${currentProfit >= 0 ? "+" : ""}${currentProfit})`)
        .setStyle(ButtonStyle.Success)
    ),
  ];
}

function createBoardComponents(session, revealAllMines = false) {
  const rows = [];

  for (let row = 0; row < 5; row += 1) {
    const rowBuilder = new ActionRowBuilder();

    for (let col = 0; col < 5; col += 1) {
      const index = row * 5 + col;
      const isMine = session.mines && session.mines.has(index);
      const isRevealed = session.revealed && session.revealed.has(index);
      const isHit = session.mineHit === index;

      let emoji = "⬜";
      let style = ButtonStyle.Secondary;
      let disabled = Boolean(session.finished);

      if (isHit || (revealAllMines && isMine)) {
        emoji = "💣";
        style = ButtonStyle.Danger;
        disabled = true;
      } else if (isRevealed) {
        emoji = "💎";
        style = ButtonStyle.Success;
        disabled = true;
      }

      rowBuilder.addComponents(
        new ButtonBuilder()
          .setCustomId(`mines:tile:${session.id}:${index}`)
          .setEmoji(emoji)
          .setStyle(style)
          .setDisabled(disabled)
      );
    }

    rows.push(rowBuilder);
  }

  return rows;
}

async function updateClaimMessage(session, channel) {
  if (!session.claimMessageId) return;

  try {
    const claimMessage = await channel.messages.fetch(session.claimMessageId);
    await claimMessage.edit({
      embeds: [createClaimEmbed(session)],
      components: session.finished ? [] : createClaimComponents(session),
    });
  } catch (err) {
    console.error("Failed to update mines claim message:", err);
  }
}

async function deleteClaimMessage(session, channel) {
  if (!session.claimMessageId) return;

  try {
    const claimMessage = await channel.messages.fetch(session.claimMessageId);
    await claimMessage.delete();
  } catch (err) {
    // Ignore missing/deleted message errors to avoid crashing game flow.
  }

  session.claimMessageId = null;
}

async function disableBoardMessage(session, channel, title, description, revealAllMines = false) {
  if (!session.boardMessageId) return;

  try {
    const boardMessage = await channel.messages.fetch(session.boardMessageId);
    await boardMessage.edit({
      embeds: [
        new EmbedBuilder()
          .setColor(0xffd54a)
          .setTitle(title)
          .setDescription(description)
          .addFields(
            { name: "Bet", value: `**${session.bet}**`, inline: true },
            { name: "Mines", value: `**${session.mineCount}**`, inline: true },
            { name: "Safe Picks", value: `**${session.revealed.size}**`, inline: true },
            { name: "Current Total Profit", value: formatProfit(Math.floor(session.currentPayout - session.bet)), inline: true },
            {
              name: "Board",
              value: `\n${buildGrid(
                session.revealed,
                session.mineHit !== null ? new Set([session.mineHit]) : new Set(),
                revealAllMines && session.mines ? session.mines : new Set()
              )}`.slice(0, 1024),
              inline: false,
            }
          )
          .setTimestamp(),
      ],
      components: createBoardComponents(session, true),
    });
  } catch (err) {
    console.error("Failed to disable mines board message:", err);
  }
}

async function sendGameMessages(target, session) {
  const boardMessage = await target.reply({
    components: createBoardComponents(session),
  });

  const claimMessage = await target.channel.send({
    embeds: [createClaimEmbed(session)],
    components: createClaimComponents(session),
  });

  session.boardMessageId = boardMessage.id;
  session.claimMessageId = claimMessage.id;
  session.channelId = target.channel.id;
}

async function startGame(msg, bet, mineCount) {
  const balance = await getBalance(msg.author.id);
  if (bet > balance) {
    await msg.reply(`You only have **${balance}** coins.`);
    return true;
  }

  const betContext = await placeBet(msg.author.id, bet);
  if (!betContext.ok) {
    await msg.reply(`You only have **${betContext.balance ?? balance}** coins.`);
    return true;
  }

  const id = `${msg.author.id}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const session = {
    id,
    userId: msg.author.id,
    bet,
    betContext,
    mineCount,
    mines: createMineSet(mineCount),
    revealed: new Set(),
    mineHit: null,
    currentPayout: bet,
    safeLeft: 25 - mineCount,
    cellsLeft: 25,
    createdAt: Date.now(),
    finished: false,
  };

  sessions.set(id, session);
  await sendGameMessages(msg, session);
  return true;
}

async function handleMines(cmd, args, msg) {
  if (cmd !== "!mines" && cmd !== "!m") return false;

  const bet = Number(args[1]);
  const mineCountArg = Number(args[2]);

  if (!Number.isInteger(bet) || bet <= 0) {
    await msg.reply("Usage: `!mines <bet>` or `!mines <bet> <mines>`");
    return true;
  }

  if (Number.isInteger(mineCountArg)) {
    if (mineCountArg < 1 || mineCountArg > 24) {
      await msg.reply("Mines must be between **1** and **24**.");
      return true;
    }

    return startGame(msg, bet, mineCountArg);
  }

  const sessionId = `${msg.author.id}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  sessions.set(sessionId, {
    id: sessionId,
    userId: msg.author.id,
    bet,
    stage: "setup",
    createdAt: Date.now(),
    finished: false,
  });

  await msg.reply({
    embeds: [createSetupEmbed(bet)],
    components: createSetupComponents(sessionId),
  });
  return true;
}

async function handleMinesInteraction(interaction) {
  if (interaction.isStringSelectMenu()) {
    if (!interaction.customId.startsWith("mines:")) return false;

    const parts = interaction.customId.split(":");
    const mode = parts[1];
    const sessionId = parts[2];
    const session = sessions.get(sessionId);

    if (!session) {
      await interaction.reply({ content: "This mines game is no longer active.", ephemeral: true });
      return true;
    }

    if (interaction.user.id !== session.userId) {
      await interaction.reply({ content: "Only the player who started this game can use these controls.", ephemeral: true });
      return true;
    }

    if (Date.now() - session.createdAt > MAX_ACTIVE_MS) {
      sessions.delete(sessionId);
      await interaction.update({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffd54a)
            .setTitle("CoinCrown | Mines")
            .setDescription("Game expired. Start a new one with `!mines <bet>`."),
        ],
        components: [],
      });
      return true;
    }

    if (mode === "setup") {
      const selected = Number(interaction.values[0]);
      if (!Number.isInteger(selected) || selected < 1 || selected > 24) {
        await interaction.reply({ content: "Choose a mines count between 1 and 24.", ephemeral: true });
        return true;
      }

      const balance = await getBalance(session.userId);
      if (session.bet > balance) {
        sessions.delete(sessionId);
        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0xffd54a)
              .setTitle("CoinCrown | Mines")
              .setDescription(`You only have **${balance}** coins.`),
          ],
          components: [],
        });
        return true;
      }

      const betContext = await placeBet(session.userId, session.bet);
      if (!betContext.ok) {
        sessions.delete(sessionId);
        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0xffd54a)
              .setTitle("CoinCrown | Mines")
              .setDescription(`You only have **${betContext.balance ?? balance}** coins.`),
          ],
          components: [],
        });
        return true;
      }

      session.stage = "game";
      session.betContext = betContext;
      session.mineCount = selected;
      session.mines = createMineSet(selected);
      session.revealed = new Set();
      session.mineHit = null;
      session.currentPayout = session.bet;
      session.safeLeft = 25 - selected;
      session.cellsLeft = 25;
      session.createdAt = Date.now();

      await interaction.update({
        components: createBoardComponents(session),
      });

      const claimMessage = await interaction.channel.send({
        embeds: [createClaimEmbed(session)],
        components: createClaimComponents(session),
      });

      session.boardMessageId = interaction.message.id;
      session.claimMessageId = claimMessage.id;
      session.channelId = interaction.channel.id;

      return true;
    }
  }

  if (interaction.isButton()) {
    if (!interaction.customId.startsWith("mines:")) return false;

    const parts = interaction.customId.split(":");
    const mode = parts[1];
    const sessionId = parts[2];
    const session = sessions.get(sessionId);

    if (!session) {
      await interaction.reply({ content: "This mines game is no longer active.", ephemeral: true });
      return true;
    }

    if (interaction.user.id !== session.userId) {
      await interaction.reply({ content: "Only the player who started this game can use these controls.", ephemeral: true });
      return true;
    }

    if (Date.now() - session.createdAt > MAX_ACTIVE_MS) {
      // Refund bet on timeout
      if (session.betContext) {
        await settleBet(session.userId, session.betContext, 0);
      }
      sessions.delete(sessionId);
      session.finished = true;
      await deleteClaimMessage(session, interaction.channel);
      await interaction.update({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffd54a)
            .setTitle("CoinCrown | Mines")
            .setDescription("Game expired. Your bet was refunded. Start a new one with `!mines <bet>`."),
        ],
        components: [],
      });
      return true;
    }

    if (mode === "claim") {
      const payout = Math.floor(session.currentPayout);
      await settleBet(session.userId, session.betContext, payout);

      session.finished = true;
      sessions.delete(sessionId);

      await interaction.deferUpdate();
      await deleteClaimMessage(session, interaction.channel);
      await disableBoardMessage(session, interaction.channel, "CoinCrown | Mines", "Claimed.", true);
      return true;
    }

    if (mode !== "tile") return false;

    const tileIndex = Number(parts[3]);
    if (!Number.isInteger(tileIndex) || tileIndex < 0 || tileIndex > 24) {
      await interaction.reply({ content: "Invalid tile.", ephemeral: true });
      return true;
    }

    if (session.revealed.has(tileIndex)) {
      await interaction.reply({ content: "That tile is already cleared.", ephemeral: true });
      return true;
    }

    if (session.mines.has(tileIndex)) {
      session.mineHit = tileIndex;
      session.finished = true;
      sessions.delete(sessionId);

      await interaction.update({
        components: createBoardComponents(session, true),
      });

      await deleteClaimMessage(session, interaction.channel);
      await disableBoardMessage(session, interaction.channel, "CoinCrown | Mines", "Mine hit.", true);
      return true;
    }

    session.revealed.add(tileIndex);
    applyStepMultiplier(session);

    if (session.safeLeft <= 0) {
      const payout = Math.floor(session.currentPayout);
      await settleBet(session.userId, session.betContext, payout);

      session.finished = true;
      sessions.delete(sessionId);

      await interaction.update({
        components: createBoardComponents(session, true),
      });

      await deleteClaimMessage(session, interaction.channel);
      await disableBoardMessage(session, interaction.channel, "CoinCrown | Mines", "All safe tiles cleared.", true);
      return true;
    }

    await interaction.update({
      components: createBoardComponents(session),
    });

    await updateClaimMessage(session, interaction.channel);

    return true;
  }

  return false;
}

module.exports = {
  handleMines,
  handleMinesInteraction,
};