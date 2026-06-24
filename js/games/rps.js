/* Rock Paper Scissors — vs computer or hot-seat 2 players.
 * Both picks are revealed side by side, the round winner is shown, and every
 * round is logged in a history board. */
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
    "Both picks are revealed; same pick = tie and replays.",
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
    const colors = [api.colors[0], api.colors[2]];
    const target = api.config.options.best;
    const wins = [0, 0];
    let p1Choice = null, roundNo = 0, over = false;

    const wrap = api.el("div", "");
    wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:14px;width:100%;max-width:380px";

    // reveal area — both players' chosen hands, side by side
    function makeCard(name, color) {
      const c = api.el("div", "");
      c.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:6px";
      const nm = api.el("div", "", name);
      nm.style.cssText = "font-weight:800;color:" + color + ";font-size:14px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
      const box = api.el("div", "");
      box.style.cssText = "width:88px;height:88px;border-radius:20px;background:#fff;box-shadow:var(--shadow);" +
        "display:grid;place-items:center;font-size:46px;border:3px solid var(--mint-200)";
      box.textContent = "❔";
      c.appendChild(nm); c.appendChild(box);
      return { box: box };
    }
    const revealRow = api.el("div", "");
    revealRow.style.cssText = "display:flex;align-items:center;justify-content:center;gap:14px";
    const card1 = makeCard(names[0], colors[0]);
    const vsLabel = api.el("div", "", "VS");
    vsLabel.style.cssText = "font-weight:800;color:var(--ink-soft);font-size:18px";
    const card2 = makeCard(names[1], colors[1]);
    revealRow.appendChild(card1.box.parentNode);
    revealRow.appendChild(vsLabel);
    revealRow.appendChild(card2.box.parentNode);
    wrap.appendChild(revealRow);

    const resultLine = api.el("div", "");
    resultLine.style.cssText = "min-height:26px;font-weight:800;font-size:18px;color:var(--mint-700)";
    wrap.appendChild(resultLine);

    // hand buttons
    const handsRow = api.el("div", "");
    handsRow.style.cssText = "display:flex;gap:12px;justify-content:center";
    const buttons = HANDS.map((h) => {
      const b = api.el("button", "btn");
      b.style.cssText = "font-size:44px;width:88px;height:88px;border-radius:22px;background:#fff;box-shadow:var(--shadow);touch-action:manipulation";
      b.textContent = h.e;
      b.title = h.n;
      b.addEventListener("click", () => pick(h));
      handsRow.appendChild(b);
      return b;
    });
    wrap.appendChild(handsRow);

    // history board
    const hist = api.el("div", "");
    hist.style.cssText = "width:100%;border:2px solid var(--mint-200);border-radius:14px;background:#fff;" +
      "box-shadow:var(--shadow);padding:10px 14px;max-height:190px;overflow-y:auto;text-align:left";
    const histTitle = api.el("div", "", "📜 History");
    histTitle.style.cssText = "font-weight:800;color:var(--ink);font-size:15px;margin-bottom:4px";
    const histList = api.el("div", "");
    const histEmpty = api.el("div", "", "No rounds yet — make a pick! 🌱");
    histEmpty.style.cssText = "color:var(--ink-soft);font-style:italic;font-size:13px;padding:4px 0";
    histList.appendChild(histEmpty);
    hist.appendChild(histTitle); hist.appendChild(histList);
    wrap.appendChild(hist);

    api.board.appendChild(wrap);

    function score() {
      api.setScores(names.map((n, i) => ({ name: n, value: wins[i] + "/" + target, color: colors[i] })));
    }
    function beats(a, b) { return (a === 0 && b === 2) || (a === 1 && b === 0) || (a === 2 && b === 1); }

    function addHistory(a, b, winnerIdx) {
      if (histEmpty.parentNode) histEmpty.remove();
      const row = api.el("div", "");
      row.style.cssText = "display:flex;align-items:center;gap:8px;padding:5px 0;border-top:1px solid var(--mint-100);font-size:14px";
      const res = winnerIdx == null ? "🤝 Tie" : "🏆 " + names[winnerIdx];
      row.innerHTML =
        "<b style='width:40px;flex:none;color:var(--ink-soft)'>#" + roundNo + "</b>" +
        "<span style='font-size:22px'>" + HANDS[a].e + "</span>" +
        "<span style='color:var(--ink-soft)'>vs</span>" +
        "<span style='font-size:22px'>" + HANDS[b].e + "</span>" +
        "<span style='margin-left:auto;font-weight:700'>" + res + "</span>";
      histList.insertBefore(row, histList.firstChild); // newest on top
    }

    function pick(h) {
      if (over) return;
      const idx = HANDS.indexOf(h);
      if (vsAI) {
        resolve(idx, (Math.random() * 3) | 0);
      } else if (p1Choice == null) {
        p1Choice = idx;
        card1.box.textContent = "🔒";   // keep it secret
        card2.box.textContent = "❔";
        resultLine.textContent = "";
        api.setStatus("✅ " + names[0] + " locked in. " + names[1] + ", make your pick (no peeking 😄).");
      } else {
        resolve(p1Choice, idx);
        p1Choice = null;
      }
    }

    function resolve(a, b) {
      roundNo++;
      card1.box.textContent = HANDS[a].e;
      card2.box.textContent = HANDS[b].e;
      let winnerIdx = null;
      if (a === b) { resultLine.textContent = "🤝 Tie — go again!"; }
      else if (beats(a, b)) { winnerIdx = 0; wins[0]++; resultLine.textContent = "🏆 " + names[0] + " wins the round!"; }
      else { winnerIdx = 1; wins[1]++; resultLine.textContent = "🏆 " + names[1] + " wins the round!"; }
      addHistory(a, b, winnerIdx);
      score();
      if (wins[0] >= target || wins[1] >= target) {
        over = true;
        const w = wins[0] >= target ? 0 : 1;
        resultLine.textContent = "🎉 " + names[w] + " wins the match " + wins[w] + "–" + wins[1 - w] + "!";
        api.recordWin && api.recordWin(names[w]);
        buttons.forEach((btn) => (btn.disabled = true));
        api.setStatus("🎉 " + names[w] + " takes the match! Hit Restart to play again.");
      } else {
        api.setStatus(vsAI ? "Pick your hand! 👊" : names[0] + ", make the next secret pick.");
      }
    }

    score();
    api.setStatus(vsAI ? "Pick your hand! 👊" : names[0] + ", make the first secret pick.");
    return { stop() {} };
  },
});
