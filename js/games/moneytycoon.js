/* Money Tycoon — tap to earn, buy businesses for passive income, build a fortune */
Arcade.register({
  id: "moneytycoon",
  name: "Money Tycoon",
  emoji: "💰",
  tagline: "Tap to earn cash, reinvest in businesses, and grow your fortune on autopilot.",
  category: "tycoon",
  tags: ["Tycoon", "Idle", "Money", "Solo"],
  minPlayers: 1,
  maxPlayers: 1,
  leaderboard: { type: "score" }, // highest net worth reached
  rules: [
    "Tap the big 💵 button to earn cash by hand.",
    "Spend cash on businesses — each one earns money every second, forever.",
    "Buying more of a business raises its price, so keep reinvesting.",
    "Upgrade your tap to earn more per click. Your highest net worth is your score! 🏆",
  ],
  options: [
    { key: "start", label: "Starting cash", type: "select", default: 0,
      choices: [{ label: "$0 (classic)", value: 0 }, { label: "$50 (boost)", value: 50 }, { label: "$250 (rush)", value: 250 }] },
  ],

  create(api) {
    const fmt = (n) => {
      n = Math.floor(n);
      if (n >= 1e12) return "$" + (n / 1e12).toFixed(2) + "T";
      if (n >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
      if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
      if (n >= 1e3) return "$" + (n / 1e3).toFixed(2) + "K";
      return "$" + n;
    };

    let cash = api.config.options.start || 0;
    let worth = cash;            // best net worth reached this session = the score
    let bestEver = api.loadBest ? api.loadBest() : 0;
    let clickValue = 1;
    let clickLevel = 0;

    const biz = [
      { emoji: "🍋", name: "Lemonade Stand", base: 15, rate: 0.4, count: 0 },
      { emoji: "🍔", name: "Burger Cart", base: 120, rate: 3, count: 0 },
      { emoji: "☕", name: "Coffee Shop", base: 700, rate: 14, count: 0 },
      { emoji: "🏪", name: "Mini-Mart", base: 3500, rate: 55, count: 0 },
      { emoji: "🏭", name: "Factory", base: 18000, rate: 250, count: 0 },
      { emoji: "🏢", name: "Office Tower", base: 95000, rate: 1100, count: 0 },
    ];
    const costOf = (b) => Math.ceil(b.base * Math.pow(1.15, b.count));
    const perSec = () => biz.reduce((s, b) => s + b.count * b.rate, 0);

    /* ---- layout (responsive: full width on phones, capped + centred on desktop) ---- */
    const root = api.el("div", "");
    root.style.cssText =
      "width:min(440px,calc(100vw - 36px));display:flex;flex-direction:column;gap:14px;" +
      "font-family:inherit;color:var(--ink)";

    const cashEl = api.el("div", "");
    cashEl.style.cssText = "font-size:34px;font-weight:900;color:var(--mint-700);text-align:center;line-height:1.1";
    const subEl = api.el("div", "");
    subEl.style.cssText = "font-size:14px;font-weight:700;color:#5c8a73;text-align:center;margin-top:-6px";

    const tapBtn = api.el("button", "btn primary", "💵 Earn money");
    tapBtn.style.cssText = "font-size:22px;padding:20px;border-radius:18px;width:100%";
    tapBtn.addEventListener("click", onTap);

    const upBtn = api.el("button", "btn ghost", "");
    upBtn.style.cssText = "font-size:14px;padding:12px;border-radius:14px;width:100%";
    upBtn.addEventListener("click", buyUpgrade);

    const shopHead = api.el("div", "");
    shopHead.style.cssText = "font-weight:800;color:var(--mint-700);margin-top:4px";
    shopHead.textContent = "🏬 Businesses (earn while you wait)";

    const shop = api.el("div", "");
    shop.style.cssText = "display:flex;flex-direction:column;gap:9px";

    root.appendChild(cashEl);
    root.appendChild(subEl);
    root.appendChild(tapBtn);
    root.appendChild(upBtn);
    root.appendChild(shopHead);
    root.appendChild(shop);
    api.board.appendChild(root);

    // one row per business, with cached refs so we only update text on tick
    const rows = biz.map((b) => {
      const row = api.el("button", "");
      row.type = "button";
      row.style.cssText =
        "display:flex;align-items:center;gap:12px;width:100%;text-align:left;cursor:pointer;" +
        "background:#fff;border:2px solid var(--mint-200);border-radius:14px;padding:11px 13px;" +
        "font-family:inherit;color:var(--ink);transition:border .15s,opacity .15s";
      const em = api.el("span", "", b.emoji);
      em.style.cssText = "font-size:30px;flex:none;width:38px;text-align:center";
      const mid = api.el("div", "");
      mid.style.cssText = "flex:1;min-width:0";
      const nm = api.el("div", "", b.name);
      nm.style.cssText = "font-weight:800;font-size:15px";
      const meta = api.el("div", "");
      meta.style.cssText = "font-size:12px;font-weight:600;color:#5c8a73";
      mid.appendChild(nm); mid.appendChild(meta);
      const price = api.el("div", "");
      price.style.cssText = "font-weight:800;font-size:14px;color:var(--mint-700);flex:none;text-align:right";
      row.appendChild(em); row.appendChild(mid); row.appendChild(price);
      row.addEventListener("click", () => buy(b));
      shop.appendChild(row);
      return { b, row, meta, price };
    });

    function onTap() {
      cash += clickValue;
      bump();
      render();
    }
    function buyUpgrade() {
      const cost = Math.ceil(50 * Math.pow(2, clickLevel));
      if (cash < cost) { api.setStatus("Need " + fmt(cost) + " to upgrade your tap."); return; }
      cash -= cost;
      clickLevel++;
      clickValue *= 2;
      render();
      api.setStatus("⬆️ Tap upgraded! Now " + fmt(clickValue) + " per tap.");
    }
    function buy(b) {
      const cost = costOf(b);
      if (cash < cost) { api.setStatus("Need " + fmt(cost) + " for a " + b.name + "."); return; }
      cash -= cost;
      b.count++;
      render();
      api.setStatus("✅ Bought a " + b.name + "! Earning " + fmt(perSec()) + "/sec total.");
    }
    function bump() {
      tapBtn.style.transform = "scale(.96)";
      setTimeout(() => (tapBtn.style.transform = ""), 80);
    }

    function render() {
      if (cash > worth) worth = cash; // net worth = highest cash held
      cashEl.textContent = fmt(cash);
      const ps = perSec();
      subEl.textContent = (ps > 0 ? fmt(ps) + " / sec" : "Tap to start earning!") +
        "  ·  best " + fmt(Math.max(bestEver, worth));
      const upCost = Math.ceil(50 * Math.pow(2, clickLevel));
      upBtn.textContent = "⬆️ Upgrade tap → " + fmt(clickValue * 2) + "/tap  (" + fmt(upCost) + ")";
      upBtn.disabled = cash < upCost;
      upBtn.style.opacity = cash < upCost ? ".55" : "1";
      rows.forEach((r) => {
        const cost = costOf(r.b);
        r.meta.textContent = "owned " + r.b.count + "  ·  " + fmt(r.b.rate) + "/sec each";
        r.price.textContent = fmt(cost);
        const ok = cash >= cost;
        r.row.style.opacity = ok ? "1" : ".55";
        r.row.style.borderColor = ok ? "var(--mint-400)" : "var(--mint-200)";
      });
      api.setScores([{ name: api.config.username, value: fmt(cash), color: api.colors[0] }]);
    }

    // passive income loop — 10 ticks/sec for smooth counting
    const timer = setInterval(() => {
      const inc = perSec() / 10;
      if (inc > 0) { cash += inc; render(); }
    }, 100);

    render();
    api.setStatus("💡 Tap 💵 to earn, then buy a 🍋 Lemonade Stand to start passive income!");

    return {
      stop() {
        clearInterval(timer);
        const finalWorth = Math.max(worth, cash);
        if (api.submitScore && finalWorth > 0) api.submitScore(Math.floor(finalWorth));
        if (api.saveBest && finalWorth > bestEver) api.saveBest(Math.floor(finalWorth));
      },
    };
  },
});
