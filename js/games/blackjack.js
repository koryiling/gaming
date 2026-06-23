/* Blackjack — 1 to 4 players vs the dealer, hot-seat */
Arcade.register({
  id: "blackjack",
  name: "Blackjack",
  emoji: "🃏",
  tagline: "Beat the dealer to 21 — but don't go bust. Hit or stand?",
  tags: ["Cards", "Family"],
  minPlayers: 1,
  maxPlayers: 4,
  rules: [
    "Get your hand as close to 21 as possible without going over.",
    "Number cards = face value, J/Q/K = 10, Ace = 11 or 1 (whichever helps).",
    "Hit to draw a card, Stand to hold. Over 21 = bust.",
    "Beat the dealer's total to win the round. Dealer draws until 17+.",
  ],
  options: [
    { key: "decks", label: "Decks in shoe", type: "select", default: 4,
      choices: [{ label: "1", value: 1 }, { label: "4", value: 4 }, { label: "6", value: 6 }] },
  ],

  create(api) {
    const names = api.config.players;
    const SUITS = ["♠", "♥", "♦", "♣"];
    const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    const wins = names.map(() => 0), losses = names.map(() => 0);
    let shoe, dealer, hands, cur, phase;

    const dealerEl = api.el("div", ""); dealerEl.style.cssText = "text-align:center;margin-bottom:14px";
    const playersEl = api.el("div", ""); playersEl.style.cssText = "display:flex;flex-direction:column;gap:12px;align-items:center";
    const controls = api.el("div", ""); controls.style.cssText = "text-align:center;margin-top:16px;display:flex;gap:10px;justify-content:center";
    api.board.appendChild(dealerEl); api.board.appendChild(playersEl); api.board.appendChild(controls);

    function buildShoe() {
      shoe = [];
      for (let d = 0; d < api.config.options.decks; d++)
        for (const s of SUITS) for (const r of RANKS) shoe.push({ r, s });
      for (let i = shoe.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [shoe[i], shoe[j]] = [shoe[j], shoe[i]]; }
    }
    function draw() { if (shoe.length < 15) buildShoe(); return shoe.pop(); }
    function value(cards) {
      let total = 0, aces = 0;
      cards.forEach((c) => {
        if (c.r === "A") { aces++; total += 11; }
        else if (["J", "Q", "K"].includes(c.r)) total += 10;
        else total += +c.r;
      });
      while (total > 21 && aces) { total -= 10; aces--; }
      return total;
    }
    function cardHTML(c, hidden) {
      const red = c && (c.s === "♥" || c.s === "♦");
      const face = hidden ? "🂠" : c.r + c.s;
      return '<span style="display:inline-grid;place-items:center;min-width:42px;height:60px;margin:3px;border-radius:8px;background:#fff;' +
        'box-shadow:var(--shadow);font-size:18px;font-weight:800;color:' + (hidden ? "#2e9d6c" : red ? "#e74c3c" : "#173a2b") + '">' + face + "</span>";
    }
    function scoreboard() {
      api.setScores(names.map((n, i) => ({ name: n, value: wins[i] + "W/" + losses[i] + "L", color: api.colors[i], turn: phase === "play" && i === cur })));
    }

    function deal() {
      if (!shoe) buildShoe();
      dealer = [draw(), draw()];
      hands = names.map(() => [draw(), draw()]);
      cur = 0; phase = "play";
      renderDealer(true); renderPlayers(); scoreboard();
      const bj = value(hands[0]) === 21;
      api.setStatus(bj ? "✨ Blackjack! " + names[0] + ", Stand to keep it." : names[0] + "'s turn — Hit or Stand?");
      renderControls();
      autoSkipBlackjack();
    }
    function autoSkipBlackjack() { /* players decide; 21 is just strong */ }
    function renderDealer(hideHole) {
      const shown = hideHole ? [dealer[0], { hidden: true }] : dealer;
      const val = hideHole ? value([dealer[0]]) + " + ?" : value(dealer);
      dealerEl.innerHTML = "<div style='font-weight:800;margin-bottom:4px'>🎩 Dealer <span style='color:var(--mint-700)'>(" + val + ")</span></div>" +
        shown.map((c) => cardHTML(c.hidden ? null : c, c.hidden)).join("");
    }
    function renderPlayers() {
      playersEl.innerHTML = "";
      names.forEach((n, i) => {
        const v = value(hands[i]);
        const bust = v > 21;
        const row = api.el("div", "");
        row.style.cssText = "padding:8px 14px;border-radius:14px;background:#fff;box-shadow:var(--shadow);min-width:240px;text-align:center;" +
          "border:2px solid " + (phase === "play" && i === cur ? "var(--mint-500)" : "transparent");
        row.innerHTML = "<div style='font-weight:800'>" + n + " <span style='color:" + (bust ? "#e74c3c" : "var(--mint-700)") + "'>(" + v + (bust ? " bust" : "") + ")</span></div>" +
          hands[i].map((c) => cardHTML(c)).join("");
        playersEl.appendChild(row);
      });
    }
    function renderControls() {
      controls.innerHTML = "";
      if (phase === "play") {
        const hit = api.el("button", "btn primary", "🃏 Hit");
        const stand = api.el("button", "btn ghost", "✋ Stand");
        hit.addEventListener("click", () => { hands[cur].push(draw()); renderPlayers(); if (value(hands[cur]) >= 21) nextPlayer(); else api.setStatus(names[cur] + ": " + value(hands[cur]) + ". Hit or Stand?"); });
        stand.addEventListener("click", nextPlayer);
        controls.appendChild(hit); controls.appendChild(stand);
      } else {
        const again = api.el("button", "btn primary", "🔄 Deal next round");
        again.addEventListener("click", deal);
        controls.appendChild(again);
      }
    }
    function nextPlayer() {
      renderPlayers();
      if (cur < names.length - 1) { cur++; scoreboard(); renderPlayers(); api.setStatus(names[cur] + "'s turn — Hit or Stand?"); }
      else dealerTurn();
    }
    function dealerTurn() {
      phase = "dealer"; scoreboard(); renderDealer(false);
      while (value(dealer) < 17) dealer.push(draw());
      renderDealer(false);
      const dv = value(dealer), dBust = dv > 21;
      const results = names.map((n, i) => {
        const v = value(hands[i]);
        let r;
        if (v > 21) r = "lose";
        else if (dBust || v > dv) r = "win";
        else if (v === dv) r = "push";
        else r = "lose";
        if (r === "win") wins[i]++; else if (r === "lose") losses[i]++;
        return n + ": " + (r === "win" ? "🏆 win" : r === "push" ? "🤝 push" : "❌ lose");
      });
      phase = "over"; scoreboard(); renderControls();
      api.setStatus("Dealer has <b>" + dv + (dBust ? " (bust)" : "") + "</b>. " + results.join(" · "));
    }

    deal();
    return { stop() {} };
  },
});
