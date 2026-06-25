/* Cooking Tycoon — serve hungry customers the right dish before time runs out */
Arcade.register({
  id: "cookingtycoon",
  name: "Cooking Tycoon",
  emoji: "🍳",
  tagline: "Run the kitchen! Cook the dish each customer wants, chain combos, and rake in cash.",
  category: "tycoon",
  tags: ["Tycoon", "Cooking", "Money", "Solo"],
  minPlayers: 1,
  maxPlayers: 1,
  leaderboard: { type: "score" }, // most money earned in a round
  rules: [
    "The customer at the front wants the dish shown in their speech bubble.",
    "Tap the matching dish in your kitchen to serve it and earn cash.",
    "Serve in a row to build a 🔥 combo — bigger combos pay more!",
    "A wrong dish breaks your combo. Earn as much as you can before time runs out. 🏆",
  ],
  options: [
    { key: "time", label: "Round length", type: "select", default: 60,
      choices: [{ label: "45s", value: 45 }, { label: "60s", value: 60 }, { label: "90s", value: 90 }] },
    { key: "menu", label: "Menu size", type: "select", default: 6,
      choices: [{ label: "Easy (4)", value: 4 }, { label: "Normal (6)", value: 6 }, { label: "Hard (8)", value: 8 }] },
  ],

  create(api) {
    const ALL = ["🍔", "🍕", "🌭", "🍟", "🌮", "🍣", "🍜", "🥗", "🍩", "🍳"];
    const menuSize = Math.min(api.config.options.menu, ALL.length);
    const menu = ALL.slice(0, menuSize);
    const rand = () => menu[(Math.random() * menu.length) | 0];

    let timeLeft = api.config.options.time;
    let money = 0, combo = 0, served = 0, over = false;
    let bestEver = api.loadBest ? api.loadBest() : 0;

    // order queue: index 0 is the active customer, the rest are the preview line
    let queue = [rand(), rand(), rand(), rand()];

    /* ---- layout (responsive: fills phones, capped + centred on desktop) ---- */
    const root = api.el("div", "");
    root.style.cssText =
      "width:min(460px,calc(100vw - 36px));display:flex;flex-direction:column;gap:14px;color:var(--ink)";

    // stat bar
    const stats = api.el("div", "");
    stats.style.cssText = "display:flex;justify-content:space-between;gap:8px;text-align:center";
    const mkStat = (label) => {
      const box = api.el("div", "");
      box.style.cssText = "flex:1;background:#fff;border:2px solid var(--mint-200);border-radius:14px;padding:8px 4px";
      const v = api.el("div", "");
      v.style.cssText = "font-size:22px;font-weight:900;color:var(--mint-700);line-height:1.1";
      const l = api.el("div", "", label);
      l.style.cssText = "font-size:11px;font-weight:700;color:#5c8a73;text-transform:uppercase;letter-spacing:.04em";
      box.appendChild(v); box.appendChild(l);
      return { box, v };
    };
    const sTime = mkStat("Time"), sMoney = mkStat("Earned"), sCombo = mkStat("Combo");
    stats.appendChild(sTime.box); stats.appendChild(sMoney.box); stats.appendChild(sCombo.box);

    // active customer + order bubble
    const orderRow = api.el("div", "");
    orderRow.style.cssText =
      "display:flex;align-items:center;gap:14px;background:linear-gradient(180deg,var(--mint-100),var(--mint-200));" +
      "border:2px solid var(--mint-400);border-radius:18px;padding:14px 16px;min-height:84px";
    const face = api.el("div", "", "🙂");
    face.style.cssText = "font-size:46px;flex:none";
    const bubble = api.el("div", "");
    bubble.style.cssText =
      "flex:1;background:#fff;border-radius:14px;padding:10px 12px;font-weight:700;color:#5c8a73;" +
      "display:flex;align-items:center;gap:10px;font-size:15px";
    const wantEm = api.el("span", "");
    wantEm.style.cssText = "font-size:40px";
    const wantTx = api.el("span", "", "wants this!");
    bubble.appendChild(wantEm); bubble.appendChild(wantTx);
    orderRow.appendChild(face); orderRow.appendChild(bubble);

    // up-next preview
    const nextRow = api.el("div", "");
    nextRow.style.cssText = "display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:#5c8a73";

    // kitchen — one big tappable button per dish on the menu
    const kitchenHead = api.el("div", "", "👩‍🍳 Your kitchen — tap to cook & serve");
    kitchenHead.style.cssText = "font-weight:800;color:var(--mint-700)";
    const kitchen = api.el("div", "");
    const cols = menu.length <= 4 ? 2 : menu.length <= 6 ? 3 : 4;
    kitchen.style.cssText = "display:grid;grid-template-columns:repeat(" + cols + ",1fr);gap:10px";

    root.appendChild(stats);
    root.appendChild(orderRow);
    root.appendChild(nextRow);
    root.appendChild(kitchenHead);
    root.appendChild(kitchen);
    api.board.appendChild(root);

    const dishBtns = menu.map((dish) => {
      const b = api.el("button", "");
      b.type = "button";
      b.textContent = dish;
      b.style.cssText =
        "font-size:38px;padding:14px 0;background:#fff;border:2px solid var(--mint-200);border-radius:16px;" +
        "cursor:pointer;transition:transform .07s,border-color .15s,background .15s";
      b.addEventListener("click", () => serve(dish, b));
      kitchen.appendChild(b);
      return b;
    });

    function flash(btn, ok) {
      btn.style.background = ok ? "var(--mint-200)" : "#fde2e0";
      btn.style.borderColor = ok ? "var(--mint-500)" : "#e74c3c";
      btn.style.transform = "scale(.92)";
      setTimeout(() => {
        btn.style.background = "#fff";
        btn.style.borderColor = "var(--mint-200)";
        btn.style.transform = "";
      }, 160);
    }

    function serve(dish, btn) {
      if (over) return;
      if (dish === queue[0]) {
        combo++;
        const pay = 10 + (combo - 1) * 3; // combo bonus
        money += pay;
        served++;
        flash(btn, true);
        face.textContent = "😋";
        queue.shift();
        queue.push(rand());
        api.setStatus("✅ Served! +" + "$" + pay + (combo > 1 ? "  🔥 " + combo + " combo" : ""));
      } else {
        combo = 0;
        flash(btn, false);
        face.textContent = "😠";
        api.setStatus("❌ Wrong dish! Combo lost.");
      }
      render();
    }

    function render() {
      sTime.v.textContent = timeLeft + "s";
      sMoney.v.textContent = "$" + money;
      sCombo.v.textContent = combo > 0 ? "🔥" + combo : "—";
      sTime.v.style.color = timeLeft <= 10 ? "#e74c3c" : "var(--mint-700)";
      wantEm.textContent = queue[0];
      nextRow.innerHTML = "";
      nextRow.appendChild(api.el("span", "", "Up next:"));
      queue.slice(1).forEach((d) => {
        const s = api.el("span", "", d);
        s.style.fontSize = "24px";
        nextRow.appendChild(s);
      });
      api.setScores([{ name: api.config.username, value: "$" + money, color: api.colors[0] }]);
    }

    const timer = setInterval(() => {
      if (over) return;
      timeLeft--;
      if (timeLeft <= 0) { timeLeft = 0; endRound(); }
      render();
    }, 1000);

    function endRound() {
      over = true;
      clearInterval(timer);
      dishBtns.forEach((b) => (b.disabled = true));
      face.textContent = "🎉";
      if (api.submitScore) api.submitScore(money);
      if (api.saveBest && money > bestEver) { api.saveBest(money); bestEver = money; }
      if (api.celebrate) api.celebrate("🍽️ $" + money + " earned!");
      api.setStatus("⏰ Time! You served " + served + " dishes for $" + money +
        " (best $" + bestEver + "). Restart to cook again!");
    }

    render();
    api.setStatus("👩‍🍳 Tap the dish the customer wants — go!");

    return {
      stop() { over = true; clearInterval(timer); },
    };
  },
});
