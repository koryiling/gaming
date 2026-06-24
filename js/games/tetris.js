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
    "← / → move · ↑ or the 🔄 Rotate button to turn the block · ↓ soft drop · Space hard drop.",
    "The bordered “Next” box previews the block coming up.",
    "Fill an entire row to clear it and score points.",
    "Clearing several rows at once scores much more.",
    "The blocks speed up as you level up. Don't reach the top!",
    "⏸️ Pause (or press P) to stop. A paused game is saved for your username — even after a refresh you can come back and continue.",
  ],
  options: [
    { key: "level", label: "Start level", type: "select", default: 1,
      choices: [{ label: "1 (easy)", value: 1 }, { label: "4", value: 4 }, { label: "7 (fast)", value: 7 }] },
  ],

  create(api) {
    const COLS = 10, ROWS = 20;
    const CELL = Math.floor(Math.min(300, window.innerWidth - 80) / COLS);

    // layout: playfield on the left, side panel (Next preview + Rotate button) on the right
    const wrap = api.el("div", "");
    wrap.style.cssText = "display:flex;gap:16px;align-items:flex-start;justify-content:center";
    const canvas = document.createElement("canvas");
    canvas.width = COLS * CELL; canvas.height = ROWS * CELL;
    canvas.tabIndex = 0;
    wrap.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    const side = api.el("div", "");
    side.style.cssText = "display:flex;flex-direction:column;gap:12px;align-items:center";
    const nextLabel = api.el("div", "", "Next");
    nextLabel.style.cssText = "font-weight:800;color:var(--ink);font-size:15px";
    const PCELL = Math.max(14, Math.floor(CELL * 0.7));
    const preview = document.createElement("canvas");
    preview.width = preview.height = 4 * PCELL;
    preview.style.cssText = "background:#fff;border:2px solid var(--mint-300);border-radius:12px;box-shadow:var(--shadow)";
    const pctx = preview.getContext("2d");
    const rotateBtn = api.el("button", "btn primary", "🔄 Rotate");
    rotateBtn.style.width = "100%";
    const pauseBtn = api.el("button", "btn", "⏸️ Pause");
    pauseBtn.style.width = "100%";
    side.appendChild(nextLabel);
    side.appendChild(preview);
    side.appendChild(rotateBtn);
    side.appendChild(pauseBtn);
    wrap.appendChild(side);
    api.board.appendChild(wrap);

    const COLORS = { I: "#16a085", O: "#f6c343", T: "#9b59b6", S: "#43b884", Z: "#e74c3c", J: "#3498db", L: "#e67e22" };
    const SHAPES = {
      I: [[0,1],[1,1],[2,1],[3,1]], O: [[1,0],[2,0],[1,1],[2,1]],
      T: [[1,0],[0,1],[1,1],[2,1]], S: [[1,0],[2,0],[0,1],[1,1]],
      Z: [[0,0],[1,0],[1,1],[2,1]], J: [[0,0],[0,1],[1,1],[2,1]], L: [[2,0],[0,1],[1,1],[2,1]],
    };
    const SPAN = { I: 4, O: 4, T: 3, S: 3, Z: 3, J: 3, L: 3 };

    let grid, piece, next, score, lines, level, over, paused, dropT = null;
    const startLevel = api.config.options.level;
    // A paused game is persisted per-username, so each player keeps their own progress:
    // whoever paused can resume on next visit; everyone else starts a normal fresh game.
    const SAVE_KEY = "mint_tetris_save:" + (api.config.username || "guest");

    function saveState() {
      if (over || !paused) return; // only a *paused* game is persisted
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({ grid, piece, next, score, lines, level }));
      } catch (e) {}
    }
    function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }
    function loadState() {
      let s;
      try { s = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return false; }
      if (!s || !Array.isArray(s.grid) || s.grid.length !== ROWS || !s.piece || !SHAPES[s.next]) return false;
      grid = s.grid; piece = s.piece; next = s.next;
      score = s.score; lines = s.lines; level = s.level;
      over = false; paused = true; // restore paused so the player resumes deliberately
      pauseBtn.textContent = "▶️ Resume";
      drawNext(); updateScore();
      api.setStatus("▶️ Saved game restored — press Resume (or P) to continue.");
      return true;
    }

    function reset() {
      clearSave();
      grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
      score = 0; lines = 0; level = startLevel; over = false; paused = false;
      pauseBtn.textContent = "⏸️ Pause";
      next = bag();
      spawn(); updateScore(); setSpeed();
      api.setStatus("← → move · ↑ / 🔄 rotate · ↓ soft · Space hard-drop · P pause");
    }
    function bag() { const k = "IOTSZJL"; return k[(Math.random() * 7) | 0]; }
    function spawn() {
      const t = next;
      next = bag();
      piece = { type: t, cells: SHAPES[t].map((c) => c.slice()), x: 3, y: 0 };
      drawNext();
      if (collide(piece.cells, piece.x, piece.y)) gameOver();
    }
    function drawNext() {
      pctx.fillStyle = "#fff"; pctx.fillRect(0, 0, preview.width, preview.height);
      const cells = SHAPES[next];
      const xs = cells.map((c) => c[0]), ys = cells.map((c) => c[1]);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const minY = Math.min(...ys), maxY = Math.max(...ys);
      const ox = (4 - (maxX - minX + 1)) / 2 - minX;
      const oy = (4 - (maxY - minY + 1)) / 2 - minY;
      cells.forEach(([x, y]) => {
        pctx.fillStyle = COLORS[next];
        pctx.fillRect((x + ox) * PCELL + 1, (y + oy) * PCELL + 1, PCELL - 2, PCELL - 2);
        pctx.fillStyle = "rgba(255,255,255,.25)";
        pctx.fillRect((x + ox) * PCELL + 1, (y + oy) * PCELL + 1, PCELL - 2, 4);
      });
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
      dropT = setInterval(() => { if (!over && !paused) { softDrop(); draw(); } }, ms);
    }
    function togglePause() {
      if (over) return;
      paused = !paused;
      if (paused) {
        if (dropT) { clearInterval(dropT); dropT = null; }
        pauseBtn.textContent = "▶️ Resume";
        saveState(); // snapshot now so a refresh can resume this player's game
        api.setStatus("⏸️ Paused — press Resume (or P) to continue. Your progress is saved if you leave.");
      } else {
        pauseBtn.textContent = "⏸️ Pause";
        clearSave(); // a live game isn't resumable; only paused games persist
        setSpeed();
        api.setStatus("← → move · ↑ / 🔄 rotate · ↓ soft · Space hard-drop · P pause");
        canvas.focus();
      }
      draw();
    }
    function gameOver() {
      over = true; if (dropT) clearInterval(dropT);
      clearSave();
      api.setStatus("💥 Game over — score <b>" + score + "</b>, " + lines + " lines. Hit Restart to retry.");
    }
    function draw() {
      ctx.fillStyle = "#f1fbf5"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        if (grid[r][c]) block(c, r, grid[r][c]);
        else { ctx.strokeStyle = "#e3f7ec"; ctx.strokeRect(c * CELL, r * CELL, CELL, CELL); }
      }
      if (!over) piece.cells.forEach(([x, y]) => { if (y + piece.y >= 0) block(x + piece.x, y + piece.y, COLORS[piece.type]); });
      if (paused) {
        ctx.fillStyle = "rgba(20,40,30,.55)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#fff";
        ctx.font = "800 " + Math.floor(CELL * 1.2) + "px system-ui, sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("⏸ PAUSED", canvas.width / 2, canvas.height / 2);
      }
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
      if (k === "p" || k === "P") { togglePause(); e.preventDefault(); return; }
      if (paused) return;
      if (k === "ArrowLeft") { move(-1); draw(); }
      else if (k === "ArrowRight") { move(1); draw(); }
      else if (k === "ArrowDown") { softDrop(); draw(); }
      else if (k === "ArrowUp") { rotate(); draw(); }
      else if (k === " ") { hardDrop(); }
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    rotateBtn.addEventListener("click", () => {
      if (over) { reset(); draw(); canvas.focus(); return; }
      if (paused) return;
      rotate(); draw(); canvas.focus();
    });
    pauseBtn.addEventListener("click", () => { togglePause(); });

    // touch controls — move / soft-drop / hard-drop buttons (rotate is the side button)
    if (window.Touch && Touch.enabled) {
      const bar = Touch.bar();
      const bL = Touch.button("◀"), bR = Touch.button("▶"), bD = Touch.button("▼"), bDrop = Touch.button("⤓");
      Touch.press(bL, () => { if (!over && !paused) { move(-1); draw(); } }, { repeat: true, interval: 120 });
      Touch.press(bR, () => { if (!over && !paused) { move(1); draw(); } }, { repeat: true, interval: 120 });
      Touch.press(bD, () => { if (!over && !paused) { softDrop(); draw(); } }, { repeat: true, interval: 70 });
      Touch.press(bDrop, () => { if (!over && !paused) hardDrop(); });
      [bL, bR, bD, bDrop].forEach((b) => bar.appendChild(b));
      // stack the play area and the control bar vertically (the board itself is a flex row)
      const col = api.el("div", "");
      col.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:6px";
      api.board.appendChild(col);
      col.appendChild(wrap);
      col.appendChild(bar);
    }

    if (!loadState()) reset();
    draw(); canvas.focus();
    return { stop() { if (dropT) clearInterval(dropT); window.removeEventListener("keydown", onKey); } };
  },
});
