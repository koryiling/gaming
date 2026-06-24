/* Code Crack — crack a secret code of distinct digits.
 * Feedback is shown with coloured tiles (no words):
 *   🟨 yellow = right digit, right place · 🟩 green = right digit, wrong place · ⬜ grey = not in code.
 * Submitted guesses move into a scrolling history panel on the left so they stay visible.
 * Enter digits by tapping the on-screen keypad or typing on a keyboard. */
Arcade.register({
  id: "codecrack",
  name: "Code Crack",
  emoji: "🔐",
  tagline: "Deduce the secret code of distinct digits from the colour clues.",
  tags: ["Detective", "Number", "Classic", "Puzzle", "Solo"],
  minPlayers: 1,
  maxPlayers: 1,
  leaderboard: { type: "low" }, // fewer guesses to crack the code ranks higher
  rules: [
    "A secret code of distinct digits is hidden (no repeats).",
    "Tap the keypad (or type) to enter a guess, then Crack.",
    "🟨 yellow = right digit, right place · 🟩 green = right digit, wrong place · ⬜ grey = not in the code.",
    "Past guesses move to the history panel on the left. Crack it within 10 guesses!",
    "The fewer guesses you need to crack the code, the higher you place on the leaderboard.",
  ],
  options: [
    { key: "len", label: "Code length", type: "select", default: 4,
      choices: [{ label: "3 digits", value: 3 }, { label: "4 digits", value: 4 }, { label: "5 digits", value: 5 }] },
  ],

  create(api) {
    const LEN = api.config.options.len, ROWS = 10;
    const COL = { correct: "#f1c40f", present: "#43b884", absent: "#9aa6a0" };
    const FG = { correct: "#173a2b", present: "#fff", absent: "#fff" };
    const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = digits.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; const t = digits[i]; digits[i] = digits[j]; digits[j] = t; }
    const secret = digits.slice(0, LEN).join("");
    let tries = 0, over = false, cur = "";

    const wide = window.innerWidth >= 560;
    const HTILE = 32;

    // ----- history panel (left) -----
    const histPanel = api.el("div", "");
    histPanel.style.cssText = "border:2px solid var(--mint-200);border-radius:14px;background:#fff;box-shadow:var(--shadow);" +
      "padding:10px 12px;overflow-y:auto;" +
      (wide ? "width:" + (LEN * HTILE + (LEN - 1) * 6 + 26) + "px;max-height:360px;align-self:stretch;"
            : "width:100%;max-width:340px;max-height:168px;");
    const histTitle = api.el("div", "", "📜 Guesses");
    histTitle.style.cssText = "font-weight:800;color:var(--ink);font-size:14px;margin-bottom:8px;text-align:center";
    const log = api.el("div", "");
    log.style.cssText = "display:flex;flex-direction:column;gap:6px;align-items:center";
    const logEmpty = api.el("div", "", "—");
    logEmpty.style.cssText = "color:var(--ink-soft);font-size:13px";
    log.appendChild(logEmpty);
    histPanel.appendChild(histTitle); histPanel.appendChild(log);

    // ----- current entry + keypad (right) -----
    const slots = api.el("div", "");
    slots.style.cssText = "display:flex;gap:8px;justify-content:center";
    const slotEls = [];
    for (let i = 0; i < LEN; i++) {
      const s = api.el("div", "");
      s.style.cssText = "width:42px;height:48px;border-radius:10px;border:2px solid var(--mint-300);background:#fff;" +
        "display:grid;place-items:center;font-size:24px;font-weight:800;color:var(--ink)";
      slotEls.push(s); slots.appendChild(s);
    }

    const pad = api.el("div", "");
    pad.style.cssText = "display:grid;grid-template-columns:repeat(3,64px);gap:8px;justify-content:center";
    function keyBtn(label, onTap, cls) {
      const b = api.el("button", "btn " + (cls || "ghost"), label);
      b.style.cssText += ";height:52px;font-size:20px;font-weight:800;touch-action:manipulation";
      b.addEventListener("click", onTap);
      return b;
    }
    "123456789".split("").forEach((d) => pad.appendChild(keyBtn(d, () => addDigit(d))));
    pad.appendChild(keyBtn("⌫", delDigit));
    pad.appendChild(keyBtn("0", () => addDigit("0")));
    pad.appendChild(keyBtn("✓", submit, "primary"));

    const rightCol = api.el("div", "");
    rightCol.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:14px";
    rightCol.appendChild(slots); rightCol.appendChild(pad);

    const wrap = api.el("div", "");
    wrap.style.cssText = wide
      ? "display:flex;gap:18px;align-items:flex-start;justify-content:center;width:100%"
      : "display:flex;flex-direction:column;gap:14px;align-items:center;width:100%;max-width:360px";
    wrap.appendChild(histPanel);   // history on the left (or on top when stacked)
    wrap.appendChild(rightCol);
    api.board.appendChild(wrap);

    function renderCur() {
      for (let i = 0; i < LEN; i++) {
        slotEls[i].textContent = cur[i] || "";
        slotEls[i].style.borderColor = cur[i] ? "var(--mint-500)" : "var(--mint-300)";
      }
    }
    function addDigit(d) {
      if (over) return;
      if (cur.length >= LEN) return;
      if (cur.indexOf(d) !== -1) { api.toast("Digits must be distinct"); return; }
      cur += d; renderCur();
    }
    function delDigit() { if (over) return; cur = cur.slice(0, -1); renderCur(); }

    function score() { api.setScores([{ name: api.config.username, value: tries + "/" + ROWS, color: api.colors[0] }]); }

    function submit() {
      if (over) return;
      if (cur.length !== LEN) { api.toast("Enter " + LEN + " distinct digits"); return; }
      tries++;
      if (logEmpty.parentNode) logEmpty.remove();
      const g = cur;
      const rowEl = api.el("div", "");
      rowEl.style.cssText = "display:flex;gap:6px;justify-content:center";
      let bulls = 0;
      for (let i = 0; i < LEN; i++) {
        const state = g[i] === secret[i] ? "correct" : (secret.indexOf(g[i]) !== -1 ? "present" : "absent");
        if (state === "correct") bulls++;
        const tile = api.el("div", "", g[i]);
        tile.style.cssText = "width:" + HTILE + "px;height:" + HTILE + "px;border-radius:8px;display:grid;place-items:center;" +
          "font-size:17px;font-weight:800;background:" + COL[state] + ";color:" + FG[state];
        rowEl.appendChild(tile);
      }
      log.appendChild(rowEl);
      histPanel.scrollTop = histPanel.scrollHeight;  // keep newest in view
      cur = ""; renderCur(); score();
      if (bulls === LEN) {
        over = true;
        api.setStatus("🎉 Code <b>" + secret + "</b> cracked in " + tries + " " + (tries === 1 ? "guess" : "guesses") + "! Fewer guesses ranks higher. Restart for a new code.");
        api.setScores([{ name: api.config.username, value: tries + "/" + ROWS, color: api.colors[0] }]);
        if (api.submitScore) api.submitScore(tries); // fewer guesses ranks higher (lower-is-better leaderboard)
      } else if (tries >= ROWS) {
        over = true;
        api.setStatus("💥 Out of guesses! The code was <b>" + secret + "</b>. Hit Restart.");
      } else {
        api.setStatus((ROWS - tries) + " guesses left. 🟨 right spot · 🟩 wrong spot · ⬜ not in code.");
      }
    }

    function onKey(e) {
      if (over) return;
      if (/^[0-9]$/.test(e.key)) { addDigit(e.key); e.preventDefault(); }
      else if (e.key === "Backspace") { delDigit(); e.preventDefault(); }
      else if (e.key === "Enter") { submit(); e.preventDefault(); }
    }
    window.addEventListener("keydown", onKey);

    renderCur(); score();
    api.setStatus("Tap the keypad or type a " + LEN + "-digit code (distinct digits) 🔐");
    return { stop() { window.removeEventListener("keydown", onKey); } };
  },
});
