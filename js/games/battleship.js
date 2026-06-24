/* Battleship — 2 to 4 players, hot-seat ring duel */
Arcade.register({
  id: "battleship",
  name: "Battleship",
  emoji: "🚢",
  tagline: "Hide your fleet, then hunt down your rivals grid by grid.",
  tags: ["Board", "Strategy", "Duel"],
  minPlayers: 2,
  maxPlayers: 4,
  leaderboard: { type: "low" }, // fewest shots to finish ranks highest (per game, not summed)
  rules: [
    "Each captain places a fleet on their own sea (rivals, look away!).",
    "Players fire in a ring: P1 → P2 → P3 → P4 → back to P1.",
    "Click a square to fire — 🔥 hit, 💧 miss. A hit lets you fire again.",
    "Sink a rival's whole fleet to knock them out. Last captain afloat wins!",
    "The fewer total shots the game takes, the higher it ranks on the leaderboard.",
  ],
  options: [
    { key: "board", label: "Board size", type: "select", default: "mid",
      choices: [
        { label: "Small (5×5)", value: "small" },
        { label: "Medium (6×6)", value: "mid" },
        { label: "Big (8×8)", value: "big" },
      ] },
    { key: "fleet", label: "Fleet", type: "select", default: "classic",
      choices: [{ label: "Classic (5,4,3,3,2)", value: "classic" }, { label: "Small (4,3,2)", value: "small" }] },
  ],

  create(api) {
    const opt = api.config.options;
    const N = opt.board === "small" ? 5 : opt.board === "big" ? 8 : 6;
    const SIZES = opt.fleet === "small" ? [4, 3, 2] : [5, 4, 3, 3, 2];
    const names = api.config.players;
    const P = names.length;
    const colors = names.map((_, i) => api.colors[i % api.colors.length]);
    const cell = Math.floor(Math.min(360, window.innerWidth - 50) / N);

    // ---- board model helpers ----
    function emptyBoard() { return { occ: {}, ships: [], shots: {} }; }
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
    function autoFill(b) {
      for (let i = b.ships.length; i < SIZES.length; i++) {
        const size = SIZES[i];
        let placed = false;
        for (let tries = 0; tries < 1500 && !placed; tries++) {
          const horiz = Math.random() < 0.5;
          const r = (Math.random() * (horiz ? N : N - size + 1)) | 0;
          const c = (Math.random() * (horiz ? N - size + 1 : N)) | 0;
          if (tryPlace(b, size, r, c, horiz)) placed = true;
        }
        if (!placed) { api.toast("Couldn't auto-place the fleet — pick a smaller fleet or bigger board."); return; }
      }
    }

    const boards = names.map(() => emptyBoard());
    const alive = names.map(() => true);

    let phase = "setup", setupP = 0, turn = 0, over = false;
    let horiz = true; // current placement orientation during setup
    let totalShots = 0, t0 = 0; // shots fired this game + play start time, for the fewest-shots leaderboard
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

    // next still-alive player after `from` (the attacker's target)
    function nextAlive(from) {
      for (let k = 1; k <= P; k++) { const i = (from + k) % P; if (alive[i]) return i; }
      return from;
    }
    function aliveCount() { return alive.filter(Boolean).length; }

    function score() {
      api.setScores(names.map((n, i) => ({
        name: (alive[i] ? "" : "💀 ") + n,
        value: "sunk " + boards[i].ships.filter((s) => s.hits >= s.size).length + "/" + SIZES.length,
        color: colors[i],
        turn: phase === "play" && i === turn && !over,
      })));
    }

    // ---- setup ----
    function setupGate() {
      horiz = true;
      showGate("🤫 " + names[setupP] + ", take the device. Place your fleet (rivals, look away!).", "I'm " + names[setupP], renderSetup);
    }
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
        if (boards[setupP].ships.length !== SIZES.length) return;
        if (setupP < P - 1) { setupP++; setupGate(); }
        else { phase = "play"; turn = 0; t0 = performance.now(); playGate(); }
        score();
      });
      score();
    }

    // ---- play ----
    function playGate() {
      const tgt = nextAlive(turn);
      showGate("🎯 " + names[turn] + "'s turn — fire at " + names[tgt] + "! Pass the device over.", names[turn] + " fire!", renderPlay);
      api.setStatus("");
    }
    function renderPlay() {
      showGrid(); clearGrid();
      const tgt = nextAlive(turn);
      const enemy = boards[tgt];
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
      api.setStatus("🎯 " + names[turn] + ", tap a square to fire at " + names[tgt] + "'s fleet.");
    }
    function fire(r, c) {
      const tgt = nextAlive(turn);
      const enemy = boards[tgt];
      const key = r + "," + c;
      if (enemy.shots[key]) return;
      totalShots++;
      const idx = enemy.occ[key];
      if (idx != null) {
        enemy.shots[key] = "hit";
        const ship = enemy.ships[idx]; ship.hits++;
        if (ship.hits >= ship.size) {
          const allSunk = enemy.ships.every((s) => s.hits >= s.size);
          if (allSunk) {
            alive[tgt] = false;
            if (aliveCount() <= 1) {
              over = true;
              const secs = Math.round((performance.now() - t0) / 1000);
              if (api.submitScore) api.submitScore(totalShots); // fewest shots to finish ranks highest
              renderPlay(); score();
              api.setStatus("🏆 " + names[turn] + " wins — fleet sunk in <b>" + totalShots + "</b> shots, " + secs + "s! 🎉 Fewer shots ranks higher.");
              return;
            }
            renderPlay(); score();
            api.setStatus("💥 " + names[tgt] + " is knocked out! Fire again, " + names[turn] + " — now at " + names[nextAlive(turn)] + ".");
            return;
          }
          renderPlay(); score();
          api.setStatus("💥 Hit and <b>sunk</b> a ship! Fire again, " + names[turn] + ".");
        } else {
          renderPlay(); score();
          api.setStatus("🔥 Direct hit! Fire again, " + names[turn] + ".");
        }
      } else {
        enemy.shots[key] = "miss";
        renderPlay();
        api.setStatus("💧 Miss! Passing turn…");
        setTimeout(() => { turn = nextAlive(turn); score(); playGate(); }, 900);
      }
    }

    score();
    setupGate();
    return { stop() {} };
  },
});
