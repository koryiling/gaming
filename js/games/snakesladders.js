/* Snakes & Ladders — 2 to 4 players, dice race */
Arcade.register({
  id: "snl",
  name: "Snakes & Ladders",
  emoji: "🎲",
  tagline: "Roll the dice, climb the ladders, dodge the snakes. First to 100 wins!",
  tags: ["Board", "Family"],
  minPlayers: 2,
  maxPlayers: 4,
  rules: [
    "On your turn, roll the dice and move forward that many squares.",
    "Land on a ladder 🪜 → climb up. Land on a snake 🐍 → slide down.",
    "You must land exactly on 100 — overshoot and you bounce back.",
    "First player to reach square 100 wins the race!",
  ],
  options: [
    { key: "dice", label: "Dice sides", type: "select", default: 6,
      choices: [{ label: "Normal d6", value: 6 }, { label: "Speedy d8", value: 8 }] },
  ],

  create(api) {
    const LADDERS = { 1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100 };
    const SNAKES = { 16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78 };
    const names = api.config.players;
    const pos = names.map(() => 0);
    const sides = api.config.options.dice;
    let turn = 0, over = false, rolling = false;

    const wrap = api.el("div", "");
    wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:14px";

    // dice control
    const ctrl = api.el("div", "");
    ctrl.style.cssText = "display:flex;align-items:center;gap:14px";
    const dieEl = api.el("div", "");
    dieEl.style.cssText = "width:56px;height:56px;border-radius:14px;background:#fff;box-shadow:var(--shadow);display:grid;place-items:center;font-size:34px";
    dieEl.textContent = "🎲";
    const rollBtn = api.el("button", "btn primary");
    rollBtn.textContent = "🎲 Roll dice";
    rollBtn.addEventListener("click", roll);
    ctrl.appendChild(dieEl); ctrl.appendChild(rollBtn);
    wrap.appendChild(ctrl);

    // board 10x10
    const size = Math.floor(Math.min(440, window.innerWidth - 40) / 10);
    const grid = api.el("div", "grid-board");
    grid.style.cssText = "display:grid;grid-template-columns:repeat(10,1fr);gap:2px;padding:6px";
    const cellOf = {};
    // build visual rows top(99..) to bottom(1)
    for (let vr = 0; vr < 10; vr++) {
      const r = 9 - vr; // bottom row r=0
      const leftToRight = r % 2 === 0;
      for (let c = 0; c < 10; c++) {
        const col = leftToRight ? c : 9 - c;
        const n = r * 10 + col + 1;
        const cell = api.el("div", "");
        cell.style.cssText = "width:" + size + "px;height:" + size + "px;border-radius:7px;position:relative;" +
          "font-size:10px;color:var(--ink-soft);display:flex;align-items:flex-start;justify-content:flex-start;padding:2px;" +
          "background:" + ((r + col) % 2 ? "#d7f0e2" : "#eafaf0");
        if (LADDERS[n]) cell.style.background = "#cdeede";
        if (SNAKES[n]) cell.style.background = "#f6dcd6";
        const num = api.el("span", "", String(n));
        cell.appendChild(num);
        const mark = LADDERS[n] ? "🪜" : SNAKES[n] ? "🐍" : "";
        if (mark) {
          const m = api.el("span", "", mark);
          m.style.cssText = "position:absolute;right:2px;bottom:1px;font-size:" + (size * 0.42) + "px";
          cell.appendChild(m);
        }
        const tokens = api.el("div", "");
        tokens.style.cssText = "position:absolute;inset:0;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:1px";
        cell.appendChild(tokens);
        cell._tokens = tokens;
        grid.appendChild(cell);
        cellOf[n] = cell;
      }
    }
    wrap.appendChild(grid);
    api.board.appendChild(wrap);

    function token(i) {
      const t = api.el("div", "");
      t.style.cssText = "width:" + (size * 0.34) + "px;height:" + (size * 0.34) + "px;border-radius:50%;" +
        "background:" + api.colors[i] + ";border:2px solid #fff;box-shadow:0 1px 2px rgba(0,0,0,.3)";
      t.title = names[i];
      return t;
    }
    function drawTokens() {
      Object.values(cellOf).forEach((c) => (c._tokens.innerHTML = ""));
      names.forEach((_, i) => { if (pos[i] >= 1) cellOf[pos[i]]._tokens.appendChild(token(i)); });
    }
    function board() {
      api.setScores(names.map((n, i) => ({ name: n, value: pos[i] || "start", color: api.colors[i], turn: i === turn && !over })));
    }
    function roll() {
      if (over || rolling) return;
      rolling = true; rollBtn.disabled = true;
      const d = 1 + ((Math.random() * sides) | 0);
      dieEl.textContent = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"][d - 1] || d;
      let np = pos[turn] + d;
      let msg = names[turn] + " rolled " + d + ". ";
      if (np > 100) { msg += "Overshoot — bounced back to " + (np = 100 - (np - 100)) + "."; }
      pos[turn] = np;
      if (LADDERS[np]) { msg += " 🪜 Ladder up to " + LADDERS[np] + "!"; pos[turn] = LADDERS[np]; }
      else if (SNAKES[np]) { msg += " 🐍 Snake down to " + SNAKES[np] + "!"; pos[turn] = SNAKES[np]; }
      drawTokens(); board();
      if (pos[turn] === 100) { over = true; api.setStatus("🏆 " + names[turn] + " reached 100 and wins! 🎉"); rolling = false; return; }
      api.setStatus(msg);
      setTimeout(() => {
        turn = (turn + 1) % names.length;
        rolling = false; rollBtn.disabled = false;
        board();
        api.setStatus(api.board.querySelector("p") ? "" : "");
        api.setStatus("🎲 " + names[turn] + ", your roll!");
      }, 900);
    }

    drawTokens(); board();
    api.setStatus("🎲 " + names[0] + " starts — hit Roll!");
    return { stop() {} };
  },
});
