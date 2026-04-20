const { createCanvas } = require("canvas");

const RED_NUMS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

function getNumberColor(num) {
  if (num === 0) return "#1e7d3e";
  if (RED_NUMS.has(num)) return "#d92534";
  return "#1a1b1f";
}

function shortAmount(amount) {
  if (amount >= 1000000) return (amount / 1000000).toFixed(1).replace(/\.0$/, "") + "m";
  if (amount >= 1000) return (amount / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return amount.toString();
}

/**
 * bets: Array of { type: string, amount: number }
 * rollResult: number | null
 */
function createRouletteBoardImage({ bets = [], rollResult = null }) {
  const width = 1000;
  const height = 450;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Background
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, "#0b1220");
  bgGradient.addColorStop(1, "#15192a");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  ctx.lineWidth = 2;
  ctx.strokeStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 20px sans-serif";

  // Grid offsets
  const startX = 110;
  const startY = 70;
  const cellW = 60;
  const cellH = 60;

  const centers = {}; // To store center coordinates for chips

  // Draw 0
  ctx.fillStyle = "#1e7d3e";
  ctx.fillRect(startX - 60, startY, 60, cellH * 3);
  ctx.strokeRect(startX - 60, startY, 60, cellH * 3);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText("0", startX - 30, startY + (cellH * 3) / 2);
  centers["0"] = { x: startX - 30, y: startY + (cellH * 3) / 2 };

  ctx.font = "bold 20px sans-serif";

  // Draw 1-36
  for (let c = 0; c < 12; c++) {
    for (let r = 0; r < 3; r++) {
      const num = (2 - r) + c * 3 + 1;
      const tX = startX + c * cellW;
      const tY = startY + r * cellH;

      ctx.fillStyle = getNumberColor(num);
      ctx.fillRect(tX, tY, cellW, cellH);
      ctx.strokeRect(tX, tY, cellW, cellH);

      ctx.fillStyle = "#ffffff";
      ctx.fillText(num.toString(), tX + cellW / 2, tY + cellH / 2);

      // Highlight winning number
      if (rollResult === num) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.fillRect(tX, tY, cellW, cellH);
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#ffe27a";
        ctx.strokeRect(tX, tY, cellW, cellH);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#ffffff";
      }

      centers[num.toString()] = { x: tX + cellW / 2, y: tY + cellH / 2 };
    }
  }

  // Highlight 0 if it won
  if (rollResult === 0) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.fillRect(startX - 60, startY, 60, cellH * 3);
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#ffe27a";
    ctx.strokeRect(startX - 60, startY, 60, cellH * 3);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ffffff";
  }

  // Draw Row/Column bets 2:1
  const colLabels = ["2:1", "2:1", "2:1"];
  const colTypes = ["col3", "col2", "col1"]; // Top row is col3, Middle is col2, Bottom is col1
  for (let r = 0; r < 3; r++) {
    const tX = startX + 12 * cellW;
    const tY = startY + r * cellH;
    ctx.fillStyle = "transparent";
    ctx.fillRect(tX, tY, cellW, cellH);
    ctx.strokeRect(tX, tY, cellW, cellH);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(colLabels[r], tX + cellW / 2, tY + cellH / 2);
    centers[colTypes[r]] = { x: tX + cellW / 2, y: tY + cellH / 2 };
  }

  // Draw Dozens
  const dozenLabels = ["1st 12", "2nd 12", "3rd 12"];
  const dozenTypes = ["1st", "2nd", "3rd"];
  for (let i = 0; i < 3; i++) {
    const tX = startX + i * 4 * cellW;
    const tY = startY + 3 * cellH;
    const tW = 4 * cellW;
    const tH = 50;
    ctx.fillStyle = "transparent";
    ctx.fillRect(tX, tY, tW, tH);
    ctx.strokeRect(tX, tY, tW, tH);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(dozenLabels[i], tX + tW / 2, tY + tH / 2);
    centers[dozenTypes[i]] = { x: tX + tW / 2, y: tY + tH / 2 };
  }

  // Draw Bottom Outside
  const outLabels = ["1 - 18", "EVEN", "RED", "BLACK", "ODD", "19 - 36"];
  const outTypes = ["low", "even", "red", "black", "odd", "high"];
  for (let i = 0; i < 6; i++) {
    const tX = startX + i * 2 * cellW;
    const tY = startY + 3 * cellH + 50;
    const tW = 2 * cellW;
    const tH = 50;
    
    // Fill specific colors for RED / BLACK
    if (outTypes[i] === "red") {
      ctx.fillStyle = "#d92534";
      ctx.fillRect(tX, tY, tW, tH);
    } else if (outTypes[i] === "black") {
      ctx.fillStyle = "#1a1b1f";
      ctx.fillRect(tX, tY, tW, tH);
    } else {
      ctx.fillStyle = "transparent";
      ctx.fillRect(tX, tY, tW, tH);
    }
    
    ctx.strokeRect(tX, tY, tW, tH);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(outLabels[i], tX + tW / 2, tY + tH / 2);
    centers[outTypes[i]] = { x: tX + tW / 2, y: tY + tH / 2 };
  }

  // Pre-aggregate bets of the same type so we draw one big chip per box
  const aggregatedBets = {};
  for (const b of bets) {
    if (!aggregatedBets[b.type]) aggregatedBets[b.type] = 0;
    aggregatedBets[b.type] += b.amount;
  }

  // Draw Chips
  ctx.font = "bold 12px sans-serif";
  for (const [type, amount] of Object.entries(aggregatedBets)) {
    const pos = centers[type];
    if (!pos) continue;

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 20, 0, Math.PI * 2);
    const chipGradient = ctx.createRadialGradient(pos.x, pos.y, 5, pos.x, pos.y, 20);
    chipGradient.addColorStop(0, "#ffeaa7");
    chipGradient.addColorStop(1, "#f39c12");
    ctx.fillStyle = chipGradient;
    ctx.fill();

    ctx.lineWidth = 3;
    ctx.strokeStyle = "#d35400";
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 17, 0, Math.PI * 2);
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#000000";
    ctx.fillText(shortAmount(amount), pos.x, pos.y);
  }

  // Draw Result Title
  if (rollResult !== null) {
    ctx.fillStyle = "#ffe27a";
    ctx.font = "bold 28px sans-serif";
    const color = getNumberColor(rollResult);
    const colorStr = color === "#d92534" ? "Red" : color === "#1a1b1f" ? "Black" : "Green";
    ctx.fillText(`Result: ${rollResult} ${colorStr}`, width / 2, 35);
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px sans-serif";
    ctx.fillText("Place Your Bets", width / 2, 35);
  }

  return canvas.toBuffer("image/png");
}

module.exports = {
  createRouletteBoardImage,
  RED_NUMS
};
