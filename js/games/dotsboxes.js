/* Dots & Boxes — 2 to 4 players */
Arcade.register({
  id: "dots",
  name: "Dots & Boxes",
  emoji: "⬜",
  tagline: "Draw lines between dots. Close a box to claim it — and go again.",
  tags: ["Board", "Strategy", "Family"],
  minPlayers: 2,
  maxPlayers: 4,
  rules: [
    "On your turn, draw one line between two adjacent dots.",
    "Complete the 4th side of a box → you claim it (your colour) and take another turn.",
    "If you don't complete a box, play passes to the next player.",
    "When every box is claimed, whoever owns the most wins!",
  ],
  options: [
    { key: "size", label: "Board size", type: "select", default: 4,
      choices: [{ label: "Small 3×3", value: 3 }, { label: "Medium 4×4", value: 4 }, { label: "Large 5×5", value: 5 }] },
  ],

  create(api) {
    const B = api.config.options.size;          // boxes per side
    const names = api.config.players;
    const scores = names.map(() => 0);
    let turn = 0, claimed = 0, over = false;
    const H = Array.from({ length: B + 1 }, () => Array(B).fill(false)); // horizontal edges
    const V = Array.from({ length: B }, () => Array(B + 1).fill(false)); // vertical edges
    const owner = Array.from({ length: B }, () => Array(B).fill(-1));

    const boxPx = Math.min(74, Math.floor((Math.min(420, window.innerWidth - 50)) / B) - 16);
    const dot = 16;
    const wrap = api.el("div", "");
    let cols = "";
    for (let i = 0; i < B; i++) cols += dot + "px " + boxPx + "px ";
    cols += dot + "px";
    wrap.style.cssText = "display:grid;grid-template-columns:" + cols + ";grid-template-rows:" + cols +
      ";background:#fff;padding:14px;border-radius:var(--radius);box-shadow:var(--shadow)";
    api.board.appendChild(wrap);

    const hEls = {}, vEls = {}, bEls = {};
    const R = 2 * B + 1;
    for (let gr = 0; gr < R; gr++) for (let gc = 0; gc < R; gc++) {
      const evR = gr % 2 === 0, evC = gc % 2 === 0;
      let cellEl;
      if (evR && evC) {
        cellEl = api.el("div", "");
        cellEl.style.cssText = "width:" + dot + "px;height:" + dot + "px;border-radius:50%;background:var(--mint-600)";
      } else if (evR && !evC) {           // horizontal edge
        const r = gr / 2, c = (gc - 1) / 2;
        cellEl = edge("h"); hEls[r + "," + c] = cellEl;
        cellEl.addEventListener("click", () => play("h", r, c));
      } else if (!evR && evC) {           // vertical edge
        const r = (gr - 1) / 2, c = gc / 2;
        cellEl = edge("v"); vEls[r + "," + c] = cellEl;
        cellEl.addEventListener("click", () => play("v", r, c));
      } else {                            // box
        const r = (gr - 1) / 2, c = (gc - 1) / 2;
        cellEl = api.el("div", "");
        cellEl.style.cssText = "display:grid;place-items:center;font-weight:800;font-size:" + (boxPx * 0.5) + "px;color:#fff";
        bEls[r + "," + c] = cellEl;
      }
      wrap.appendChild(cellEl);
    }
    function edge(type) {
      const e = api.el("div", "");
      const w = type === "h" ? boxPx : dot, h = type === "h" ? dot : boxPx;
      e.style.cssText = "width:" + w + "px;height:" + h + "px;display:flex;align-items:center;justify-content:center;cursor:pointer";
      const bar = api.el("div", "");
      const bw = type === "h" ? boxPx : 6, bh = type === "h" ? 6 : boxPx;
      bar.style.cssText = "width:" + bw + "px;height:" + bh + "px;border-radius:4px;background:#e3f7ec;transition:background .12s";
      e.appendChild(bar); e._bar = bar;
      e.addEventListener("mouseenter", () => { if (!e._on && !over) bar.style.background = "var(--mint-200)"; });
      e.addEventListener("mouseleave", () => { if (!e._on) bar.style.background = "#e3f7ec"; });
      return e;
    }

    function board() {
      api.setScores(names.map((n, i) => ({ name: n, value: scores[i], color: api.colors[i], turn: i === turn && !over })));
    }
    function play(type, r, c) {
      if (over) return;
      const arr = type === "h" ? H : V;
      if (arr[r][c]) return;
      arr[r][c] = true;
      const elMap = type === "h" ? hEls : vEls;
      const e = elMap[r + "," + c];
      e._on = true; e._bar.style.background = api.colors[turn];
      // check boxes touching this edge
      let made = 0;
      const boxesToCheck = type === "h" ? [[r - 1, c], [r, c]] : [[r, c - 1], [r, c]];
      boxesToCheck.forEach(([br, bc]) => {
        if (br < 0 || bc < 0 || br >= B || bc >= B || owner[br][bc] >= 0) return;
        if (H[br][bc] && H[br + 1][bc] && V[br][bc] && V[br][bc + 1]) {
          owner[br][bc] = turn; scores[turn]++; claimed++; made++;
          const be = bEls[br + "," + bc];
          be.style.background = api.colors[turn];
          be.textContent = names[turn].charAt(0).toUpperCase();
        }
      });
      if (claimed === B * B) return finish();
      if (!made) { turn = (turn + 1) % names.length; api.setStatus("✏️ " + names[turn] + "'s turn — draw a line."); }
      else { api.setStatus("📦 " + names[turn] + " claimed a box — go again!"); }
      board();
    }
    function finish() {
      over = true; board();
      const max = Math.max(...scores);
      const champs = names.filter((_, i) => scores[i] === max);
      api.setStatus(champs.length > 1
        ? "🤝 It's a tie at " + max + " boxes between " + champs.join(" & ") + "!"
        : "🏆 " + champs[0] + " wins with " + max + " boxes! 🎉");
    }

    board();
    api.setStatus("✏️ " + names[0] + " starts — draw a line between two dots.");
    return { stop() {} };
  },
});
