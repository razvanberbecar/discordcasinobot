const { createCanvas } = require("canvas");

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function rankLabel(value) {
  if (value === 14) return "A";
  if (value === 13) return "K";
  if (value === 12) return "Q";
  if (value === 11) return "J";
  return String(value);
}

function suitSymbol(suit) {
  if (suit === "spades") return "♠";
  if (suit === "hearts") return "♥";
  if (suit === "diamonds") return "♦";
  return "♣";
}

function suitColor(suit) {
  return suit === "hearts" || suit === "diamonds" ? "#dd3d4f" : "#0b1528";
}

function cardToLabel(card) {
  return `${rankLabel(card.value)}${suitSymbol(card.suit)}`;
}

function drawCard(ctx, x, y, card, scale = 1) {
  const w = 210 * scale;
  const h = 300 * scale;
  const pad = 16 * scale;

  ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
  ctx.shadowBlur = 22 * scale;
  ctx.shadowOffsetY = 8 * scale;
  roundRect(ctx, x, y, w, h, 20 * scale);
  ctx.fillStyle = "#fcfcff";
  ctx.fill();
  ctx.shadowColor = "transparent";

  ctx.lineWidth = 3 * scale;
  ctx.strokeStyle = "rgba(17, 26, 42, 0.2)";
  ctx.stroke();

  const rank = rankLabel(card.value);
  const suit = suitSymbol(card.suit);
  const color = suitColor(card.suit);

  ctx.fillStyle = color;
  ctx.font = `bold ${40 * scale}px sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText(rank, x + pad, y + 45 * scale);

  ctx.font = `${34 * scale}px sans-serif`;
  ctx.fillText(suit, x + pad, y + 82 * scale);

  ctx.font = `${112 * scale}px serif`;
  ctx.textAlign = "center";
  ctx.fillText(suit, x + w / 2, y + h / 2 + 38 * scale);

  ctx.save();
  ctx.translate(x + w, y + h);
  ctx.rotate(Math.PI);
  ctx.textAlign = "left";
  ctx.font = `bold ${40 * scale}px sans-serif`;
  ctx.fillText(rank, pad, 45 * scale);
  ctx.font = `${34 * scale}px sans-serif`;
  ctx.fillText(suit, pad, 82 * scale);
  ctx.restore();
}

function createHigherLowerImage({ currentCard, previousCard = null, statusText = "Current Card" }) {
  const width = 760;
  const height = 420;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, "#0a2b25");
  bgGradient.addColorStop(1, "#041914");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  roundRect(ctx, 22, 22, width - 44, 58, 14);
  ctx.fill();

  ctx.fillStyle = "#ffe27a";
  const titleText = "CoinCrown | Higher Lower";
  const titleX = 40;
  const rightPadding = 40;
  const gap = 22;

  ctx.font = "bold 34px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(titleText, titleX, 62);

  const titleWidth = ctx.measureText(titleText).width;
  const statusMaxWidth = Math.max(0, width - rightPadding - (titleX + titleWidth + gap));

  ctx.fillStyle = "#f6fbff";
  let statusFontSize = 24;
  let statusValue = String(statusText || "");

  while (statusFontSize > 16) {
    ctx.font = `bold ${statusFontSize}px sans-serif`;
    if (ctx.measureText(statusValue).width <= statusMaxWidth) break;
    statusFontSize -= 1;
  }

  ctx.font = `bold ${statusFontSize}px sans-serif`;
  if (ctx.measureText(statusValue).width > statusMaxWidth && statusMaxWidth > 0) {
    while (statusValue.length > 0 && ctx.measureText(`${statusValue}...`).width > statusMaxWidth) {
      statusValue = statusValue.slice(0, -1);
    }
    statusValue = `${statusValue}...`;
  }

  ctx.textAlign = "right";
  if (statusMaxWidth > 0) {
    ctx.fillText(statusValue, width - rightPadding, 62);
  }

  if (previousCard) {
    drawCard(ctx, 110, 95, previousCard, 0.86);
    drawCard(ctx, 370, 85, currentCard, 1);
    ctx.fillStyle = "rgba(255, 226, 122, 0.85)";
    ctx.font = "bold 44px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("→", 345, 245);
  } else {
    drawCard(ctx, (width - 210) / 2, 92, currentCard, 1);
  }

  return canvas.toBuffer("image/png");
}

function convertBlackjackCard(card) {
  // Converts blackjack.js card { value: 'A', suit: '♠' } to higher/lower format { value: 14, suit: 'spades' }
  const valueMap = { 'A': 14, 'K': 13, 'Q': 12, 'J': 11 };
  let value = valueMap[card.value] || Number(card.value);
  let suit = card.suit;
  if (suit === '♠') suit = 'spades';
  else if (suit === '♥') suit = 'hearts';
  else if (suit === '♦') suit = 'diamonds';
  else if (suit === '♣') suit = 'clubs';
  return { value, suit };
}

function createBlackjackImage({ playerHand, dealerHand, revealDealer = false }) {
  const width = 760;
  const height = 420;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Background
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, "#0a2b25");
  bgGradient.addColorStop(1, "#041914");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Titles
  ctx.fillStyle = "#ffe27a";
  ctx.font = "bold 34px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Your Hand", 60, 62);
  ctx.textAlign = "right";
  ctx.fillText("Dealer's Hand", width - 60, 62);

  // Card layout for stacked cards with multiple rows
  const cardW = 110, cardH = 160, gap = 18, overlapY = 60, maxPerRow = 2;

  // Player hand (left, raised to align with dealer)
  const playerBaseX = 60, playerBaseY = 120;
  for (let i = 0; i < playerHand.length; ++i) {
    // Row and column for stacking
    const row = Math.floor(i / maxPerRow);
    const col = i % maxPerRow;
    const x = playerBaseX + col * (cardW + gap) + row * (cardW + gap) * 0.25;
    const y = playerBaseY + row * overlapY;
    drawCard(ctx, x, y, convertBlackjackCard(playerHand[i]), 0.52);
  }

  // Dealer hand (right, lower to avoid label)
  const dealerBaseX = width - cardW * 2 - gap - 60;
  const dealerBaseY = 120;
  for (let i = 0; i < dealerHand.length; ++i) {
    const row = Math.floor(i / maxPerRow);
    const col = i % maxPerRow;
    const x = dealerBaseX + col * (cardW + gap) + row * (cardW + gap) * 0.25;
    const y = dealerBaseY + row * overlapY;
    if (!revealDealer && i > 0) {
      ctx.save();
      ctx.fillStyle = "#1b2336";
      roundRect(ctx, x, y, cardW, cardH, 16);
      ctx.fill();
      ctx.restore();
    } else {
      drawCard(ctx, x, y, convertBlackjackCard(dealerHand[i]), 0.52);
    }
  }
  return canvas.toBuffer("image/png");
}

module.exports = {
  createHigherLowerImage,
  cardToLabel,
  createBlackjackImage,
};