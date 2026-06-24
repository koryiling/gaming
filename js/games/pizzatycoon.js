/* Pizza Tycoon — move your chef to bake & deliver pizzas, then grow the empire */
Arcade.register({
  id: "pizzatycoon",
  name: "Pizza Tycoon",
  emoji: "🍕",
  tagline: "Run the floor: walk your chef to the oven, deliver hot slices to customers, and grow a pizza empire.",
  tags: ["Strategy", "Family", "Solo"],
  minPlayers: 1,
  maxPlayers: 1,
  rules: [
    "Move your chef 🧑‍🍳 with the arrow keys / WASD (or the on-screen pad).",
    "Step on the oven 🔥 to pick up freshly baked pizzas.",
    "Walk a carried pizza onto a customer 🙋 to sell it for cash.",
    "Spend cash on upgrades — faster shoes, hotter oven, bigger tray, premium menu, more customers.",
    "Your score is total money earned. Build the biggest empire you can!",
  ],
  options: [],

  create(api) {
    const CW = Math.max(280, Math.min(520, window.innerWidth - 60));
    const CH = 340, R = 16;
    let money = 0, earned = 0, price = 5;
    let speed = 2.4, carryCap = 1, carrying = 0;
    let bakeMs = 1400, bakeAcc = 0, ovenReady = 1;
    let stopped = false, raf = null, last = 0, scoreAcc = 0;

    const oven = { x: 22, y: CH / 2 - 32, w: 86, h: 64 };
    const chef = { x: CW / 2, y: CH / 2 };
    const held = { up: false, down: false, left: false, right: false };
    const customers = [];
    const maxReady = () => Math.max(3, carryCap + 2);

    function fmt(n) {
      n = Math.floor(n);
      if (n < 1000) return "$" + n;
      const u = ["", "K", "M", "B", "T"]; let i = 0, v = n;
      while (v >= 1000 && i < u.length - 1) { v /= 1000; i++; }
      return "$" + (v < 10 ? v.toFixed(1) : Math.floor(v)) + u[i];
    }
    function addCustomer() {
      customers.push({ x: 0, y: 0 }); relocate(customers[customers.length - 1]);
    }
    function relocate(c) {
      c.x = CW * 0.4 + Math.random() * (CW * 0.6 - 30) + 10;
      c.y = 26 + Math.random() * (CH - 52);
    }
    addCustomer(); addCustomer(); addCustomer();

    // ---- layout ----
    const wrap = api.el("div", "");
    wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:12px;padding:6px;width:100%;max-width:540px";
    const moneyLine = api.el("div", "");
    moneyLine.style.cssText = "font-size:15px;font-weight:700;color:var(--ink);text-align:center";
    const canvas = document.createElement("canvas");
    canvas.width = CW; canvas.height = CH;
    canvas.style.cssText = "background:#fff;border-radius:var(--radius);box-shadow:var(--shadow);touch-action:none";
    const ctx = canvas.getContext("2d");

    // on-screen D-pad (touch / mouse)
    const pad = api.el("div", "");
    pad.style.cssText = "display:grid;grid-template-columns:repeat(3,46px);grid-template-rows:repeat(2,46px);gap:6px;justify-content:center";
    function padBtn(label, dir, col, row) {
      const b = api.el("button", "btn ghost", label);
      b.style.cssText = "padding:0;font-size:20px;grid-column:" + col + ";grid-row:" + row + "";
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
      { emoji: "🙋", name: "More Customers", desc: "+1 customer", cost: 130, growth: 1.5, n: 0, buy() { if (customers.length < 8) addCustomer(); } },
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
        const take = Math.min(carryCap - carrying, ovenReady);
        carrying += take; ovenReady -= take;
      }
      // sell to customers
      customers.forEach((c) => {
        if (carrying > 0 && dist(chef, c) < R + 18) {
          carrying--; money += price; earned += price; relocate(c);
        }
      });
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
      // customers
      ctx.font = "26px serif";
      customers.forEach((c) => {
        ctx.fillText("🙋", c.x, c.y);
        ctx.font = "15px serif"; ctx.fillText("🍕", c.x + 14, c.y - 14); ctx.font = "26px serif";
      });
      // chef
      ctx.fillText("🧑‍🍳", chef.x, chef.y);
      if (carrying > 0) {
        ctx.font = "16px serif"; ctx.fillText("🍕", chef.x, chef.y - 20);
        if (carrying > 1) { ctx.fillStyle = "#173a2b"; ctx.font = "bold 12px sans-serif"; ctx.fillText("×" + carrying, chef.x + 16, chef.y - 20); }
      }
    }
    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }

    function updateHud() {
      moneyLine.innerHTML = "💰 <b>" + fmt(money) + "</b> &nbsp; 🍕 carry " + carrying + "/" + carryCap +
        " &nbsp; 💵 " + fmt(price) + "/pizza &nbsp; 🏆 earned <b>" + fmt(earned) + "</b>";
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
    api.setStatus("Move with arrow keys / WASD — grab 🍕 at the oven 🔥 and deliver to customers 🙋!");
    raf = requestAnimationFrame(frame);

    return { stop() { stopped = true; if (raf) cancelAnimationFrame(raf); window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); } };
  },
});
