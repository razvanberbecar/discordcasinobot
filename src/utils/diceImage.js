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

function createDiceFaceImage(roll) {
  const size = 350;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  const bgGradient = ctx.createLinearGradient(0, 0, size, size);
  bgGradient.addColorStop(0, "#0b1220");
  bgGradient.addColorStop(1, "#15192a");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, size, size);

  const faceSize = 280;
  const faceX = (size - faceSize) / 2;
  const faceY = (size - faceSize) / 2;
  const dotRadius = 20;
  const margin = 45;

  roundRect(ctx, faceX, faceY, faceSize, faceSize, 28);
  ctx.fillStyle = "#0f1f1b";
  ctx.fill();

  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(255, 221, 74, 0.7)";
  ctx.stroke();

  const dotPositions = {
    1: [[faceSize / 2 + faceX, faceSize / 2 + faceY]],
    2: [
      [faceX + margin + dotRadius, faceY + margin + dotRadius],
      [faceX + faceSize - margin - dotRadius, faceY + faceSize - margin - dotRadius],
    ],
    3: [
      [faceX + margin + dotRadius, faceY + margin + dotRadius],
      [faceX + faceSize / 2, faceY + faceSize / 2],
      [faceX + faceSize - margin - dotRadius, faceY + faceSize - margin - dotRadius],
    ],
    4: [
      [faceX + margin + dotRadius, faceY + margin + dotRadius],
      [faceX + faceSize - margin - dotRadius, faceY + margin + dotRadius],
      [faceX + margin + dotRadius, faceY + faceSize - margin - dotRadius],
      [faceX + faceSize - margin - dotRadius, faceY + faceSize - margin - dotRadius],
    ],
    5: [
      [faceX + margin + dotRadius, faceY + margin + dotRadius],
      [faceX + faceSize - margin - dotRadius, faceY + margin + dotRadius],
      [faceX + faceSize / 2, faceY + faceSize / 2],
      [faceX + margin + dotRadius, faceY + faceSize - margin - dotRadius],
      [faceX + faceSize - margin - dotRadius, faceY + faceSize - margin - dotRadius],
    ],
    6: [
      [faceX + margin + dotRadius, faceY + margin + dotRadius],
      [faceX + faceSize - margin - dotRadius, faceY + margin + dotRadius],
      [faceX + margin + dotRadius, faceY + faceSize / 2],
      [faceX + faceSize - margin - dotRadius, faceY + faceSize / 2],
      [faceX + margin + dotRadius, faceY + faceSize - margin - dotRadius],
      [faceX + faceSize - margin - dotRadius, faceY + faceSize - margin - dotRadius],
    ],
  };

  ctx.fillStyle = "#ffe27a";
  for (const [dotX, dotY] of dotPositions[roll]) {
    ctx.beginPath();
    ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas.toBuffer("image/png");
}

module.exports = {
  createDiceFaceImage,
};
