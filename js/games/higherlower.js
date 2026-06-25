/* Higher or Lower — call the next card right and build a streak */
Arcade.register({
  id: "higherlower",
  name: "Higher or Lower",
  emoji: "🃏",
  tagline: "Will the next card be higher or lower? Ride your streak as far as you dare.",
  tags: ["Cards", "Quick", "Family", "Solo"],
  category: "number",
  minPlayers: 1,
  maxPlayers: 1,
  leaderboard: { type: "score" }, // your best streak in one game ranks highest → lowest (not summed)
  rules: [
    "A card is shown (Ace low, King high).",
    "Guess whether the next card will be higher or lower.",
    "A correct call extends your streak; a wrong one ends the run.",
    "Equal value counts as a miss — your score is your best streak.",
  ],
  options: [],

  create(api) {
    const SUITS = ["♠", "♥", "♦", "♣"], RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    let current = draw(), streak = 0, over = false;
    function draw() { return { r: Math.random() * 13 | 0, s: Math.random() * 4 | 0 }; }

    const wrap = api.el("div", "");
    wrap.style.cssText = "display:flex;flex-direction:column;gap:18px;align-items:center;padding:10px";
    const card = api.el("div", "");
    card.style.cssText = "width:120px;height:168px;border-radius:16px;background:#fff;box-shadow:var(--shadow);" +
      "display:grid;place-items:center;font-size:46px;font-weight:800;border:2px solid var(--mint-200)";
    const btns = api.el("div", "");
    btns.style.cssText = "display:flex;gap:12px";
    const up = api.el("button", "btn primary", "▲ Higher");
    const down = api.el("button", "btn primary", "▼ Lower");
    btns.appendChild(up); btns.appendChild(down);
    wrap.appendChild(card); wrap.appendChild(btns);
    api.board.appendChild(wrap);

    function render() {
      card.textContent = RANKS[current.r] + SUITS[current.s];
      card.style.color = current.s === 1 || current.s === 2 ? "#e74c3c" : "var(--ink)";
      api.setScores([{ name: api.config.username, value: streak, color: api.colors[0] }]);
    }
    function call(higher) {
      if (over) return;
      const next = draw();
      const ok = higher ? next.r > current.r : next.r < current.r;
      current = next;
      if (ok) { streak++; render(); api.setStatus("✅ Right! Streak " + streak + ". Keep going?"); }
      else {
        over = true; render();
        up.disabled = down.disabled = true;
        if (api.submitScore) api.submitScore(streak); // best streak in one game ranks highest
        api.setStatus("❌ It was " + RANKS[current.r] + SUITS[current.s] + ". Final streak " + streak + ". Hit Restart to play again.");
      }
    }
    up.addEventListener("click", () => call(true));
    down.addEventListener("click", () => call(false));

    render();
    api.setStatus("Higher or lower than " + RANKS[current.r] + "? Make the call!");
    return { stop() {} };
  },
});
