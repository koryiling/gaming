/* Mastermind — single player code-breaking / deduction */
Arcade.register({
  id: "mastermind",
  name: "Mastermind",
  emoji: "🕵️",
  tagline: "Crack the hidden colour code using the clues from each guess.",
  tags: ["Detective", "Puzzle", "Solo"],
  minPlayers: 1,
  maxPlayers: 1,
  leaderboard: { type: "low" }, // fewer guesses to crack the code ranks higher
  rules: [
    "A secret code of coloured pegs is hidden. Deduce it!",
    "Tap colours to fill your guess, then Submit.",
    "Each guessed peg is ringed: 🟨 yellow = right colour & spot, 🟩 green = right colour, wrong spot.",
    "Your past guesses stack up on the left with their clues — crack the code in as few guesses as you can.",
    "The fewer guesses you need, the higher you place on the leaderboard.",
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
    wrap.style.cssText = "display:flex;gap:18px;align-items:flex-start;justify-content:center;flex-wrap:wrap;width:100%;max-width:680px";

    // LEFT — running list of past guesses with their per-peg clues
    const histPanel = api.el("div", "");
    histPanel.style.cssText = "flex:0 0 auto;min-width:170px;max-width:300px;background:#fff;border-radius:14px;box-shadow:var(--shadow);" +
      "padding:12px 14px;display:flex;flex-direction:column;gap:8px;max-height:440px;overflow-y:auto";
    const histTitle = api.el("div", "", "🧩 Your guesses");
    histTitle.style.cssText = "font-weight:800;font-size:14px;color:var(--ink)";
    const history = api.el("div", "");
    history.style.cssText = "display:flex;flex-direction:column;gap:6px";
    const histEmpty = api.el("div", "", "No guesses yet — make your first!");
    histEmpty.style.cssText = "font-size:13px;color:var(--ink-soft);font-style:italic";
    history.appendChild(histEmpty);
    histPanel.appendChild(histTitle); histPanel.appendChild(history);

    // RIGHT — the current guess, colour palette and submit
    const playCol = api.el("div", "");
    playCol.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:12px;flex:1 1 260px;min-width:240px";
    const guessRow = api.el("div", "");
    guessRow.style.cssText = "display:flex;gap:8px;justify-content:center;padding:8px;background:#fff;border-radius:12px;box-shadow:var(--shadow)";
    const palette = api.el("div", "");
    palette.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;justify-content:center";
    const submit = api.el("button", "btn primary", "✓ Submit guess");
    submit.addEventListener("click", check);
    playCol.appendChild(guessRow); playCol.appendChild(palette); playCol.appendChild(submit);

    wrap.appendChild(histPanel); wrap.appendChild(playCol);
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
    function addHistory(g, states, num) {
      if (histEmpty.parentNode) histEmpty.remove();
      const row = api.el("div", "");
      row.style.cssText = "display:flex;align-items:center;gap:8px;background:var(--mint-50);border-radius:10px;padding:6px 8px";
      const idx = api.el("span", "", "#" + num);
      idx.style.cssText = "font-weight:800;font-size:12px;color:var(--ink-soft);width:24px;flex:none";
      row.appendChild(idx);
      const pegs = api.el("div", "");
      pegs.style.cssText = "display:flex;gap:5px";
      g.forEach((c, i) => {
        // each guessed peg sits inside a coloured ring showing its per-position feedback
        const ring = api.el("div", "");
        ring.style.cssText = "padding:3px;border-radius:50%;background:" + COL[states[i]];
        ring.appendChild(peg(c, 20));
        pegs.appendChild(ring);
      });
      row.appendChild(pegs);
      // compact result tally: yellow = right spot, green = right colour wrong spot
      const correct = states.filter((s) => s === "correct").length;
      const present = states.filter((s) => s === "present").length;
      const tally = api.el("span", "", "🟨" + correct + " 🟩" + present);
      tally.style.cssText = "margin-left:auto;font-size:12px;font-weight:700;white-space:nowrap";
      row.appendChild(tally);
      history.appendChild(row);
      histPanel.scrollTop = histPanel.scrollHeight;
    }
    function board() {
      api.setScores([{ name: api.config.username, value: "guess " + (rows + 1) + "/" + MAX, color: "#2e9d6c" }]);
    }
    function check() {
      if (over || guess.some((g) => g == null)) return;
      const states = feedbackStates(guess);
      addHistory(guess, states, rows + 1);
      rows++;
      if (states.every((s) => s === "correct")) {
        over = true;
        api.submitScore(rows); // fewer guesses ranks higher (lower-is-better leaderboard)
        reveal("🎉 Cracked it in " + rows + " " + (rows === 1 ? "guess" : "guesses") + "! Brilliant detective work.");
        return;
      }
      if (rows >= MAX) { over = true; reveal("💥 Out of guesses! The code was:"); return; }
      guess = Array(N).fill(null);
      renderGuess(); board();
      api.setStatus("Clues added — keep deducing! " + (MAX - rows) + " guesses left.");
    }
    function reveal(msg) {
      if (histEmpty.parentNode) histEmpty.remove();
      const row = api.el("div", "");
      row.style.cssText = "display:flex;align-items:center;gap:8px;margin-top:6px;padding:6px 8px;border-radius:10px;background:#fff7da;border:1.5px solid #f3d24e";
      const label = api.el("span", "", "🔑");
      label.style.cssText = "font-size:13px;flex:none";
      row.appendChild(label);
      const pegs = api.el("div", "");
      pegs.style.cssText = "display:flex;gap:5px";
      code.forEach((c) => pegs.appendChild(peg(c, 22)));
      row.appendChild(pegs);
      history.appendChild(row);
      histPanel.scrollTop = histPanel.scrollHeight;
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
