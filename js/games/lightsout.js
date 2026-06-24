/* Lights Out — toggle the grid until every light is off */
Arcade.register({
  id: "lightsout",
  name: "Lights Out",
  emoji: "💡",
  tagline: "Flip lights and their neighbours until the whole board goes dark — mind the chain reactions.",
  tags: ["Puzzle", "Classic", "Solo"],
  minPlayers: 1,
  maxPlayers: 1,
  rules: [
    "Click a light to toggle it and its four neighbours (up/down/left/right).",
    "Goal: turn every light OFF.",
    "Every puzzle is solvable — fewer moves means a higher score!",
  ],
  options: [
    { key: "size", label: "Grid", type: "select", default: 5,
      choices: [{ label: "3×3 (easy)", value: 3 }, { label: "5×5", value: 5 }, { label: "6×6 (hard)", value: 6 }] },
  ],

  create(api) {
    const N = api.config.options.size;
    const cellSize = Math.floor(Math.min(360, window.innerWidth - 60) / N);
    const lit = Array.from({ length: N }, () => Array(N).fill(false));
    let moves = 0, over = false;

    const grid = api.el("div", "grid-board");
    grid.style.gridTemplateColumns = "repeat(" + N + ",1fr)";
    api.board.appendChild(grid);
    const cells = {};

    function inb(r, c) { return r >= 0 && c >= 0 && r < N && c < N; }
    function toggle(r, c) { if (inb(r, c)) lit[r][c] = !lit[r][c]; }
    function press(r, c, count) {
      toggle(r, c); toggle(r - 1, c); toggle(r + 1, c); toggle(r, c - 1); toggle(r, c + 1);
      if (count) moves++;
    }
    // scramble from all-off so it's always solvable
    function scramble() {
      const k = N * N;
      for (let i = 0; i < k; i++) if (Math.random() < 0.5) press(Math.random() * N | 0, Math.random() * N | 0, false);
      if (solved()) press(0, 0, false); // ensure not already solved
    }
    function solved() { return lit.every((row) => row.every((v) => !v)); }

    function paint() {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const e = cells[r + "," + c];
        e.style.background = lit[r][c] ? "#f6c343" : "#cdd6d0";
        e.textContent = lit[r][c] ? "💡" : "";
      }
      api.setScores([{ name: api.config.username, value: moves + " moves", color: api.colors[0] }]);
    }
    function click(r, c) {
      if (over) return;
      press(r, c, true);
      paint();
      if (solved()) {
        over = true;
        const sc = Math.max(20, 400 - moves * 12);
        api.setStatus("🎉 Lights out in " + moves + " moves! Score " + sc + ". Hit Restart for a new puzzle.");
        api.setScores([{ name: api.config.username, value: sc, color: api.colors[0] }]);
      } else {
        api.setStatus("💡 " + moves + " moves — keep going until it's all dark.");
      }
    }

    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const btn = api.el("button", "cell");
      btn.style.width = btn.style.height = cellSize + "px";
      btn.style.fontSize = cellSize * 0.45 + "px";
      btn.addEventListener("click", () => click(r, c));
      cells[r + "," + c] = btn;
      grid.appendChild(btn);
    }

    scramble();
    paint();
    api.setStatus("Turn every light off. Click to toggle a light and its neighbours.");
    return { stop() {} };
  },
});
