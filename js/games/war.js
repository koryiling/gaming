/* War — flip cards, highest wins the round; most rounds wins */
Arcade.register({
  id: "war",
  name: "War",
  emoji: "⚔️",
  tagline: "Split the deck and flip — the higher card takes the round. Most rounds wins the war.",
  tags: ["Cards", "Duel", "Family"],
  minPlayers: 2,
  maxPlayers: 2,
  leaderboard: { type: "wins" },
  rules: [
    "The deck is split evenly between the two captains.",
    "Each press of Flip turns the top card for both players.",
    "Higher card wins the round (ties split). Most rounds when the deck runs out wins.",
    "Each match win is tallied on the leaderboard.",
  ],
  options: [],

  create(api) {
    const names = api.config.players;
    const colors = [api.colors[0], api.colors[4]];
    const SUITS = ["♠", "♥", "♦", "♣"], RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
    // build & shuffle a 52-card deck
    const deck = [];
    for (let r = 0; r < 13; r++) for (let s = 0; s < 4; s++) deck.push({ r, s });
    for (let i = deck.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; const t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
    const hands = [[], []];
    deck.forEach((c, i) => hands[i % 2].push(c));
    let idx = 0, wins = [0, 0], over = false;

    const wrap = api.el("div", "");
    wrap.style.cssText = "display:flex;flex-direction:column;gap:18px;align-items:center;padding:10px";
    const row = api.el("div", "");
    row.style.cssText = "display:flex;gap:28px;align-items:center";
    const cardEls = [makeCard(), makeCard()];
    row.appendChild(labeled(names[0], cardEls[0]));
    const vs = api.el("div", "", "⚔️"); vs.style.fontSize = "30px";
    row.appendChild(vs);
    row.appendChild(labeled(names[1], cardEls[1]));
    const flip = api.el("button", "btn primary", "Flip! 🃏");
    wrap.appendChild(row); wrap.appendChild(flip);
    api.board.appendChild(wrap);

    function makeCard() {
      const c = api.el("div", "");
      c.style.cssText = "width:104px;height:146px;border-radius:14px;background:#fff;box-shadow:var(--shadow);" +
        "display:grid;place-items:center;font-size:40px;font-weight:800;border:2px solid var(--mint-200)";
      c.textContent = "🂠";
      return c;
    }
    function labeled(name, cardEl) {
      const col = api.el("div", "");
      col.style.cssText = "display:flex;flex-direction:column;gap:8px;align-items:center";
      const lab = api.el("div", "", name); lab.style.cssText = "font-weight:800";
      col.appendChild(lab); col.appendChild(cardEl);
      return col;
    }
    function paint(el, card) {
      el.textContent = RANKS[card.r] + SUITS[card.s];
      el.style.color = card.s === 1 || card.s === 2 ? "#e74c3c" : "var(--ink)";
    }
    function score() {
      api.setScores(names.map((n, i) => ({ name: n, value: wins[i] + " rounds", color: colors[i], turn: false })));
    }
    function flipRound() {
      if (over) return;
      const a = hands[0][idx], b = hands[1][idx];
      paint(cardEls[0], a); paint(cardEls[1], b);
      if (a.r > b.r) { wins[0]++; api.setStatus("🔺 " + names[0] + " takes the round!"); }
      else if (b.r > a.r) { wins[1]++; api.setStatus("🔻 " + names[1] + " takes the round!"); }
      else api.setStatus("🤝 Tie — no points.");
      idx++; score();
      if (idx >= hands[0].length) {
        over = true; flip.disabled = true;
        const w = wins[0] === wins[1] ? -1 : (wins[0] > wins[1] ? 0 : 1);
        if (w === -1) api.setStatus("🤝 The war ends in a draw! " + wins[0] + "–" + wins[1] + ".");
        else { api.recordWin(names[w]); api.setStatus("🏆 " + names[w] + " wins the war " + Math.max(wins[0], wins[1]) + "–" + Math.min(wins[0], wins[1]) + "! (win recorded)"); }
      }
    }
    flip.addEventListener("click", flipRound);

    score();
    api.setStatus("Press Flip to turn the first cards 🃏");
    return { stop() {} };
  },
});
