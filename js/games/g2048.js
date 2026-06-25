/* 2048 — single player */
Arcade.register({
  id: "g2048",
  name: "2048",
  emoji: "🔢",
  tagline: "Slide and merge tiles. Can you reach 2048?",
  tags: ["Puzzle", "Solo"],
  minPlayers: 1,
  maxPlayers: 1,
  leaderboard: { type: "score" }, // keep each player's highest score, ranked highest → lowest
  rules: [
    "Use Arrow keys / WASD to slide all tiles in one direction.",
    "Two tiles with the same number merge into their sum.",
    "A new tile appears after every move — it gets bigger as your board grows.",
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
    // Yellow/gold family — every number gets its own shade, light cream up to deep amber.
    const COLORS = {
      0: "#fdf6cf", 2: "#fef3bf", 4: "#fde98a", 8: "#fcdf5c", 16: "#fad431", 32: "#f6c90e",
      64: "#f0b800", 128: "#e8a600", 256: "#dd9400", 512: "#d08200", 1024: "#c06f00", 2048: "#b25e00",
    };
    let grid, score = 0, best = api.loadBest(), over = false, won = false;

    const cell = Math.floor(Math.min(400, window.innerWidth - 60) / N) - 10;
    const board = api.el("div", "grid-board");
    board.style.gridTemplateColumns = "repeat(" + N + ",1fr)";
    board.style.background = "#f6df8d"; // warm gold frame to match the yellow tiles
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
      api.setStatus("Swipe, or slide with Arrow keys / WASD 🎮");
    }
    function spawnValue() {
      // scale spawned tiles with the board's biggest tile, so you don't grind from 2 forever
      let maxTile = 2;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (grid[r][c] > maxTile) maxTile = grid[r][c];
      let cap = 4;
      while ((cap * 2) * 32 <= maxTile) cap *= 2;       // cap ≈ maxTile / 32, minimum 4
      const lo = Math.max(2, cap / 4);
      const cands = [];
      for (let v = lo; v <= cap; v *= 2) cands.push(v);  // e.g. max 256 → [2,4,8], max 1024 → [8,16,32]
      const r = Math.random();                            // weight toward the smaller options
      if (cands.length >= 3) return r < 0.55 ? cands[0] : r < 0.85 ? cands[1] : cands[2];
      if (cands.length === 2) return r < 0.7 ? cands[0] : cands[1];
      return cands[0];
    }
    function addTile() {
      const empty = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!grid[r][c]) empty.push([r, c]);
      if (!empty.length) return;
      const [r, c] = empty[(Math.random() * empty.length) | 0];
      grid[r][c] = spawnValue();
    }
    function draw() {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const v = grid[r][c], t = tiles[r * N + c];
        t.textContent = v || "";
        t.style.background = COLORS[v] || "#b25e00";
        t.style.color = v >= 128 ? "#fff" : "#6b4f00";
        t.style.fontSize = (v >= 1000 ? cell * 0.34 : cell * 0.42) + "px";
      }
      if (score > best) { best = score; api.saveBest(best); }
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
      if (won) { over = true; if (api.celebrate) api.celebrate("🎉 You reached " + goal + "!"); api.setStatus("🎉 You reached " + goal + "! Keep going via Restart."); return; }
      if (!canMove()) {
        over = true;
        if (api.submitScore) api.submitScore(score); // bank the final score to the leaderboard
        api.setStatus("💥 No moves left — final score <b>" + score + "</b> saved to the leaderboard 🏆. Restart to retry.");
      }
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

    // touch: swipe in any direction to slide
    if (window.Touch) Touch.swipe(board, { onSwipe: move });

    reset();
    return { stop() { window.removeEventListener("keydown", onKey); } };
  },
});
