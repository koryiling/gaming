/* Number Detective — guess the secret number from higher/lower clues */
Arcade.register({
  id: "numberdetective",
  name: "Number Detective",
  emoji: "🕵️",
  tagline: "Sniff out the secret number from higher / lower clues in as few guesses as you can.",
  tags: ["Detective", "Number", "Classic", "Quick", "Solo"],
  minPlayers: 1,
  maxPlayers: 1,
  leaderboard: { type: "low" }, // fewest guesses to crack the number ranks highest (per game, not summed)
  rules: [
    "I'm thinking of a secret number in the chosen range.",
    "Type a guess and press Enter — I'll say higher 📈 or lower 📉.",
    "Crack it in as few tries as possible for a higher score!",
  ],
  options: [
    { key: "max", label: "Range", type: "select", default: 100,
      choices: [{ label: "1–50", value: 50 }, { label: "1–100", value: 100 }, { label: "1–500", value: 500 }] },
  ],

  create(api) {
    const MAX = api.config.options.max;
    let secret = (Math.random() * MAX | 0) + 1, tries = 0, lo = 1, hi = MAX, over = false;

    const wrap = api.el("div", "");
    wrap.style.cssText = "display:flex;flex-direction:column;gap:16px;align-items:center;padding:10px";
    const range = api.el("p", "", "");
    range.style.cssText = "font-size:18px;color:var(--ink)";
    const input = api.el("input");
    input.type = "number"; input.min = 1; input.max = MAX;
    input.style.cssText = "padding:14px;font-size:24px;width:160px;text-align:center;border-radius:14px;border:2px solid var(--mint-300);outline:none";
    const btn = api.el("button", "btn primary", "Guess 🔍");
    wrap.appendChild(range); wrap.appendChild(input); wrap.appendChild(btn);
    api.board.appendChild(wrap);

    function show() {
      range.innerHTML = "Between <b>" + lo + "</b> and <b>" + hi + "</b> — your move.";
      api.setScores([{ name: api.config.username, value: tries + (tries === 1 ? " try" : " tries"), color: api.colors[0] }]);
    }
    function guess() {
      if (over) return;
      const v = parseInt(input.value, 10);
      if (!v || v < 1 || v > MAX) { api.toast("Enter a number 1–" + MAX); return; }
      tries++;
      if (v === secret) {
        over = true;
        if (api.submitScore) api.submitScore(tries); // fewest guesses ranks highest (lower is better)
        if (api.celebrate) api.celebrate("🎉 Cracked in " + tries + (tries === 1 ? " try" : " tries") + "!");
        api.setStatus("🎉 Cracked it in " + tries + (tries === 1 ? " try" : " tries") + "! The number was <b>" + secret + "</b>. Fewer guesses ranks higher 🏆. Hit Restart for a new case.");
        api.setScores([{ name: api.config.username, value: tries + (tries === 1 ? " try" : " tries"), color: api.colors[0] }]);
        return;
      }
      if (v < secret) { lo = Math.max(lo, v + 1); api.setStatus("📈 Higher than " + v + "…"); }
      else { hi = Math.min(hi, v - 1); api.setStatus("📉 Lower than " + v + "…"); }
      input.value = ""; input.focus(); show();
    }
    btn.addEventListener("click", guess);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") guess(); });

    show();
    api.setStatus("Type a guess and hit Guess 🔍");
    setTimeout(() => input.focus(), 0);
    return { stop() {} };
  },
});
