const {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");
const { getBalance, placeBet, settleBet } = require("../balanceStore");
const { createRouletteBoardImage, RED_NUMS } = require("../utils/rouletteImage");
const { sleep } = require("../utils/render");

const sessions = new Map();

function getComponents(session, disableAll = false) {
  if (disableAll) return [];

  const ts = Date.now(); // Append timestamp to force select menu state resets

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`rl:chip:10:${session.id}`).setLabel("10").setStyle(session.activeChipSize === 10 ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`rl:chip:100:${session.id}`).setLabel("100").setStyle(session.activeChipSize === 100 ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`rl:chip:500:${session.id}`).setLabel("500").setStyle(session.activeChipSize === 500 ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`rl:chip:1000:${session.id}`).setLabel("1k").setStyle(session.activeChipSize === 1000 ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`rl:custom:${session.id}`).setLabel(session.customChipSize ? `Custom (${session.customChipSize})` : "Custom").setStyle(session.activeChipSize === session.customChipSize ? ButtonStyle.Success : ButtonStyle.Primary)
  );

  const inner1Options = [];
  for (let i = 0; i <= 18; i++) inner1Options.push({ label: i.toString(), value: i.toString() });
  const row2 = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId(`rl:in1:${session.id}:${ts}`).setPlaceholder("Place Inside Bet (0-18)").addOptions(inner1Options)
  );

  const inner2Options = [];
  for (let i = 19; i <= 36; i++) inner2Options.push({ label: i.toString(), value: i.toString() });
  const row3 = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId(`rl:in2:${session.id}:${ts}`).setPlaceholder("Place Inside Bet (19-36)").addOptions(inner2Options)
  );

  const outerOptions = [
    { label: "1-18 (Low)", value: "low" },
    { label: "19-36 (High)", value: "high" },
    { label: "Even", value: "even" },
    { label: "Odd", value: "odd" },
    { label: "Red", value: "red" },
    { label: "Black", value: "black" },
    { label: "1st Dozen", value: "1st" },
    { label: "2nd Dozen", value: "2nd" },
    { label: "3rd Dozen", value: "3rd" },
    { label: "1st Row", value: "col1" },
    { label: "2nd Row", value: "col2" },
    { label: "3rd Row", value: "col3" },
  ];
  const row4 = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId(`rl:out:${session.id}:${ts}`).setPlaceholder("Place Outside Bet").addOptions(outerOptions)
  );

  const hasBets = session.bets.length > 0;
  const row5 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`rl:spin:${session.id}`).setLabel("🎰 SPIN WHEEL").setStyle(ButtonStyle.Success).setDisabled(!hasBets),
    new ButtonBuilder().setCustomId(`rl:clear:${session.id}`).setLabel("🗑️ Clear Bets").setStyle(ButtonStyle.Danger).setDisabled(!hasBets)
  );

  return [row1, row2, row3, row4, row5];
}

async function renderSessionMessage(session, interactionOrMessage, isResult = false) {
  try {
    const imageBuffer = createRouletteBoardImage({
      bets: session.bets,
      rollResult: isResult ? session.rollResult : null
    });
    const attachment = new AttachmentBuilder(imageBuffer, { name: "roulette.png" });
    const payload = {
      content: isResult ? `**Spin Result: ${session.rollResult}**` : `**Active Chip: ${session.activeChipSize}**\nPlace your chips using the dropdowns below!`,
      components: getComponents(session, isResult),
      files: [attachment]
    };

    const isInteraction = !!interactionOrMessage.user;

    if (isInteraction) {
      // This is an interaction (Button, SelectMenu, ModalSubmit)
      if (interactionOrMessage.deferred || interactionOrMessage.replied) {
        await interactionOrMessage.editReply(payload);
      } else {
        await interactionOrMessage.update(payload);
      }
    } else {
      // This is the original User message (`!r`)
      const msg = await interactionOrMessage.reply(payload);
      session.messageId = msg.id;
    }
  } catch (err) {
    console.error("Failed to render roulette session:", err);
  }
}

async function handleRoulette(cmd, args, msg) {
  if (cmd !== "!roulette" && cmd !== "!r") return false;

  const id = `${msg.author.id}-${Date.now()}`;
  const session = {
    id,
    userId: msg.author.id,
    activeChipSize: 10,
    customChipSize: null,
    bets: [], // { type, amount, context }
    rollResult: null,
    finished: false
  };

  sessions.set(id, session);
  await renderSessionMessage(session, msg);
  return true;
}

