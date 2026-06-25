/* Gomoku (Five in a Row) — vs computer or 2 players */
Arcade.register({
  id: "gomoku",
  name: "Five in a Row",
  emoji: "🔵",
  tagline: "Line up five of your stones in a row before your rival does.",
  tags: ["Board", "Strategy", "Duel"],
  minPlayers: 1,
  maxPlayers: 2,
  leaderboard: { type: "wins" }, // counts wins; each victory adds one (computer wins aren't recorded)
  rules: [
    "Take turns placing a stone on any empty intersection.",
    "Get five of your stones in a row — horizontally, vertically, or diagonally.",
    "First to five wins. Simple to learn, tricky to master!",
    "Play 1 vs the computer, or 2 against a friend.",
  ],
  options: [
    { key: "size", label: "Board", type: "select", default: 13,
      choices: [{ label: "11×11", value: 11 }, { label: "13×13", value: 13 }, { label: "15×15", value: 15 }] },
  ],

  create(api) {
    const N = api.config.options.size;
    const vsAI = api.config.players.length === 1;
    const names = vsAI ? [api.config.players[0], "🤖 Computer"] : api.config.players;
    const STONE = ["⚫", "⚪"];
    const colors = ["#173a2b", "#bbb"];
    let grid, turn = 0, over = false;
    const cell = Math.floor(Math.min(480, window.innerWidth - 30) / N);

    const boardEl = api.el("div", "grid-board");
    boardEl.style.cssText = "display:grid;grid-template-columns:repeat(" + N + ",1fr);gap:0;background:#d8b15e;padding:6px;border-radius:10px";
    const cells = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const b = api.el("button", "");
      b.style.cssText = "width:" + cell + "px;height:" + cell + "px;border:0.5px solid #b8924a;background:transparent;cursor:pointer;" +
        "font-size:" + (cell * 0.95) + "px;line-height:1;padding:0;display:grid;place-items:center";
      b.addEventListener("click", () => human(r, c));
      boardEl.appendChild(b); cells.push(b);
    }
    api.board.appendChild(boardEl);

    // Lock all input at the board level (one style write) instead of toggling every cell's
    // `disabled` — that full-grid pass on each move was what made the game lag.
    function lockInput(locked) { boardEl.style.pointerEvents = locked ? "none" : "auto"; }
    // Repaint a single cell — the only DOM write a move needs.
    function paint(r, c) {
      const v = grid[r][c];
      cells[r * N + c].textContent = v >= 0 ? STONE[v] : "";
    }

    function init() {
      grid = Array.from({ length: N }, () => Array(N).fill(-1));
      turn = 0; over = false;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { cells[r * N + c].textContent = ""; cells[r * N + c].style.background = "transparent"; }
      lockInput(false); board();
      api.setStatus(STONE[0] + " " + names[0] + " starts — tap a spot.");
    }
    function board() { api.setScores(names.map((n, i) => ({ name: STONE[i] + " " + n, value: "", color: colors[i], turn: i === turn && !over }))); }
    function winLine(r, c, p) {
      for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
        let cnt = 1, line = [[r, c]];
        for (const s of [1, -1]) { let rr = r + dr * s, cc = c + dc * s; while (rr >= 0 && rr < N && cc >= 0 && cc < N && grid[rr][cc] === p) { cnt++; line.push([rr, cc]); rr += dr * s; cc += dc * s; } }
        if (cnt >= 5) return line;
      }
      return null;
    }
    function placeStone(r, c, p) {
      grid[r][c] = p; paint(r, c);
      const w = winLine(r, c, p);
      if (w) { over = true; lockInput(true); w.forEach(([rr, cc]) => (cells[rr * N + cc].style.background = "#9fe0bf")); if (api.recordWin && !(vsAI && p === 1)) api.recordWin(names[p]); api.setStatus("🏆 " + STONE[p] + " " + names[p] + " gets five — win! 🎉"); board(); return true; }
      if (grid.every((row) => row.every((x) => x >= 0))) { over = true; lockInput(true); api.setStatus("🤝 Board full — a draw!"); return true; }
      return false;
    }
    function human(r, c) {
      if (over || grid[r][c] >= 0 || (vsAI && turn === 1)) return;
      if (placeStone(r, c, turn)) return;
      turn = 1 - turn; board();
      if (vsAI && turn === 1) { lockInput(true); api.setStatus("🤖 Computer thinking…"); setTimeout(aiMove, 280); }
      else api.setStatus(STONE[turn] + " " + names[turn] + "'s turn.");
    }
    function score(r, c, p) {
      // heuristic: value of placing p at (r,c) = own potential + blocking opponent
      if (grid[r][c] >= 0) return -1;
      function lineScore(pl) {
        let best = 0;
        for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
          let cnt = 1, openEnds = 0;
          for (const s of [1, -1]) { let rr = r + dr * s, cc = c + dc * s, run = 0; while (rr >= 0 && rr < N && cc >= 0 && cc < N && grid[rr][cc] === pl) { run++; rr += dr * s; cc += dc * s; } cnt += run; if (rr >= 0 && rr < N && cc >= 0 && cc < N && grid[rr][cc] === -1) openEnds++; }
          let v = cnt >= 5 ? 100000 : Math.pow(cnt, 3) * (openEnds + 1);
          best = Math.max(best, v);
        }
        return best;
      }
      return lineScore(1) * 1.0 + lineScore(0) * 0.9 + (1 - (Math.abs(r - N / 2) + Math.abs(c - N / 2)) / N) * 2;
    }
    // candidate cells = empties within 2 steps of an existing stone (the only spots worth
    // considering). Keeps the AI both fast and sensible instead of scanning the whole board.
    function candidates() {
      const out = [], seen = new Set(); let any = false;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (grid[r][c] >= 0) {
        any = true;
        for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
          const rr = r + dr, cc = c + dc;
          if (rr >= 0 && rr < N && cc >= 0 && cc < N && grid[rr][cc] === -1) {
            const k = rr * N + cc;
            if (!seen.has(k)) { seen.add(k); out.push([rr, cc]); }
          }
        }
      }
      if (!any) { const m = N >> 1; return [[m, m]]; } // empty board → centre
      return out;
    }
    function aiMove() {
      if (over) return;
      const cand = candidates();
      let best = null, bs = -1;
      for (const [r, c] of cand) {
        const s = score(r, c, 1) + Math.random();
        if (s > bs) { bs = s; best = [r, c]; }
      }
      if (!best) return;
      // beatable AI: about a third of the time, play a random sensible move instead of the best
      if (Math.random() < 0.35 && cand.length) best = cand[(Math.random() * cand.length) | 0];
      if (placeStone(best[0], best[1], 1)) return;
      turn = 0; lockInput(false); board(); api.setStatus(STONE[0] + " " + names[0] + "'s turn.");
    }

    init();
    return { stop() {} };
  },
});
