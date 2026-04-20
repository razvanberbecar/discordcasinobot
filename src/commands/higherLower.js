const {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const { getBalance, placeBet, settleBet } = require("../balanceStore");
const { createHigherLowerImage, cardToLabel } = require("../utils/cardsImage");

const HOUSE_FACTOR = 0.96;
const MAX_ACTIVE_MS = 3 * 60 * 1000;
const sessions = new Map();

function createDeck() {
  const suits = ["spades", "hearts", "diamonds", "clubs"];
  const deck = [];
  for (const suit of suits) {
    for (let value = 2; value <= 14; value += 1) {
      deck.push({ suit, value });
    }
  }

  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

function getChances(currentCard, deck) {
  let higher = 0;
  let lower = 0;
  let tie = 0;
  for (const card of deck) {
    if (card.value > currentCard.value) higher += 1;
    if (card.value < currentCard.value) lower += 1;
    if (card.value === currentCard.value) tie += 1;
  }
  const total = deck.length || 1;
  return {
    higherProb: higher / total,
    lowerProb: lower / total,
    tieProb: tie / total,
  };
}

function stepMultiplier(probability) {
  if (probability <= 0) return 0;
  return HOUSE_FACTOR / probability;
}

function projectedProfit(session, direction) {
  const { higherProb, lowerProb, tieProb } = getChances(session.currentCard, session.deck);
  let probability = higherProb;
  if (direction === "lower") probability = lowerProb;
  if (direction === "tie") probability = tieProb;
  if (probability <= 0) return null;
  const projectedPayout = session.currentPayout * stepMultiplier(probability);
  return Math.floor(projectedPayout - session.bet);
}

function createControls(session) {
  const higherProfit = projectedProfit(session, "higher");
  const lowerProfit = projectedProfit(session, "lower");
  const tieProfit = projectedProfit(session, "tie");
  const currentProfit = Math.floor(session.currentPayout - session.bet);

  const higherLabel = "Higher";
  const lowerLabel = "Lower";
  const tieLabel = "Tie";
  const claimLabel = `Claim (+${currentProfit})`;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`hl:${session.id}:higher`)
      .setLabel(higherLabel)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(higherProfit === null),
    new ButtonBuilder()
      .setCustomId(`hl:${session.id}:lower`)
      .setLabel(lowerLabel)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(lowerProfit === null),
    new ButtonBuilder()
      .setCustomId(`hl:${session.id}:tie`)
      .setLabel(tieLabel)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(tieProfit === null),
    new ButtonBuilder()
      .setCustomId(`hl:${session.id}:claim`)
      .setLabel(claimLabel)
      .setStyle(ButtonStyle.Success)
  );

  return [row];
}

function createStatusEmbed(session, statusTitle) {
  const currentProfit = Math.floor(session.currentPayout - session.bet);

  return new EmbedBuilder()
    .setColor(0xffd54a)
    .setTitle(statusTitle)
    .setDescription("Ace is high, and payout odds update from the real remaining deck.")
    .addFields(
      { name: "Current Card", value: `**${cardToLabel(session.currentCard)}**`, inline: true },
      { name: "Rounds Won", value: `**${session.roundWins}**`, inline: true },
      { name: "Starting Bet", value: `**${session.bet}**`, inline: true },
      { name: "Current Total Profit", value: `**+${currentProfit}**`, inline: true },
      { name: "Deck Remaining", value: `**${session.deck.length}** cards`, inline: true }
    )
    .setFooter({ text: "Game auto-expires after 3 minutes" })
    .setTimestamp();
}