function checkWin(type, result) {
  if (type === result.toString()) return { win: true, mult: 36 };
  if (result === 0) return { win: false, mult: 0 }; // 0 loses all outside bets

  if (type === "even") return { win: result % 2 === 0, mult: 2 };
  if (type === "odd") return { win: result % 2 !== 0, mult: 2 };
  if (type === "red") return { win: RED_NUMS.has(result), mult: 2 };
  if (type === "black") return { win: !RED_NUMS.has(result), mult: 2 };
  if (type === "low") return { win: result >= 1 && result <= 18, mult: 2 };
  if (type === "high") return { win: result >= 19 && result <= 36, mult: 2 };
  if (type === "1st") return { win: result >= 1 && result <= 12, mult: 3 };
  if (type === "2nd") return { win: result >= 13 && result <= 24, mult: 3 };
  if (type === "3rd") return { win: result >= 25 && result <= 36, mult: 3 };

  if (type === "col1") return { win: result % 3 === 1, mult: 3 }; // Bottom
  if (type === "col2") return { win: result % 3 === 2, mult: 3 }; // Middle
  if (type === "col3") return { win: result % 3 === 0, mult: 3 }; // Top

  return { win: false, mult: 0 };
}

async function handleRouletteInteraction(interaction) {
  // Handle Modal Submit
  if (interaction.isModalSubmit() && interaction.customId.startsWith("rl:modal:")) {
    const sessionId = interaction.customId.split(":")[2];
    const session = sessions.get(sessionId);
    if (!session || session.finished) {
      await interaction.reply({ content: "Session expired.", ephemeral: true });
      return true;
    }
    if (interaction.user.id !== session.userId) return true;

    const customVal = Number(interaction.fields.getTextInputValue("chip_input"));
    if (Number.isInteger(customVal) && customVal > 0) {
      session.customChipSize = customVal;
      session.activeChipSize = customVal;
      await renderSessionMessage(session, interaction);
    } else {
      await interaction.reply({ content: "Invalid chip size. Must be a whole number greater than 0.", ephemeral: true });
    }
    return true;
  }

  if (!interaction.isButton() && !interaction.isStringSelectMenu()) return false;
  if (!interaction.customId.startsWith("rl:")) return false;

  const parts = interaction.customId.split(":");
  const action = parts[1];
  let sessionId = parts[2];
  if (action === "in1" || action === "in2" || action === "out") {
    sessionId = parts[2];
  } else if (action === "chip") {
    sessionId = parts[3];
  }

  const session = sessions.get(sessionId);
  if (!session || session.finished) {
    if (!interaction.deferred && !interaction.replied) await interaction.reply({ content: "This game is no longer active.", ephemeral: true });
    return true;
  }

  if (interaction.user.id !== session.userId) {
    await interaction.reply({ content: "You cannot control someone else's roulette table.", ephemeral: true });
    return true;
  }

  if (action === "chip") {
    const size = Number(parts[2]);
    session.activeChipSize = size;
    await renderSessionMessage(session, interaction);
    return true;
  }

  if (action === "custom") {
    const modal = new ModalBuilder()
      .setCustomId(`rl:modal:${session.id}`)
      .setTitle("Set Custom Chip Size");
    const input = new TextInputBuilder()
      .setCustomId("chip_input")
      .setLabel("Amount")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
    return true;
  }

  if (action === "clear") {
    for (const b of session.bets) {
      await settleBet(session.userId, b.context, b.amount); // Cancel and refund
    }
    session.bets = [];
    await renderSessionMessage(session, interaction);
    return true;
  }

  if (action === "in1" || action === "in2" || action === "out") {
    const betType = interaction.values[0];
    const amount = session.activeChipSize;

    const betContext = await placeBet(session.userId, amount);
    if (!betContext.ok) {
      await interaction.reply({ content: `You don't have enough coins! You only have **${betContext.balance ?? await getBalance(session.userId)}** left.`, ephemeral: true });
      return true;
    }

    session.bets.push({ type: betType, amount, context: betContext });
    await renderSessionMessage(session, interaction);
    return true;
  }

  if (action === "spin") {
    if (session.bets.length === 0) {
      await interaction.reply({ content: "Place some bets first!", ephemeral: true });
      return true;
    }
    session.finished = true;
    await interaction.update({ content: "🎰 **Spinning the wheel...**", components: [], files: [] });
    await sleep(1500);

    const result = Math.floor(Math.random() * 37);
    session.rollResult = result;

    let totalProfit = 0;
    let totalBet = 0;

    for (const b of session.bets) {
      totalBet += b.amount;
      const { win, mult } = checkWin(b.type, result);
      const payout = win ? Math.floor(b.amount * mult) : 0;
      totalProfit += (payout - b.amount);
      await settleBet(session.userId, b.context, payout);
    }

    await renderSessionMessage(session, interaction, true);

    // Add text follow up sumary
    const netTxt = totalProfit >= 0 ? `+${totalProfit}` : `${totalProfit}`;
    await interaction.followUp(`Spin Result: **${result}**\nTotal Bet: **${totalBet}** | Net Profit: **${netTxt}**`);

    sessions.delete(session.id);
    return true;
  }

  return false;
}

module.exports = {
  handleRoulette,
  handleRouletteInteraction
};
