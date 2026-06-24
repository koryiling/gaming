/* Pizza Tycoon — move your chef to bake & deliver pizzas, then grow the empire.
 * Now with hungry-customer patience timers, speed tips, a delivery combo streak,
 * day-by-day progression, and a deeper upgrade shop. */
Arcade.register({
  id: "pizzatycoon",
  name: "Pizza Tycoon",
  emoji: "🍕",
  tagline: "Run the floor: bake hot slices, race them to hungry customers before they storm off, and build a pizza empire.",
  tags: ["Strategy", "Family", "Solo"],
  minPlayers: 1,
  maxPlayers: 1,
  rules: [
    "Move your chef 🧑‍🍳 with the arrow keys / WASD (or the on-screen pad).",
    "Step on the oven 🔥 to pick up freshly baked pizzas, then walk them onto a customer 🙋.",
    "Customers get impatient — the ring around them drains. Serve fast for a bigger 💸 tip!",
    "Chain quick deliveries to build a 🔥 combo multiplier. A timeout breaks the streak.",
    "Earn enough to reach the next 📅 day — more customers arrive. Spend cash on upgrades.",
    "Your score is total money earned. Build the biggest empire you can!",
  ],
  options: [
    { key: "pace", label: "Pace", type: "select", default: "normal",
      choices: [{ label: "Relaxed", value: "relaxed" }, { label: "Normal", value: "normal" }, { label: "Rush", value: "rush" }] },
  ],

  create(api) {
    const CW = Math.max(280, Math.min(520, window.innerWidth - 60));
    const CH = 340, R = 16;
    const PACE = { relaxed: 13000, normal: 9500, rush: 7000 }[api.config.options.pace] || 9500;

    let money = 0, earned = 0, price = 5;
    let speed = 2.4, carryCap = 1, carrying = 0;
    let bakeMs = 1400, bakeAcc = 0, ovenReady = 1;
    let tipMult = 0.5, served = 0, missed = 0;
    let combo = 0, comboTimer = 0;
    let day = 1, nextDayAt = 120;
    let stopped = false, raf = null, last = 0, scoreAcc = 0;

    const oven = { x: 22, y: CH / 2 - 32, w: 86, h: 64 };
    const chef = { x: CW / 2, y: CH / 2 };
    const held = { up: false, down: false, left: false, right: false };
    const customers = [];
    const maxReady = () => Math.max(3, carryCap + 2);
    const patienceMax = () => Math.max(4200, PACE - (day - 1) * 350);

    function fmt(n) {
      n = Math.floor(n);
      if (n < 1000) return "$" + n;
      const u = ["", "K", "M", "B", "T"]; let i = 0, v = n;
      while (v >= 1000 && i < u.length - 1) { v /= 1000; i++; }
      return "$" + (v < 10 ? v.toFixed(1) : Math.floor(v)) + u[i];
    }
    function addCustomer() {
      const c = { x: 0, y: 0, patience: patienceMax(), max: patienceMax() };
      customers.push(c); relocate(c);
    }
    function relocate(c) {
      c.x = CW * 0.4 + Math.random() * (CW * 0.6 - 30) + 10;
      c.y = 26 + Math.random() * (CH - 52);
      c.max = patienceMax();
      c.patience = c.max;
    }
    addCustomer(); addCustomer(); addCustomer();

    // ---- layout ----
    const wrap = api.el("div", "");
    wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:12px;padding:6px;width:100%;max-width:540px";
    const moneyLine = api.el("div", "");
    moneyLine.style.cssText = "font-size:14px;font-weight:700;color:var(--ink);text-align:center;line-height:1.7";
    const canvas = document.createElement("canvas");
    canvas.width = CW; canvas.height = CH;
    canvas.style.cssText = "background:#fff;border-radius:var(--radius);box-shadow:var(--shadow);touch-action:none;max-width:100%";
    const ctx = canvas.getContext("2d");

    // on-screen D-pad (touch / mouse)
    const pad = api.el("div", "");
    pad.style.cssText = "display:grid;grid-template-columns:repeat(3,48px);grid-template-rows:repeat(2,48px);gap:6px;justify-content:center";
    function padBtn(label, dir, col, row) {
      const b = api.el("button", "btn ghost", label);
      b.style.cssText = "padding:0;font-size:21px;grid-column:" + col + ";grid-row:" + row + ";touch-action:none";
      const set = (v) => (e) => { e.preventDefault(); held[dir] = v; };
      b.addEventListener("pointerdown", set(true));
      b.addEventListener("pointerup", set(false));
      b.addEventListener("pointerleave", set(false));
      b.addEventListener("pointercancel", set(false));
      pad.appendChild(b);
    }
    padBtn("⬆", "up", 2, 1);
    padBtn("⬅", "left", 1, 2);
    padBtn("⬇", "down", 2, 2);
    padBtn("➡", "right", 3, 2);

    const shop = api.el("div", "");
    shop.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:9px;width:100%";
    const upgrades = [
      { emoji: "🥾", name: "Faster Shoes", desc: "+ move speed", cost: 25, growth: 1.3, n: 0, buy() { speed += 0.7; } },
      { emoji: "🔥", name: "Hotter Oven", desc: "bake faster", cost: 60, growth: 1.4, n: 0, buy() { bakeMs = Math.max(300, bakeMs * 0.8); } },
      { emoji: "🧺", name: "Bigger Tray", desc: "+1 carry", cost: 90, growth: 1.5, n: 0, buy() { carryCap += 1; } },
      { emoji: "💵", name: "Premium Menu", desc: "+$3 / pizza", cost: 50, growth: 1.35, n: 0, buy() { price += 3; } },
      { emoji: "💸", name: "Tip Jar", desc: "bigger tips", cost: 70, growth: 1.45, n: 0, buy() { tipMult += 0.4; } },
      { emoji: "🙋", name: "More Customers", desc: "+1 customer", cost: 130, growth: 1.5, n: 0, buy() { if (customers.length < 9) addCustomer(); } },
    ];
    const upBtns = upgrades.map((u) => {
      const b = api.el("button", "");
      b.style.cssText = "text-align:left;border:2px solid var(--mint-200);background:#fff;border-radius:13px;padding:9px 11px;" +
        "cursor:pointer;font-family:inherit;display:flex;flex-direction:column;gap:1px";
      b.addEventListener("click", () => buy(u));
      shop.appendChild(b);
      return b;
    });

    wrap.appendChild(moneyLine);
    wrap.appendChild(canvas);
    wrap.appendChild(pad);
    wrap.appendChild(shop);
    api.board.appendChild(wrap);

    function buy(u) {
      if (money < u.cost) return;
      money -= u.cost; u.n++; u.buy();
      u.cost = Math.ceil(u.cost * u.growth);
      api.toast(u.emoji + " " + u.name + " (×" + u.n + ")");
      paintShop();
    }
    function paintShop() {
      upgrades.forEach((u, i) => {
        const b = upBtns[i], afford = money >= u.cost;
        b.style.opacity = afford ? "1" : "0.55";
        b.style.borderColor = afford ? "var(--mint-400)" : "var(--mint-200)";
        b.innerHTML = "<span style='font-weight:800;font-size:13px'>" + u.emoji + " " + u.name +
          (u.n ? " <span style='color:var(--mint-700)'>×" + u.n + "</span>" : "") + "</span>" +
          "<span style='font-size:11px;color:var(--ink-soft)'>" + u.desc + "</span>" +
          "<span style='font-size:13px;font-weight:700;color:" + (afford ? "var(--mint-700)" : "#c0392b") + "'>" + fmt(u.cost) + "</span>";
      });
    }

    // ---- input ----
    function onKey(down) {
      return (e) => {
        const k = e.key.toLowerCase();
        let hit = true;
        if (k === "arrowup" || k === "w") held.up = down;
        else if (k === "arrowdown" || k === "s") held.down = down;
        else if (k === "arrowleft" || k === "a") held.left = down;
        else if (k === "arrowright" || k === "d") held.right = down;
        else hit = false;
        if (hit) e.preventDefault();
      };
    }
    const kd = onKey(true), ku = onKey(false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);

    function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

    function deliver(c) {
      const frac = Math.max(0, c.patience / c.max);     // 1 = instant, 0 = last second
      const tip = Math.round(price * frac * tipMult);
      // combo: a delivery within the window keeps the streak alive
      combo = comboTimer > 0 ? combo + 1 : 1;
      comboTimer = 3500;
      const mult = 1 + Math.min(combo - 1, 8) * 0.2;     // up to ~2.6×
      const take = Math.round((price + tip) * mult);
      carrying--; money += take; earned += take; served++;
      if (combo >= 2) api.toast("🔥 Combo ×" + combo + (tip ? "  +💸" + tip + " tip" : ""));
      relocate(c);
      if (earned >= nextDayAt) advanceDay();
    }
    function advanceDay() {
      day++;
      nextDayAt = Math.ceil(nextDayAt * 2.15);
      if (customers.length < 9) addCustomer();
      api.toast("📅 Day " + day + "! The lunch rush grows 🙌");
    }

    function step(dt) {
      const dx = (held.right ? 1 : 0) - (held.left ? 1 : 0);
      const dy = (held.down ? 1 : 0) - (held.up ? 1 : 0);
      if (dx || dy) {
        const m = Math.hypot(dx, dy) || 1, v = speed * (dt / 16);
        chef.x = Math.max(R, Math.min(CW - R, chef.x + (dx / m) * v));
        chef.y = Math.max(R, Math.min(CH - R, chef.y + (dy / m) * v));
      }
      // bake
      bakeAcc += dt;
      if (bakeAcc >= bakeMs) { bakeAcc = 0; if (ovenReady < maxReady()) ovenReady++; }
      // pick up at oven
      const overOven = chef.x + R > oven.x && chef.x - R < oven.x + oven.w && chef.y + R > oven.y && chef.y - R < oven.y + oven.h;
      if (overOven && carrying < carryCap && ovenReady > 0) {
        const t = Math.min(carryCap - carrying, ovenReady);
        carrying += t; ovenReady -= t;
      }
      // customers: patience drains; deliver if reached
      customers.forEach((c) => {
        if (carrying > 0 && dist(chef, c) < R + 18) { deliver(c); return; }
        c.patience -= dt;
        if (c.patience <= 0) { missed++; combo = 0; comboTimer = 0; relocate(c); }
      });
      // combo window
      if (comboTimer > 0) { comboTimer -= dt; if (comboTimer <= 0) combo = 0; }
    }

    function draw() {
      ctx.fillStyle = "#f1fbf5"; ctx.fillRect(0, 0, CW, CH);
      // oven
      ctx.fillStyle = "#3a2417"; roundRect(oven.x, oven.y, oven.w, oven.h, 12); ctx.fill();
      ctx.fillStyle = "#ffce54"; roundRect(oven.x + 8, oven.y + 10, oven.w - 16, oven.h - 20, 8); ctx.fill();
      ctx.font = "26px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("🔥", oven.x + oven.w / 2, oven.y + oven.h / 2);
      ctx.fillStyle = "#173a2b"; ctx.font = "bold 13px sans-serif";
      ctx.fillText("ready " + ovenReady, oven.x + oven.w / 2, oven.y - 9);
      // customers + patience rings
      customers.forEach((c) => {
        const frac = Math.max(0, c.patience / c.max);
        // patience ring
        ctx.beginPath();
        ctx.arc(c.x, c.y, 21, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
        ctx.strokeStyle = frac > 0.5 ? "#2e9d6c" : frac > 0.25 ? "#e6a700" : "#e74c3c";
        ctx.lineWidth = 3.5; ctx.lineCap = "round"; ctx.stroke();
        ctx.font = "24px serif";
        ctx.fillText(frac < 0.25 ? "😣" : "🙋", c.x, c.y);
        ctx.font = "14px serif"; ctx.fillText("🍕", c.x + 15, c.y - 15);
      });
      // chef
      ctx.font = "26px serif"; ctx.fillText("🧑‍🍳", chef.x, chef.y);
      if (carrying > 0) {
        ctx.font = "16px serif"; ctx.fillText("🍕", chef.x, chef.y - 20);
        if (carrying > 1) { ctx.fillStyle = "#173a2b"; ctx.font = "bold 12px sans-serif"; ctx.fillText("×" + carrying, chef.x + 16, chef.y - 20); }
      }
      // combo badge
      if (combo >= 2) {
        ctx.fillStyle = "#e67e22"; ctx.font = "bold 18px sans-serif"; ctx.textAlign = "right";
        ctx.fillText("🔥 ×" + combo, CW - 10, 20); ctx.textAlign = "center";
      }
    }
    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }

    function updateHud() {
      moneyLine.innerHTML = "💰 <b>" + fmt(money) + "</b> &nbsp; 📅 Day " + day +
        " &nbsp; 🍕 " + carrying + "/" + carryCap +
        " &nbsp; 💵 " + fmt(price) + (combo >= 2 ? " &nbsp; 🔥 ×" + combo : "") +
        "<br>🏆 earned <b>" + fmt(earned) + "</b> &nbsp; 😋 served " + served + " &nbsp; 😣 missed " + missed +
        " &nbsp; ▶ next day at " + fmt(nextDayAt);
    }

    function frame(ts) {
      if (stopped) return;
      const dt = last ? Math.min(50, ts - last) : 16; last = ts;
      step(dt);
      draw();
      updateHud();
      paintShop();
      scoreAcc += dt;
      if (scoreAcc >= 500) { scoreAcc = 0; api.setScores([{ name: api.config.username, value: Math.floor(earned), color: api.colors[1] }]); }
      raf = requestAnimationFrame(frame);
    }

    paintShop();
    updateHud();
    api.setScores([{ name: api.config.username, value: 0, color: api.colors[1] }]);
    api.setStatus("Grab 🍕 at the oven 🔥 and deliver before the ring runs out — serve fast for tips & combos!");
    raf = requestAnimationFrame(frame);

    return { stop() { stopped = true; if (raf) cancelAnimationFrame(raf); window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); } };
  },
});
