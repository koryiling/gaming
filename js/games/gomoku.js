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

    function init() {
      grid = Array.from({ length: N }, () => Array(N).fill(-1));
      turn = 0; over = false; render(); board();
      api.setStatus(STONE[0] + " " + names[0] + " starts — tap a spot.");
    }
    function board() { api.setScores(names.map((n, i) => ({ name: STONE[i] + " " + n, value: "", color: colors[i], turn: i === turn && !over }))); }
    function render() {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const v = grid[r][c]; const b = cells[r * N + c];
        b.textContent = v >= 0 ? STONE[v] : ""; b.disabled = v >= 0 || over || (vsAI && turn === 1);
      }
    }
    function winLine(r, c, p) {
      for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
        let cnt = 1, line = [[r, c]];
        for (const s of [1, -1]) { let rr = r + dr * s, cc = c + dc * s; while (rr >= 0 && rr < N && cc >= 0 && cc < N && grid[rr][cc] === p) { cnt++; line.push([rr, cc]); rr += dr * s; cc += dc * s; } }
        if (cnt >= 5) return line;
      }
      return null;
    }
    function placeStone(r, c, p) {
      grid[r][c] = p; render();
      const w = winLine(r, c, p);
      if (w) { over = true; w.forEach(([rr, cc]) => (cells[rr * N + cc].style.background = "#9fe0bf")); if (api.recordWin && !(vsAI && p === 1)) api.recordWin(names[p]); api.setStatus("🏆 " + STONE[p] + " " + names[p] + " gets five — win! 🎉"); board(); return true; }
      if (grid.every((row) => row.every((x) => x >= 0))) { over = true; api.setStatus("🤝 Board full — a draw!"); return true; }
      return false;
    }
    function human(r, c) {
      if (over || grid[r][c] >= 0 || (vsAI && turn === 1)) return;
      if (placeStone(r, c, turn)) return;
      turn = 1 - turn; board();
      if (vsAI && turn === 1) { api.setStatus("🤖 Computer thinking…"); setTimeout(aiMove, 380); }
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
    function aiMove() {
      if (over) return;
      let best = null, bs = -1;
      const empties = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (grid[r][c] === -1) {
        empties.push([r, c]);
        const s = score(r, c, 1) + Math.random();
        if (s > bs) { bs = s; best = [r, c]; }
      }
      if (!best) return;
      // beatable AI: about half the time, play a random legal move instead of the best one
      if (Math.random() < 0.5 && empties.length) best = empties[(Math.random() * empties.length) | 0];
      if (placeStone(best[0], best[1], 1)) return;
      turn = 0; board(); api.setStatus(STONE[0] + " " + names[0] + "'s turn.");
    }

    init();
    return { stop() {} };
  },
});
