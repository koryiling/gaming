/* Memory Match — 1 to 4 players, turn based.
 * Solo runs are timed and ranked like Sudoku: fastest clear per difficulty tops the board. */
Arcade.register({
  id: "memory",
  name: "Memory Match",
  emoji: "🧠",
  tagline: "Flip cards, find matching pairs, remember where they are.",
  tags: ["Cards", "Memory"],
  minPlayers: 1,
  maxPlayers: 4,
  leaderboard: {
    type: "time", // solo: fastest clear first; each difficulty ranked on its own (like Sudoku)
    categories: [
      { key: "12", label: "🔴 12 pairs" },
      { key: "10", label: "🟠 10 pairs" },
      { key: "8", label: "🟡 8 pairs" },
      { key: "6", label: "🟢 6 pairs" },
    ],
  },
  rules: [
    "On your turn, flip two cards.",
    "Match a pair → you score a point and go again.",
    "No match → cards flip back and it's the next player's turn.",
    "Solo: you're on the clock — clear all pairs as fast as you can!",
    "Each difficulty (6/8/10/12 pairs) has its own fastest-time ranking. ⏱️",
  ],
  options: [
    {
      key: "pairs", label: "Number of pairs", type: "select", default: 8,
      choices: [{ label: "6 (easy)", value: 6 }, { label: "8", value: 8 }, { label: "10", value: 10 }, { label: "12 (hard)", value: 12 }],
    },
  ],

  create(api) {
    const symbols = ["🍏","🍓","🥑","🍋","🍉","🐢","🐸","🦎","🌵","🍀","🦜","🐬","🦋","🐝","🌿","🍄"];
    const pairs = api.config.options.pairs;
    const names = api.config.players;
    const solo = names.length === 1;
    const CAT = String(pairs); // leaderboard category = difficulty
    const scores = names.map(() => 0);
    let turn = 0, busy = false, found = 0;

    // ---- timer (solo only) ----
    let t0 = 0, tick = null, started = false, finalElapsed = 0, over = false;
    function elapsedSec() { return Math.max(0, Math.round((performance.now() - t0) / 1000)); }
    function fmt(sec) { const m = Math.floor(sec / 60), s = sec % 60; return m + ":" + (s < 10 ? "0" : "") + s; }

    const deck = [];
    for (let i = 0; i < pairs; i++) { deck.push(symbols[i], symbols[i]); }
    // shuffle
    for (let i = deck.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [deck[i], deck[j]] = [deck[j], deck[i]]; }

    const cols = pairs <= 6 ? 4 : pairs <= 8 ? 4 : pairs <= 10 ? 5 : 6;
    const size = Math.floor(Math.min(430, window.innerWidth - 50) / cols) - 8;
    const grid = api.el("div", "grid-board");
    grid.style.gridTemplateColumns = "repeat(" + cols + ",1fr)";

    let first = null;
    const cards = deck.map((sym, idx) => {
      const c = api.el("button", "cell");
      c.style.width = c.style.height = size + "px";
      c.style.fontSize = size * 0.55 + "px";
      c.style.background = "linear-gradient(180deg,var(--mint-400),var(--mint-600))";
      c.textContent = "";
      c.dataset.sym = sym;
      c.addEventListener("click", () => flip(c, idx));
      grid.appendChild(c);
      return c;
    });
    api.board.appendChild(grid);

    function show(c) { c.textContent = c.dataset.sym; c.style.background = "#fff"; }
    function hide(c) { c.textContent = ""; c.style.background = "linear-gradient(180deg,var(--mint-400),var(--mint-600))"; }

    function board() {
      const chips = names.map((n, i) => ({
        name: n, value: scores[i], color: api.colors[i], turn: !solo && i === turn && found < pairs,
      }));
      if (solo) chips.push({ name: "Time", value: fmt(over ? finalElapsed : elapsedSec()), color: "#e67e22" });
      api.setScores(chips);
    }
    function startTimer() {
      if (!solo || started) return;
      started = true; t0 = performance.now();
      tick = setInterval(() => { if (!over) board(); }, 1000);
    }
    function flip(c, idx) {
      if (over || busy || c.textContent || c === first) return;
      startTimer(); // solo clock starts on first flip
      show(c);
      if (!first) { first = c; return; }
      busy = true;
      if (first.dataset.sym === c.dataset.sym) {
        scores[turn]++; found++; board();
        first.disabled = c.disabled = true;
        first = null; busy = false;
        if (found === pairs) return finish();
        if (!solo) api.setStatus("✨ Match! " + names[turn] + " goes again.");
      } else {
        const a = first; first = null;
        setTimeout(() => {
          hide(a); hide(c); busy = false;
          if (names.length > 1) { turn = (turn + 1) % names.length; board(); api.setStatus("🔄 " + names[turn] + "'s turn."); }
        }, 750);
      }
    }
    function finish() {
      over = true;
      if (tick) { clearInterval(tick); tick = null; }
      if (solo) {
        finalElapsed = elapsedSec();
        board();
        if (api.submitScore) api.submitScore(finalElapsed, { cat: CAT }); // fastest time per difficulty
        if (api.celebrate) api.celebrate("🎉 Cleared in " + fmt(finalElapsed) + "!");
        api.setStatus("🎉 All " + pairs + " pairs in " + fmt(finalElapsed) + "! Great memory, " + names[0] + ". Restart to beat your time.");
        return;
      }
      const max = Math.max(...scores);
      const champs = names.filter((_, i) => scores[i] === max);
      if (api.celebrate) api.celebrate(champs.length > 1 ? "🤝 It's a tie!" : "🏆 " + champs[0] + " wins!");
      api.setStatus(champs.length > 1 ? "🤝 Tie between " + champs.join(" & ") + "!" : "🏆 " + champs[0] + " wins with " + max + " pairs!");
    }

    board();
    api.setStatus(solo ? "Flip two cards to find a pair — the clock starts on your first flip! ⏱️" : names[0] + " starts — flip two cards.");
    return { stop() { over = true; if (tick) { clearInterval(tick); tick = null; } } };
  },
});
