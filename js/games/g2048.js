/* 2048 — single player */
Arcade.register({
  id: "g2048",
  name: "2048",
  emoji: "🔢",
  tagline: "Slide and merge tiles. Can you reach 2048?",
  tags: ["Puzzle", "Solo"],
  minPlayers: 1,
  maxPlayers: 1,
  rules: [
    "Use Arrow keys / WASD to slide all tiles in one direction.",
    "Two tiles with the same number merge into their sum.",
    "A new tile (2 or 4) appears after every move.",
    "Reach the target tile to win — or fill the board to lose.",
  ],
  options: [
    {
      key: "goal", label: "Target tile", type: "select", default: 2048,
      choices: [{ label: "256 (quick)", value: 256 }, { label: "1024", value: 1024 }, { label: "2048", value: 2048 }],
    },
  ],

  create(api) {
    const N = 4, goal = api.config.options.goal;
    const COLORS = {
      0: "#e3f7ec", 2: "#d7f0e2", 4: "#bfe8cf", 8: "#9fe0bf", 16: "#6fcda0", 32: "#43b884",
      64: "#2e9d6c", 128: "#f6d365", 256: "#f5b942", 512: "#f59e2b", 1024: "#ef8e1a", 2048: "#e67e22",
    };
    let grid, score = 0, best = 0, over = false, won = false;

    const cell = Math.floor(Math.min(400, window.innerWidth - 60) / N) - 10;
    const board = api.el("div", "grid-board");
    board.style.gridTemplateColumns = "repeat(" + N + ",1fr)";
    const tiles = [];
    for (let i = 0; i < N * N; i++) {
      const t = api.el("div", "cell");
      t.style.width = t.style.height = cell + "px";
      t.style.cursor = "default";
      tiles.push(t); board.appendChild(t);
    }
    api.board.appendChild(board);

    function reset() {
      grid = Array.from({ length: N }, () => Array(N).fill(0));
      score = 0; over = false; won = false;
      addTile(); addTile(); draw();
      api.setStatus("Slide with Arrow keys or WASD 🎮");
    }
    function addTile() {
      const empty = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!grid[r][c]) empty.push([r, c]);
      if (!empty.length) return;
      const [r, c] = empty[(Math.random() * empty.length) | 0];
      grid[r][c] = Math.random() < 0.9 ? 2 : 4;
    }
    function draw() {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const v = grid[r][c], t = tiles[r * N + c];
        t.textContent = v || "";
        t.style.background = COLORS[v] || "#e67e22";
        t.style.color = v >= 8 ? "#fff" : "var(--ink)";
        t.style.fontSize = (v >= 1000 ? cell * 0.34 : cell * 0.42) + "px";
      }
      best = Math.max(best, score);
      api.setScores([{ name: api.config.username, value: score, color: "#2e9d6c" }, { name: "Best", value: best, color: "#e67e22" }]);
    }
    function slide(row) {
      let arr = row.filter((x) => x);
      for (let i = 0; i < arr.length - 1; i++) {
        if (arr[i] === arr[i + 1]) { arr[i] *= 2; score += arr[i]; if (arr[i] >= goal) won = true; arr.splice(i + 1, 1); }
      }
      while (arr.length < N) arr.push(0);
      return arr;
    }
    function move(dir) {
      if (over) return;
      const before = JSON.stringify(grid);
      let g = grid;
      const rot = (m) => m[0].map((_, c) => m.map((row) => row[c]));
      if (dir === "up") { g = rot(g).map(slide); g = rot(g); }
      else if (dir === "down") { g = rot(g).map((r) => slide(r.reverse()).reverse()); g = rot(g); }
      else if (dir === "left") { g = g.map(slide); }
      else { g = g.map((r) => slide(r.reverse()).reverse()); }
      grid = g;
      if (JSON.stringify(grid) !== before) { addTile(); draw(); }
      if (won) { over = true; api.setStatus("🎉 You reached " + goal + "! Keep going via Restart."); return; }
      if (!canMove()) { over = true; api.setStatus("💥 No moves left — final score <b>" + score + "</b>. Restart to retry."); }
    }
    function canMove() {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        if (!grid[r][c]) return true;
        if (c < N - 1 && grid[r][c] === grid[r][c + 1]) return true;
        if (r < N - 1 && grid[r][c] === grid[r + 1][c]) return true;
      }
      return false;
    }
    const keys = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right" };
    function onKey(e) {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (keys[k]) { e.preventDefault(); move(keys[k]); }
    }
    window.addEventListener("keydown", onKey);

    reset();
    return { stop() { window.removeEventListener("keydown", onKey); } };
  },
});
