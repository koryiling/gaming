/* Treasure Hunt — find the buried treasure from warmer/colder clues */
Arcade.register({
  id: "treasurehunt",
  name: "Treasure Hunt",
  emoji: "🗺️",
  tagline: "Dig for buried treasure, following hot-and-cold clues to strike gold in few digs.",
  tags: ["Detective", "Number", "Classic", "Puzzle", "Solo"],
  minPlayers: 1,
  maxPlayers: 1,
  leaderboard: { type: "low" }, // fewest digs to find the treasure ranks highest (per game, not summed)
  rules: [
    "Treasure 💎 is buried in one square of the grid.",
    "Click a square to dig — the colour shows how close you are.",
    "🔥 burning hot · 🟧 warm · 🟦 cold. Find it in as few digs as possible!",
  ],
  options: [
    { key: "size", label: "Grid", type: "select", default: 8,
      choices: [{ label: "6×6", value: 6 }, { label: "8×8", value: 8 }, { label: "10×10", value: 10 }] },
  ],

  create(api) {
    const N = api.config.options.size;
    const tr = Math.random() * N | 0, tc = Math.random() * N | 0;
    let digs = 0, over = false;
    const cellSize = Math.floor(Math.min(380, window.innerWidth - 60) / N);

    const grid = api.el("div", "grid-board");
    grid.style.gridTemplateColumns = "repeat(" + N + ",1fr)";
    api.board.appendChild(grid);

    function score() { api.setScores([{ name: api.config.username, value: digs + " digs", color: api.colors[0] }]); }
    function colorFor(dist) {
      if (dist === 0) return "#f6c343";
      if (dist <= 1) return "#e74c3c";
      if (dist <= 2) return "#e67e22";
      if (dist <= 4) return "#f1c40f";
      return "#5dade2";
    }
    const cells = {};
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const btn = api.el("button", "cell");
      btn.style.width = btn.style.height = cellSize + "px";
      btn.style.fontSize = cellSize * 0.5 + "px";
      btn.style.background = "#e3f7ec";
      btn.addEventListener("click", () => dig(r, c, btn));
      cells[r + "," + c] = btn;
      grid.appendChild(btn);
    }
    function dig(r, c, btn) {
      if (over || btn.disabled) return;
      digs++;
      const dist = Math.max(Math.abs(r - tr), Math.abs(c - tc));
      btn.disabled = true;
      btn.style.background = colorFor(dist);
      if (dist === 0) {
        over = true;
        btn.textContent = "💎";
        if (api.submitScore) api.submitScore(digs); // fewest digs ranks highest (lower is better)
        if (api.celebrate) api.celebrate("🎉 Found it in " + digs + " digs!");
        api.setStatus("🎉 Treasure found in " + digs + " digs! Fewer digs ranks higher 🏆. Restart to bury a new one.");
        api.setScores([{ name: api.config.username, value: digs + " digs", color: api.colors[0] }]);
        return;
      }
      btn.textContent = dist <= 1 ? "🔥" : dist <= 2 ? "♨️" : dist <= 4 ? "🌤️" : "❄️";
      api.setStatus(dist <= 2 ? "Getting hot! 🔥" : dist <= 4 ? "Warmish… 🌤️" : "Brr, cold. ❄️");
      score();
    }
    score();
    api.setStatus("Click a square to start digging ⛏️");
    return { stop() {} };
  },
});
