const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

function renderGrid(grid) {
  return `${grid[0].join(" ")}\n${grid[1].join(" ")}\n${grid[2].join(" ")}`;
}

function renderGridWithPaylineMarks(grid, paylines, winningIndexes) {
  const marker = Array.from({ length: 3 }, () => Array(5).fill(false));

  for (const idx of winningIndexes) {
    const path = paylines[idx];
    for (let col = 0; col < 5; col++) {
      const row = path[col];
      marker[row][col] = true;
    }
  }

  const rows = [];
  for (let r = 0; r < 3; r++) {
    const cols = [];
    for (let c = 0; c < 5; c++) {
      cols.push(marker[r][c] ? `【${grid[r][c]}】` : ` ${grid[r][c]} `);
    }
    rows.push(cols.join(" "));
  }

  return rows.join("\n");
}

module.exports = {
  sleep,
  renderGrid,
  renderGridWithPaylineMarks,
};