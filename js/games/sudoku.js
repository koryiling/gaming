/* Sudoku — single player number puzzle (unique-solution generator) */
Arcade.register({
  id: "sudoku",
  name: "Sudoku",
  emoji: "🔢",
  tagline: "Fill the 9×9 grid so every row, column and box holds 1–9 exactly once.",
  tags: ["Number", "Puzzle", "Solo"],
  minPlayers: 1,
  maxPlayers: 1,
  rules: [
    "Tap an empty cell, then tap a number (or press 1–9) to place it.",
    "Each row, column, and 3×3 box must contain 1–9 with no repeats.",
    "Clashing numbers flash red — fix them as you go.",
    "Fill the whole grid correctly to win!",
  ],
  options: [
    { key: "diff", label: "Difficulty", type: "select", default: "easy",
      choices: [{ label: "Easy", value: "easy" }, { label: "Medium", value: "med" }, { label: "Hard", value: "hard" }] },
  ],

  create(api) {
    const KEEP = { easy: 42, med: 34, hard: 27 }[api.config.options.diff];

    // ---- generation ----
    function emptyG() { return Array.from({ length: 9 }, () => Array(9).fill(0)); }
    function canPlace(g, r, c, n) {
      for (let i = 0; i < 9; i++) if (g[r][i] === n || g[i][c] === n) return false;
      const br = r - (r % 3), bc = c - (c % 3);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (g[br + i][bc + j] === n) return false;
      return true;
    }
    function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
    function fill(g) {
      for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (!g[r][c]) {
        for (const n of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) if (canPlace(g, r, c, n)) {
          g[r][c] = n; if (fill(g)) return true; g[r][c] = 0;
        }
        return false;
      }
      return true;
    }
    function countSolutions(g, cap) {
      for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (!g[r][c]) {
        let total = 0;
        for (let n = 1; n <= 9; n++) if (canPlace(g, r, c, n)) {
          g[r][c] = n; total += countSolutions(g, cap - total); g[r][c] = 0;
          if (total >= cap) return total;
        }
        return total;
      }
      return 1;
    }
    const solution = emptyG(); fill(solution);
    const puzzle = solution.map((row) => row.slice());
    const cells = shuffle([...Array(81).keys()]);
    let filledCount = 81;
    for (const idx of cells) {
      if (filledCount <= KEEP) break;
      const r = (idx / 9) | 0, c = idx % 9, bak = puzzle[r][c];
      puzzle[r][c] = 0;
      const test = puzzle.map((row) => row.slice());
      if (countSolutions(test, 2) !== 1) puzzle[r][c] = bak; else filledCount--;
    }

    // ---- UI ----
    const grid = puzzle.map((row) => row.slice());
    const fixed = puzzle.map((row) => row.map((v) => v !== 0));
    let sel = null, over = false;

    const size = Math.min(46, Math.floor((Math.min(440, window.innerWidth - 40)) / 9));
    const wrap = api.el("div", "");
    wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:14px";
    const boardEl = api.el("div", "");
    boardEl.style.cssText = "display:grid;grid-template-columns:repeat(9," + size + "px);background:#173a2b;gap:1px;padding:3px;border-radius:10px";
    const cellEls = [];
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      const b = api.el("button", "");
      b.style.cssText = "width:" + size + "px;height:" + size + "px;border:none;font-size:" + (size * 0.5) + "px;font-weight:700;cursor:pointer;" +
        "background:#fcfff9;color:var(--ink);" +
        "margin-right:" + (c % 3 === 2 && c < 8 ? "2px" : "0") + ";margin-bottom:" + (r % 3 === 2 && r < 8 ? "2px" : "0");
      b.addEventListener("click", () => selectCell(r, c));
      boardEl.appendChild(b); cellEls.push(b);
    }
    wrap.appendChild(boardEl);

    const pad = api.el("div", "");
    pad.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;justify-content:center";
    for (let n = 1; n <= 9; n++) { const b = api.el("button", "btn ghost", String(n)); b.style.cssText += ";min-width:42px"; b.addEventListener("click", () => place(n)); pad.appendChild(b); }
    const er = api.el("button", "btn ghost", "⌫"); er.addEventListener("click", () => place(0)); pad.appendChild(er);
    wrap.appendChild(pad);
    api.board.appendChild(wrap);

    function at(r, c) { return cellEls[r * 9 + c]; }
    function conflictsAt(r, c) {
      const v = grid[r][c]; if (!v) return false;
      for (let i = 0; i < 9; i++) { if (i !== c && grid[r][i] === v) return true; if (i !== r && grid[i][c] === v) return true; }
      const br = r - r % 3, bc = c - c % 3;
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { const rr = br + i, cc = bc + j; if ((rr !== r || cc !== c) && grid[rr][cc] === v) return true; }
      return false;
    }
    function render() {
      for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
        const b = at(r, c), v = grid[r][c];
        b.textContent = v || "";
        const isSel = sel && sel[0] === r && sel[1] === c;
        const conflict = conflictsAt(r, c);
        b.style.color = fixed[r][c] ? "#173a2b" : "#2980b9";
        b.style.fontWeight = fixed[r][c] ? "800" : "600";
        b.style.background = conflict ? "#f3a79f" : isSel ? "#cdeede" : (sel && (sel[0] === r || sel[1] === c)) ? "#eafaf0" : "#fcfff9";
      }
    }
    function selectCell(r, c) { if (over || fixed[r][c]) { sel = fixed[r][c] ? null : sel; if (fixed[r][c]) { sel = null; render(); return; } } sel = [r, c]; render(); }
    function place(n) {
      if (over || !sel) return;
      const [r, c] = sel; if (fixed[r][c]) return;
      grid[r][c] = n; render(); checkWin();
    }
    function checkWin() {
      for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) { if (!grid[r][c] || conflictsAt(r, c)) return scoreboard(); }
      over = true; api.setStatus("🎉 Solved! Beautiful logic, " + api.config.username + "! Restart for a new puzzle.");
      scoreboard();
    }
    function scoreboard() {
      let filled = 0; grid.forEach((row) => row.forEach((v) => v && filled++));
      api.setScores([{ name: "Filled", value: filled + "/81", color: "#2e9d6c" }, { name: "Difficulty", value: api.config.options.diff, color: "#e67e22" }]);
    }
    function onKey(e) {
      if (over) return;
      if (/^[1-9]$/.test(e.key)) place(+e.key);
      else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") place(0);
      else if (sel && e.key.startsWith("Arrow")) {
        let [r, c] = sel;
        if (e.key === "ArrowUp") r = (r + 8) % 9; if (e.key === "ArrowDown") r = (r + 1) % 9;
        if (e.key === "ArrowLeft") c = (c + 8) % 9; if (e.key === "ArrowRight") c = (c + 1) % 9;
        sel = [r, c]; render();
      } else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);

    render(); scoreboard();
    api.setStatus("Tap a cell, then a number (or use your keyboard) 🔢");
    return { stop() { window.removeEventListener("keydown", onKey); } };
  },
});
