/* Pizza Tycoon — build a pizza empire (idle / clicker management) */
Arcade.register({
  id: "pizzatycoon",
  name: "Pizza Tycoon",
  emoji: "🍕",
  tagline: "Serve slices, hire chefs, and reinvest profits to grow a sizzling pizza empire.",
  tags: ["Strategy", "Family", "Solo"],
  minPlayers: 1,
  maxPlayers: 1,
  rules: [
    "Click the pizza to serve a slice and earn cash.",
    "Spend cash on upgrades: recipes raise the price, chefs bake automatically, ovens boost income, branches multiply everything.",
    "Auto-income keeps rolling in while you plan your next buy.",
    "Your score is total money earned — how big can your empire get?",
  ],
  options: [],

  create(api) {
    let money = 0, earned = 0, value = 1, perSec = 0, mult = 1;
    let timer = null, goalIdx = 0;
    const GOALS = [
      { at: 100, msg: "🎉 First $100 — the neighbourhood loves you!" },
      { at: 1e3, msg: "🏪 $1K — you opened a second counter!" },
      { at: 1e4, msg: "🚚 $10K — delivery scooters everywhere!" },
      { at: 1e5, msg: "🏙️ $100K — a city-wide chain!" },
      { at: 1e6, msg: "👑 $1M — Pizza Tycoon status unlocked!" },
      { at: 1e7, msg: "🌍 $10M — a global pizza empire!" },
    ];
    const upgrades = [
      { emoji: "📖", name: "Better Recipe", desc: "+$1 per slice", cost: 15, growth: 1.15, n: 0, buy() { value += 1; } },
      { emoji: "👨‍🍳", name: "Hire Chef", desc: "+1 pizza / sec", cost: 50, growth: 1.18, n: 0, buy() { perSec += 1; } },
      { emoji: "🔥", name: "Bigger Oven", desc: "+25% income", cost: 220, growth: 1.20, n: 0, buy() { mult += 0.25; } },
      { emoji: "🏪", name: "New Branch", desc: "×2 everything", cost: 3000, growth: 1.6, n: 0, buy() { mult *= 2; } },
    ];

    function fmt(n) {
      n = Math.floor(n);
      if (n < 1000) return "$" + n;
      const u = ["", "K", "M", "B", "T"]; let i = 0, v = n;
      while (v >= 1000 && i < u.length - 1) { v /= 1000; i++; }
      return "$" + (v < 10 ? v.toFixed(1) : Math.floor(v)) + u[i];
    }
    const clickValue = () => value * mult;
    const rate = () => perSec * value * mult;

    // ---- layout ----
    const wrap = api.el("div", "");
    wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:16px;padding:8px;width:100%;max-width:520px";

    const cash = api.el("div", "");
    cash.style.cssText = "font-size:32px;font-weight:800;color:var(--mint-700)";
    const stats = api.el("div", "");
    stats.style.cssText = "font-size:14px;color:var(--ink-soft);text-align:center";

    const pizzaBtn = api.el("button", "");
    pizzaBtn.style.cssText = "border:none;background:radial-gradient(circle at 50% 38%,#ffe08a,#f6c343 55%,#e0962a);width:160px;height:160px;border-radius:50%;" +
      "font-size:78px;cursor:pointer;box-shadow:var(--shadow-lg);transition:transform .06s;line-height:1";
    pizzaBtn.textContent = "🍕";
    pizzaBtn.addEventListener("click", () => {
      const g = clickValue(); money += g; earned += g;
      pizzaBtn.style.transform = "scale(0.93)";
      setTimeout(() => (pizzaBtn.style.transform = "scale(1)"), 70);
      render();
    });
    const serveHint = api.el("div", "");
    serveHint.style.cssText = "font-weight:700;color:var(--ink)";

    const shop = api.el("div", "");
    shop.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%";
    const upBtns = upgrades.map((u) => {
      const b = api.el("button", "");
      b.style.cssText = "text-align:left;border:2px solid var(--mint-200);background:#fff;border-radius:14px;padding:11px 13px;" +
        "cursor:pointer;font-family:inherit;display:flex;flex-direction:column;gap:2px;transition:background .15s,opacity .15s";
      b.addEventListener("click", () => buy(u, b));
      shop.appendChild(b);
      return b;
    });

    wrap.appendChild(cash);
    wrap.appendChild(stats);
    wrap.appendChild(pizzaBtn);
    wrap.appendChild(serveHint);
    wrap.appendChild(shop);
    api.board.appendChild(wrap);

    function buy(u, b) {
      if (money < u.cost) return;
      money -= u.cost; u.n++; u.buy();
      u.cost = Math.ceil(u.cost * u.growth);
      api.toast(u.emoji + " " + u.name + " (×" + u.n + ")");
      render();
    }

    function render() {
      cash.textContent = fmt(money) + " in the till";
      stats.innerHTML = "🍕 <b>" + fmt(clickValue()) + "</b>/slice &nbsp;·&nbsp; 📈 <b>" + fmt(rate()) + "</b>/sec &nbsp;·&nbsp; 🏆 earned <b>" + fmt(earned) + "</b>";
      serveHint.textContent = "Click the pizza! +" + fmt(clickValue()) + " a slice";
      upgrades.forEach((u, i) => {
        const b = upBtns[i];
        const afford = money >= u.cost;
        b.style.opacity = afford ? "1" : "0.55";
        b.style.borderColor = afford ? "var(--mint-400)" : "var(--mint-200)";
        b.innerHTML = "<span style='font-weight:800'>" + u.emoji + " " + u.name +
          (u.n ? " <span style='color:var(--mint-700)'>×" + u.n + "</span>" : "") + "</span>" +
          "<span style='font-size:12px;color:var(--ink-soft)'>" + u.desc + "</span>" +
          "<span style='font-size:13px;font-weight:700;color:" + (afford ? "var(--mint-700)" : "#c0392b") + "'>" + fmt(u.cost) + "</span>";
      });
      api.setScores([{ name: api.config.username, value: Math.floor(earned), color: api.colors[1] }]);
      if (goalIdx < GOALS.length && earned >= GOALS[goalIdx].at) {
        api.setStatus(GOALS[goalIdx].msg);
        api.toast(GOALS[goalIdx].msg);
        goalIdx++;
      } else if (goalIdx < GOALS.length) {
        api.setStatus("Next goal: " + fmt(GOALS[goalIdx].at) + " earned — keep those ovens hot! 🔥");
      } else {
        api.setStatus("🌍 Pizza legend! Total earned: " + fmt(earned) + ".");
      }
    }

    timer = setInterval(() => {
      const g = rate();
      if (g) { money += g; earned += g; }
      render();
    }, 1000);

    render();
    api.setStatus("Click the pizza to serve your first slice! 🍕");
    return { stop() { if (timer) clearInterval(timer); } };
  },
});
