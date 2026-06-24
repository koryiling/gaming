/* Sudoku — single player number puzzle (unique-solution generator)
 * Features: tap-to-select with row/column/box + same-number highlighting,
 * 💡 Hint (reveals one correct cell), ✏️ pencil-notes mode, strict rule checking,
 * and a layout that scales to fit any screen. */
Arcade.register({
  id: "sudoku",
  name: "Sudoku",
  emoji: "🔢",
  tagline: "Fill the 9×9 grid so every row, column and box holds 1–9 exactly once.",
  tags: ["Number", "Puzzle", "Solo"],
  minPlayers: 1,
  maxPlayers: 1,
  rules: [
    "Tap a cell, then tap a number (or press 1–9) to place it.",
    "Selecting a cell highlights its row, column, box and every matching number.",
    "Each row, column, and 3×3 box must contain 1–9 with no repeats — clashes flash red.",
    "✏️ Notes lets you pencil in candidates; 💡 Hint reveals one correct cell.",
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
    const order = shuffle([...Array(81).keys()]);
    let filledCount = 81;
    for (const idx of order) {
      if (filledCount <= KEEP) break;
      const r = (idx / 9) | 0, c = idx % 9, bak = puzzle[r][c];
      puzzle[r][c] = 0;
      const test = puzzle.map((row) => row.slice());
      if (countSolutions(test, 2) !== 1) puzzle[r][c] = bak; else filledCount--;
    }

    // ---- state ----
    const grid = puzzle.map((row) => row.slice());
    const fixed = puzzle.map((row) => row.map((v) => v !== 0));
    const notes = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
    const hinted = Array.from({ length: 9 }, () => Array(9).fill(false));
    let sel = null, over = false, noteMode = false, hints = 0;

    // ---- layout ----
    // size the grid so the whole board + number pad fit small screens too
    const size = Math.max(30, Math.min(46, Math.floor((Math.min(460, window.innerWidth - 26)) / 9)));
    const wrap = api.el("div", "");
    wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:12px;max-width:100%";

    const boardEl = api.el("div", "");
    boardEl.style.cssText = "display:grid;grid-template-columns:repeat(9," + size + "px);background:#173a2b;gap:1px;padding:3px;border-radius:10px";
    const cellEls = [];
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      const b = api.el("button", "");
      b.style.cssText = "width:" + size + "px;height:" + size + "px;border:none;padding:0;font-size:" + (size * 0.52) + "px;font-weight:700;cursor:pointer;" +
        "display:grid;place-items:center;line-height:1;background:#fcfff9;color:var(--ink);transition:background .08s;" +
        "margin-right:" + (c % 3 === 2 && c < 8 ? "2px" : "0") + ";margin-bottom:" + (r % 3 === 2 && r < 8 ? "2px" : "0");
      b.addEventListener("click", () => selectCell(r, c));
      boardEl.appendChild(b); cellEls.push(b);
    }
    wrap.appendChild(boardEl);

    // number pad + tools
    const pad = api.el("div", "");
    pad.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;justify-content:center;max-width:" + (size * 9 + 30) + "px";
    const numBtns = [];
    for (let n = 1; n <= 9; n++) {
      const b = api.el("button", "btn ghost", String(n));
      b.style.cssText += ";min-width:40px;height:44px;font-size:19px;font-weight:800";
      b.addEventListener("click", () => place(n));
      pad.appendChild(b); numBtns.push(b);
    }
    const er = api.el("button", "btn ghost", "⌫"); er.style.cssText += ";min-width:40px;height:44px";
    er.addEventListener("click", () => place(0)); pad.appendChild(er);
    wrap.appendChild(pad);

    const tools = api.el("div", "");
    tools.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;justify-content:center";
    const noteBtn = api.el("button", "btn ghost", "✏️ Notes: Off");
    noteBtn.addEventListener("click", () => { noteMode = !noteMode; noteBtn.className = "btn " + (noteMode ? "primary" : "ghost"); noteBtn.textContent = "✏️ Notes: " + (noteMode ? "On" : "Off"); });
    const hintBtn = api.el("button", "btn ghost", "💡 Hint");
    hintBtn.addEventListener("click", giveHint);
    tools.appendChild(noteBtn); tools.appendChild(hintBtn);
    wrap.appendChild(tools);

    api.board.appendChild(wrap);

    // ---- helpers ----
    function at(r, c) { return cellEls[r * 9 + c]; }
    function sameBox(r1, c1, r2, c2) { return ((r1 / 3) | 0) === ((r2 / 3) | 0) && ((c1 / 3) | 0) === ((c2 / 3) | 0); }
    function conflictsAt(r, c) {
      const v = grid[r][c]; if (!v) return false;
      for (let i = 0; i < 9; i++) { if (i !== c && grid[r][i] === v) return true; if (i !== r && grid[i][c] === v) return true; }
      const br = r - r % 3, bc = c - c % 3;
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { const rr = br + i, cc = bc + j; if ((rr !== r || cc !== c) && grid[rr][cc] === v) return true; }
      return false;
    }

    function notesHtml(set) {
      const s = Math.max(8, Math.floor(size * 0.26));
      let html = "<div style='display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);width:100%;height:100%;font-size:" + s + "px;font-weight:600;color:var(--ink-soft);line-height:1'>";
      for (let n = 1; n <= 9; n++) html += "<span style='display:grid;place-items:center'>" + (set.has(n) ? n : "") + "</span>";
      return html + "</div>";
    }

    function render() {
      const selVal = sel ? grid[sel[0]][sel[1]] : 0;
      for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
        const b = at(r, c), v = grid[r][c];
        // content: value, else pencil notes, else empty
        if (v) { b.textContent = v; }
        else if (notes[r][c].size) { b.innerHTML = notesHtml(notes[r][c]); }
        else { b.textContent = ""; }

        const isSel = sel && sel[0] === r && sel[1] === c;
        const conflict = conflictsAt(r, c);
        const peer = sel && (sel[0] === r || sel[1] === c || sameBox(sel[0], sel[1], r, c));
        const sameNum = selVal && v === selVal;

        // colours (priority: conflict > selected > same number > peer > base)
        b.style.background = conflict ? "#f3a79f"
          : isSel ? "#aee3c8"
          : sameNum ? "#ffe6a3"
          : peer ? "#eafaf0"
          : "#fcfff9";
        b.style.color = fixed[r][c] ? "#173a2b" : hinted[r][c] ? "#c0392b" : "#2065b0";
        b.style.fontWeight = fixed[r][c] ? "800" : "600";
      }
      // dim number-pad buttons whose digit is already placed nine times
      const counts = Array(10).fill(0);
      for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (grid[r][c]) counts[grid[r][c]]++;
      numBtns.forEach((b, i) => (b.style.opacity = counts[i + 1] >= 9 ? "0.4" : "1"));
    }

    function selectCell(r, c) { if (over) return; sel = [r, c]; render(); }

    function place(n) {
      if (over || !sel) return;
      const [r, c] = sel; if (fixed[r][c]) return;
      if (noteMode && n !== 0) {
        if (grid[r][c]) return;       // can't pencil over a filled cell
        const set = notes[r][c];
        if (set.has(n)) set.delete(n); else set.add(n);
        render(); return;
      }
      // placing / erasing a real value
      hinted[r][c] = false;
      grid[r][c] = n;
      notes[r][c].clear();
      render(); checkWin();
    }

    function giveHint() {
      if (over) return;
      // prefer the selected empty cell, else the first empty cell
      let target = sel && !fixed[sel[0]][sel[1]] && !grid[sel[0]][sel[1]] ? sel : null;
      if (!target) {
        outer: for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (!grid[r][c]) { target = [r, c]; break outer; }
      }
      if (!target) return;
      const [r, c] = target;
      grid[r][c] = solution[r][c];
      notes[r][c].clear();
      hinted[r][c] = true;
      hints++;
      sel = [r, c];
      api.toast("💡 Revealed " + solution[r][c] + " (hints: " + hints + ")");
      render(); scoreboard(); checkWin();
    }

    function checkWin() {
      for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) { if (!grid[r][c] || conflictsAt(r, c)) return scoreboard(); }
      over = true;
      api.setStatus("🎉 Solved with " + hints + " hint" + (hints === 1 ? "" : "s") + "! Beautiful logic, " + api.config.username + ". Restart for a new puzzle.");
      scoreboard();
    }

    function scoreboard() {
      let filled = 0; grid.forEach((row) => row.forEach((v) => v && filled++));
      api.setScores([
        { name: "Filled", value: filled + "/81", color: "#2e9d6c" },
        { name: "Difficulty", value: api.config.options.diff, color: "#e67e22" },
        { name: "Hints", value: hints, color: "#3498db" },
      ]);
    }

    function onKey(e) {
      if (over) return;
      if (/^[1-9]$/.test(e.key)) place(+e.key);
      else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") place(0);
      else if (e.key.toLowerCase() === "n") { noteBtn.click(); }
      else if (e.key.toLowerCase() === "h") { giveHint(); }
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
    api.setStatus("Tap a cell, then a number. ✏️ Notes pencils candidates · 💡 Hint reveals a cell 🔢");
    return { stop() { window.removeEventListener("keydown", onKey); } };
  },
});
