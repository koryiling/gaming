/* Yahtzee — 1 to 4 players, dice */
Arcade.register({
  id: "yahtzee",
  name: "Yahtzee",
  emoji: "🎰",
  tagline: "Roll five dice up to three times, then bank them in the best category.",
  tags: ["Dice", "Family", "Strategy"],
  minPlayers: 1,
  maxPlayers: 4,
  leaderboard: { type: "score" }, // highest total in one game ranks highest → lowest (not summed)
  rules: [
    "Each turn: roll all 5 dice, then re-roll any dice up to 2 more times.",
    "Tap a die to HOLD it between rolls.",
    "Pick a scoring category to bank your dice — each can be used once.",
    "Score 63+ in the upper section (1s–6s) for a +35 bonus. Highest total wins!",
  ],
  options: [],

  create(api) {
    const names = api.config.players;
    const CATS = [
      { key: "ones", name: "Ones", up: true, fn: (d) => sum(d.filter((x) => x === 1)) },
      { key: "twos", name: "Twos", up: true, fn: (d) => sum(d.filter((x) => x === 2)) },
      { key: "threes", name: "Threes", up: true, fn: (d) => sum(d.filter((x) => x === 3)) },
      { key: "fours", name: "Fours", up: true, fn: (d) => sum(d.filter((x) => x === 4)) },
      { key: "fives", name: "Fives", up: true, fn: (d) => sum(d.filter((x) => x === 5)) },
      { key: "sixes", name: "Sixes", up: true, fn: (d) => sum(d.filter((x) => x === 6)) },
      { key: "3kind", name: "Three of a Kind", fn: (d) => (maxCount(d) >= 3 ? sum(d) : 0) },
      { key: "4kind", name: "Four of a Kind", fn: (d) => (maxCount(d) >= 4 ? sum(d) : 0) },
      { key: "full", name: "Full House", fn: (d) => (isFullHouse(d) ? 25 : 0) },
      { key: "sm", name: "Small Straight", fn: (d) => (straight(d) >= 4 ? 30 : 0) },
      { key: "lg", name: "Large Straight", fn: (d) => (straight(d) === 5 ? 40 : 0) },
    ];
    function sum(a) { return a.reduce((x, y) => x + y, 0); }
    function counts(d) { const c = {}; d.forEach((x) => (c[x] = (c[x] || 0) + 1)); return c; }
    function maxCount(d) { return Math.max(...Object.values(counts(d))); }
    function isFullHouse(d) { const v = Object.values(counts(d)).sort(); return v.length === 2 && v[0] === 2 && v[1] === 3; }
    function straight(d) {
      const s = [...new Set(d)].sort((a, b) => a - b);
      let best = 1, run = 1;
      for (let i = 1; i < s.length; i++) { if (s[i] === s[i - 1] + 1) { run++; best = Math.max(best, run); } else run = 1; }
      return best;
    }

    const sheets = names.map(() => ({}));
    let turn = 0, dice = [1, 1, 1, 1, 1], held = [false, false, false, false, false], rolls = 0, turnDone = 0;

    // responsive: side-by-side on wide screens (keeps the dice big), stacked on phones
    const wide = window.innerWidth >= 640;
    const W = Math.min(460, window.innerWidth - 40);
    const dieSize = wide ? 64 : Math.max(44, Math.floor((W - 44) / 5));

    // die face drawn with CSS pips (the ⚀-⚅ glyphs render blank on many devices)
    const PIP = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
    function faceHtml(d) {
      const set = PIP[d] || [];
      const dot = Math.max(8, Math.round(dieSize * 0.16));
      let h = "<div style='display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);width:100%;height:100%;gap:1px;padding:" + Math.round(dieSize * 0.16) + "px;box-sizing:border-box'>";
      for (let i = 1; i <= 9; i++) {
        h += "<div style='display:grid;place-items:center'>" + (set.indexOf(i) !== -1
          ? "<div style='width:" + dot + "px;height:" + dot + "px;border-radius:50%;background:#173a2b'></div>" : "") + "</div>";
      }
      return h + "</div>";
    }

    const diceRow = api.el("div", "");
    diceRow.style.cssText = "display:flex;gap:8px;justify-content:center;flex-wrap:wrap";
    const dieEls = dice.map((_, i) => {
      const b = api.el("button", "");
      b.style.cssText = "width:" + dieSize + "px;height:" + dieSize + "px;border-radius:14px;padding:0;background:#fff;" +
        "border:3px solid transparent;cursor:pointer;box-shadow:var(--shadow);box-sizing:border-box";
      b.addEventListener("click", () => { if (rolls > 0 && !over) { held[i] = !held[i]; b.style.borderColor = held[i] ? "var(--mint-600)" : "transparent"; } });
      diceRow.appendChild(b); return b;
    });
    const rollBtn = api.el("button", "btn primary");
    rollBtn.addEventListener("click", roll);

    const left = api.el("div", "");
    left.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:14px";
    left.appendChild(diceRow); left.appendChild(rollBtn);

    const card = api.el("div", "");
    card.style.cssText = "display:grid;grid-template-columns:1fr auto;gap:4px 14px;background:#fff;padding:14px 18px;border-radius:var(--radius);box-shadow:var(--shadow);" +
      (wide ? "min-width:300px" : "width:100%");

    const wrap = api.el("div", "");
    wrap.style.cssText = wide
      ? "display:flex;gap:22px;align-items:flex-start;justify-content:center"
      : "display:flex;flex-direction:column;align-items:center;gap:16px;width:" + W + "px";
    wrap.appendChild(left); wrap.appendChild(card);
    api.board.appendChild(wrap);

    let over = false;

    function drawDice() { dieEls.forEach((b, i) => (b.innerHTML = faceHtml(dice[i]))); }
    function totals(p) {
      let upper = 0, lower = 0;
      CATS.forEach((c) => { const v = sheets[p][c.key]; if (v == null) return; if (c.up) upper += v; else lower += v; });
      const bonus = upper >= 63 ? 35 : 0;
      return { upper, bonus, total: upper + bonus + lower };
    }
    function board() {
      api.setScores(names.map((n, i) => ({ name: n, value: totals(i).total, color: api.colors[i], turn: i === turn && !over })));
    }
    function renderCard() {
      card.innerHTML = "";
      const head = api.el("div", "", "<b>" + names[turn] + "'s card</b>");
      head.style.gridColumn = "1 / span 2"; head.style.color = "var(--mint-700)";
      card.appendChild(head);
      CATS.forEach((c) => {
        const used = sheets[turn][c.key] != null;
        const label = api.el("div", "", c.name);
        label.style.cssText = "padding:4px 0;" + (c.up ? "" : "");
        const val = api.el(used ? "div" : "button", used ? "" : "btn small");
        if (used) { val.textContent = sheets[turn][c.key]; val.style.cssText = "text-align:right;font-weight:700;color:var(--ink-soft);padding:4px 8px"; }
        else if (rolls > 0) {
          const pot = c.fn(dice);
          val.textContent = pot; val.style.minWidth = "44px";
          val.addEventListener("click", () => pick(c.key, pot));
        } else { val.textContent = "–"; val.disabled = true; val.style.cssText = "min-width:44px;opacity:.5"; }
        card.appendChild(label); card.appendChild(val);
      });
      const t = totals(turn);
      const foot = api.el("div", "", "Upper " + t.upper + (t.bonus ? " (+35 bonus)" : "") + " · <b>Total " + t.total + "</b>");
      foot.style.cssText = "grid-column:1 / span 2;margin-top:6px;color:var(--mint-700)";
      card.appendChild(foot);
    }
    function roll() {
      if (over || rolls >= 3) return;
      dice = dice.map((d, i) => (held[i] && rolls > 0 ? d : 1 + ((Math.random() * 6) | 0)));
      rolls++;
      drawDice(); renderCard();
      rollBtn.textContent = rolls < 3 ? "🎲 Roll (" + (3 - rolls) + " left)" : "No rolls left — pick a category";
      rollBtn.disabled = rolls >= 3;
      api.setStatus(rolls < 3 ? "Tap dice to hold, then roll again — or bank a score." : "Pick a category to bank your dice.");
    }
    function pick(key, val) {
      if (over || rolls === 0 || sheets[turn][key] != null) return;
      sheets[turn][key] = val;
      turnDone++;
      // reset for next turn
      held = [false, false, false, false, false];
      dieEls.forEach((b) => (b.style.borderColor = "transparent"));
      rolls = 0; dice = [1, 1, 1, 1, 1]; drawDice();
      board();
      if (turnDone >= names.length * CATS.length) return finish();
      turn = (turn + 1) % names.length;
      newTurn();
    }
    function newTurn() {
      rollBtn.disabled = false; rollBtn.textContent = "🎲 Roll";
      renderCard(); board();
      api.setStatus("🎲 " + names[turn] + "'s turn — roll the dice!");
    }
    function finish() {
      over = true;
      const tot = names.map((_, i) => totals(i).total);
      const max = Math.max(...tot);
      const champs = names.filter((_, i) => tot[i] === max);
      if (api.submitScore) api.submitScore(max); // highest total of the game ranks on the board
      renderCard();
      api.setStatus(names.length === 1
        ? "🎉 Final score: <b>" + tot[0] + "</b>, " + names[0] + "!"
        : (champs.length > 1 ? "🤝 Tie at " + max + "!" : "🏆 " + champs[0] + " wins with " + max + " points! 🎉"));
    }

    drawDice(); newTurn();
    return { stop() {} };
  },
});
