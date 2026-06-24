/* Mastermind — single player code-breaking / deduction */
Arcade.register({
  id: "mastermind",
  name: "Mastermind",
  emoji: "🕵️",
  tagline: "Crack the hidden colour code using the clues from each guess.",
  tags: ["Detective", "Puzzle", "Solo"],
  minPlayers: 1,
  maxPlayers: 1,
  rules: [
    "A secret code of coloured pegs is hidden. Deduce it!",
    "Tap colours to fill your guess, then Submit.",
    "Each guessed peg is ringed: 🟨 yellow = right colour & spot, 🟩 green = right colour, wrong spot.",
    "Crack the code before you run out of guesses.",
  ],
  options: [
    { key: "pegs", label: "Code length", type: "select", default: 4,
      choices: [{ label: "4 pegs", value: 4 }, { label: "5 pegs", value: 5 }] },
    { key: "colors", label: "Colours", type: "select", default: 6,
      choices: [{ label: "6 (easier)", value: 6 }, { label: "8 (harder)", value: 8 }] },
    { key: "dupes", label: "Allow repeats", type: "toggle", default: true },
  ],

  create(api) {
    const PALETTE = ["#e74c3c", "#e67e22", "#f1c40f", "#2ecc71", "#3498db", "#9b59b6", "#1abc9c", "#34495e"];
    // per-position feedback ring: 🟨 right colour & spot · 🟩 right colour wrong spot · grey absent
    const COL = { correct: "#f1c40f", present: "#43b884", absent: "#9aa6a0" };
    const N = api.config.options.pegs;
    const K = api.config.options.colors;
    const dupes = api.config.options.dupes;
    const MAX = 10;
    let code, guess, rows, over;

    function makeCode() {
      const c = [];
      const avail = [...Array(K).keys()];
      for (let i = 0; i < N; i++) {
        if (dupes) c.push((Math.random() * K) | 0);
        else { const j = (Math.random() * avail.length) | 0; c.push(avail.splice(j, 1)[0]); }
      }
      return c;
    }

    const wrap = api.el("div", "");
    wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:12px;width:" + Math.min(420, window.innerWidth - 40) + "px";
    const history = api.el("div", "");
    history.style.cssText = "display:flex;flex-direction:column;gap:6px;width:100%;min-height:30px";
    const guessRow = api.el("div", "");
    guessRow.style.cssText = "display:flex;gap:8px;justify-content:center;padding:8px;background:#fff;border-radius:12px;box-shadow:var(--shadow)";
    const palette = api.el("div", "");
    palette.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;justify-content:center";
    const submit = api.el("button", "btn primary", "✓ Submit guess");
    submit.addEventListener("click", check);
    wrap.appendChild(history); wrap.appendChild(guessRow); wrap.appendChild(palette); wrap.appendChild(submit);
    api.board.appendChild(wrap);

    function peg(colorIdx, size, hollow) {
      const d = api.el("div", "");
      d.style.cssText = "width:" + size + "px;height:" + size + "px;border-radius:50%;" +
        (colorIdx == null ? "background:#eef6f0;border:2px dashed #bcdcc9" :
          "background:" + (hollow ? "#fff" : PALETTE[colorIdx]) + ";border:2px solid " + PALETTE[colorIdx]);
      return d;
    }
    function renderGuess() {
      guessRow.innerHTML = "";
      for (let i = 0; i < N; i++) {
        const slot = peg(guess[i] != null ? guess[i] : null, 36);
        slot.style.cursor = "pointer";
        slot.addEventListener("click", () => { guess[i] = null; renderGuess(); });
        guessRow.appendChild(slot);
      }
      submit.disabled = guess.some((g) => g == null) || over;
    }
    function renderPalette() {
      palette.innerHTML = "";
      for (let c = 0; c < K; c++) {
        const b = peg(c, 38);
        b.style.cursor = "pointer";
        b.title = "color " + (c + 1);
        b.addEventListener("click", () => {
          const empty = guess.indexOf(null);
          if (empty >= 0) { guess[empty] = c; renderGuess(); }
        });
        palette.appendChild(b);
      }
    }
    function feedbackStates(g) {
      const states = Array(N).fill("absent");
      const cc = code.slice();
      for (let i = 0; i < N; i++) if (g[i] === cc[i]) { states[i] = "correct"; cc[i] = -2; }
      for (let i = 0; i < N; i++) if (states[i] !== "correct") { const j = cc.indexOf(g[i]); if (j >= 0) { states[i] = "present"; cc[j] = -2; } }
      return states;
    }
    function addHistory(g, states) {
      const row = api.el("div", "");
      row.style.cssText = "display:flex;align-items:center;gap:10px;justify-content:center;background:#fff;border-radius:10px;padding:8px 10px;box-shadow:var(--shadow)";
      g.forEach((c, i) => {
        // each guessed peg sits inside a coloured ring showing its per-position feedback
        const ring = api.el("div", "");
        ring.style.cssText = "padding:4px;border-radius:50%;background:" + COL[states[i]];
        ring.appendChild(peg(c, 26));
        row.appendChild(ring);
      });
      history.appendChild(row);
    }
    function board() {
      api.setScores([{ name: api.config.username, value: "guess " + (rows + 1) + "/" + MAX, color: "#2e9d6c" }]);
    }
    function check() {
      if (over || guess.some((g) => g == null)) return;
      const states = feedbackStates(guess);
      addHistory(guess, states);
      rows++;
      if (states.every((s) => s === "correct")) { over = true; reveal("🎉 Cracked it in " + rows + "! Brilliant detective work."); return; }
      if (rows >= MAX) { over = true; reveal("💥 Out of guesses! The code was:"); return; }
      guess = Array(N).fill(null);
      renderGuess(); board();
      api.setStatus("Clues added — keep deducing! " + (MAX - rows) + " guesses left.");
    }
    function reveal(msg) {
      const row = api.el("div", "");
      row.style.cssText = "display:flex;gap:6px;justify-content:center;margin-top:6px";
      code.forEach((c) => row.appendChild(peg(c, 30)));
      history.appendChild(row);
      submit.disabled = true;
      api.setStatus(msg);
      board();
    }

    code = makeCode(); guess = Array(N).fill(null); rows = 0; over = false;
    renderPalette(); renderGuess(); board();
    api.setStatus("Pick colours to fill your guess, then Submit. 🕵️");
    return { stop() {} };
  },
});
