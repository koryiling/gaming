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
  leaderboard: {
    type: "time", // shortest correct solve first; each hint adds +10s
    categories: [ // a separate ranking per difficulty, shown Hard → Medium → Easy
      { key: "Hard", label: "🔴 Hard" },
      { key: "Medium", label: "🟠 Medium" },
      { key: "Easy", label: "🟢 Easy" },
    ],
  },
  rules: [
    "Tap a cell, then tap a number (or press 1–9) to place it.",
    "Selecting a cell highlights its row, column, box and every matching number.",
    "Each row, column, and 3×3 box must contain 1–9 with no repeats — clashes flash red.",
    "✏️ Notes lets you pencil in candidates; 💡 Hint reveals one correct cell.",
    "You're on the clock — each 💡 hint adds +10s. Shortest solve tops the board!",
    "Watch your accuracy: 5 wrong entries are allowed — the 6th mistake ends the game.",
    "Each difficulty has its own ranking — Hard, Medium, then Easy — shortest time first.",
  ],
  options: [
    { key: "diff", label: "Difficulty", type: "select", default: "easy",
      choices: [{ label: "Easy", value: "easy" }, { label: "Medium", value: "med" }, { label: "Hard", value: "hard" }] },
  ],

  create(api) {
    const DIFF = api.config.options.diff;
    const KEEP = { easy: 42, med: 34, hard: 27 }[DIFF];
    const CAT = { easy: "Easy", med: "Medium", hard: "Hard" }[DIFF] || "Easy"; // leaderboard category

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
    let sel = null, over = false, noteMode = false, hints = 0, mistakes = 0;
    const HINT_PENALTY = 10; // seconds added to your time per hint used
    const MAX_MISTAKES = 5;  // 5 wrong entries allowed; the 6th ends the game
    let t0 = 0, tick = null, finalElapsed = 0;
    function elapsedSec() { return Math.max(0, Math.round((performance.now() - t0) / 1000)); }
    function fmt(sec) { const m = Math.floor(sec / 60), s = sec % 60; return m + ":" + (s < 10 ? "0" : "") + s; }

    // ---- layout ----
    // size the grid so the whole board + number pad fit small screens too
    const size = Math.max(30, Math.min(46, Math.floor((Math.min(460, window.innerWidth - 26)) / 9)));
    const wrap = api.el("div", "");
    wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:12px;max-width:100%";

    // bold 3×3 box borders, thin lines between cells inside a box, dark outer frame
    const THIN = "1px solid #d4e2da", BOLD = "2.5px solid #173a2b";
    const boardEl = api.el("div", "");
    boardEl.style.cssText = "display:grid;grid-template-columns:repeat(9," + size + "px);gap:0;padding:0;" +
      "border:" + BOLD + ";border-radius:8px;overflow:hidden;background:#fcfff9;box-shadow:var(--shadow)";
    const cellEls = [];
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      const b = api.el("button", "");
      // each cell draws only its top + left line: bold at a 3×3 boundary, thin otherwise.
      // row 0 / col 0 draw nothing (the board's frame covers them) — keeps the frame even.
      b.style.cssText = "box-sizing:border-box;width:" + size + "px;height:" + size + "px;padding:0;" +
        "font-size:" + (size * 0.52) + "px;font-weight:700;cursor:pointer;display:grid;place-items:center;line-height:1;" +
        "background:#fcfff9;color:var(--ink);transition:background .08s;" +
        "border-top:" + (r === 0 ? "none" : (r % 3 === 0 ? BOLD : THIN)) + ";" +
        "border-left:" + (c === 0 ? "none" : (c % 3 === 0 ? BOLD : THIN)) + ";" +
        "border-right:none;border-bottom:none";
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
      const wrong = n !== 0 && n !== solution[r][c]; // entry that doesn't match the unique solution
      grid[r][c] = n;
      notes[r][c].clear();
      if (wrong) {
        mistakes++;
        if (mistakes > MAX_MISTAKES) {
          over = true;
          if (tick) { clearInterval(tick); tick = null; }
          render(); scoreboard();
          api.setStatus("💥 " + MAX_MISTAKES + " mistakes used up — the 6th ended the game. Hit Restart for a new puzzle.");
          return;
        }
        api.toast("❌ Wrong number (mistakes: " + mistakes + "/" + MAX_MISTAKES + ")");
      }
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
      api.toast("💡 Revealed " + solution[r][c] + " (hints: " + hints + ", +" + HINT_PENALTY + "s)");
      render(); scoreboard(); checkWin();
    }

    function checkWin() {
      for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) { if (!grid[r][c] || conflictsAt(r, c)) return scoreboard(); }
      over = true;
      finalElapsed = elapsedSec();
      if (tick) { clearInterval(tick); tick = null; }
      const penalty = hints * HINT_PENALTY;
      const total = finalElapsed + penalty;
      api.submitScore(total, { cat: CAT }); // time-metric leaderboard, ranked within its difficulty
      if (api.celebrate) api.celebrate("🎉 Solved in " + fmt(total) + "!");
      scoreboard();
      const penaltyMsg = hints ? " + " + penalty + "s for " + hints + " hint" + (hints === 1 ? "" : "s") + " = " + fmt(total) : "";
      api.setStatus("🎉 Solved in " + fmt(finalElapsed) + penaltyMsg + "! Nice work, " + api.config.username + ". Restart for a new puzzle.");
    }

    function scoreboard() {
      const elapsed = over ? finalElapsed : elapsedSec();
      api.setScores([
        { name: "Time", value: fmt(elapsed), color: "#2e9d6c" },
        { name: "Difficulty", value: api.config.options.diff, color: "#e67e22" },
        { name: "Hints", value: String(hints) + (hints ? " (+" + hints * HINT_PENALTY + "s)" : ""), color: "#3498db" },
        { name: "Mistakes", value: Math.min(mistakes, MAX_MISTAKES) + "/" + MAX_MISTAKES, color: "#e74c3c" },
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

    t0 = performance.now();
    tick = setInterval(() => { if (!over) scoreboard(); }, 1000);
    render(); scoreboard();
    api.setStatus("Tap a cell, then a number. ✏️ Notes pencils candidates · 💡 Hint reveals a cell (+" + HINT_PENALTY + "s) 🔢");
    return { stop() { window.removeEventListener("keydown", onKey); if (tick) { clearInterval(tick); tick = null; } } };
  },
});
