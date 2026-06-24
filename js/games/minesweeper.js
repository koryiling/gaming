/* Minesweeper — single player */
Arcade.register({
  id: "mines",
  name: "Minesweeper",
  emoji: "💣",
  tagline: "Clear the field without detonating a mine. Use the numbers as clues.",
  tags: ["Puzzle", "Solo"],
  minPlayers: 1,
  maxPlayers: 1,
  leaderboard: { type: "wins" }, // counts cleared fields; each win adds one
  rules: [
    "Click a tile to reveal it. Numbers show how many mines touch that tile.",
    "Tap 🚩 Flag to switch to flag mode (then tap a tile to flag it) — or right-click / long-press.",
    "Reveal a mine and it's game over!",
    "Clear every safe tile to win — each clear counts on the leaderboard.",
  ],
  options: [
    {
      key: "diff", label: "Difficulty", type: "select", default: "easy",
      choices: [
        { label: "Easy 9×9", value: "easy" },
        { label: "Medium 12×12", value: "med" },
        { label: "Hard 14×14", value: "hard" },
      ],
    },
  ],

  create(api) {
    const CONF = { easy: [9, 10], med: [12, 24], hard: [14, 40] }[api.config.options.diff];
    const N = CONF[0], MINES = CONF[1];
    let grid, revealed, flagged, over, win, started, flags = 0, flagMode = false;

    const size = Math.floor(Math.min(440, window.innerWidth - 40) / N) - 4;
    const board = api.el("div", "grid-board");
    board.style.gridTemplateColumns = "repeat(" + N + ",1fr)";
    board.addEventListener("contextmenu", (e) => e.preventDefault());
    const cells = [];
    for (let i = 0; i < N * N; i++) {
      const b = api.el("button", "cell");
      b.style.width = b.style.height = size + "px";
      b.style.fontSize = size * 0.5 + "px";
      b.style.background = "var(--mint-300)";
      const idx = i;
      b.addEventListener("click", () => { if (flagMode) flag(idx); else reveal(idx); });
      b.addEventListener("contextmenu", (e) => { e.preventDefault(); flag(idx); });
      board.appendChild(b); cells.push(b);
    }
    api.board.appendChild(board);

    // in-game controls: a flag-mode toggle (handy on touch) and a fresh-board button
    const tools = api.el("div", "");
    tools.style.cssText = "display:flex;gap:8px;justify-content:center;margin-top:10px";
    const flagBtn = api.el("button", "btn ghost", "🚩 Flag: Off");
    flagBtn.addEventListener("click", () => {
      flagMode = !flagMode;
      flagBtn.className = "btn " + (flagMode ? "primary" : "ghost");
      flagBtn.textContent = "🚩 Flag: " + (flagMode ? "On" : "Off");
    });
    const newBtn = api.el("button", "btn ghost", "🔄 New field");
    newBtn.addEventListener("click", () => { flagMode = false; flagBtn.className = "btn ghost"; flagBtn.textContent = "🚩 Flag: Off"; init(); });
    tools.appendChild(flagBtn); tools.appendChild(newBtn);
    api.board.appendChild(tools);

    function init() {
      grid = Array(N * N).fill(0);
      revealed = Array(N * N).fill(false);
      flagged = Array(N * N).fill(false);
      over = win = started = false; flags = 0;
      cells.forEach((c) => { c.textContent = ""; c.style.background = "var(--mint-300)"; c.disabled = false; });
      score();
      api.setStatus("Left-click to reveal · right-click to flag 🚩");
    }
    function score() {
      api.setScores([
        { name: "Mines", value: MINES, color: "#e74c3c" },
        { name: "Flags", value: flags, color: "#e67e22" },
      ]);
    }
    function neighbors(i) {
      const r = (i / N) | 0, c = i % N, out = [];
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < N && nc >= 0 && nc < N) out.push(nr * N + nc);
      }
      return out;
    }
    function plant(safe) {
      let placed = 0;
      while (placed < MINES) {
        const p = (Math.random() * N * N) | 0;
        if (p === safe || grid[p] === -1 || neighbors(safe).includes(p)) continue;
        grid[p] = -1; placed++;
      }
      for (let i = 0; i < N * N; i++) if (grid[i] !== -1) grid[i] = neighbors(i).filter((n) => grid[n] === -1).length;
      started = true;
    }
    function flag(i) {
      if (over || revealed[i]) return;
      flagged[i] = !flagged[i];
      flags += flagged[i] ? 1 : -1;
      cells[i].textContent = flagged[i] ? "🚩" : "";
      score();
    }
    function reveal(i) {
      if (over || flagged[i] || revealed[i]) return;
      if (!started) plant(i);
      if (grid[i] === -1) return boom(i);
      flood(i);
      checkWin();
    }
    function flood(i) {
      const stack = [i];
      while (stack.length) {
        const cur = stack.pop();
        if (revealed[cur] || flagged[cur]) continue;
        revealed[cur] = true;
        const c = cells[cur];
        c.style.background = "#f1fbf5"; c.disabled = true;
        if (grid[cur] > 0) {
          const palette = ["", "#2e9d6c", "#2980b9", "#e67e22", "#8e44ad", "#c0392b", "#16a085", "#34495e", "#7f8c8d"];
          c.textContent = grid[cur]; c.style.color = palette[grid[cur]]; c.style.fontWeight = "800";
        } else {
          c.textContent = "";
          neighbors(cur).forEach((n) => { if (!revealed[n]) stack.push(n); });
        }
      }
    }
    function boom(i) {
      over = true;
      for (let k = 0; k < N * N; k++) if (grid[k] === -1) { cells[k].textContent = "💣"; cells[k].style.background = "#f3a79f"; }
      cells[i].style.background = "#e74c3c";
      api.setStatus("💥 Boom! You hit a mine. Hit Restart to try again.");
    }
    function checkWin() {
      const safe = N * N - MINES;
      if (revealed.filter(Boolean).length === safe) {
        over = win = true;
        if (api.recordWin) api.recordWin(api.config.username);
        api.setStatus("🎉 Cleared! You swept the field, " + api.config.username + "! 🏆 (win recorded)");
      }
    }

    init();
    return { stop() {} };
  },
});
