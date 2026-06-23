/* Pig — push-your-luck dice, 2 to 4 players */
Arcade.register({
  id: "pig",
  name: "Pig (Dice)",
  emoji: "🎲",
  tagline: "Roll to build points — but bank them before a 1 wipes your turn!",
  tags: ["Dice", "Family", "Quick"],
  minPlayers: 2,
  maxPlayers: 4,
  rules: [
    "On your turn, roll the die as many times as you dare.",
    "Each roll adds to your running turn total.",
    "Roll a 1 and you lose the whole turn total — your turn ends!",
    "Hold to bank your turn total. First to the target score wins.",
  ],
  options: [
    { key: "target", label: "Target score", type: "select", default: 100,
      choices: [{ label: "50 (quick)", value: 50 }, { label: "100", value: 100 }] },
  ],

  create(api) {
    const names = api.config.players;
    const target = api.config.options.target;
    const banked = names.map(() => 0);
    let turn = 0, running = 0, over = false, rolling = false;

    const wrap = api.el("div", "");
    wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:18px";
    const dieEl = api.el("div", "");
    dieEl.style.cssText = "width:96px;height:96px;border-radius:20px;background:#fff;box-shadow:var(--shadow);display:grid;place-items:center;font-size:70px";
    dieEl.textContent = "🎲";
    const runEl = api.el("div", "");
    runEl.style.cssText = "font-size:20px;font-weight:800;color:var(--mint-700)";
    const btns = api.el("div", ""); btns.style.cssText = "display:flex;gap:12px";
    const rollBtn = api.el("button", "btn primary", "🎲 Roll");
    const holdBtn = api.el("button", "btn ghost", "🏦 Hold");
    rollBtn.addEventListener("click", roll); holdBtn.addEventListener("click", hold);
    btns.appendChild(rollBtn); btns.appendChild(holdBtn);
    wrap.appendChild(dieEl); wrap.appendChild(runEl); wrap.appendChild(btns);
    api.board.appendChild(wrap);

    const FACE = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
    function board() {
      api.setScores(names.map((n, i) => ({ name: n, value: banked[i] + "/" + target, color: api.colors[i], turn: i === turn && !over })));
    }
    function setRun() { runEl.textContent = "Turn total: " + running; }
    function roll() {
      if (over || rolling) return;
      rolling = true; rollBtn.disabled = true; holdBtn.disabled = true;
      let ticks = 0;
      const anim = setInterval(() => {
        dieEl.textContent = FACE[(Math.random() * 6) | 0];
        if (++ticks > 6) {
          clearInterval(anim);
          const d = 1 + ((Math.random() * 6) | 0);
          dieEl.textContent = FACE[d - 1];
          rolling = false;
          if (d === 1) {
            running = 0; setRun();
            api.setStatus("🎲 Rolled a 1 — turn lost! Passing to next player.");
            setTimeout(nextTurn, 900);
          } else {
            running += d; setRun();
            rollBtn.disabled = false; holdBtn.disabled = false;
            api.setStatus(names[turn] + " rolled " + d + ". Roll again or Hold?");
          }
        }
      }, 60);
    }
    function hold() {
      if (over || rolling) return;
      banked[turn] += running; board();
      if (banked[turn] >= target) { over = true; rollBtn.disabled = holdBtn.disabled = true; api.setStatus("🏆 " + names[turn] + " banked " + banked[turn] + " and wins! 🎉"); return; }
      api.setStatus("🏦 " + names[turn] + " banked " + running + " points.");
      setTimeout(nextTurn, 700);
    }
    function nextTurn() {
      running = 0; setRun();
      turn = (turn + 1) % names.length;
      rollBtn.disabled = holdBtn.disabled = false;
      board();
      api.setStatus("🎲 " + names[turn] + "'s turn — Roll to start!");
    }

    setRun(); board();
    api.setStatus("🎲 " + names[0] + " starts — Roll the die!");
    return { stop() {} };
  },
});
