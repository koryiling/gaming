/* Word Scramble — unscramble the jumbled word */
Arcade.register({
  id: "scramble",
  name: "Word Scramble",
  emoji: "🔤",
  tagline: "Letters are jumbled — unscramble the hidden word before the clock idea fades.",
  tags: ["Word", "Puzzle", "Solo"],
  category: "english",
  minPlayers: 1,
  maxPlayers: 1,
  leaderboard: { type: "score" }, // your best single game ranks highest → lowest (not summed)
  rules: [
    "The letters of a hidden word are shuffled.",
    "Type the unscrambled word and press Enter.",
    "10 words per game — each solve is worth points (use Skip if stuck).",
    "The leaderboard keeps your highest score in a single game.",
  ],
  options: [
    { key: "len", label: "Word length", type: "select", default: 5,
      choices: [{ label: "4 letters", value: 4 }, { label: "5 letters", value: 5 }, { label: "6 letters", value: 6 }] },
  ],

  create(api) {
    const WORDS = {
      4: ["mint", "leaf", "game", "star", "moon", "fish", "tree", "frog", "wave", "glow", "seed", "vine", "sage", "reef", "palm", "dawn", "gift", "luck", "nest", "bean"],
      5: ["green", "plant", "apple", "beach", "cloud", "dance", "eagle", "grape", "happy", "lemon", "mango", "olive", "piano", "river", "tiger", "whale", "bloom", "charm", "dream", "honey"],
      6: ["garden", "planet", "cherry", "dragon", "forest", "guitar", "island", "jungle", "meadow", "orange", "parrot", "rocket", "silver", "turtle", "violet", "wonder", "castle", "flower", "sunset", "candle"],
    };
    const LEN = api.config.options.len;
    const ROUNDS = 10; // 10 words per game
    const pool = WORDS[LEN].slice();
    let score = 0, solved = 0, round = 0, answer = "", over = false;

    const wrap = api.el("div", "");
    wrap.style.cssText = "display:flex;flex-direction:column;gap:16px;align-items:center;padding:10px";
    const jumble = api.el("div", "");
    jumble.style.cssText = "display:flex;gap:8px";
    const input = api.el("input");
    input.type = "text"; input.maxLength = LEN;
    input.style.cssText = "padding:12px;font-size:22px;width:200px;text-align:center;border-radius:12px;border:2px solid var(--mint-300);text-transform:uppercase;outline:none";
    const btns = api.el("div", ""); btns.style.cssText = "display:flex;gap:10px";
    const go = api.el("button", "btn primary", "Submit");
    const skip = api.el("button", "btn ghost", "Skip");
    btns.appendChild(go); btns.appendChild(skip);
    wrap.appendChild(jumble); wrap.appendChild(input); wrap.appendChild(btns);
    api.board.appendChild(wrap);

    function shuffle(w) {
      const a = w.split("");
      do { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; const t = a[i]; a[i] = a[j]; a[j] = t; } }
      while (a.join("") === w);
      return a;
    }
    function setScore() {
      api.setScores([
        { name: api.config.username, value: score, color: api.colors[0] },
        { name: "Word", value: Math.min(round, ROUNDS) + "/" + ROUNDS, color: "#3498db" },
      ]);
    }
    function finish() {
      over = true; input.disabled = go.disabled = skip.disabled = true;
      if (api.submitScore) api.submitScore(score); // best single game ranks highest
      setScore();
      api.setStatus("🏁 Done! Solved " + solved + "/" + ROUNDS + ", score <b>" + score + "</b>. Hit Restart to play again.");
    }
    function next() {
      if (round >= ROUNDS || !pool.length) { finish(); return; }
      round++;
      answer = pool.splice(Math.random() * pool.length | 0, 1)[0].toUpperCase();
      jumble.innerHTML = "";
      shuffle(answer).forEach((ch) => {
        const t = api.el("div", "", ch);
        t.style.cssText = "width:42px;height:42px;border-radius:8px;background:var(--mint-200);display:grid;place-items:center;font-weight:800;font-size:22px;color:var(--ink)";
        jumble.appendChild(t);
      });
      input.value = ""; input.focus();
      setScore();
    }
    function submit() {
      if (over) return;
      if ((input.value || "").trim().toUpperCase() === answer) {
        score += LEN * 10; solved++;
        api.setStatus("✅ " + answer + "! +" + (LEN * 10) + " (" + solved + " solved)");
        next();
      } else { api.toast("Not quite — try again"); }
    }
    go.addEventListener("click", submit);
    skip.addEventListener("click", () => { if (!over) { api.setStatus("⏭️ It was " + answer + "."); next(); } });
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });

    next();
    api.setStatus("Unscramble the word and press Enter!");
    return { stop() {} };
  },
});
