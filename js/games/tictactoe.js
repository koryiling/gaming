/* Tic-Tac-Toe — 2 players (or vs computer) */
Arcade.register({
  id: "ttt",
  name: "Tic-Tac-Toe",
  emoji: "❌",
  tagline: "Get three in a row. Classic duel of X and O.",
  tags: ["Board", "Strategy"],
  minPlayers: 1,
  maxPlayers: 2,
  rules: [
    "Players take turns placing their mark on the 3×3 grid.",
    "First to line up three marks in a row, column, or diagonal wins.",
    "If the board fills with no winner, it's a draw.",
    "Pick 1 player to face the computer, or 2 for a friend.",
  ],
  options: [
    {
      key: "ai", label: "Computer difficulty (1-player)", type: "select", default: "smart",
      choices: [{ label: "Easy", value: "easy" }, { label: "Smart", value: "smart" }],
    },
  ],

  create(api) {
    const players = api.config.players;
    const vsAI = players.length === 1;
    const names = vsAI ? [players[0], "🤖 Computer"] : players;
    const marks = ["❌", "⭕"];
    const colors = [api.colors[0], api.colors[2]];
    let board = Array(9).fill(null);
    let turn = 0, over = false;
    const wins = [0, 0];

    const grid = api.el("div", "grid-board");
    grid.style.gridTemplateColumns = "repeat(3,1fr)";
    const cells = [];
    for (let i = 0; i < 9; i++) {
      const c = api.el("button", "cell");
      c.style.width = c.style.height = "92px";
      c.style.fontSize = "44px";
      c.addEventListener("click", () => move(i));
      grid.appendChild(c); cells.push(c);
    }
    api.board.appendChild(grid);

    function scores() {
      api.setScores(names.map((n, i) => ({
        name: marks[i] + " " + n, value: wins[i], color: colors[i], turn: !over && i === turn,
      })));
    }
    function render() {
      cells.forEach((c, i) => {
        c.textContent = board[i] != null ? marks[board[i]] : "";
        c.disabled = board[i] != null || over;
      });
    }
    function winner(b) {
      const L = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
      for (const [a,b2,c] of L) if (b[a] != null && b[a] === b[b2] && b[a] === b[c]) return { who: b[a], line: [a,b2,c] };
      return null;
    }
    function move(i) {
      if (over || board[i] != null) return;
      board[i] = turn;
      const w = winner(board);
      if (w) return finish(w);
      if (board.every((x) => x != null)) return finish(null);
      turn = 1 - turn; scores(); render();
      if (vsAI && turn === 1) setTimeout(aiMove, 380);
    }
    function finish(w) {
      over = true;
      if (w) {
        wins[w.who]++;
        w.line.forEach((idx) => (cells[idx].style.background = "var(--mint-200)"));
        api.setStatus("🏆 " + marks[w.who] + " " + names[w.who] + " wins! Hit Restart for a rematch.");
      } else {
        api.setStatus("🤝 It's a draw! Hit Restart to go again.");
      }
      scores(); render();
    }
    function aiMove() {
      if (over) return;
      let pick;
      if (api.config.options.ai === "smart") pick = bestMove();
      if (pick == null) {
        const empty = board.map((v, i) => (v == null ? i : -1)).filter((i) => i >= 0);
        pick = empty[(Math.random() * empty.length) | 0];
      }
      move(pick);
    }
    function bestMove() {
      // win if possible, block if needed, else center/corner
      for (const me of [1, 0]) {
        for (let i = 0; i < 9; i++) if (board[i] == null) {
          const t = board.slice(); t[i] = me;
          if (winner(t)) return i;
        }
      }
      if (board[4] == null) return 4;
      const corners = [0, 2, 6, 8].filter((i) => board[i] == null);
      if (corners.length) return corners[(Math.random() * corners.length) | 0];
      return null;
    }

    scores(); render();
    api.setStatus(marks[0] + " " + names[0] + " starts. Tap a square!");
    return { stop() {} };
  },
});
