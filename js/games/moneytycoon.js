/* Money Tycoon — tap to earn, buy businesses for passive income, build a fortune.
   Leaderboard ranks every user by their current money, highest to lowest.
   Each user owns their own entry and can reset it with the 🗑 button. */
Arcade.register({
  id: "moneytycoon",
  name: "Money Tycoon",
  emoji: "💰",
  tagline: "Tap to earn cash, reinvest in businesses, and climb the money ranking.",
  category: "tycoon",
  tags: ["Tycoon", "Idle", "Money", "Solo"],
  minPlayers: 1,
  maxPlayers: 1,
  leaderboard: false, // uses its own live "current money" ranking, not the global score board
  rules: [
    "Tap the big 💵 button to earn cash by hand.",
    "Spend cash on businesses — each one earns money every second, forever.",
    "Buying more of a business raises its price, so keep reinvesting.",
    "Everyone is ranked by their current money, highest first. 🗑 Reset clears your own entry.",
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

    /* ---- shared "current money" ranking (one record per username, on this browser) ---- */
    const user = (api.config && api.config.username) || "guest";
    const RKEY = "mint_money_rank:moneytycoon";
    const loadRank = () => { try { return JSON.parse(localStorage.getItem(RKEY)) || {}; } catch (e) { return {}; } };
    const saveRank = (o) => { try { localStorage.setItem(RKEY, JSON.stringify(o)); } catch (e) {} };
    const setMine = (amount) => { const o = loadRank(); o[user] = { money: Math.max(0, Math.floor(amount)), ts: Date.now() }; saveRank(o); };
    const resetMine = () => { const o = loadRank(); delete o[user]; saveRank(o); };

    let cash = api.config.options.start || 0;
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

    // ---- current-money ranking card ----
    const rankCard = api.el("div", "");
    rankCard.style.cssText = "border:2px solid var(--mint-200);border-radius:16px;padding:12px 14px;background:var(--mint-50)";
    const rankTop = api.el("div", "");
    rankTop.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px";
    const rankTitle = api.el("div", "", "🏆 Money ranking");
    rankTitle.style.cssText = "font-weight:800;color:var(--mint-700);font-size:15px";
    const resetBtn = api.el("button", "btn ghost small", "🗑 Reset mine");
    resetBtn.addEventListener("click", () => {
      resetMine();
      cash = 0; clickValue = 1; clickLevel = 0; biz.forEach((b) => (b.count = 0));
      render(); renderRank();
      if (api.toast) api.toast("Your money was reset");
      api.setStatus("🗑 Your fortune was reset — start earning again!");
    });
    rankTop.appendChild(rankTitle); rankTop.appendChild(resetBtn);
    const rankList = api.el("div", "");
    rankList.style.cssText = "display:flex;flex-direction:column;gap:5px;font-size:14px;font-weight:700;color:var(--ink)";
    rankCard.appendChild(rankTop); rankCard.appendChild(rankList);

    root.appendChild(cashEl);
    root.appendChild(subEl);
    root.appendChild(tapBtn);
    root.appendChild(upBtn);
    root.appendChild(shopHead);
    root.appendChild(shop);
    root.appendChild(rankCard);
    api.board.appendChild(root);

    function renderRank() {
      const o = loadRank();
      const list = Object.keys(o).map((n) => ({ name: n, money: (o[n] && o[n].money) || 0 }))
        .sort((a, b) => b.money - a.money).slice(0, 12);
      rankList.innerHTML = "";
      if (!list.length) {
        const p = api.el("div", "", "No players yet — earn some cash to top the chart!");
        p.style.color = "#5c8a73"; p.style.fontWeight = "600";
        rankList.appendChild(p);
        return;
      }
      list.forEach((e, i) => {
        const row = api.el("div", "");
        const me = e.name === user;
        row.style.cssText = "display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:10px;" +
          (me ? "background:var(--mint-200);" : "");
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : String(i + 1);
        const rk = api.el("span", "", medal);
        rk.style.cssText = "width:26px;text-align:center;flex:none;font-weight:800;color:var(--mint-700)";
        const nm = api.el("span", "", e.name + (me ? " (you)" : ""));
        nm.style.cssText = "flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
        const mv = api.el("span", "", fmt(e.money));
        mv.style.cssText = "flex:none;font-weight:800;color:var(--mint-700)";
        row.appendChild(rk); row.appendChild(nm); row.appendChild(mv);
        rankList.appendChild(row);
      });
    }

    // one row per business, with cached refs so we only update text on tick
    const rows = biz.map((b) => {
      const row = api.el("button", "");
      row.type = "button";
      row.style.cssText =
        "display:flex;align-items:center;gap:12px;width:100%;text-align:left;cursor:pointer;" +
        "background:#fff;border:2px solid var(--mint-200);border-radius:14px;padding:11px 13px;" +
        "touch-action:manipulation;-webkit-tap-highlight-color:transparent;" +
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

    function onTap() { cash += clickValue; bump(); render(); }
    function buyUpgrade() {
      const cost = Math.ceil(50 * Math.pow(2, clickLevel));
      if (cash < cost) { api.setStatus("Need " + fmt(cost) + " to upgrade your tap."); return; }
      cash -= cost; clickLevel++; clickValue *= 2;
      render();
      api.setStatus("⬆️ Tap upgraded! Now " + fmt(clickValue) + " per tap.");
    }
    function buy(b) {
      const cost = costOf(b);
      if (cash < cost) { api.setStatus("Need " + fmt(cost) + " for a " + b.name + "."); return; }
      cash -= cost; b.count++;
      render();
      api.setStatus("✅ Bought a " + b.name + "! Earning " + fmt(perSec()) + "/sec total.");
    }
    function bump() { tapBtn.style.transform = "scale(.96)"; setTimeout(() => (tapBtn.style.transform = ""), 80); }

    function render() {
      cashEl.textContent = fmt(cash);
      const ps = perSec();
      subEl.textContent = ps > 0 ? fmt(ps) + " / sec" : "Tap to start earning!";
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

    // passive income loop — 10 ticks/sec for smooth counting; publish my money to the ranking ~1/sec
    let beat = 0;
    const timer = setInterval(() => {
      const inc = perSec() / 10;
      if (inc > 0) cash += inc;
      if (inc > 0) render();
      if (++beat >= 10) { beat = 0; setMine(cash); renderRank(); }
    }, 100);

    setMine(cash); renderRank();
    render();
    api.setStatus("💡 Tap 💵 to earn, then buy a 🍋 Lemonade Stand to start passive income!");

    return {
      stop() { clearInterval(timer); setMine(cash); },
    };
  },
});
