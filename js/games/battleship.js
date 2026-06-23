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
    "Each captain gets a fleet on a 10×10 sea (hidden from the rival).",
    "Tap 'Shuffle' to rearrange your ships, then 'Ready'.",
    "Take turns firing at the enemy grid — 🔥 hit, 💧 miss.",
    "Sink every enemy ship to win the battle!",
  ],
  options: [
    { key: "fleet", label: "Fleet", type: "select", default: "classic",
      choices: [{ label: "Classic (5,4,3,3,2)", value: "classic" }, { label: "Small (4,3,2)", value: "small" }] },
  ],

  create(api) {
    const N = 10;
    const SIZES = api.config.options.fleet === "small" ? [4, 3, 2] : [5, 4, 3, 3, 2];
    const names = api.config.players;
    const colors = [api.colors[2], api.colors[4]];
    const cell = Math.floor(Math.min(360, window.innerWidth - 50) / N);

    // board model per player
    function makeFleet() {
      const occ = {}, ships = [];
      SIZES.forEach((size) => {
        for (;;) {
          const horiz = Math.random() < 0.5;
          const r = (Math.random() * (horiz ? N : N - size + 1)) | 0;
          const c = (Math.random() * (horiz ? N - size + 1 : N)) | 0;
          const cells = [];
          let ok = true;
          for (let k = 0; k < size; k++) { const rr = r + (horiz ? 0 : k), cc = c + (horiz ? k : 0); if (occ[rr + "," + cc]) { ok = false; break; } cells.push([rr, cc]); }
          if (!ok) continue;
          const idx = ships.length;
          cells.forEach(([rr, cc]) => (occ[rr + "," + cc] = idx));
          ships.push({ cells, hits: 0, size });
          break;
        }
      });
      return { occ, ships, shots: {} };
    }
    const boards = [makeFleet(), makeFleet()];

    let phase = "setup", setupP = 0, turn = 0, over = false;
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
        return { name: n, value: "sunk " + sunk + "/" + boards[i].ships.length, color: colors[i], turn: phase === "play" && i === turn && !over };
      }));
    }

    // ---- setup ----
    function setupGate() {
      showGate("🤫 " + names[setupP] + ", take the device. Place your fleet (rival, look away!).", "I'm " + names[setupP], renderSetup);
    }
    function renderSetup() {
      showGrid(); clearGrid();
      const b = boards[setupP];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const btn = api.el("div", "cell");
        btn.style.width = btn.style.height = cell + "px";
        btn.style.cursor = "default";
        const ship = b.occ[r + "," + c] != null;
        btn.style.background = ship ? colors[setupP] : "#cfeeff";
        if (ship) btn.textContent = "🚢";
        btn.style.fontSize = cell * 0.5 + "px";
        grid.appendChild(btn);
      }
      api.setStatus(names[setupP] + "'s fleet — <button class='btn ghost small' id='bs-shuffle'>🔀 Shuffle</button> " +
        "<button class='btn primary small' id='bs-ready'>✔ Ready</button>");
      document.getElementById("bs-shuffle").addEventListener("click", () => { boards[setupP] = makeFleet(); renderSetup(); });
      document.getElementById("bs-ready").addEventListener("click", () => {
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
