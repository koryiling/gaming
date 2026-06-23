/* Memory Match — 1 to 4 players, turn based */
Arcade.register({
  id: "memory",
  name: "Memory Match",
  emoji: "🧠",
  tagline: "Flip cards, find matching pairs, remember where they are.",
  tags: ["Cards", "Memory"],
  minPlayers: 1,
  maxPlayers: 4,
  rules: [
    "On your turn, flip two cards.",
    "Match a pair → you score a point and go again.",
    "No match → cards flip back and it's the next player's turn.",
    "When all pairs are found, the highest score wins!",
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
    const scores = names.map(() => 0);
    let turn = 0, busy = false, found = 0;

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
      api.setScores(names.map((n, i) => ({
        name: n, value: scores[i], color: api.colors[i], turn: i === turn && found < pairs,
      })));
    }
    function flip(c, idx) {
      if (busy || c.textContent || c === first) return;
      show(c);
      if (!first) { first = c; return; }
      busy = true;
      if (first.dataset.sym === c.dataset.sym) {
        scores[turn]++; found++; board();
        first.disabled = c.disabled = true;
        first = null; busy = false;
        if (found === pairs) return finish();
        api.setStatus("✨ Match! " + names[turn] + " goes again.");
      } else {
        const a = first; first = null;
        setTimeout(() => {
          hide(a); hide(c); busy = false;
          if (names.length > 1) { turn = (turn + 1) % names.length; board(); api.setStatus("🔄 " + names[turn] + "'s turn."); }
        }, 750);
      }
    }
    function finish() {
      const max = Math.max(...scores);
      const champs = names.filter((_, i) => scores[i] === max);
      api.setStatus(
        names.length === 1
          ? "🎉 All pairs found! Great memory, " + names[0] + "."
          : (champs.length > 1 ? "🤝 Tie between " + champs.join(" & ") + "!" : "🏆 " + champs[0] + " wins with " + max + " pairs!")
      );
    }

    board();
    api.setStatus(names.length > 1 ? names[0] + " starts — flip two cards." : "Flip two cards to find a pair!");
    return { stop() {} };
  },
});
