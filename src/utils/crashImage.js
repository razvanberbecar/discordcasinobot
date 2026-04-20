const { createCanvas } = require("canvas");

function createCrashImage({ finalMultiplier, cashedOutAt = null, didCrash = false }) {
  const width = 800;
  const height = 450;
  const margin = 50;
  
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Background
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  if (didCrash) {
    bgGradient.addColorStop(0, "#2c0e12"); // Dark red tint
    bgGradient.addColorStop(1, "#18080a");
  } else {
    bgGradient.addColorStop(0, "#0b1612"); // Dark green/gold tint
    bgGradient.addColorStop(1, "#071110");
  }
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Graph Area
  const graphW = width - margin * 2;
  const graphH = height - margin * 2;
  const graphX = margin;
  const graphY = margin;

  // Axes
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.beginPath();
  ctx.moveTo(graphX, graphY);
  ctx.lineTo(graphX, graphY + graphH);
  ctx.lineTo(graphX + graphW, graphY + graphH);
  ctx.stroke();

  // Exponential Curve Plotting
  // m = e^(r*t) -> t = ln(m)/r
  // We plot from m = 1.0 to m = finalMultiplier
  
  const safeFinal = Math.max(1.01, finalMultiplier); // Prevent div by 0 if it crashed at 1.00
  const maxT = Math.log(safeFinal); 
  
  ctx.beginPath();
  let first = true;
  const steps = 100;
  
  for (let i = 0; i <= steps; i++) {
    // Current t mapped 0 to maxT
    const t = (i / steps) * maxT;
    const m = Math.exp(t); // current Multiplier
    
    // x mapped 0 to graphW
    const x = graphX + (i / steps) * graphW;
    // y mapped 1.0..safeFinal to graphH..0
    const mFrac = (m - 1.0) / (safeFinal - 1.0);
    const y = graphY + graphH - (mFrac * graphH);

    if (first) {
      ctx.moveTo(x, y);
      first = false;
    } else {
      ctx.lineTo(x, y);
    }
  }

  // Draw Path
  ctx.lineWidth = 6;
  ctx.strokeStyle = didCrash ? "#e74c3c" : "#2ecc71";
  ctx.stroke();

  // Draw fill under curve
  ctx.lineTo(graphX + graphW, graphY + graphH);
  ctx.lineTo(graphX, graphY + graphH);
  ctx.closePath();
  const fillGrad = ctx.createLinearGradient(0, graphY, 0, graphY + graphH);
  if (didCrash) {
    fillGrad.addColorStop(0, "rgba(231, 76, 60, 0.4)");
    fillGrad.addColorStop(1, "rgba(231, 76, 60, 0.0)");
  } else {
    fillGrad.addColorStop(0, "rgba(46, 204, 113, 0.4)");
    fillGrad.addColorStop(1, "rgba(46, 204, 113, 0.0)");
  }
  ctx.fillStyle = fillGrad;
  ctx.fill();

  // Large Status Text
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 50px sans-serif";
  
  if (didCrash) {
    ctx.fillStyle = "#e74c3c";
    ctx.fillText(`Crashed @ ${finalMultiplier.toFixed(2)}x`, width / 2, height / 2 - 40);
  } else {
    ctx.fillStyle = "#2ecc71";
    ctx.fillText(`Cashed Out @ ${cashedOutAt.toFixed(2)}x`, width / 2, height / 2 - 40);
    ctx.font = "bold 25px sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.fillText(`(Rocket continued to ${finalMultiplier.toFixed(2)}x)`, width / 2, height / 2 + 20);
  }

  // Draw Cashout Point Dot
  if (cashedOutAt !== null && !didCrash) {
    const tCash = Math.log(cashedOutAt);
    const xCash = graphX + (tCash / maxT) * graphW;
    const mFrac = (cashedOutAt - 1.0) / (safeFinal - 1.0);
    const yCash = graphY + graphH - (mFrac * graphH);

    ctx.beginPath();
    ctx.arc(xCash, yCash, 12, 0, Math.PI * 2);
    ctx.fillStyle = "#f1c40f";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
  }

  return canvas.toBuffer("image/png");
}

module.exports = {
  createCrashImage
};
