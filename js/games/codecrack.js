/* Code Crack — bulls & cows digit deduction */
Arcade.register({
  id: "codecrack",
  name: "Code Crack",
  emoji: "🔐",
  tagline: "Deduce the secret code of distinct digits from bulls 🎯 and cows 🐄 clues.",
  tags: ["Detective", "Number", "Classic", "Puzzle", "Solo"],
  minPlayers: 1,
  maxPlayers: 1,
  rules: [
    "A secret code of distinct digits is hidden (no repeats).",
    "Enter a guess of distinct digits and press Enter.",
    "🎯 Bull = right digit, right place · 🐄 Cow = right digit, wrong place.",
    "Crack the code within 10 guesses!",
  ],
  options: [
    { key: "len", label: "Code length", type: "select", default: 4,
      choices: [{ label: "3 digits", value: 3 }, { label: "4 digits", value: 4 }, { label: "5 digits", value: 5 }] },
  ],

  create(api) {
    const LEN = api.config.options.len, ROWS = 10;
    // secret = LEN distinct digits
    const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = digits.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; const t = digits[i]; digits[i] = digits[j]; digits[j] = t; }
    const secret = digits.slice(0, LEN).join("");
    let tries = 0, over = false;

    const wrap = api.el("div", "");
    wrap.style.cssText = "display:flex;flex-direction:column;gap:14px;align-items:center;padding:8px";
    const log = api.el("div", "");
    log.style.cssText = "display:flex;flex-direction:column;gap:6px;min-height:40px;font-size:17px;font-weight:700;color:var(--ink)";
    const input = api.el("input");
    input.type = "text"; input.inputMode = "numeric"; input.maxLength = LEN;
    input.style.cssText = "padding:12px;font-size:22px;letter-spacing:8px;width:" + (LEN * 34) + "px;text-align:center;border-radius:12px;border:2px solid var(--mint-300);outline:none";
    const btn = api.el("button", "btn primary", "Crack 🔓");
    wrap.appendChild(log); wrap.appendChild(input); wrap.appendChild(btn);
    api.board.appendChild(wrap);

    function score() { api.setScores([{ name: api.config.username, value: tries + "/" + ROWS, color: api.colors[0] }]); }
    function guess() {
      if (over) return;
      const g = (input.value || "").trim();
      if (!/^[0-9]+$/.test(g) || g.length !== LEN) { api.toast("Enter " + LEN + " digits"); return; }
      if (new Set(g.split("")).size !== LEN) { api.toast("Digits must be distinct"); return; }
      tries++;
      let bulls = 0, cows = 0;
      for (let i = 0; i < LEN; i++) {
        if (g[i] === secret[i]) bulls++;
        else if (secret.indexOf(g[i]) !== -1) cows++;
      }
      const line = api.el("div", "", g + " → " + "🎯".repeat(bulls) + "🐄".repeat(cows) + (bulls + cows === 0 ? "—" : ""));
      log.appendChild(line);
      input.value = ""; input.focus(); score();
      if (bulls === LEN) {
        over = true;
        const sc = Math.max(10, 200 - (tries - 1) * 18);
        api.setStatus("🎉 Code <b>" + secret + "</b> cracked in " + tries + "! Score " + sc + ". Restart for a new code.");
        api.setScores([{ name: api.config.username, value: sc, color: api.colors[0] }]);
      } else if (tries >= ROWS) {
        over = true;
        api.setStatus("💥 Out of guesses! The code was <b>" + secret + "</b>. Hit Restart.");
      } else {
        api.setStatus(bulls + " bull(s), " + cows + " cow(s). " + (ROWS - tries) + " guesses left.");
      }
    }
    btn.addEventListener("click", guess);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") guess(); });

    score();
    api.setStatus("Enter a " + LEN + "-digit code (distinct digits) and press Enter.");
    setTimeout(() => input.focus(), 0);
    return { stop() {} };
  },
});