async function handleHigherLower(cmd, args, msg) {
  if (cmd !== "!higherlower" && cmd !== "!hl") return false;
  try {
    const bet = Number(args[1]);
    if (!Number.isInteger(bet) || bet <= 0) {
      await msg.reply("Usage: `!higherlower <bet>` or `!hl <bet>`");
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

    const deck = createDeck();
    const currentCard = deck.pop();
    const sessionId = `${msg.author.id}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const session = {
      id: sessionId,
      userId: msg.author.id,
      bet,
      betContext,
      currentPayout: bet,
      roundWins: 0,
      deck,
      currentCard,
      createdAt: Date.now(),
    };

    sessions.set(sessionId, session);

    const embed = createStatusEmbed(session, "CoinCrown | Higher Lower");
    const components = createControls(session);

    try {
      const imageBuffer = createHigherLowerImage({
        currentCard: session.currentCard,
        statusText: "Pick Higher or Lower",
      });
      const attachment = new AttachmentBuilder(imageBuffer, { name: "higher-lower.png" });
      await msg.reply({ files: [attachment], embeds: [embed], components });
    } catch (renderErr) {
      console.error("Failed to render higher/lower start image:", renderErr);
      await msg.reply({ embeds: [embed], components });
    }

    return true;
  } catch (err) {
    console.error("Failed to start higher/lower game:", err);
    await msg.reply("Could not start higher/lower right now. Try again in a moment.");
    return true;
  }
}

async function handleHigherLowerInteraction(interaction) {
  if (!interaction.isButton()) return false;
  if (!interaction.customId.startsWith("hl:")) return false;

  const parts = interaction.customId.split(":");
  const sessionId = parts[1];
  const action = parts[2];
  const allowedActions = new Set(["higher", "lower", "tie", "claim"]);
  if (!allowedActions.has(action)) return false;
  const session = sessions.get(sessionId);

  if (!session) {
    await interaction.reply({
      content: "This game is no longer active. Start a new one with `!higherlower <bet>`.",
      ephemeral: true,
    });
    return true;
  }

  if (interaction.user.id !== session.userId) {
    await interaction.reply({
      content: "Only the player who started this game can use these buttons.",
      ephemeral: true,
    });
    return true;
  }

  if (Date.now() - session.createdAt > MAX_ACTIVE_MS) {
    // Refund bet on timeout
    await settleBet(session.userId, session.betContext, 0);
    sessions.delete(sessionId);
    await interaction.update({
      components: [],
      embeds: [
        new EmbedBuilder()
          .setColor(0xffd54a)
          .setTitle("CoinCrown | Higher Lower")
          .setDescription("Game expired. Your bet was refunded. Start a new one with `!higherlower <bet>`."),
      ],
    });
    return true;
  }

  if (action === "claim") {
    const payout = Math.floor(session.currentPayout);
    const profit = payout - session.bet;
    await settleBet(session.userId, session.betContext, payout);
    sessions.delete(sessionId);

    const embed = new EmbedBuilder()
      .setColor(0xffd54a)
      .setTitle("CoinCrown | Cash Out")
      .setDescription("You claimed your run.")
      .addFields(
        { name: "Bet", value: `**${session.bet}**`, inline: true },
        { name: "Final Card", value: `**${cardToLabel(session.currentCard)}**`, inline: true },
        { name: "Rounds Won", value: `**${session.roundWins}**`, inline: true },
        { name: "Profit", value: `**+${profit}**`, inline: true },
        { name: "Payout", value: `**${payout}**`, inline: true }
      )
      .setTimestamp();

    try {
      const imageBuffer = createHigherLowerImage({
        currentCard: session.currentCard,
        statusText: "Claimed",
      });
      const attachment = new AttachmentBuilder(imageBuffer, { name: "higher-lower.png" });
      await interaction.update({ files: [attachment], embeds: [embed], components: [] });
    } catch (renderErr) {
      console.error("Failed to render higher/lower claim image:", renderErr);
      await interaction.update({ embeds: [embed], components: [] });
    }

    return true;
  }

  const { higherProb, lowerProb, tieProb } = getChances(session.currentCard, session.deck);

  let probability = higherProb;
  if (action === "lower") probability = lowerProb;
  if (action === "tie") probability = tieProb;

  if (probability <= 0) {
    await interaction.reply({
      content: "That option is not available for this card. Pick another option or claim.",
      ephemeral: true,
    });
    return true;
  }

  const previousCard = session.currentCard;
  const nextCard = session.deck.pop();

  if (!nextCard) {
    const payout = Math.floor(session.currentPayout);
    const profit = payout - session.bet;
    await settleBet(session.userId, session.betContext, payout);
    sessions.delete(sessionId);

    const embed = new EmbedBuilder()
      .setColor(0xffd54a)
      .setTitle("CoinCrown | Deck Cleared")
      .setDescription("No cards remaining, run auto-claimed.")
      .addFields(
        { name: "Bet", value: `**${session.bet}**`, inline: true },
        { name: "Profit", value: `**+${profit}**`, inline: true },
        { name: "Payout", value: `**${payout}**`, inline: true }
      )
      .setTimestamp();

    try {
      const imageBuffer = createHigherLowerImage({
        currentCard: previousCard,
        statusText: "Deck Finished",
      });
      const attachment = new AttachmentBuilder(imageBuffer, { name: "higher-lower.png" });
      await interaction.update({ files: [attachment], embeds: [embed], components: [] });
    } catch (renderErr) {
      console.error("Failed to render higher/lower deck-finished image:", renderErr);
      await interaction.update({ embeds: [embed], components: [] });
    }

    return true;
  }

  let win = false;
  if (action === "higher") win = nextCard.value > previousCard.value;
  if (action === "lower") win = nextCard.value < previousCard.value;
  if (action === "tie") win = nextCard.value === previousCard.value;

  if (!win) {
    sessions.delete(sessionId);
    const embed = new EmbedBuilder()
      .setColor(0xffd54a)
      .setTitle("CoinCrown | Run Lost")
      .setDescription("Wrong guess. Stake is lost.")
      .addFields(
        { name: "Bet", value: `**${session.bet}**`, inline: true },
        { name: "Previous Card", value: `**${cardToLabel(previousCard)}**`, inline: true },
        { name: "Drawn Card", value: `**${cardToLabel(nextCard)}**`, inline: true }
      )
      .setTimestamp();

    try {
      const imageBuffer = createHigherLowerImage({
        previousCard,
        currentCard: nextCard,
        statusText: "You Lost",
      });
      const attachment = new AttachmentBuilder(imageBuffer, { name: "higher-lower.png" });
      await interaction.update({ files: [attachment], embeds: [embed], components: [] });
    } catch (renderErr) {
      console.error("Failed to render higher/lower lose image:", renderErr);
      await interaction.update({ embeds: [embed], components: [] });
    }

    return true;
  }

  session.currentPayout *= stepMultiplier(probability);
  session.roundWins += 1;
  session.currentCard = nextCard;

  const embed = createStatusEmbed(session, "CoinCrown | Higher Lower");
  const components = createControls(session);

  try {
    const imageBuffer = createHigherLowerImage({
      previousCard,
      currentCard: nextCard,
      statusText: "Correct",
    });
    const attachment = new AttachmentBuilder(imageBuffer, { name: "higher-lower.png" });
    await interaction.update({ files: [attachment], embeds: [embed], components });
  } catch (renderErr) {
    console.error("Failed to render higher/lower step image:", renderErr);
    await interaction.update({ embeds: [embed], components });
  }

  return true;
}

module.exports = {
  handleHigherLower,
  handleHigherLowerInteraction,
};