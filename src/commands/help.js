async function handleHelp(cmd, args, msg) {
  if (cmd !== "!help" && cmd !== "!games") return false;

  const topic = (args[1] || "").toLowerCase();

  if (topic === "blackjack" || topic === "bj") {
    await msg.reply(
      `🃏 **Blackjack Help**

**Command**
\`!blackjack <bet>\` or \`!bj <bet>\`

**How it works**
• Try to get as close to 21 as possible without going over
• Beat the dealer's hand to win
• Dealer stands on all 17 or higher
• Blackjack (Ace + 10/J/Q/K as first two cards) pays 3:2 and ends the round
• All other wins pay 1:1
• If you and the dealer tie, it's a push (your bet is returned)
• Game uses 6 standard decks shuffled together

**Actions**
• **Hit** — Draw another card
• **Stand** — End your turn, dealer plays
• **Double Down** — Double your bet, draw one card, and stand (only available as your first action)

**Example**
• \`!blackjack 1000\` — bet 1000 coins on blackjack`
    );
    return true;
  }

  if (topic === "slots" || topic === "sl") {
    await msg.reply(
      `🎰 **Slots Help**

**Command**
\`!slots <bet> <paylines> [image|text]\` or \`!sl <bet> <paylines> [image|text]\`

**Default**
• If you do not add a mode, the bot uses \`image\`

**What the options mean**
• \`bet\` = coins you want to spend
• \`paylines\` = number of active paylines, from 1 to 20
• \`image\` = shows the custom slot image
• \`text\` = shows the text version instead

**How it works**
• The total bet is split across the paylines
• More paylines means more chances to win
• A win needs 3 or more matching symbols from left to right
• Bigger matches pay more

**Examples**
• \`!slots 200 5\`
• \`!slots 500 20 text\`
• \`!slots 300 20 image\``
    );
    return true;
  }

  if (topic === "coinflip" || topic === "cf") {
    await msg.reply(
      `🪙 **Coinflip Help**

**Command**
\`!coinflip <amount> <heads/tails>\` or \`!cf <amount> <heads/tails>\`

**How it works**
• Flip a coin and choose heads or tails
• 50% chance to win
• 50% chance to lose
• No house edge — completely fair

**Win and lose**
• If you win: you get your bet back + double your coins
• If you lose: you lose your bet

**Example**
• \`!coinflip 100 heads\` — bet 100 coins on heads`
    );
    return true;
  }

  if (topic === "dice" || topic === "d") {
    await msg.reply(
      `🎲 **Dice Roll Help**

**Command**
\`!dice <bet> <prediction>\` or \`!d <bet> <prediction>\`

**Prediction types**
• \`1-6\` — Pick a specific number (16% win chance)
• \`even\` — Roll is even (50% win chance)
• \`odd\` — Roll is odd (50% win chance)
• \`high\` — Roll is 4, 5, or 6 (50% win chance)
• \`low\` — Roll is 1, 2, or 3 (50% win chance)

**Payouts**
• Specific number: 5x your bet
• Even/Odd/High/Low: 1.86x your bet

**Example**
• \`!dice 100 even\` — bet 100 coins on even
• \`!dice 50 6\` — bet 50 coins on rolling a 6`
    );
    return true;
  }

  if (topic === "higherlower" || topic === "hl") {
    await msg.reply(
      `🃏 **Higher Lower Help**

**Command**
\`!higherlower <bet>\` or \`!hl <bet>\`

**How it works**
• The bet is locked when the game starts
• One card is shown from a real shuffled 52-card deck
• Choose **Higher**, **Lower**, or **Tie** with buttons
• If your guess is correct, your run continues and profit grows
• If you guess wrong, you lose the stake
• You can press **Claim** anytime to cash out current profit

**Realistic rules**
• Ace is high
• Tie is a valid guess with lower chance and bigger payout
• Win chances are calculated from remaining cards in the deck`
    );
    return true;
  }

  if (topic === "mines" || topic === "m") {
    await msg.reply(
      `💣 **Mines Help**

**Command**
\`!mines <bet>\` or \`!mines <bet> <mines>\`
\`!m <bet>\` or \`!m <bet> <mines>\`

**How it works**
• The board is 5x5
• Choose how many mines to play with, from 1 to 24
• Click the tile buttons to pick safe tiles and grow your total profit
• Hit a mine and you lose the stake
• Press **Claim** in the control message anytime to cash out

**Rules**
• Each safe pick updates your total profit
• More mines means more risk and bigger payout growth
• Mine count can be selected interactively if you do not pass it in the command
• The board and claim control are shown as separate interactive messages`
    );
    return true;
  }

  if (topic === "rtp" || topic === "rates") {
    await msg.reply(
      `📊 **RTP Help**

**Command**
\`!rtp\` or \`!rates\`

**What is RTP?**
• RTP stands for "Return To Player".
• It is a theoretical percentage indicating how much of all wagered money a game will pay back to players over a large number of plays. 
• For example, a 96% RTP means that on average, for every 100 coins bet, 96 are returned to players as winnings and 4 are kept by the house as an edge.

**What it does**
• Shows the platform RTP rates for each game
• Values are fixed display rates

**Example**
• \`!rtp\``
    );
    return true;
  }

  if (topic === "roulette" || topic === "r") {
    await msg.reply(
      `🎰 **Roulette Help**

**Command**
\`!roulette\` or \`!r\`

**How it works**
• Interactive European Roulette (single 0).
• Select your active chip size via the buttons at the top of the message.
• Place unlimited bets across the board using the three dropdown menus.
• Every time you place a bet, the dynamic board image updates to show your active staked chips.
• Hit **SPIN WHEEL** to roll the ball.
• If you make a mistake, hit **Clear Bets** to recall your whole stake limit.

**Payout Multipliers**
• Straight Number (0-36): 36x
• Dozens & Columns: 3x
• RED, BLACK, EVEN, ODD, 1-18, 19-36: 2x`
    );
    return true;
  }

  if (topic === "crash" || topic === "c") {
    await msg.reply(
      `🚀 **Crash Help**

**Command**
\`!crash <bet>\` or \`!c <bet>\`

**How it works**
• The multiplier starts at 1.00x and climbs exponentially.
• The game updates every 1.5 seconds.
• You must hit **CASH OUT** before the random crash point is reached!
• If you cash out in time, you win your bet multiplied by the exact multiplier on your screen.
• If it crashes before you cash out, you lose your bet.
• At the end of the game, a beautiful graph is generated showing your exit point vs the crash point.`
    );
    return true;
  }

  if (cmd === "!games") {
    await msg.reply(
      `🎮 **Available Games**
• \`!help crash\` — Learn how to play crash
• \`!help roulette\` — Learn how to play interactive roulette
• \`!help blackjack\` — Learn how to play blackjack
• \`!help slots\` — Learn how to play slots
• \`!help coinflip\` — Learn how to play coinflip
• \`!help dice\` — Learn how to play dice roll
• \`!help higherlower\` — Learn how to play higher/lower
• \`!help mines\` — Learn how to play mines
• \`!help rtp\` — Learn about RTP display
• \`!rtp\` — View game RTP rates`
    );
    return true;
  }

  await msg.reply(
    `🎰 **CoinCrown Casino**

**About**
• A fair real-world simulation casino
• For entertainment purposes only
• Transparent game mechanics
• Play responsibly

**Games**
• Type \`!games\` to see a full list of available games.
• Type \`!rtp\` to view the theoretical payout rates for all games.

**Economy**
• \`!leaderboard\`, \`!lb\`, or \`!top\` — View the global player stats
• \`!balance\` or \`!bal\` — Check your coin balance
• \`!daily\` — Claim your daily reward`
  );

  return true;
}

module.exports = { handleHelp };