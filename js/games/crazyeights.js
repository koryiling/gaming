/* Crazy Eights — 2-player hot-seat card shedding */
Arcade.register({
  id: "crazyeights",
  name: "Crazy Eights",
  emoji: "🃏",
  tagline: "Shed your hand by matching suit or rank — and unleash wild 8s to switch the suit.",
  tags: ["Cards", "Duel", "Family"],
  minPlayers: 2,
  maxPlayers: 2,
  leaderboard: { type: "wins" },
  rules: [
    "Each player starts with 7 cards; one card starts the discard pile.",
    "On your turn, play a card matching the top card's suit or rank.",
    "An 8 is wild — play it anytime and choose the next suit.",
    "Can't play? Draw a card and your turn passes. First to empty their hand wins!",
  ],
  options: [],

  create(api) {
    const names = api.config.players;
    const colors = [api.colors[0], api.colors[4]];
    const SUITS = ["♠", "♥", "♦", "♣"], RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    const EIGHT = 7; // index of rank "8"
    function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; const t = a[i]; a[i] = a[j]; a[j] = t; } }

    let deck = [];
    for (let r = 0; r < 13; r++) for (let s = 0; s < 4; s++) deck.push({ r, s });
    shuffle(deck);
    const hands = [[], []];
    for (let k = 0; k < 7; k++) { hands[0].push(deck.pop()); hands[1].push(deck.pop()); }
    let start; do { start = deck.pop(); } while (start.r === EIGHT && deck.length);
    const discard = [start];
    let curSuit = start.s, curRank = start.r, turn = 0, over = false, phase = "gate";

    const root = api.el("div", "");
    root.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:16px;min-height:380px;justify-content:center;width:100%";
    api.board.appendChild(root);

    const top = () => discard[discard.length - 1];
    const cardStr = (c) => RANKS[c.r] + SUITS[c.s];
    const isRed = (c) => c.s === 1 || c.s === 2;
    const playable = (c) => c.r === EIGHT || c.s === curSuit || c.r === curRank;
    function score() {
      api.setScores(names.map((n, i) => ({ name: n, value: hands[i].length + " cards", color: colors[i], turn: phase === "play" && i === turn && !over })));
    }
    function drawCard() {
      if (!deck.length) { const t = discard.pop(); shuffle(discard); deck = discard.splice(0); discard.push(t); }
      return deck.pop();
    }
    function cardEl(c, big) {
      const w = big ? 80 : 58, h = big ? 112 : 82;
      const e = api.el("div", "", cardStr(c));
      e.style.cssText = "width:" + w + "px;height:" + h + "px;border-radius:12px;background:#fff;box-shadow:var(--shadow);" +
        "display:grid;place-items:center;font-size:" + (big ? 30 : 22) + "px;font-weight:800;border:2px solid var(--mint-200);color:" + (isRed(c) ? "#e74c3c" : "var(--ink)");
      return e;
    }

    function gate() {
      phase = "gate"; root.innerHTML = "";
      const p = api.el("p", "", "🤫 " + names[turn] + ", your turn. (" + names[1 - turn] + ", look away!)");
      p.style.cssText = "font-size:18px;font-weight:600;text-align:center;color:var(--ink)";
      const b = api.el("button", "btn primary", "I'm " + names[turn]);
      b.addEventListener("click", renderTurn);
      root.appendChild(p); root.appendChild(b);
      api.setStatus(""); score();
    }

    function topArea() {
      const wrap = api.el("div", "");
      wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:6px";
      const lab = api.el("div", "", "Top card · suit to match: <b>" + SUITS[curSuit] + "</b>");
      lab.style.cssText = "font-weight:700;color:var(--ink-soft)";
      wrap.appendChild(lab); wrap.appendChild(cardEl(top(), true));
      return wrap;
    }

    function renderTurn() {
      phase = "play"; root.innerHTML = "";
      root.appendChild(topArea());

      const hand = hands[turn];
      const anyPlayable = hand.some(playable);
      const handWrap = api.el("div", "");
      handWrap.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;justify-content:center;max-width:520px";
      hand.forEach((c, i) => {
        const e = cardEl(c, false);
        if (playable(c)) { e.style.cursor = "pointer"; e.addEventListener("click", () => playCard(i)); }
        else { e.style.opacity = "0.4"; }
        handWrap.appendChild(e);
      });
      root.appendChild(handWrap);

      const drawBtn = api.el("button", "btn ghost", "🃏 Draw a card");
      drawBtn.addEventListener("click", drawAction);
      root.appendChild(drawBtn);

      api.setStatus(anyPlayable ? names[turn] + ": play a glowing card, or draw." : names[turn] + ": no playable card — draw one.");
      score();
    }

    function finishTurn() {
      if (hands[turn].length === 0) {
        over = true;
        api.recordWin(names[turn]);
        phase = "over"; root.innerHTML = "";
        root.appendChild(topArea());
        api.setStatus("🏆 " + names[turn] + " shed every card and wins! 🎉 (win recorded)");
        score();
        return;
      }
      turn = 1 - turn; gate();
    }

    function playCard(i) {
      if (phase !== "play") return;
      const c = hands[turn].splice(i, 1)[0];
      discard.push(c); curRank = c.r; curSuit = c.s;
      if (c.r === EIGHT) chooseSuit(); else finishTurn();
    }
    function chooseSuit() {
      root.innerHTML = "";
      root.appendChild(topArea());
      const q = api.el("p", "", "♻️ Wild 8! " + names[turn] + ", choose the new suit:");
      q.style.cssText = "font-weight:700;color:var(--ink)";
      const row = api.el("div", ""); row.style.cssText = "display:flex;gap:10px";
      SUITS.forEach((s, si) => {
        const b = api.el("button", "btn primary", s);
        b.style.fontSize = "22px";
        b.style.color = (si === 1 || si === 2) ? "#ffd5cd" : "#fff";
        b.addEventListener("click", () => { curSuit = si; finishTurn(); });
        row.appendChild(b);
      });
      root.appendChild(q); root.appendChild(row);
    }
    function drawAction() {
      if (phase !== "play") return;
      hands[turn].push(drawCard());
      api.toast(names[turn] + " drew a card");
      turn = 1 - turn; gate();
    }

    score();
    gate();
    return { stop() {} };
  },
});
