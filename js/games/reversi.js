/* Reversi / Othello — 2 players or vs computer */
Arcade.register({
  id: "reversi",
  name: "Reversi",
  emoji: "⚫",
  tagline: "Flank your rival's discs to flip them. Own the most when the board fills.",
  tags: ["Board", "Strategy", "Duel"],
  minPlayers: 1,
  maxPlayers: 2,
  rules: [
    "Place a disc so it traps a line of the opponent's discs between yours.",
    "Every trapped disc flips to your colour.",
    "You must play a flanking move; if you can't, your turn is skipped.",
    "When no moves remain, whoever owns the most discs wins.",
  ],
  options: [
    { key: "ai", label: "Computer (1-player)", type: "select", default: "smart",
      choices: [{ label: "Easy", value: "easy" }, { label: "Smart", value: "smart" }] },
  ],

  create(api) {
    const N = 8;
    const vsAI = api.config.players.length === 1;
    const names = vsAI ? [api.config.players[0], "🤖 Computer"] : api.config.players;
    const DISC = ["⚫", "⚪"];
    const colorOf = ["#173a2b", "#ffffff"];
    let grid, turn = 0, over = false;
    const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

    const cell = Math.floor(Math.min(440, window.innerWidth - 40) / N);
    const boardEl = api.el("div", "grid-board");
    boardEl.style.gridTemplateColumns = "repeat(" + N + ",1fr)";
    boardEl.style.background = "var(--mint-600)";
    const cells = [];
    for (let i = 0; i < N * N; i++) {
      const b = api.el("button", "cell");
      b.style.width = b.style.height = cell + "px";
      b.style.fontSize = cell * 0.7 + "px";
      b.style.background = "#2e9d6c";
      const idx = i;
      b.addEventListener("click", () => human((idx / N) | 0, idx % N));
      boardEl.appendChild(b); cells.push(b);
    }
    api.board.appendChild(boardEl);

    function init() {
      grid = Array.from({ length: N }, () => Array(N).fill(-1));
      const m = N / 2;
      grid[m-1][m-1] = 1; grid[m][m] = 1; grid[m-1][m] = 0; grid[m][m-1] = 0;
      over = false; turn = 0;
      render(); board();
      api.setStatus(DISC[0] + " " + names[0] + " starts. Green dots show valid moves.");
    }
    function onBoard(r, c) { return r >= 0 && r < N && c >= 0 && c < N; }
    function flips(r, c, p) {
      if (grid[r][c] !== -1) return [];
      const out = [];
      for (const [dr, dc] of DIRS) {
        const line = []; let rr = r + dr, cc = c + dc;
        while (onBoard(rr, cc) && grid[rr][cc] === 1 - p) { line.push([rr, cc]); rr += dr; cc += dc; }
        if (line.length && onBoard(rr, cc) && grid[rr][cc] === p) out.push(...line);
      }
      return out;
    }
    function validMoves(p) {
      const mv = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (flips(r, c, p).length) mv.push([r, c]);
      return mv;
    }
    function counts() {
      let a = 0, b = 0;
      grid.forEach((row) => row.forEach((v) => { if (v === 0) a++; else if (v === 1) b++; }));
      return [a, b];
    }
    function board() {
      const cnt = counts();
      api.setScores(names.map((n, i) => ({ name: DISC[i] + " " + n, value: cnt[i], color: i === 0 ? "#173a2b" : "#888", turn: i === turn && !over })));
    }
    function render() {
      const moves = over ? [] : validMoves(turn);
      const moveSet = new Set(moves.map(([r, c]) => r + "," + c));
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const b = cells[r * N + c];
        if (grid[r][c] >= 0) { b.textContent = DISC[grid[r][c]]; b.disabled = true; b.style.background = "#2e9d6c"; }
        else if (moveSet.has(r + "," + c) && !(vsAI && turn === 1)) {
          b.textContent = "·"; b.style.color = "#9fe0bf"; b.disabled = false; b.style.background = "#2e9d6c";
        } else { b.textContent = ""; b.disabled = true; b.style.background = "#2e9d6c"; }
      }
    }
    function place(r, c, p) {
      const f = flips(r, c, p);
      if (!f.length) return false;
      grid[r][c] = p; f.forEach(([rr, cc]) => (grid[rr][cc] = p));
      return true;
    }
    function human(r, c) {
      if (over || (vsAI && turn === 1)) return;
      if (!place(r, c, turn)) return;
      advance();
    }
    function advance() {
      render(); board();
      const next = 1 - turn;
      if (validMoves(next).length) { turn = next; }
      else if (validMoves(turn).length) { api.setStatus("⏭ " + names[next] + " has no move — " + names[turn] + " goes again."); }
      else { return finish(); }
      render(); board();
      if (vsAI && turn === 1 && !over) { api.setStatus("🤖 Computer is thinking…"); setTimeout(aiMove, 550); }
      else api.setStatus(DISC[turn] + " " + names[turn] + "'s turn.");
    }
    function aiMove() {
      const moves = validMoves(1);
      if (!moves.length) return advance();
      let best = moves[0], bestScore = -1;
      const WEIGHT = (r, c) => {
        const corner = (r === 0 || r === N - 1) && (c === 0 || c === N - 1);
        const edge = r === 0 || r === N - 1 || c === 0 || c === N - 1;
        return corner ? 25 : edge ? 5 : 1;
      };
      moves.forEach(([r, c]) => {
        let s = flips(r, c, 1).length;
        if (api.config.options.ai === "smart") s += WEIGHT(r, c);
        if (s > bestScore) { bestScore = s; best = [r, c]; }
      });
      place(best[0], best[1], 1);
      advance();
    }
    function finish() {
      over = true; render(); board();
      const [a, b] = counts();
      api.setStatus(a === b ? "🤝 Tie at " + a + " discs each!" :
        "🏆 " + (a > b ? names[0] : names[1]) + " wins " + Math.max(a, b) + "–" + Math.min(a, b) + "! 🎉");
    }

    init();
    return { stop() {} };
  },
});
