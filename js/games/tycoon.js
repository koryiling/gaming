/* Idle Tycoon — single player, timed.
 * Tap "Hustle" to earn your first cash by hand, then plough it into ventures
 * (🍋 → 🚀) that each earn money automatically every second. Every purchase of a
 * venture makes the next one pricier, so stack them wisely. Your score is the
 * total cash earned before the clock runs out. Each run length is ranked separately. */
Arcade.register({
  id: "tycoon",
  name: "Idle Tycoon",
  emoji: "🏭",
  tagline: "Build a business empire — buy ventures, stack passive income, and grow your fortune against the clock.",
  tags: ["Strategy", "Solo", "Quick"],
  minPlayers: 1,
  maxPlayers: 1,
  leaderboard: {
    type: "score", // most total cash earned wins; each run length ranked separately
    categories: [
      { key: "Marathon", label: "🏆 Marathon (180s)" },
      { key: "Standard", label: "🕐 Standard (120s)" },
      { key: "Sprint", label: "⏱️ Sprint (60s)" },
    ],
  },
  rules: [
    "Tap 💰 Hustle to earn your first cash by hand.",
    "Spend cash on ventures (🍋 → 🚀) — each one earns money automatically every second.",
    "Buy more of a venture to stack its income; every purchase makes the next one pricier.",
    "Your score is the total cash you earn before the timer runs out.",
    "Pick a run length in Options — each length has its own leaderboard. Build the biggest empire! 🏭",
  ],
  options: [
    { key: "len", label: "Run length", type: "select", default: 120,
      choices: [
        { label: "⏱️ Sprint (60s)", value: 60 },
        { label: "🕐 Standard (120s)", value: 120 },
        { label: "🏆 Marathon (180s)", value: 180 },
      ] },
  ],

  create(api) {
    const RUN = [60, 120, 180].indexOf(api.config.options.len) !== -1 ? api.config.options.len : 120;
    const MODE = { 60: "Sprint", 120: "Standard", 180: "Marathon" }[RUN];
    const ACCENT = api.colors[0];

    // each venture: base cost, income per second per unit. Cost grows 15% per purchase.
    const GROWTH = 1.15;
    const VENTURES = [
      { emoji: "🍋", name: "Lemonade Stand", cost: 10, rate: 0.5 },
      { emoji: "🍕", name: "Pizza Shop", cost: 120, rate: 6 },
      { emoji: "🏪", name: "Mini-Mart", cost: 1300, rate: 50 },
      { emoji: "🏢", name: "Office Tower", cost: 15000, rate: 450 },
      { emoji: "🏭", name: "Factory", cost: 200000, rate: 5500 },
      { emoji: "🚀", name: "Space Venture", cost: 3000000, rate: 75000 },
    ];
    VENTURES.forEach((v) => { v.owned = 0; v.curCost = v.cost; });

    let cash = 0, earned = 0, timeLeft = RUN, running = true, timer = null;

    // compact money formatting: $940, $1.2K, $3.4M, $1.1B …
    function fmt(n) {
      n = Math.floor(n);
      if (n < 1000) return "$" + n;
      const u = ["K", "M", "B", "T", "Qa"];
      let i = -1, x = n;
      while (x >= 1000 && i < u.length - 1) { x /= 1000; i++; }
      const s = x < 10 ? x.toFixed(2) : x < 100 ? x.toFixed(1) : String(Math.round(x));
      return "$" + s + u[i];
    }
    function income() { return VENTURES.reduce((sum, v) => sum + v.owned * v.rate, 0); }

    /* ---------- layout ---------- */
    const wrap = api.el("div");
    wrap.style.cssText = "width:min(540px,calc(100vw - 28px));margin:0 auto;font-family:inherit;color:#173a2b";

    const hustle = api.el("button", "", "💰 Hustle <span style='opacity:.7;font-weight:600'>+$1</span>");
    hustle.style.cssText = "display:block;width:100%;padding:18px;margin-bottom:14px;border:none;border-radius:16px;" +
      "background:" + ACCENT + ";color:#fff;font-size:21px;font-weight:800;cursor:pointer;" +
      "box-shadow:0 8px 20px rgba(46,157,108,.35);transition:transform .06s ease;touch-action:manipulation";
    hustle.addEventListener("click", () => {
      if (!running) return;
      cash += 1; earned += 1;
      hustle.style.transform = "scale(0.97)";
      setTimeout(() => (hustle.style.transform = "none"), 70);
      render();
    });
    wrap.appendChild(hustle);

    const list = api.el("div");
    list.style.cssText = "display:flex;flex-direction:column;gap:8px";
    wrap.appendChild(list);

    // build one row per venture; keep references so we can refresh cheaply each tick
    const rows = VENTURES.map((v) => {
      const row = api.el("div");
      row.style.cssText = "display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;" +
        "background:#fcf8ef;border:2px solid #e7ddc8";
      const emoji = api.el("span", "", v.emoji);
      emoji.style.cssText = "font-size:26px;flex:0 0 auto";
      const info = api.el("div");
      info.style.cssText = "flex:1 1 auto;min-width:0;line-height:1.3";
      const title = api.el("div", "", v.name);
      title.style.cssText = "font-weight:700";
      const sub = api.el("div");
      sub.style.cssText = "font-size:12.5px;color:#6b7d72";
      info.appendChild(title); info.appendChild(sub);
      const owned = api.el("span", "", "0");
      owned.style.cssText = "flex:0 0 auto;font-weight:800;font-size:18px;min-width:30px;text-align:right;color:" + ACCENT;
      const buy = api.el("button");
      buy.style.cssText = "flex:0 0 auto;padding:9px 12px;border:none;border-radius:11px;background:" + ACCENT +
        ";color:#fff;font-weight:700;font-size:13px;cursor:pointer;min-width:84px;touch-action:manipulation";
      buy.addEventListener("click", () => {
        if (!running) return;
        const c = Math.floor(v.curCost);
        if (cash < c) return;
        cash -= c; v.owned++; v.curCost *= GROWTH;
        render();
      });
      row.appendChild(emoji); row.appendChild(info); row.appendChild(owned); row.appendChild(buy);
      list.appendChild(row);
      return { v: v, sub: sub, owned: owned, buy: buy, row: row };
    });

    api.board.appendChild(wrap);

    /* ---------- render ---------- */
    function render() {
      const inc = income();
      api.setScores([
        { name: "🏆 Earned", value: fmt(earned), color: ACCENT },
        { name: "💰 Cash", value: fmt(cash) },
        { name: "📈 /sec", value: fmt(inc) },
        { name: "⏱", value: Math.ceil(timeLeft) + "s" },
      ]);
      rows.forEach((r) => {
        const c = Math.floor(r.v.curCost);
        r.owned.textContent = String(r.v.owned);
        r.sub.textContent = "+" + fmt(r.v.rate * Math.max(1, r.v.owned)) + "/s" + (r.v.owned ? "" : " each");
        r.buy.textContent = "Buy " + fmt(c);
        const can = running && cash >= c;
        r.buy.disabled = !can;
        r.buy.style.opacity = can ? "1" : "0.4";
        r.buy.style.cursor = can ? "pointer" : "default";
      });
      if (running) {
        api.setStatus(inc > 0
          ? "Earning " + fmt(inc) + "/sec — reinvest to grow faster! 🏭"
          : "Tap 💰 Hustle to earn your first cash, then buy a 🍋 Lemonade Stand.");
      }
    }

    function end() {
      if (!running) return;
      running = false;
      if (timer) { clearInterval(timer); timer = null; }
      render();
      hustle.disabled = true;
      hustle.style.opacity = "0.5";
      hustle.style.cursor = "default";
      api.submitScore(Math.floor(earned), { cat: MODE });
      api.setStatus("⏰ Time! You built a " + fmt(earned) + " empire. Hit ↻ Restart to beat it!");
      api.celebrate("🏭 " + fmt(earned) + " empire!");
    }

    render();
    timer = setInterval(() => {
      if (!running) return;
      const dt = 0.1;
      const inc = income();
      cash += inc * dt; earned += inc * dt;
      timeLeft -= dt;
      if (timeLeft <= 0) { timeLeft = 0; end(); return; }
      render();
    }, 100);

    return { stop() { running = false; if (timer) { clearInterval(timer); timer = null; } } };
  },
});
