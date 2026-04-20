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

function drawLabelValue(ctx, label, value, x, y) {
  ctx.fillStyle = "#9fb0c0";
  ctx.font = "24px sans-serif";
  ctx.fillText(label, x, y);

  ctx.fillStyle = "#f5fbff";
  ctx.font = "bold 36px sans-serif";
  ctx.fillText(String(value), x, y + 42);
}

function drawWinningPaylines(ctx, paylines, winningPaylineIndexes, board) {
  if (!Array.isArray(winningPaylineIndexes) || winningPaylineIndexes.length === 0) return;

  const palette = [
    "#ffe27a",
    "#ffb84a",
    "#73f7c4",
    "#88d7ff",
    "#ff8ec1",
    "#b4ff8f",
    "#ffd19b",
  ];

  const lineWidth = winningPaylineIndexes.length > 8 ? 4 : 5;

  for (let i = 0; i < winningPaylineIndexes.length; i++) {
    const paylineIndex = winningPaylineIndexes[i];
    const pattern = paylines[paylineIndex];
    if (!pattern) continue;

    const color = palette[i % palette.length];

    ctx.save();
    ctx.beginPath();
    for (let col = 0; col < 5; col++) {
      const row = pattern[col];
      const cx = board.x + col * (board.cellW + board.gapX) + board.cellW / 2;
      const cy = board.y + row * (board.cellH + board.gapY) + board.cellH / 2;

      if (col === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    }

    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.82;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    ctx.globalAlpha = 0.95;
    for (let col = 0; col < 5; col++) {
      const row = pattern[col];
      const cx = board.x + col * (board.cellW + board.gapX) + board.cellW / 2;
      const cy = board.y + row * (board.cellH + board.gapY) + board.cellH / 2;

      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

function createSlotsResultImage({
  grid,
  paylines,
  winningPaylineIndexes,
  statusText,
  totalBet,
  totalPayout,
  net,
  selectedPaylines,
}) {
  const width = 980;
  const height = 640;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, "#0b1220");
  bgGradient.addColorStop(1, "#15192a");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  const headerGradient = ctx.createLinearGradient(0, 0, width, 0);
  headerGradient.addColorStop(0, "#ffe27a");
  headerGradient.addColorStop(1, "#f3bf26");

  roundRect(ctx, 28, 24, width - 56, 76, 18);
  ctx.fillStyle = "#101a2b";
  ctx.fill();

  ctx.save();
  ctx.shadowColor = "rgba(255, 218, 102, 0.38)";
  ctx.shadowBlur = 16;
  ctx.strokeStyle = "rgba(255, 225, 120, 0.35)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, 28, 24, width - 56, 76, 18);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = headerGradient;
  roundRect(ctx, 28, 24, 12, 76, 6);
  ctx.fill();

  ctx.fillStyle = "#f6fbff";
  ctx.font = "bold 38px sans-serif";
  ctx.shadowColor = "rgba(255, 224, 123, 0.35)";
  ctx.shadowBlur = 8;
  ctx.fillText("CoinCrown | Slots", 58, 74);
  ctx.shadowBlur = 0;

  ctx.fillStyle = net >= 0 ? "#7dffad" : "#ff7d95";
  ctx.font = "bold 30px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(statusText, width - 58, 73);
  ctx.textAlign = "left";

  roundRect(ctx, 28, 118, width - 56, 312, 22);
  ctx.fillStyle = "#0f1f1b";
  ctx.fill();

  const boardGradient = ctx.createLinearGradient(0, 118, width, 430);
  boardGradient.addColorStop(0, "#0e603f");
  boardGradient.addColorStop(1, "#0b7a50");
  ctx.globalAlpha = 0.24;
  roundRect(ctx, 28, 118, width - 56, 312, 22);
  ctx.fillStyle = boardGradient;
  ctx.fill();
  ctx.globalAlpha = 1;

  const boardX = 58;
  const boardY = 145;
  const cellW = 164;
  const cellH = 86;
  const gapX = 12;
  const gapY = 14;

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5; col++) {
      const x = boardX + col * (cellW + gapX);
      const y = boardY + row * (cellH + gapY);

      roundRect(ctx, x, y, cellW, cellH, 14);
      ctx.fillStyle = "rgba(7, 21, 28, 0.56)";
      ctx.fill();

      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255, 223, 135, 0.55)";
      ctx.shadowColor = "rgba(255, 212, 98, 0.32)";
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.font = "58px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(grid[row][col], x + cellW / 2, y + cellH / 2 + 2);
    }
  }

  drawWinningPaylines(ctx, paylines, winningPaylineIndexes, {
    x: boardX,
    y: boardY,
    cellW,
    cellH,
    gapX,
    gapY,
  });

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  roundRect(ctx, 28, 454, width - 56, 160, 20);
  ctx.fillStyle = "#101a2b";
  ctx.fill();

  const netString = `${net >= 0 ? "+" : ""}${net}`;

  drawLabelValue(ctx, "Bet", totalBet, 58, 500);
  drawLabelValue(ctx, "Payout", totalPayout, 242, 500);

  ctx.fillStyle = "#9fb0c0";
  ctx.font = "24px sans-serif";
  ctx.fillText("Net", 438, 500);
  ctx.fillStyle = net >= 0 ? "#8bffbb" : "#ff9eb0";
  ctx.font = "bold 36px sans-serif";
  ctx.fillText(netString, 438, 542);

  drawLabelValue(ctx, "Paylines", selectedPaylines, 602, 500);

  ctx.fillStyle = "rgba(194, 206, 221, 0.48)";
  ctx.font = "20px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("@CoinCrown", width - 58, 598);
  ctx.textAlign = "left";

  return canvas.toBuffer("image/png");
}

module.exports = {
  createSlotsResultImage,
};
