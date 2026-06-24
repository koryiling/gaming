/* Snakes & Ladders — solo vs computer, or 2 to 4 players, dice race */
Arcade.register({
  id: "snl",
  name: "Snakes & Ladders",
  emoji: "🎲",
  tagline: "Roll the dice, climb ladders, dodge snakes — race to 100 solo vs the computer or with friends!",
  tags: ["Board", "Family"],
  minPlayers: 1,
  maxPlayers: 4,
  rules: [
    "On your turn, roll the dice and move forward that many squares.",
    "Land on a ladder 🪜 → climb up. Land on a snake 🐍 → slide down.",
    "You must land exactly on 100 — overshoot and you bounce back.",
    "First player to reach square 100 wins the race!",
    "Pick 1 player to face a 🤖 computer, or 2–4 players for hot-seat.",
  ],
  options: [
    { key: "dice", label: "Dice sides", type: "select", default: 6,
      choices: [{ label: "Normal d6", value: 6 }, { label: "Speedy d8", value: 8 }] },
  ],

  create(api) {
    const LADDERS = { 1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100 };
    const SNAKES = { 16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78 };

    // solo → add a computer opponent
    const vsAI = api.config.players.length === 1;
    const names = vsAI ? [api.config.players[0], "🤖 Computer"] : api.config.players;
    const pos = names.map(() => 0);
    const sides = api.config.options.dice;
    let turn = 0, over = false, rolling = false;

    const wrap = api.el("div", "");
    wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:14px";

    // dice control
    const ctrl = api.el("div", "");
    ctrl.style.cssText = "display:flex;align-items:center;gap:14px";
    const dieEl = api.el("div", "");
    dieEl.style.cssText = "width:58px;height:58px;border-radius:14px;background:#fff;box-shadow:var(--shadow);" +
      "display:grid;place-items:center;border:2px solid var(--mint-200)";
    const rollBtn = api.el("button", "btn primary");
    rollBtn.textContent = "🎲 Roll dice";
    rollBtn.addEventListener("click", roll);
    ctrl.appendChild(dieEl); ctrl.appendChild(rollBtn);
    wrap.appendChild(ctrl);

    // pip layouts for a die face (positions on a 3×3 grid, 1=top-left … 9=bottom-right)
    const PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
    function showDie(d) {
      dieEl.innerHTML = "";
      if (PIPS[d]) {
        const g = api.el("div", "");
        g.style.cssText = "display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);width:74%;height:74%;gap:1px";
        const set = PIPS[d];
        for (let i = 1; i <= 9; i++) {
          const cell = api.el("div", "");
          cell.style.cssText = "display:grid;place-items:center";
          if (set.indexOf(i) !== -1) {
            const dot = api.el("div", "");
            dot.style.cssText = "width:9px;height:9px;border-radius:50%;background:#173a2b";
            cell.appendChild(dot);
          }
          g.appendChild(cell);
        }
        dieEl.appendChild(g);
      } else {
        // d7 / d8 etc. — show the number clearly
        dieEl.textContent = String(d);
        dieEl.style.fontSize = "30px"; dieEl.style.fontWeight = "800"; dieEl.style.color = "var(--ink)";
      }
    }
    showDie(1);

    // board 10x10
    const size = Math.floor(Math.min(440, window.innerWidth - 40) / 10);
    const grid = api.el("div", "grid-board");
    grid.style.cssText = "display:grid;grid-template-columns:repeat(10,1fr);gap:2px;padding:6px";
    const cellOf = {};
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
      // quick roll animation, then resolve the move
      let ticks = 0;
      const anim = setInterval(() => {
        showDie(1 + ((Math.random() * Math.min(6, sides)) | 0));
        if (++ticks >= 6) { clearInterval(anim); applyRoll(d); }
      }, 70);
    }

    function applyRoll(d) {
      showDie(d);
      let np = pos[turn] + d;
      let msg = names[turn] + " rolled " + d + ". ";
      if (np > 100) { np = 100 - (np - 100); msg += "Overshoot — bounced back to " + np + ". "; }
      pos[turn] = np;
      if (LADDERS[np]) { msg += "🪜 Ladder up to " + LADDERS[np] + "!"; pos[turn] = LADDERS[np]; }
      else if (SNAKES[np]) { msg += "🐍 Snake down to " + SNAKES[np] + "!"; pos[turn] = SNAKES[np]; }
      drawTokens(); board();
      if (pos[turn] === 100) {
        over = true; rolling = false; rollBtn.disabled = true;
        api.setStatus("🏆 " + names[turn] + " reached 100 and wins! 🎉 Hit Restart to race again.");
        return;
      }
      api.setStatus(msg);
      setTimeout(nextTurn, 950);
    }

    function nextTurn() {
      turn = (turn + 1) % names.length;
      rolling = false;
      board();
      if (vsAI && turn === 1) {
        rollBtn.disabled = true;
        api.setStatus("🤖 Computer is rolling…");
        setTimeout(roll, 700);
      } else {
        rollBtn.disabled = false;
        api.setStatus("🎲 " + names[turn] + ", your roll!");
      }
    }

    drawTokens(); board();
    api.setStatus(vsAI
      ? "🎲 " + names[0] + " vs 🤖 Computer — hit Roll to start!"
      : "🎲 " + names[0] + " starts — hit Roll!");
    return { stop() {} };
  },
});
