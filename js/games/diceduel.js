/* Dice Duel — race to the target total, 2-4 players */
Arcade.register({
  id: "diceduel",
  name: "Dice Duel",
  emoji: "🎲",
  tagline: "Take turns rolling — first captain to race their total to the target wins the duel.",
  tags: ["Dice", "Duel", "Family", "Quick"],
  minPlayers: 2,
  maxPlayers: 4,
  leaderboard: { type: "wins" },
  rules: [
    "Players take turns rolling a single die.",
    "Your roll adds to your running total.",
    "First to reach the target total wins — each win is tallied on the leaderboard.",
  ],
  options: [
    { key: "target", label: "Target total", type: "select", default: 30,
      choices: [{ label: "20 (quick)", value: 20 }, { label: "30", value: 30 }, { label: "50 (long)", value: 50 }] },
  ],

  create(api) {
    const names = api.config.players, P = names.length;
    const colors = names.map((_, i) => api.colors[i % api.colors.length]);
    const TARGET = api.config.options.target;
    const totals = names.map(() => 0);
    const FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
    let turn = 0, over = false;

    const wrap = api.el("div", "");
    wrap.style.cssText = "display:flex;flex-direction:column;gap:20px;align-items:center;padding:10px";
    const die = api.el("div", "", "🎲");
    die.style.cssText = "font-size:88px;line-height:1";
    const roll = api.el("button", "btn primary", "Roll 🎲");
    wrap.appendChild(die); wrap.appendChild(roll);
    api.board.appendChild(wrap);

    function score() {
      api.setScores(names.map((n, i) => ({ name: n, value: totals[i] + "/" + TARGET, color: colors[i], turn: i === turn && !over })));
    }
    function doRoll() {
      if (over) return;
      const v = (Math.random() * 6 | 0) + 1;
      die.textContent = FACES[v - 1];
      totals[turn] += v;
      if (totals[turn] >= TARGET) {
        over = true; roll.disabled = true; score();
        api.recordWin(names[turn]);
        api.setStatus("🏆 " + names[turn] + " hits " + totals[turn] + " and wins the duel! 🎉 (win recorded)");
        return;
      }
      api.setStatus(names[turn] + " rolled " + v + " → total " + totals[turn] + ".");
      turn = (turn + 1) % P;
      score();
      setTimeout(() => api.setStatus("🎲 " + names[turn] + "'s turn — tap Roll!"), 600);
    }
    roll.addEventListener("click", doRoll);

    score();
    api.setStatus("🎲 " + names[turn] + "'s turn — tap Roll to start!");
    return { stop() {} };
  },
});
