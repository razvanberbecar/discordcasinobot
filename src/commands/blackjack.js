const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, AttachmentBuilder } = require("discord.js");
const { createBlackjackImage } = require("../utils/cardsImage");
const { getBalance, placeBet, settleBet } = require("../balanceStore");

const sessions = new Map();
const DECK = [
  "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"
];
const SUITS = ["♠", "♥", "♦", "♣"];

function drawDeck() {
  const deck = [];
  // Use 6 decks
  for (let d = 0; d < 6; d++) {
    for (const suit of SUITS) {
      for (const value of DECK) {
        deck.push({ value, suit });
      }
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function cardValue(card) {
  if (card.value === "A") return 11;
  if (["K", "Q", "J"].includes(card.value)) return 10;
  return Number(card.value);
}

function handValue(hand) {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    total += cardValue(card);
    if (card.value === "A") aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function handString(hand) {
  return hand.map(c => `${c.value}${c.suit}`).join(" ");
}

function createEmbedWithImage(session, revealDealer = false, description = null) {
  const imageBuffer = createBlackjackImage({ playerHand: session.playerHand, dealerHand: session.dealerHand, revealDealer });
  const attachment = new AttachmentBuilder(imageBuffer, { name: "blackjack.png" });
  const embed = new EmbedBuilder()
    .setColor(0x2ecc40)
    .setTitle("CoinCrown | Blackjack")
    .setImage("attachment://blackjack.png");
  if (description) embed.setDescription(description);
  embed.addFields(
    { name: "Your Hand", value: `${handString(session.playerHand)} (${handValue(session.playerHand)})`, inline: false },
    { name: "Dealer's Hand", value: revealDealer ? `${handString(session.dealerHand)} (${handValue(session.dealerHand)})` : `${session.dealerHand[0].value}${session.dealerHand[0].suit} ??`, inline: false },
    { name: "Bet", value: `**${session.bet}**`, inline: true }
  );
  return { embed, attachment };
}

async function createButtons(session, finished = false) {
  if (finished) return [];
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`bj:hit:${session.id}`).setLabel("Hit").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`bj:stand:${session.id}`).setLabel("Stand").setStyle(ButtonStyle.Success)
  );
  // Only allow double down if player has exactly 2 cards, hasn't doubled, and has enough balance
  const canDouble = !session.doubled && session.playerHand.length === 2 && (await getBalance(session.userId)) >= session.bet;
  if (canDouble) {
    row.addComponents(
      new ButtonBuilder().setCustomId(`bj:double:${session.id}`).setLabel("Double Down").setStyle(ButtonStyle.Danger)
    );
  }
  return [row];
}

async function startGame(msg, bet) {
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
  const deck = drawDeck();
  const playerHand = [deck.pop(), deck.pop()];
  const dealerHand = [deck.pop(), deck.pop()];
  const session = {
    id,
    userId: msg.author.id,
    bet,
    betContext,
    deck,
    playerHand,
    dealerHand,
    finished: false,
    doubled: false
  };
  // Check for natural blackjack (Ace + 10-value as first two cards)
  const isPlayerBlackjack =
    playerHand.length === 2 &&
    ((playerHand[0].value === "A" && ["10", "J", "Q", "K"].includes(playerHand[1].value)) ||
     (playerHand[1].value === "A" && ["10", "J", "Q", "K"].includes(playerHand[0].value)));

  sessions.set(id, session);
  if (isPlayerBlackjack) {
    session.finished = true;
    const payout = Math.floor(bet * 2.5); // 3:2 payout
    await settleBet(msg.author.id, betContext, payout);
    const { embed, attachment } = createEmbedWithImage(session, true, "Blackjack! You win 3:2.");
    const reply = await msg.reply({ embeds: [embed], components: await createButtons(session, true), files: [attachment] });
    session.messageId = reply.id;
    session.channelId = msg.channel.id;
    return true;
  }
  const { embed, attachment } = createEmbedWithImage(session);
  const reply = await msg.reply({ embeds: [embed], components: await createButtons(session), files: [attachment] });
  session.messageId = reply.id;
  session.channelId = msg.channel.id;
  return true;
}

async function handleBlackjack(cmd, args, msg) {
  if (cmd !== "!blackjack" && cmd !== "!bj") return false;
  const bet = Number(args[1]);
  if (!Number.isInteger(bet) || bet <= 0) {
    await msg.reply("Usage: `!blackjack <bet>`");
    return true;
  }
  return startGame(msg, bet);
}

async function handleBlackjackInteraction(interaction) {
  if (!interaction.customId.startsWith("bj:")) return false;
  const [_, action, sessionId] = interaction.customId.split(":");
  const session = sessions.get(sessionId);
  if (!session || session.finished) {
    await interaction.reply({ content: "This blackjack game is no longer active.", ephemeral: true });
    return true;
  }
  if (interaction.user.id !== session.userId) {
    await interaction.reply({ content: "Only the player who started this game can use these controls.", ephemeral: true });
    return true;
  }
  // Double Down
  if (action === "double") {
    // Only allow if not already doubled, exactly 2 cards, and enough balance
    const bal = await getBalance(session.userId);
    if (session.doubled || session.playerHand.length !== 2 || bal < session.bet) {
      await interaction.reply({ content: "You can't double down now.", ephemeral: true });
      return true;
    }
    // Place additional bet
    const betContext2 = await placeBet(session.userId, session.bet);
    if (!betContext2.ok) {
      await interaction.reply({ content: `You only have **${betContext2.balance}** coins.`, ephemeral: true });
      return true;
    }
    session.bet *= 2;
    session.doubled = true;
    session.betContext2 = betContext2; // Store second bet context
    // Draw one card and stand automatically
    session.playerHand.push(session.deck.pop());
    // Dealer plays
    while (handValue(session.dealerHand) < 17) {
      session.dealerHand.push(session.deck.pop());
    }
    session.finished = true;
    const playerScore = handValue(session.playerHand);
    const dealerScore = handValue(session.dealerHand);
    let payout = 0;
    let result = "";
    // Check for natural blackjack (shouldn't be possible after double, but keep for safety)
    const isPlayerBlackjack =
      session.playerHand.length === 2 &&
      ((session.playerHand[0].value === "A" && ["10", "J", "Q", "K"].includes(session.playerHand[1].value)) ||
       (session.playerHand[1].value === "A" && ["10", "J", "Q", "K"].includes(session.playerHand[0].value)));

    if (playerScore > 21) {
      payout = 0;
      result = session.doubled ? "You busted! Dealer wins. (Doubled)" : "You busted! Dealer wins.";
    } else if (dealerScore > 21 || playerScore > dealerScore) {
      if (isPlayerBlackjack) {
        payout = Math.floor(session.bet * 2.5); // 3:2 payout
        result = "Blackjack! You win 3:2.";
      } else {
        payout = Math.floor(session.bet * 2); // 1:1 payout
        result = session.doubled ? "You win! (Doubled)" : "You win!";
      }
    } else if (playerScore === dealerScore) {
      payout = session.bet;
      result = "Push! (Tie)";
    } else {
      payout = 0;
      result = session.doubled ? "Dealer wins. (Doubled)" : "Dealer wins.";
    }
    // Settle both bets if doubled down
    if (session.betContext2) {
      // Split payout equally between both bets (since both are same amount)
      const halfPayout = Math.floor(payout / 2);
      // If payout is odd, give the extra to the first bet
      const payout1 = halfPayout + (payout % 2);
      const payout2 = halfPayout;
      await settleBet(session.userId, session.betContext, payout1);
      await settleBet(session.userId, session.betContext2, payout2);
    } else {
      await settleBet(session.userId, session.betContext, payout);
    }
    const { embed, attachment } = createEmbedWithImage(session, true, result);
    await interaction.update({ embeds: [embed], components: await createButtons(session, true), files: [attachment] });
    return true;
  }
  if (action === "hit") {
    session.playerHand.push(session.deck.pop());
    if (handValue(session.playerHand) > 21) {
      session.finished = true;
      await settleBet(session.userId, session.betContext, 0);
      const { embed, attachment } = createEmbedWithImage(session, true, "You busted! Dealer wins. ❌");
      await interaction.update({ embeds: [embed], components: await createButtons(session, true), files: [attachment] });
      return true;
    }
    const { embed, attachment } = createEmbedWithImage(session);
    await interaction.update({ embeds: [embed], components: await createButtons(session), files: [attachment] });
    return true;
  }
  if (action === "stand") {
    // Dealer plays
    while (handValue(session.dealerHand) < 17) {
      session.dealerHand.push(session.deck.pop());
    }
    session.finished = true;
    const playerScore = handValue(session.playerHand);
    const dealerScore = handValue(session.dealerHand);
    let payout = 0;
    let result = "";
    // Check for natural blackjack (Ace + 10-value as first two cards)
    const isPlayerBlackjack =
      session.playerHand.length === 2 &&
      ((session.playerHand[0].value === "A" && ["10", "J", "Q", "K"].includes(session.playerHand[1].value)) ||
       (session.playerHand[1].value === "A" && ["10", "J", "Q", "K"].includes(session.playerHand[0].value)));

    if (dealerScore > 21 || playerScore > dealerScore) {
      if (isPlayerBlackjack) {
        payout = Math.floor(session.bet * 2.5); // 3:2 payout
        result = "Blackjack! You win 3:2. ✅";
      } else {
        payout = Math.floor(session.bet * 2); // 1:1 payout
        result = "You win! ✅";
      }
    } else if (playerScore === dealerScore) {
      payout = session.bet;
      result = "Push! (Tie) 🤝";
    } else {
      payout = 0;
      result = "Dealer wins. ❌";
    }
    await settleBet(session.userId, session.betContext, payout);
    const { embed, attachment } = createEmbedWithImage(session, true, result);
    await interaction.update({ embeds: [embed], components: await createButtons(session, true), files: [attachment] });
    return true;
  }
  return false;
}

module.exports = {
  handleBlackjack,
  handleBlackjackInteraction
};
