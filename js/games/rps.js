/* Rock Paper Scissors — vs computer or hot-seat 2 players */
Arcade.register({
  id: "rps",
  name: "Rock Paper Scissors",
  emoji: "✊",
  tagline: "Rock smashes scissors, scissors cut paper, paper covers rock.",
  tags: ["Quick", "Duel"],
  minPlayers: 1,
  maxPlayers: 2,
  rules: [
    "Each player secretly picks Rock, Paper, or Scissors.",
    "Rock beats Scissors, Scissors beats Paper, Paper beats Rock.",
    "Same pick = tie, replay the round.",
    "First to win the chosen number of rounds takes the match.",
  ],
  options: [
    {
      key: "best", label: "Win target", type: "select", default: 3,
      choices: [{ label: "First to 3", value: 3 }, { label: "First to 5", value: 5 }],
    },
  ],

  create(api) {
    const HANDS = [{ k: "rock", e: "✊", n: "Rock" }, { k: "paper", e: "✋", n: "Paper" }, { k: "scissors", e: "✌️", n: "Scissors" }];
    const vsAI = api.config.players.length === 1;
    const names = vsAI ? [api.config.players[0], "🤖 Computer"] : api.config.players;
    const target = api.config.options.best;
    const wins = [0, 0];
    let p1Choice = null;

    const wrap = api.el("div", "");
    wrap.style.textAlign = "center";
    const handsRow = api.el("div", "");
    handsRow.style.cssText = "display:flex;gap:14px;justify-content:center;margin-top:8px";
    const buttons = HANDS.map((h) => {
      const b = api.el("button", "btn");
      b.style.cssText = "font-size:48px;width:96px;height:96px;border-radius:24px;background:#fff;box-shadow:var(--shadow)";
      b.textContent = h.e;
      b.title = h.n;
      b.addEventListener("click", () => pick(h));
      handsRow.appendChild(b);
      return b;
    });
    wrap.appendChild(handsRow);
    api.board.appendChild(wrap);

    function score() {
      api.setScores(names.map((n, i) => ({ name: n, value: wins[i] + "/" + target, color: api.colors[i] })));
    }
    function beats(a, b) { // index of HANDS
      return (a === 0 && b === 2) || (a === 1 && b === 0) || (a === 2 && b === 1);
    }
    function pick(h) {
      const idx = HANDS.indexOf(h);
      if (vsAI) {
        const ai = (Math.random() * 3) | 0;
        resolve(idx, ai);
      } else if (p1Choice == null) {
        p1Choice = idx;
        api.setStatus("✅ " + names[0] + " locked in. " + names[1] + ", make your pick (no peeking 😄).");
      } else {
        resolve(p1Choice, idx);
        p1Choice = null;
      }
    }
    function resolve(a, b) {
      let msg = names[0] + " " + HANDS[a].e + " vs " + HANDS[b].e + " " + names[1] + " — ";
      if (a === b) { msg += "tie! Go again."; }
      else if (beats(a, b)) { wins[0]++; msg += "🏆 " + names[0] + " wins the round!"; }
      else { wins[1]++; msg += "🏆 " + names[1] + " wins the round!"; }
      score();
      if (wins[0] >= target || wins[1] >= target) {
        const w = wins[0] >= target ? 0 : 1;
        msg = "🎉 " + names[w] + " wins the match " + wins[w] + "–" + wins[1 - w] + "! Restart to replay.";
        buttons.forEach((b) => (b.disabled = true));
      }
      api.setStatus(msg);
    }

    score();
    api.setStatus(vsAI ? "Pick your hand! 👊" : names[0] + ", make the first secret pick.");
    return { stop() {} };
  },
});
