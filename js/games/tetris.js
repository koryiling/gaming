/* Tetris — single player, canvas */
Arcade.register({
  id: "tetris",
  name: "Tetris",
  emoji: "🧱",
  tagline: "Stack falling blocks, clear full lines, survive as long as you can.",
  tags: ["Puzzle", "Arcade", "Solo"],
  minPlayers: 1,
  maxPlayers: 1,
  rules: [
    "← / → move · ↑ rotate · ↓ soft drop · Space hard drop.",
    "Fill an entire row to clear it and score points.",
    "Clearing several rows at once scores much more.",
    "The blocks speed up as you level up. Don't reach the top!",
  ],
  options: [
    { key: "level", label: "Start level", type: "select", default: 1,
      choices: [{ label: "1 (easy)", value: 1 }, { label: "4", value: 4 }, { label: "7 (fast)", value: 7 }] },
  ],

  create(api) {
    const COLS = 10, ROWS = 20;
    const CELL = Math.floor(Math.min(300, window.innerWidth - 80) / COLS);
    const canvas = document.createElement("canvas");
    canvas.width = COLS * CELL; canvas.height = ROWS * CELL;
    canvas.tabIndex = 0;
    api.board.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    const COLORS = { I: "#16a085", O: "#f6c343", T: "#9b59b6", S: "#43b884", Z: "#e74c3c", J: "#3498db", L: "#e67e22" };
    const SHAPES = {
      I: [[0,1],[1,1],[2,1],[3,1]], O: [[1,0],[2,0],[1,1],[2,1]],
      T: [[1,0],[0,1],[1,1],[2,1]], S: [[1,0],[2,0],[0,1],[1,1]],
      Z: [[0,0],[1,0],[1,1],[2,1]], J: [[0,0],[0,1],[1,1],[2,1]], L: [[2,0],[0,1],[1,1],[2,1]],
    };
    const SPAN = { I: 4, O: 4, T: 3, S: 3, Z: 3, J: 3, L: 3 };

    let grid, piece, score, lines, level, over, dropT = null;
    const startLevel = api.config.options.level;

    function reset() {
      grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
      score = 0; lines = 0; level = startLevel; over = false;
      spawn(); updateScore(); setSpeed();
      api.setStatus("← → move · ↑ rotate · ↓ soft · Space hard-drop");
    }
    function bag() { const k = "IOTSZJL"; return k[(Math.random() * 7) | 0]; }
    function spawn() {
      const t = bag();
      piece = { type: t, cells: SHAPES[t].map((c) => c.slice()), x: 3, y: 0 };
      if (collide(piece.cells, piece.x, piece.y)) gameOver();
    }
    function collide(cells, ox, oy) {
      return cells.some(([x, y]) => {
        const nx = x + ox, ny = y + oy;
        return nx < 0 || nx >= COLS || ny >= ROWS || (ny >= 0 && grid[ny][nx]);
      });
    }
    function rotate() {
      const s = SPAN[piece.type];
      const rot = piece.cells.map(([x, y]) => [s - 1 - y, x]);
      for (const kick of [0, -1, 1, -2, 2]) {
        if (!collide(rot, piece.x + kick, piece.y)) { piece.cells = rot; piece.x += kick; return; }
      }
    }
    function move(dx) { if (!collide(piece.cells, piece.x + dx, piece.y)) piece.x += dx; }
    function softDrop() {
      if (!collide(piece.cells, piece.x, piece.y + 1)) { piece.y++; return true; }
      lock(); return false;
    }
    function hardDrop() { while (!collide(piece.cells, piece.x, piece.y + 1)) piece.y++; lock(); }
    function lock() {
      piece.cells.forEach(([x, y]) => { const ny = y + piece.y; if (ny >= 0) grid[ny][x + piece.x] = COLORS[piece.type]; });
      clearLines(); spawn(); draw();
    }
    function clearLines() {
      let cleared = 0;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (grid[r].every((c) => c)) { grid.splice(r, 1); grid.unshift(Array(COLS).fill(null)); cleared++; r++; }
      }
      if (cleared) {
        score += [0, 100, 300, 500, 800][cleared] * level;
        lines += cleared;
        const newLevel = startLevel + Math.floor(lines / 10);
        if (newLevel !== level) { level = newLevel; setSpeed(); }
        updateScore();
      }
    }
    function updateScore() {
      api.setScores([
        { name: api.config.username, value: score, color: "#2e9d6c" },
        { name: "Lines", value: lines, color: "#3498db" },
        { name: "Level", value: level, color: "#e67e22" },
      ]);
    }
    function setSpeed() {
      if (dropT) clearInterval(dropT);
      const ms = Math.max(90, 700 - (level - 1) * 70);
      dropT = setInterval(() => { if (!over) { softDrop(); draw(); } }, ms);
    }
    function gameOver() {
      over = true; if (dropT) clearInterval(dropT);
      api.setStatus("💥 Game over — score <b>" + score + "</b>, " + lines + " lines. Hit Restart to retry.");
    }
    function draw() {
      ctx.fillStyle = "#f1fbf5"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        if (grid[r][c]) block(c, r, grid[r][c]);
        else { ctx.strokeStyle = "#e3f7ec"; ctx.strokeRect(c * CELL, r * CELL, CELL, CELL); }
      }
      if (!over) piece.cells.forEach(([x, y]) => { if (y + piece.y >= 0) block(x + piece.x, y + piece.y, COLORS[piece.type]); });
    }
    function block(c, r, color) {
      ctx.fillStyle = color;
      ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
      ctx.fillStyle = "rgba(255,255,255,.25)";
      ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, 4);
    }
    function onKey(e) {
      const k = e.key;
      if (over && k === " ") { reset(); draw(); return; }
      if (over) return;
      if (k === "ArrowLeft") { move(-1); draw(); }
      else if (k === "ArrowRight") { move(1); draw(); }
      else if (k === "ArrowDown") { softDrop(); draw(); }
      else if (k === "ArrowUp") { rotate(); draw(); }
      else if (k === " ") { hardDrop(); }
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);

    reset(); draw(); canvas.focus();
    return { stop() { if (dropT) clearInterval(dropT); window.removeEventListener("keydown", onKey); } };
  },
});
