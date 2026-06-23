/* Mahjong Solitaire — single player tile matching */
Arcade.register({
  id: "mahjong",
  name: "Mahjong Solitaire",
  emoji: "🀄",
  tagline: "Clear the layout by matching pairs of free tiles. Calm and tricky.",
  tags: ["Puzzle", "Tiles", "Solo"],
  minPlayers: 1,
  maxPlayers: 1,
  rules: [
    "Match two identical tiles to remove them.",
    "A tile is 'free' only if its left OR right side is open and nothing sits on top of it.",
    "Free tiles glow when you select one; pick a matching free tile to clear the pair.",
    "Clear every tile to win. Stuck? Use Shuffle to rearrange the rest.",
  ],
  options: [
    { key: "size", label: "Layout", type: "select", default: "medium",
      choices: [{ label: "Small", value: "small" }, { label: "Medium", value: "medium" }, { label: "Large", value: "large" }] },
  ],

  create(api) {
    const SYMS = ["🀄","🎋","🌸","🍂","🐉","🌙","☀️","⭐","🍀","🔔","💎","🎐","🏮","🍃","🪷","🐲","🎍","🪕","🧧","🪭"];
    const LAYOUTS = {
      small:  { w: 8,  rows: [4, 3, 2] },
      medium: { w: 12, rows: [5, 3, 1] },
      large:  { w: 14, rows: [6, 4, 2] },
    };
    const conf = LAYOUTS[api.config.options.size];

    // build positions: each layer centered, aligned grid
    const positions = [];
    conf.rows.forEach((rowsInLayer, layer) => {
      const width = conf.w - layer * 2;
      const startX = layer; // indent per layer
      for (let ry = 0; ry < rowsInLayer; ry++) {
        const y = ry + layer; // shift down a touch per layer
        for (let x = 0; x < width; x++) positions.push({ x: startX + x, y: y, layer });
      }
    });
    // ensure even count
    if (positions.length % 2) positions.pop();

    // assign symbols in pairs
    const vals = [];
    for (let i = 0; i < positions.length / 2; i++) { const s = SYMS[i % SYMS.length]; vals.push(s, s); }
    function shuffleVals() { for (let i = vals.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [vals[i], vals[j]] = [vals[j], vals[i]]; } }
    shuffleVals();

    const maxX = Math.max(...positions.map((p) => p.x)) + 1;
    const maxY = Math.max(...positions.map((p) => p.y)) + 1;
    const cw = Math.floor(Math.min(560, window.innerWidth - 30) / (maxX + 1));
    const ch = Math.floor(cw * 1.3);
    const off = Math.max(3, (cw * 0.12) | 0);

    const wrap = api.el("div", "");
    wrap.style.cssText = "position:relative;width:" + (maxX * cw + off * 3 + 6) + "px;height:" + (maxY * ch + off * 3 + 6) +
      "px;margin:0 auto;background:#cdeede;border-radius:var(--radius);box-shadow:var(--shadow)";
    api.board.appendChild(wrap);

    let tiles = positions.map((p, i) => {
      const el = api.el("button", "");
      el.style.cssText = "position:absolute;width:" + (cw - 3) + "px;height:" + (ch - 3) + "px;border:2px solid #b7d8c6;" +
        "border-radius:7px;background:#fcfff9;cursor:pointer;font-size:" + (cw * 0.6) + "px;display:grid;place-items:center;" +
        "box-shadow:1px 2px 3px rgba(0,0,0,.25)";
      wrap.appendChild(el);
      const t = { ...p, sym: vals[i], el, removed: false };
      el.addEventListener("click", () => clickTile(t));
      return t;
    });

    let selected = null;
    function present(x, y, layer) { return tiles.some((t) => !t.removed && t.x === x && t.y === y && t.layer === layer); }
    function isFree(t) {
      if (t.removed) return false;
      for (let L = t.layer + 1; L <= 2; L++) if (present(t.x, t.y, L)) return false;
      const leftB = present(t.x - 1, t.y, t.layer);
      const rightB = present(t.x + 1, t.y, t.layer);
      return !(leftB && rightB);
    }
    function place(t) {
      t.el.style.left = (t.x * cw + t.layer * off) + "px";
      t.el.style.top = (t.y * ch + t.layer * off) + "px";
      t.el.style.zIndex = t.layer * 100 + t.y;
    }
    function render() {
      tiles.forEach((t) => {
        if (t.removed) { t.el.style.display = "none"; return; }
        place(t);
        t.el.textContent = t.sym;
        const free = isFree(t);
        t.el.disabled = !free;
        t.el.style.opacity = free ? "1" : ".62";
        t.el.style.outline = t === selected ? "3px solid var(--mint-600)" : "none";
        t.el.style.background = t === selected ? "#dff5e8" : "#fcfff9";
      });
      const left = tiles.filter((t) => !t.removed).length;
      api.setScores([{ name: "Tiles left", value: left, color: "#2e9d6c" }, { name: "Pairs", value: left / 2, color: "#e67e22" }]);
      if (left === 0) { api.setStatus("🎉 Cleared! Beautifully done, " + api.config.username + "!"); return; }
      if (!hasMove()) api.setStatus("😵 No free matches — hit Shuffle to rearrange.");
    }
    function hasMove() {
      const free = tiles.filter(isFree);
      const seen = {};
      for (const t of free) { if (seen[t.sym]) return true; seen[t.sym] = true; }
      return false;
    }
    function clickTile(t) {
      if (t.removed || !isFree(t)) return;
      if (!selected) { selected = t; render(); api.setStatus("Selected " + t.sym + " — pick its match."); return; }
      if (selected === t) { selected = null; render(); return; }
      if (selected.sym === t.sym) {
        selected.removed = true; t.removed = true; selected = null;
        render();
        const left = tiles.filter((x) => !x.removed).length;
        if (left) api.setStatus("✨ Matched! " + left + " tiles to go.");
      } else { selected = t; render(); api.setStatus("Selected " + t.sym + " — pick its match."); }
    }

    // shuffle button
    const ctrl = api.el("div", ""); ctrl.style.cssText = "text-align:center;margin-top:14px";
    const shuf = api.el("button", "btn ghost small", "🔀 Shuffle remaining");
    shuf.addEventListener("click", () => {
      const remain = tiles.filter((t) => !t.removed);
      const syms = remain.map((t) => t.sym);
      for (let i = syms.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [syms[i], syms[j]] = [syms[j], syms[i]]; }
      remain.forEach((t, i) => (t.sym = syms[i]));
      selected = null; render(); api.setStatus("🔀 Shuffled — keep matching!");
    });
    ctrl.appendChild(shuf);
    api.board.appendChild(ctrl);

    render();
    api.setStatus("Match two free, identical tiles to clear them.");
    return { stop() {} };
  },
});
