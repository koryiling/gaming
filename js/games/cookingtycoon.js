/* Cooking Tycoon — assemble each customer's dish in the right order, before time runs out.
   Leaderboard ranks every user by their current money, highest to lowest;
   each user owns their entry and can reset it with the 🗑 button. */
Arcade.register({
  id: "cookingtycoon",
  name: "Cooking Tycoon",
  emoji: "🍳",
  tagline: "Build each order ingredient-by-ingredient in the right order, chain combos, earn cash.",
  category: "tycoon",
  tags: ["Tycoon", "Cooking", "Money", "Solo"],
  minPlayers: 1,
  maxPlayers: 1,
  leaderboard: false, // uses its own live "current money" ranking, not the global score board
  rules: [
    "Each order ticket lists the ingredients in the order they must be stacked.",
    "Tap ingredients from your tray in the correct sequence to assemble the dish.",
    "Finish an order to earn cash and grow your 🔥 combo — longer orders pay more.",
    "A wrong ingredient scraps the dish and breaks your combo. Everyone is ranked by money.",
  ],
  options: [
    { key: "time", label: "Round length", type: "select", default: 60,
      choices: [{ label: "45s", value: 45 }, { label: "60s", value: 60 }, { label: "90s", value: 90 }] },
    { key: "diff", label: "Difficulty", type: "select", default: "normal",
      choices: [{ label: "Easy", value: "easy" }, { label: "Normal", value: "normal" }, { label: "Hard", value: "hard" }] },
  ],

  create(api) {
    const ALL = ["🍞", "🥬", "🍅", "🧀", "🥩", "🥓", "🧅", "🥚", "🌶️", "🥒"];
    const DIFF = {
      easy: { tray: 4, min: 2, max: 3 },
      normal: { tray: 6, min: 3, max: 4 },
      hard: { tray: 8, min: 4, max: 5 },
    }[api.config.options.diff] || { tray: 6, min: 3, max: 4 };
    const tray = ALL.slice(0, Math.min(DIFF.tray, ALL.length));
    const rnd = (n) => (Math.random() * n) | 0;
    const newOrder = () => {
      const len = DIFF.min + rnd(DIFF.max - DIFF.min + 1);
      return Array.from({ length: len }, () => tray[rnd(tray.length)]);
    };

    let timeLeft = api.config.options.time;
    let money = 0, combo = 0, served = 0, over = false;
    let order = newOrder(), buildIdx = 0;

    /* ---- shared "current money" ranking (one record per username, on this browser) ---- */
    const user = (api.config && api.config.username) || "guest";
    const RKEY = "mint_money_rank:cookingtycoon";
    const loadRank = () => { try { return JSON.parse(localStorage.getItem(RKEY)) || {}; } catch (e) { return {}; } };
    const saveRank = (o) => { try { localStorage.setItem(RKEY, JSON.stringify(o)); } catch (e) {} };
    const setMine = (amount) => { const o = loadRank(); o[user] = { money: Math.max(0, Math.floor(amount)), ts: Date.now() }; saveRank(o); };
    const resetMine = () => { const o = loadRank(); delete o[user]; saveRank(o); };

    /* ---- layout (responsive: fills phones, capped + centred on desktop) ---- */
    const root = api.el("div", "");
    root.style.cssText = "width:min(460px,calc(100vw - 36px));display:flex;flex-direction:column;gap:13px;color:var(--ink)";

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

    // order ticket
    const ticket = api.el("div", "");
    ticket.style.cssText =
      "background:linear-gradient(180deg,var(--mint-100),var(--mint-200));border:2px solid var(--mint-400);" +
      "border-radius:18px;padding:14px;display:flex;flex-direction:column;gap:8px;align-items:center";
    const ticketHead = api.el("div", "", "🧾 Order — stack in this order:");
    ticketHead.style.cssText = "font-weight:800;color:var(--mint-700);font-size:14px";
    const slots = api.el("div", "");
    slots.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;justify-content:center";
    ticket.appendChild(ticketHead); ticket.appendChild(slots);

    // tray
    const trayHead = api.el("div", "", "🧺 Tray — tap to add the next ingredient");
    trayHead.style.cssText = "font-weight:800;color:var(--mint-700)";
    const trayGrid = api.el("div", "");
    const cols = tray.length <= 4 ? 2 : tray.length <= 6 ? 3 : 4;
    trayGrid.style.cssText = "display:grid;grid-template-columns:repeat(" + cols + ",1fr);gap:10px";

    // ranking card
    const rankCard = api.el("div", "");
    rankCard.style.cssText = "border:2px solid var(--mint-200);border-radius:16px;padding:12px 14px;background:var(--mint-50)";
    const rankTop = api.el("div", "");
    rankTop.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px";
    const rankTitle = api.el("div", "", "🏆 Money ranking");
    rankTitle.style.cssText = "font-weight:800;color:var(--mint-700);font-size:15px";
    const resetBtn = api.el("button", "btn ghost small", "🗑 Reset mine");
    resetBtn.addEventListener("click", () => {
      resetMine();
      money = 0; combo = 0;
      render(); renderRank();
      if (api.toast) api.toast("Your money was reset");
    });
    rankTop.appendChild(rankTitle); rankTop.appendChild(resetBtn);
    const rankList = api.el("div", "");
    rankList.style.cssText = "display:flex;flex-direction:column;gap:5px;font-size:14px;font-weight:700;color:var(--ink)";
    rankCard.appendChild(rankTop); rankCard.appendChild(rankList);

    root.appendChild(stats);
    root.appendChild(ticket);
    root.appendChild(trayHead);
    root.appendChild(trayGrid);
    root.appendChild(rankCard);
    api.board.appendChild(root);

    const trayBtns = tray.map((ing) => {
      const b = api.el("button", "");
      b.type = "button";
      b.textContent = ing;
      b.style.cssText =
        "font-size:34px;padding:13px 0;background:#fff;border:2px solid var(--mint-200);border-radius:16px;" +
        "cursor:pointer;transition:transform .07s,border-color .15s,background .15s";
      b.addEventListener("click", () => tap(ing, b));
      trayGrid.appendChild(b);
      return b;
    });

    function fmt(n) { n = Math.floor(n); return n >= 1e3 ? "$" + (n / 1e3).toFixed(1) + "K" : "$" + n; }

    function renderTicket() {
      slots.innerHTML = "";
      order.forEach((ing, i) => {
        const s = api.el("div", "", ing);
        const done = i < buildIdx, next = i === buildIdx;
        s.style.cssText =
          "width:48px;height:48px;display:grid;place-items:center;font-size:30px;border-radius:12px;" +
          "border:2px solid " + (done ? "var(--mint-500)" : next ? "#e67e22" : "var(--mint-200)") + ";" +
          "background:" + (done ? "var(--mint-200)" : "#fff") + ";opacity:" + (done ? ".6" : "1") + ";" +
          (next ? "box-shadow:0 0 0 3px rgba(230,126,34,.25);" : "");
        slots.appendChild(s);
      });
    }

    function flash(btn, ok) {
      btn.style.background = ok ? "var(--mint-200)" : "#fde2e0";
      btn.style.borderColor = ok ? "var(--mint-500)" : "#e74c3c";
      btn.style.transform = "scale(.92)";
      setTimeout(() => { btn.style.background = "#fff"; btn.style.borderColor = "var(--mint-200)"; btn.style.transform = ""; }, 150);
    }

    function tap(ing, btn) {
      if (over) return;
      if (ing === order[buildIdx]) {
        buildIdx++;
        flash(btn, true);
        if (buildIdx >= order.length) {
          combo++;
          const pay = order.length * 5 + (combo - 1) * 3;
          money += pay; served++;
          setMine(money);
          order = newOrder(); buildIdx = 0;
          api.setStatus("🍽️ Served! +$" + pay + (combo > 1 ? "  🔥 " + combo + " combo" : ""));
        } else {
          api.setStatus("👍 " + buildIdx + "/" + order.length + " — keep stacking!");
        }
      } else {
        combo = 0; buildIdx = 0;
        flash(btn, false);
        api.setStatus("❌ Wrong ingredient! Dish scrapped, combo lost.");
      }
      render();
    }

    function renderRank() {
      const o = loadRank();
      const list = Object.keys(o).map((n) => ({ name: n, money: (o[n] && o[n].money) || 0 }))
        .sort((a, b) => b.money - a.money).slice(0, 12);
      rankList.innerHTML = "";
      if (!list.length) {
        const p = api.el("div", "", "No players yet — serve dishes to top the chart!");
        p.style.color = "#5c8a73"; p.style.fontWeight = "600";
        rankList.appendChild(p);
        return;
      }
      list.forEach((e, i) => {
        const row = api.el("div", "");
        const me = e.name === user;
        row.style.cssText = "display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:10px;" + (me ? "background:var(--mint-200);" : "");
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

    function render() {
      sTime.v.textContent = timeLeft + "s";
      sMoney.v.textContent = "$" + money;
      sCombo.v.textContent = combo > 0 ? "🔥" + combo : "—";
      sTime.v.style.color = timeLeft <= 10 ? "#e74c3c" : "var(--mint-700)";
      renderTicket();
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
      trayBtns.forEach((b) => (b.disabled = true));
      setMine(money); renderRank();
      if (api.celebrate) api.celebrate("🍽️ $" + money + " earned!");
      api.setStatus("⏰ Time! You served " + served + " orders for $" + money + ". Restart to cook again!");
    }

    setMine(money); renderRank();
    render();
    api.setStatus("👩‍🍳 Build the order in sequence — tap the highlighted ingredient first!");

    return {
      stop() { over = true; clearInterval(timer); setMine(money); },
    };
  },
});
