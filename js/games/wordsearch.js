/* Word Search — single player.
 * A box of letters hides a set of words (placed in any of 8 directions, forwards or
 * backwards). Drag across a straight line of letters to trace a word; every word you
 * find scores a point. Pick how many words to hunt (1–30). Highest words-found wins. */
Arcade.register({
  id: "wordsearch",
  name: "Word Search",
  emoji: "🔎",
  tagline: "Hunt hidden words in a grid of letters — drag across to trace them.",
  tags: ["Word", "Puzzle", "Solo"],
  category: "english",
  minPlayers: 1,
  maxPlayers: 1,
  leaderboard: {
    type: "time", // fastest full clear first; each difficulty ranked separately
    categories: [ // a separate ranking per difficulty, shown Hard → Medium → Easy
      { key: "Hard", label: "🔴 Hard" },
      { key: "Medium", label: "🟠 Medium" },
      { key: "Easy", label: "🟢 Easy" },
    ],
  },
  rules: [
    "Words hide in the grid — across, down, diagonally, forwards or backwards.",
    "Drag from the first letter to the last to trace a word (tap-drag works on touch).",
    "Find a word and it's crossed off the list and locked in colour.",
    "Pick a difficulty: Easy (8), Medium (12) or Hard (20) words.",
    "You're on the clock — find every word as fast as you can.",
    "Each difficulty has its own ranking — fastest full clear tops the board! 🏆",
  ],
  options: [
    { key: "count", label: "Difficulty", type: "select", default: 8,
      choices: [{ label: "Easy (8 words)", value: 8 }, { label: "Medium (12 words)", value: 12 }, { label: "Hard (20 words)", value: 20 }] },
  ],

  create(api) {
    const COUNT = Math.max(1, Math.min(30, api.config.options.count | 0));
    const CAT = { 8: "Easy", 12: "Medium", 20: "Hard" }[COUNT] || "Easy"; // leaderboard category
    // A roomy, family-friendly vocabulary (A–Z only). Easy to extend — just add more.
    const WORDS = (
      "CAT DOG FOX OWL BEE ANT BAT COW PIG HEN RAT BUG ELK APE EEL " +
      "LION TIGER BEAR WOLF DEER GOAT FROG DUCK FISH CRAB SEAL MOLE HARE LAMB FOAL " +
      "EAGLE HORSE SHEEP MOUSE ZEBRA SHARK WHALE SNAKE SNAIL OTTER PANDA KOALA CAMEL MONKEY RABBIT " +
      "APPLE GRAPE LEMON MANGO PEACH BERRY MELON OLIVE ONION BEANS BREAD HONEY SUGAR JUICE CANDY " +
      "PIZZA PASTA SALAD CURRY TOAST WAFFLE COOKIE CHEESE BUTTER POTATO TOMATO BANANA CHERRY ORANGE " +
      "RED BLUE PINK GOLD GRAY GREEN BLACK WHITE BROWN PURPLE YELLOW SILVER VIOLET " +
      "SUN MOON STAR RAIN SNOW WIND CLOUD STORM OCEAN RIVER BEACH FIELD FOREST DESERT ISLAND " +
      "TREE LEAF ROOT SEED ROSE LILY FERN PALM GRASS PETAL BLOOM " +
      "RUN JUMP SWIM WALK READ SING DANCE PAINT WRITE LAUGH DREAM BUILD SOLVE LEARN THINK " +
      "BALL KITE DRUM BELL BOAT KING CROWN ROBOT MAGIC PUZZLE RIDDLE " +
      "HAPPY LUCKY BRAVE QUICK QUIET SHINY FUNNY SWEET FRESH GIANT CALM " +
      "HOUSE TABLE CHAIR CLOCK LAMP DOOR WINDOW GARDEN BRIDGE CASTLE MARKET SCHOOL " +
      "PLANE TRAIN TRUCK WAGON CYCLE ROCKET YACHT SLEDGE " +
      "MUSIC PIANO VIOLIN GUITAR FLUTE TRUMPET MELODY RHYTHM "
    ).trim().split(/\s+/);
    // 8 directions: E, S, SE, NE and their reverses W, N, NW, SW
    const DIRS = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]];
    const FOUND_COLORS = ["#aee3c8", "#ffe6a3", "#bcd9ff", "#ffc9c0", "#d9c2ff", "#c2f0e6", "#ffd6ec", "#e6f0a3"];

    // ---- choose the words: distinct, A–Z only, short enough for a comfy grid ----
    const pool = Array.from(new Set(WORDS.map((w) => w.toUpperCase()).filter((w) => /^[A-Z]{3,9}$/.test(w))));
    for (let i = pool.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [pool[i], pool[j]] = [pool[j], pool[i]]; }
    let words = pool.slice(0, COUNT).sort((a, b) => b.length - a.length);

    // ---- build a grid that fits every word; grow it / drop extras only if forced ----
    let grid, size, placed;
    const longest = words.reduce((m, w) => Math.max(m, w.length), 3);
    size = Math.max(longest, Math.ceil(Math.sqrt(words.join("").length * 1.7)), 9);
    size = Math.min(size, 18);
    for (;;) {
      const res = tryPlaceAll(words, size);
      if (res) { grid = res.grid; placed = res.placed; break; }
      if (size < 20) { size++; continue; }                 // give it more room
      words = words.slice(0, words.length - 1);            // last resort: hunt one fewer word
      if (!words.length) { grid = makeFilled(9); size = 9; placed = []; break; }
    }
    const TOTAL = placed.length;

    function makeFilled(n) {
      const g = Array.from({ length: n }, () => Array(n).fill(""));
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) g[r][c] = String.fromCharCode(65 + ((Math.random() * 26) | 0));
      return g;
    }
    function tryPlaceAll(list, n) {
      const g = Array.from({ length: n }, () => Array(n).fill(""));
      const out = [];
      for (const w of list) {
        let ok = false;
        for (let tries = 0; tries < 250 && !ok; tries++) {
          const [dr, dc] = DIRS[(Math.random() * DIRS.length) | 0];
          const r0 = (Math.random() * n) | 0, c0 = (Math.random() * n) | 0;
          const re = r0 + dr * (w.length - 1), ce = c0 + dc * (w.length - 1);
          if (re < 0 || re >= n || ce < 0 || ce >= n) continue;
          let fits = true;
          for (let k = 0; k < w.length; k++) { const ch = g[r0 + dr * k][c0 + dc * k]; if (ch && ch !== w[k]) { fits = false; break; } }
          if (!fits) continue;
          const cells = [];
          for (let k = 0; k < w.length; k++) { const r = r0 + dr * k, c = c0 + dc * k; g[r][c] = w[k]; cells.push(r + "," + c); }
          out.push({ word: w, cells, found: false });
          ok = true;
        }
        if (!ok) return null; // couldn't place this word at this size
      }
      // fill the blanks with random letters
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!g[r][c]) g[r][c] = String.fromCharCode(65 + ((Math.random() * 26) | 0));
      return { grid: g, placed: out };
    }

    // ---- layout ----
    const wrap = api.el("div", "");
    wrap.style.cssText = "display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start;justify-content:center;max-width:100%";

    const CELL = Math.max(20, Math.min(40, Math.floor((Math.min(470, window.innerWidth - 30)) / size)));
    const boardEl = api.el("div", "");
    boardEl.style.cssText = "display:grid;grid-template-columns:repeat(" + size + "," + CELL + "px);gap:2px;padding:8px;" +
      "background:#fcfff9;border:2.5px solid #173a2b;border-radius:12px;box-shadow:var(--shadow);" +
      "touch-action:none;user-select:none;-webkit-user-select:none";
    const cellEls = [];
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
      const b = api.el("div", "", grid[r][c]);
      b.dataset.r = r; b.dataset.c = c;
      b.style.cssText = "width:" + CELL + "px;height:" + CELL + "px;display:grid;place-items:center;border-radius:6px;" +
        "font-size:" + Math.floor(CELL * 0.5) + "px;font-weight:800;color:#173a2b;background:#eef9f1;cursor:pointer;line-height:1";
      boardEl.appendChild(b); cellEls.push(b);
    }
    wrap.appendChild(boardEl);

    // word list panel
    const panel = api.el("div", "");
    panel.style.cssText = "display:flex;flex-direction:column;gap:8px;min-width:140px;max-width:240px";
    const panelHead = api.el("div", "", "Find these words");
    panelHead.style.cssText = "font-weight:800;color:var(--ink);font-size:15px";
    panel.appendChild(panelHead);
    const listEl = api.el("div", "");
    listEl.style.cssText = "display:flex;flex-wrap:wrap;gap:6px";
    const chipFor = {};
    placed.forEach((p, i) => {
      const chip = api.el("span", "", p.word);
      chip.style.cssText = "font-size:13px;font-weight:700;padding:3px 9px;border-radius:999px;background:var(--mint-100);color:var(--mint-700)";
      chipFor[p.word] = chip; listEl.appendChild(chip);
    });
    panel.appendChild(listEl);
    wrap.appendChild(panel);
    api.board.appendChild(wrap);

    // ---- state + helpers ----
    let found = 0, over = false, dragging = false, startCell = null, path = [];
    let t0 = performance.now(), tick = null, finalElapsed = 0;
    const foundCells = new Set();
    function elapsedSec() { return Math.max(0, Math.round((performance.now() - t0) / 1000)); }
    function fmt(sec) { const m = Math.floor(sec / 60), s = sec % 60; return m + ":" + (s < 10 ? "0" : "") + s; }
    function at(r, c) { return cellEls[r * size + c]; }
    function cellFromPoint(x, y) {
      const e = document.elementFromPoint(x, y);
      if (!e || e.dataset.r === undefined) return null;
      return [parseInt(e.dataset.r, 10), parseInt(e.dataset.c, 10)];
    }
    function linePath(a, b) {
      const dr = Math.sign(b[0] - a[0]), dc = Math.sign(b[1] - a[1]);
      const len = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
      // only straight lines along the 8 directions count
      if (!(b[0] === a[0] || b[1] === a[1] || Math.abs(b[0] - a[0]) === Math.abs(b[1] - a[1]))) return null;
      const cells = [];
      for (let k = 0; k <= len; k++) cells.push([a[0] + dr * k, a[1] + dc * k]);
      return cells;
    }
    function clearHover() {
      cellEls.forEach((b) => {
        const key = b.dataset.r + "," + b.dataset.c;
        b.style.background = foundCells.has(key) ? b.dataset.fc : "#eef9f1";
      });
    }
    function showPath(cells) {
      clearHover();
      cells.forEach(([r, c]) => { const b = at(r, c); if (!foundCells.has(r + "," + c)) b.style.background = "#9fe0bf"; });
    }
    function score() {
      const elapsed = over ? finalElapsed : elapsedSec();
      api.setScores([
        { name: "Time", value: fmt(elapsed), color: "#2e9d6c" },
        { name: "Found", value: found + "/" + TOTAL, color: "#e67e22" },
        { name: "Difficulty", value: CAT, color: "#3498db" },
      ]);
    }

    function finish(cells) {
      if (!cells || cells.length < 2) { clearHover(); return; }
      const fwd = cells.map(([r, c]) => grid[r][c]).join("");
      const rev = fwd.split("").reverse().join("");
      const hit = placed.find((p) => !p.found && (p.word === fwd || p.word === rev));
      if (!hit) { clearHover(); return; }
      hit.found = true; found++;
      const color = FOUND_COLORS[(found - 1) % FOUND_COLORS.length];
      cells.forEach(([r, c]) => { const k = r + "," + c; foundCells.add(k); const b = at(r, c); b.dataset.fc = color; });
      clearHover();
      const chip = chipFor[hit.word];
      if (chip) { chip.style.textDecoration = "line-through"; chip.style.opacity = "0.5"; chip.style.background = color; }
      api.toast("✅ " + hit.word);
      score();
      if (found >= TOTAL) {
        over = true;
        finalElapsed = elapsedSec();
        if (tick) { clearInterval(tick); tick = null; }
        if (api.submitScore) api.submitScore(finalElapsed, { cat: CAT }); // time-metric, ranked within its difficulty
        score();
        if (api.celebrate) api.celebrate("🎉 All " + TOTAL + " words in " + fmt(finalElapsed) + "!");
        api.setStatus("🎉 You found all " + TOTAL + " words in " + fmt(finalElapsed) + ", " + api.config.username + "! Restart for a fresh board.");
      }
    }

    // ---- pointer drag (mouse + touch) ----
    function onDown(e) {
      if (over) return;
      const c = cellFromPoint(e.clientX, e.clientY);
      if (!c) return;
      dragging = true; startCell = c; path = [c]; showPath(path);
      e.preventDefault();
    }
    function onMove(e) {
      if (!dragging || over) return;
      const c = cellFromPoint(e.clientX, e.clientY);
      if (!c) return;
      const line = linePath(startCell, c);
      if (line) { path = line; showPath(path); }
      e.preventDefault();
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      const cells = path; path = [];
      finish(cells);
    }
    boardEl.addEventListener("pointerdown", onDown);
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);

    t0 = performance.now();
    tick = setInterval(() => { if (!over) score(); }, 1000);
    score();
    api.setStatus("Drag across letters to trace a word — any direction, forwards or backwards. Find all " + TOTAL + " as fast as you can! 🔎");
    return {
      stop() {
        if (tick) { clearInterval(tick); tick = null; }
        boardEl.removeEventListener("pointerdown", onDown);
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
      },
    };
  },
});
