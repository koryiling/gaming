/* Dice Sprint — push your luck across rounds for the best total */
Arcade.register({
  id: "dicesprint",
  name: "Dice Sprint",
  emoji: "🎲",
  tagline: "Roll, bank, and push your luck across five rounds for the highest total you dare.",
  tags: ["Dice", "Family", "Solo"],
  minPlayers: 1,
  maxPlayers: 1,
  rules: [
    "Each round, keep rolling to build a round total.",
    "But roll a ⚀ (one) and the round busts — you lose that round's points!",
    "Bank before busting to lock the points. Best total after 5 rounds is your score.",
  ],
  options: [
    { key: "rounds", label: "Rounds", type: "select", default: 5,
      choices: [{ label: "3 rounds", value: 3 }, { label: "5 rounds", value: 5 }, { label: "7 rounds", value: 7 }] },
  ],

  create(api) {
    const ROUNDS = api.config.options.rounds;
    const FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
    let total = 0, round = 1, pot = 0, over = false;

    const wrap = api.el("div", "");
    wrap.style.cssText = "display:flex;flex-direction:column;gap:18px;align-items:center;padding:10px";
    const die = api.el("div", "", "🎲");
    die.style.cssText = "font-size:84px;line-height:1";
    const potLine = api.el("p", "", "");
    potLine.style.cssText = "font-size:18px;font-weight:700;color:var(--ink)";
    const btns = api.el("div", ""); btns.style.cssText = "display:flex;gap:12px";
    const roll = api.el("button", "btn primary", "Roll 🎲");
    const bank = api.el("button", "btn ghost", "Bank 💰");
    btns.appendChild(roll); btns.appendChild(bank);
    wrap.appendChild(die); wrap.appendChild(potLine); wrap.appendChild(btns);
    api.board.appendChild(wrap);

    function score() { api.setScores([{ name: api.config.username, value: total, color: api.colors[0] }]); }
    function update() {
      potLine.innerHTML = "Round <b>" + round + "/" + ROUNDS + "</b> · this round: <b>" + pot + "</b> · banked total: <b>" + total + "</b>";
      score();
    }
    function endRoundCheck() {
      if (round > ROUNDS) {
        over = true; roll.disabled = bank.disabled = true;
        api.setStatus("🏁 Sprint over! Final total " + total + ". Hit Restart to run again.");
      }
    }
    function doRoll() {
      if (over) return;
      const v = (Math.random() * 6 | 0) + 1;
      die.textContent = FACES[v - 1];
      if (v === 1) {
        pot = 0;
        api.setStatus("💥 Busted! Round " + round + " scores nothing.");
        round++; update(); endRoundCheck();
        if (!over) api.setStatus(api.config.username + ": round " + round + " — roll or bank.");
      } else {
        pot += v;
        update();
        api.setStatus("Rolled " + v + " — round pot " + pot + ". Roll again or bank?");
      }
    }
    function doBank() {
      if (over || pot === 0) return;
      total += pot;
      api.setStatus("💰 Banked " + pot + "! Total " + total + ".");
      pot = 0; round++; update(); endRoundCheck();
    }
    roll.addEventListener("click", doRoll);
    bank.addEventListener("click", doBank);

    update();
    api.setStatus("Roll to build your round pot — bank it before a ⚀ busts you!");
    return { stop() {} };
  },
});
