/* Connect Four — 2 players */
Arcade.register({
  id: "connect4",
  name: "Connect Four",
  emoji: "🔴",
  tagline: "Drop discs and connect four in a row before your rival.",
  tags: ["Board", "Strategy"],
  minPlayers: 1,
  maxPlayers: 2,
  leaderboard: { type: "wins", reset: "year" }, // only the winner is tallied; resets each year
  rules: [
    "Players alternate dropping a disc into a column.",
    "Discs fall to the lowest empty slot in that column.",
    "First to line up four discs — horizontally, vertically, or diagonally — wins.",
    "Fill the board with no four-in-a-row for a draw.",
    "Pick 1 player to face a 🤖 computer, or 2 players hot-seat.",
  ],
  options: [
    {
      key: "grid", label: "Grid size", type: "select", default: "7x6",
      choices: [{ label: "Classic 7×6", value: "7x6" }, { label: "Big 9×7", value: "9x7" }],
    },
  ],

  create(api) {
    const [COLS, ROWS] = api.config.options.grid.split("x").map(Number);
    const vsAI = api.config.players.length === 1;
    const names = vsAI ? [api.config.players[0], "🤖 Computer"] : api.config.players;
    const colors = [api.colors[4], api.colors[1]]; // red, orange
    const disc = ["🔴", "🟠"];
    let board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    let turn = 0, over = false;
    const wins = [0, 0];

    const cell = Math.floor(Math.min(440, window.innerWidth - 60) / COLS);
    const grid = api.el("div", "grid-board");
    grid.style.gridTemplateColumns = "repeat(" + COLS + ",1fr)";
    const cells = [];
    for (let r = 0; r < ROWS; r++) {
      cells[r] = [];
      for (let c = 0; c < COLS; c++) {
        const b = api.el("button", "cell");
        b.style.width = b.style.height = cell + "px";
        b.style.fontSize = cell * 0.66 + "px";
        b.style.borderRadius = "50%";
        b.dataset.col = c;
        b.addEventListener("click", () => drop(c));
        grid.appendChild(b); cells[r][c] = b;
      }
    }
    api.board.appendChild(grid);

    function scores() {
      api.setScores(names.map((n, i) => ({
        name: disc[i] + " " + n, value: wins[i], color: colors[i], turn: !over && i === turn,
      })));
    }
    function render() {
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        cells[r][c].textContent = board[r][c] != null ? disc[board[r][c]] : "";
      }
    }
    function drop(c) {
      if (over) return;
      if (vsAI && turn === 1) return; // computer's turn — ignore clicks
      place(c);
    }
    function place(c) {
      if (over) return;
      let r = -1;
      for (let i = ROWS - 1; i >= 0; i--) if (board[i][c] == null) { r = i; break; }
      if (r < 0) return;
      board[r][c] = turn;
      const line = winAt(r, c);
      render();
      if (line) return finish(turn, line);
      if (board.every((row) => row.every((v) => v != null))) return finish(null);
      turn = 1 - turn; scores();
      if (vsAI && turn === 1) {
        api.setStatus("🤖 Computer is thinking…");
        setTimeout(aiMove, 550);
      } else {
        api.setStatus(disc[turn] + " " + names[turn] + ", your move — pick a column.");
      }
    }

    // simple AI: win if possible, else block the opponent, else favour the centre
    function dropRow(c) { for (let i = ROWS - 1; i >= 0; i--) if (board[i][c] == null) return i; return -1; }
    function wouldWin(c, p) {
      const r = dropRow(c); if (r < 0) return false;
      board[r][c] = p; const w = !!winAt(r, c); board[r][c] = null; return w;
    }
    function aiMove() {
      if (over) return;
      const valid = [];
      for (let c = 0; c < COLS; c++) if (dropRow(c) >= 0) valid.push(c);
      if (!valid.length) return;
      // beatable AI: about half the time, just drop in a random column instead of playing optimally
      if (Math.random() < 0.5) { place(valid[(Math.random() * valid.length) | 0]); return; }
      let choice = valid.find((c) => wouldWin(c, 1));           // take the win
      if (choice == null) choice = valid.find((c) => wouldWin(c, 0)); // block their win
      if (choice == null) {
        const center = Math.floor(COLS / 2);
        valid.sort((a, b) => Math.abs(a - center) - Math.abs(b - center));
        const top = valid.slice(0, Math.min(3, valid.length));
        choice = top[(Math.random() * top.length) | 0];
      }
      place(choice);
    }
    function winAt(r, c) {
      const me = board[r][c];
      const dirs = [[0,1],[1,0],[1,1],[1,-1]];
      for (const [dr, dc] of dirs) {
        const line = [[r, c]];
        for (const s of [1, -1]) {
          let rr = r + dr * s, cc = c + dc * s;
          while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && board[rr][cc] === me) {
            line.push([rr, cc]); rr += dr * s; cc += dc * s;
          }
        }
        if (line.length >= 4) return line;
      }
      return null;
    }
    function finish(who, line) {
      over = true;
      if (who != null) {
        wins[who]++;
        if (!vsAI || who === 0) api.recordWin(names[who]); // only the winner (never the computer)
        (line || []).forEach(([r, c]) => (cells[r][c].style.background = "var(--mint-300)"));
        api.setStatus("🏆 " + disc[who] + " " + names[who] + " connects four! Restart for a rematch.");
      } else {
        api.setStatus("🤝 Board full — it's a draw!");
      }
      scores();
    }

    scores(); render();
    api.setStatus(disc[0] + " " + names[0] + " starts — pick a column.");
    return { stop() {} };
  },
});
