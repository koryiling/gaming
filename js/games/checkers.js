/* Checkers / Draughts — 2 players, hot-seat */
Arcade.register({
  id: "checkers",
  name: "Checkers",
  emoji: "♟️",
  tagline: "Jump and capture your way across the board. Crown your kings!",
  tags: ["Board", "Strategy", "Duel"],
  minPlayers: 2,
  maxPlayers: 2,
  rules: [
    "Move diagonally forward to an empty dark square.",
    "Jump over an adjacent enemy piece (to an empty square beyond) to capture it.",
    "If a capture is available you must take it — and chain multiple jumps when you can.",
    "Reach the far row to crown a King (moves both directions). Capture all foes to win!",
  ],
  options: [],

  create(api) {
    const N = 8;
    const names = api.config.players;
    const colors = [api.colors[0], api.colors[1]];
    let grid, turn = 0, sel = null, mustChain = null, over = false;
    const cap = Math.floor(Math.min(440, window.innerWidth - 40) / N);

    const boardEl = api.el("div", "grid-board");
    boardEl.style.gridTemplateColumns = "repeat(" + N + ",1fr)";
    boardEl.style.background = "#173a2b";
    const cells = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const b = api.el("button", "");
      b.style.cssText = "width:" + cap + "px;height:" + cap + "px;border:none;cursor:pointer;display:grid;place-items:center;" +
        "background:" + ((r + c) % 2 ? "#3a6b54" : "#e8f5ec") + ";font-size:" + (cap * 0.6) + "px";
      b.addEventListener("click", () => clickCell(r, c));
      boardEl.appendChild(b); cells.push(b);
    }
    api.board.appendChild(boardEl);

    function init() {
      grid = Array.from({ length: N }, () => Array(N).fill(null));
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if ((r + c) % 2) {
        if (r < 3) grid[r][c] = { p: 1, king: false };
        else if (r > 4) grid[r][c] = { p: 0, king: false };
      }
      turn = 0; sel = null; mustChain = null; over = false;
      render(); board();
      api.setStatus(names[0] + " (bottom) starts. Tap a piece, then a highlighted square.");
    }
    function inB(r, c) { return r >= 0 && r < N && c >= 0 && c < N; }
    function dirs(piece) {
      if (piece.king) return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
      return piece.p === 0 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
    }
    function capturesFrom(r, c) {
      const pc = grid[r][c]; if (!pc) return [];
      const out = [];
      for (const [dr, dc] of dirs(pc)) {
        const mr = r + dr, mc = c + dc, lr = r + 2 * dr, lc = c + 2 * dc;
        if (inB(lr, lc) && grid[mr] && grid[mr][mc] && grid[mr][mc].p !== pc.p && !grid[lr][lc])
          out.push({ to: [lr, lc], over: [mr, mc] });
      }
      return out;
    }
    function simpleFrom(r, c) {
      const pc = grid[r][c]; if (!pc) return [];
      const out = [];
      for (const [dr, dc] of dirs(pc)) { const nr = r + dr, nc = c + dc; if (inB(nr, nc) && !grid[nr][nc]) out.push({ to: [nr, nc] }); }
      return out;
    }
    function allCaptures(p) {
      const list = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (grid[r][c] && grid[r][c].p === p && capturesFrom(r, c).length) list.push([r, c]);
      return list;
    }
    function legalFor(r, c) {
      if (mustChain) return (mustChain[0] === r && mustChain[1] === c) ? capturesFrom(r, c) : [];
      const caps = allCaptures(turn);
      if (caps.length) return (grid[r][c] && grid[r][c].p === turn) ? capturesFrom(r, c) : [];
      return (grid[r][c] && grid[r][c].p === turn) ? simpleFrom(r, c) : [];
    }
    function board() {
      const cnt = [0, 0]; grid.forEach((row) => row.forEach((x) => { if (x) cnt[x.p]++; }));
      api.setScores(names.map((n, i) => ({ name: n, value: cnt[i] + " left", color: colors[i], turn: i === turn && !over })));
    }
    function render() {
      const targets = sel ? legalFor(sel[0], sel[1]).map((m) => m.to.join(",")) : [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const b = cells[r * N + c], pc = grid[r][c];
        b.textContent = pc ? (pc.king ? "♚" : "●") : "";
        b.style.color = pc ? colors[pc.p] : "transparent";
        const isSel = sel && sel[0] === r && sel[1] === c;
        const isTarget = targets.includes(r + "," + c);
        b.style.background = isTarget ? "#9fe0bf" : isSel ? "#6fcda0" : ((r + c) % 2 ? "#3a6b54" : "#e8f5ec");
        b.style.textShadow = pc ? "0 1px 2px rgba(0,0,0,.4)" : "none";
      }
    }
    function clickCell(r, c) {
      if (over) return;
      const moves = sel ? legalFor(sel[0], sel[1]) : [];
      const move = moves.find((m) => m.to[0] === r && m.to[1] === c);
      if (sel && move) return doMove(sel, move);
      // select own piece (if not chaining)
      if (!mustChain && grid[r][c] && grid[r][c].p === turn) {
        const caps = allCaptures(turn);
        if (caps.length && !capturesFrom(r, c).length) { api.toast("You must capture!"); return; }
        sel = [r, c]; render();
      }
    }
    function doMove(from, move) {
      const [fr, fc] = from, [tr, tc] = move.to;
      const pc = grid[fr][fc];
      grid[tr][tc] = pc; grid[fr][fc] = null;
      if (move.over) grid[move.over[0]][move.over[1]] = null;
      // promotion
      let promoted = false;
      if (!pc.king && ((pc.p === 0 && tr === 0) || (pc.p === 1 && tr === N - 1))) { pc.king = true; promoted = true; }
      // chain?
      if (move.over && !promoted && capturesFrom(tr, tc).length) {
        sel = [tr, tc]; mustChain = [tr, tc]; render(); board();
        api.setStatus("⚡ Keep jumping, " + names[turn] + "!");
        return;
      }
      sel = null; mustChain = null;
      turn = 1 - turn;
      render(); board();
      if (gameOverCheck()) return;
      api.setStatus(names[turn] + "'s turn.");
    }
    function gameOverCheck() {
      const cnt = [0, 0]; grid.forEach((row) => row.forEach((x) => { if (x) cnt[x.p]++; }));
      if (!cnt[turn]) { over = true; api.setStatus("🏆 " + names[1 - turn] + " captured everything — win! 🎉"); return true; }
      const hasMove = allCaptures(turn).length || (() => {
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (grid[r][c] && grid[r][c].p === turn && simpleFrom(r, c).length) return true;
        return false;
      })();
      if (!hasMove) { over = true; api.setStatus("🏆 " + names[1 - turn] + " wins — " + names[turn] + " has no moves!"); return true; }
      return false;
    }

    init();
    return { stop() {} };
  },
});
