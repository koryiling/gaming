/* Battleship — 2 players, hot-seat */
Arcade.register({
  id: "battleship",
  name: "Battleship",
  emoji: "🚢",
  tagline: "Hide your fleet, then hunt down your rival's ships grid by grid.",
  tags: ["Board", "Strategy", "Duel"],
  minPlayers: 2,
  maxPlayers: 2,
  rules: [
    "Pick a board size, then place your fleet on the sea (rival, look away!).",
    "Click a square to drop the current ship — use 🔄 Rotate to flip it, or 🔀 Auto to let the sea place it.",
    "Once both captains are 'Ready', take turns firing — 🔥 hit, 💧 miss.",
    "Sink every enemy ship to win the battle!",
  ],
  options: [
    { key: "board", label: "Board size", type: "select", default: "big",
      choices: [{ label: "Small (8×8)", value: "small" }, { label: "Big (10×10)", value: "big" }] },
    { key: "fleet", label: "Fleet", type: "select", default: "classic",
      choices: [{ label: "Classic (5,4,3,3,2)", value: "classic" }, { label: "Small (4,3,2)", value: "small" }] },
  ],

  create(api) {
    const N = api.config.options.board === "small" ? 8 : 10;
    const SIZES = api.config.options.fleet === "small" ? [4, 3, 2] : [5, 4, 3, 3, 2];
    const names = api.config.players;
    const colors = [api.colors[2], api.colors[4]];
    const cell = Math.floor(Math.min(360, window.innerWidth - 50) / N);

    // ---- board model helpers ----
    function emptyBoard() { return { occ: {}, ships: [], shots: {} }; }

    // try to place a ship of `size` with top-left (r,c); returns true on success
    function tryPlace(b, size, r, c, horiz) {
      const cells = [];
      for (let k = 0; k < size; k++) {
        const rr = r + (horiz ? 0 : k), cc = c + (horiz ? k : 0);
        if (rr < 0 || cc < 0 || rr >= N || cc >= N) return false;
        if (b.occ[rr + "," + cc] != null) return false;
        cells.push([rr, cc]);
      }
      const idx = b.ships.length;
      cells.forEach(([rr, cc]) => (b.occ[rr + "," + cc] = idx));
      b.ships.push({ cells, hits: 0, size });
      return true;
    }

    // fill any not-yet-placed ships at random (used by 🔀 Auto)
    function autoFill(b) {
      for (let i = b.ships.length; i < SIZES.length; i++) {
        const size = SIZES[i];
        for (;;) {
          const horiz = Math.random() < 0.5;
          const r = (Math.random() * (horiz ? N : N - size + 1)) | 0;
          const c = (Math.random() * (horiz ? N - size + 1 : N)) | 0;
          if (tryPlace(b, size, r, c, horiz)) break;
        }
      }
    }

    const boards = [emptyBoard(), emptyBoard()];

    let phase = "setup", setupP = 0, turn = 0, over = false;
    let horiz = true; // current placement orientation during setup
    const grid = api.el("div", "grid-board");
    grid.style.gridTemplateColumns = "repeat(" + N + ",1fr)";
    const gate = api.el("div", "");
    gate.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:14px;min-height:" + (N * (cell + 2)) + "px;justify-content:center";
    api.board.appendChild(gate);
    api.board.appendChild(grid);

    function clearGrid() { grid.innerHTML = ""; }
    function showGate(text, btnLabel, cb) {
      grid.style.display = "none"; gate.style.display = "flex"; gate.innerHTML = "";
      const p = api.el("p", "", text); p.style.cssText = "font-size:18px;font-weight:600;text-align:center;color:var(--ink)";
      const b = api.el("button", "btn primary", btnLabel);
      b.addEventListener("click", cb);
      gate.appendChild(p); gate.appendChild(b);
    }
    function showGrid() { gate.style.display = "none"; grid.style.display = "grid"; }

    function score() {
      api.setScores(names.map((n, i) => {
        const sunk = boards[i].ships.filter((s) => s.hits >= s.size).length;
        return { name: n, value: "sunk " + sunk + "/" + SIZES.length, color: colors[i], turn: phase === "play" && i === turn && !over };
      }));
    }

    // ---- setup ----
    function setupGate() {
      horiz = true;
      showGate("🤫 " + names[setupP] + ", take the device. Place your fleet (rival, look away!).", "I'm " + names[setupP], renderSetup);
    }

    // highlight the cells the current ship would occupy from (r,c)
    function previewCells(b, size, r, c) {
      const out = [];
      let ok = true;
      for (let k = 0; k < size; k++) {
        const rr = r + (horiz ? 0 : k), cc = c + (horiz ? k : 0);
        if (rr < 0 || cc < 0 || rr >= N || cc >= N || b.occ[rr + "," + cc] != null) ok = false;
        out.push([rr, cc]);
      }
      return { cells: out, ok };
    }

    function renderSetup() {
      showGrid(); clearGrid();
      const b = boards[setupP];
      const nextSize = b.ships.length < SIZES.length ? SIZES[b.ships.length] : null;
      const cellEls = {};
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const btn = api.el("div", "cell");
        btn.style.width = btn.style.height = cell + "px";
        btn.style.cursor = nextSize ? "pointer" : "default";
        const ship = b.occ[r + "," + c] != null;
        btn.style.background = ship ? colors[setupP] : "#cfeeff";
        if (ship) btn.textContent = "🚢";
        btn.style.fontSize = cell * 0.5 + "px";
        cellEls[r + "," + c] = btn;
        if (nextSize) {
          btn.addEventListener("mouseenter", () => {
            const pv = previewCells(b, nextSize, r, c);
            pv.cells.forEach(([rr, cc]) => {
              const e = cellEls[rr + "," + cc];
              if (e) e.style.background = pv.ok ? "#a7e0b8" : "#f3b4ab";
            });
          });
          btn.addEventListener("mouseleave", () => {
            for (let rr = 0; rr < N; rr++) for (let cc = 0; cc < N; cc++) {
              const e = cellEls[rr + "," + cc];
              if (e) e.style.background = b.occ[rr + "," + cc] != null ? colors[setupP] : "#cfeeff";
            }
          });
          btn.addEventListener("click", () => {
            if (tryPlace(b, nextSize, r, c, horiz)) { renderSetup(); score(); }
            else api.toast("Ship won't fit there 🚫");
          });
        }
        grid.appendChild(btn);
      }

      const placed = b.ships.length, total = SIZES.length;
      const ready = placed === total;
      const remaining = SIZES.slice(placed).join(", ") || "none";
      api.setStatus(
        names[setupP] + "'s fleet — placed <b>" + placed + "/" + total + "</b>" +
        (ready ? "" : " · next ship: <b>" + SIZES[placed] + "</b> long · remaining: " + remaining) +
        "<br>" +
        "<button class='btn ghost small' id='bs-rotate'>🔄 " + (horiz ? "Horizontal" : "Vertical") + "</button> " +
        "<button class='btn ghost small' id='bs-undo'" + (placed ? "" : " disabled") + ">↶ Undo</button> " +
        "<button class='btn ghost small' id='bs-auto'>🔀 Auto</button> " +
        "<button class='btn ghost small' id='bs-clear'" + (placed ? "" : " disabled") + ">🗑 Clear</button> " +
        "<button class='btn primary small' id='bs-ready'" + (ready ? "" : " disabled") + ">✔ Ready</button>"
      );
      document.getElementById("bs-rotate").addEventListener("click", () => { horiz = !horiz; renderSetup(); });
      document.getElementById("bs-undo").addEventListener("click", () => {
        const s = b.ships.pop();
        if (s) s.cells.forEach(([rr, cc]) => delete b.occ[rr + "," + cc]);
        renderSetup(); score();
      });
      document.getElementById("bs-auto").addEventListener("click", () => { autoFill(b); renderSetup(); score(); });
      document.getElementById("bs-clear").addEventListener("click", () => { boards[setupP] = emptyBoard(); renderSetup(); score(); });
      document.getElementById("bs-ready").addEventListener("click", () => {
        if (b.ships.length !== SIZES.length) return;
        if (setupP === 0) { setupP = 1; setupGate(); }
        else { phase = "play"; turn = 0; playGate(); }
        score();
      });
      score();
    }

    // ---- play ----
    function playGate() {
      showGate("🎯 " + names[turn] + "'s turn to fire. Pass the device over.", names[turn] + " fire!", renderPlay);
      api.setStatus("");
    }
    function renderPlay() {
      showGrid(); clearGrid();
      const enemy = boards[1 - turn];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const key = r + "," + c;
        const btn = api.el("button", "cell");
        btn.style.width = btn.style.height = cell + "px";
        btn.style.fontSize = cell * 0.5 + "px";
        const shot = enemy.shots[key];
        if (shot === "hit") { btn.textContent = "🔥"; btn.style.background = "#f6dcd6"; btn.disabled = true; }
        else if (shot === "miss") { btn.textContent = "💧"; btn.style.background = "#cfeeff"; btn.disabled = true; }
        else { btn.style.background = "#bfe0f5"; btn.addEventListener("click", () => fire(r, c)); }
        grid.appendChild(btn);
      }
      api.setStatus("🎯 " + names[turn] + ", tap a square to fire at " + names[1 - turn] + "'s fleet.");
    }
    function fire(r, c) {
      const enemy = boards[1 - turn];
      const key = r + "," + c;
      if (enemy.shots[key]) return;
      const idx = enemy.occ[key];
      if (idx != null) {
        enemy.shots[key] = "hit";
        const ship = enemy.ships[idx]; ship.hits++;
        renderPlay(); score();
        if (ship.hits >= ship.size) {
          const allSunk = enemy.ships.every((s) => s.hits >= s.size);
          if (allSunk) { over = true; api.setStatus("🏆 " + names[turn] + " sank the whole fleet and wins! 🎉"); score(); return; }
          api.setStatus("💥 Hit and <b>sunk</b> a ship! Fire again, " + names[turn] + ".");
        } else {
          api.setStatus("🔥 Direct hit! Fire again, " + names[turn] + ".");
        }
      } else {
        enemy.shots[key] = "miss";
        renderPlay();
        api.setStatus("💧 Miss! Passing turn…");
        setTimeout(() => { turn = 1 - turn; score(); playGate(); }, 900);
      }
    }

    score();
    setupGate();
    return { stop() {} };
  },
});
