/* Hangman — 1 to 4 players, turn based letter guessing */
Arcade.register({
  id: "hangman",
  name: "Hangman",
  emoji: "🔤",
  tagline: "Guess the hidden word one letter at a time before you run out of tries.",
  tags: ["Word", "Memory"],
  minPlayers: 1,
  maxPlayers: 4,
  leaderboard: { type: "score" }, // most words found in one game ranks highest → lowest (not summed)
  rules: [
    "A hidden word is shown as blanks. Guess letters with the on-screen keys or your own keyboard.",
    "A 💡 tip shows the category and length of each word.",
    "Solve a word and a new one appears — keep your wrong guesses low!",
    "You get several wrong guesses for the whole game; run out and it ends.",
    "Your score is how many words you find in one game.",
  ],
  options: [
    {
      key: "cat", label: "Category", type: "select", default: "mixed",
      choices: [
        { label: "Animals", value: "animals" }, { label: "Fruits", value: "fruits" },
        { label: "Countries", value: "countries" }, { label: "Mixed", value: "mixed" },
      ],
    },
    { key: "lives", label: "Wrong guesses allowed", type: "range", default: 7, min: 4, max: 9, step: 1 },
  ],

  create(api) {
    const BANK = {
      animals: ["elephant", "giraffe", "dolphin", "kangaroo", "penguin", "octopus", "hedgehog", "flamingo", "chameleon", "squirrel"],
      fruits: ["pineapple", "strawberry", "watermelon", "blueberry", "mango", "papaya", "apricot", "raspberry", "coconut", "lychee"],
      countries: ["canada", "brazil", "japan", "morocco", "iceland", "vietnam", "portugal", "thailand", "norway", "kenya"],
    };
    let pool = api.config.options.cat === "mixed"
      ? [].concat(BANK.animals, BANK.fruits, BANK.countries)
      : BANK[api.config.options.cat];
    const names = api.config.players;
    const scores = names.map(() => 0);
    const maxWrong = api.config.options.lives;
    let word = "", wrong = 0, guessed = new Set(), turn = 0, over = false, wordsFound = 0;
    function catOf(w) {
      const lw = w.toLowerCase();
      if (BANK.animals.indexOf(lw) !== -1) return "an animal";
      if (BANK.fruits.indexOf(lw) !== -1) return "a fruit";
      if (BANK.countries.indexOf(lw) !== -1) return "a country";
      return "a word";
    }

    const wrap = api.el("div", "");
    wrap.style.cssText = "text-align:center;width:" + Math.min(520, window.innerWidth - 40) + "px";
    const gallows = api.el("div", "");
    gallows.style.cssText = "font-size:34px;letter-spacing:4px;margin-bottom:6px;min-height:44px";
    const wordEl = api.el("div", "");
    wordEl.style.cssText = "font-size:34px;font-weight:800;letter-spacing:8px;margin:10px 0 6px;color:var(--ink)";
    const tipEl = api.el("div", "");
    tipEl.style.cssText = "font-size:14px;color:var(--ink-soft);margin-bottom:14px;min-height:18px";
    const kb = api.el("div", "");
    kb.style.cssText = "display:grid;grid-template-columns:repeat(9,1fr);gap:6px";
    wrap.appendChild(gallows); wrap.appendChild(wordEl); wrap.appendChild(tipEl); wrap.appendChild(kb);
    api.board.appendChild(wrap);

    const keys = {};
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach((ch) => {
      const b = api.el("button", "cell");
      b.style.cssText = "height:42px;font-size:16px;background:#fff;box-shadow:var(--shadow)";
      b.textContent = ch;
      b.addEventListener("click", () => guess(ch));
      kb.appendChild(b); keys[ch] = b;
    });

    function board() {
      api.setScores(names.map((n, i) => ({ name: n, value: scores[i], color: api.colors[i], turn: i === turn && !over })));
    }
    function drawGallows() {
      const parts = ["😟", "🧍", "👕", "💪", "🦵", "👟", "💀", "⚰️", "🪦"];
      gallows.textContent = "❌ ".repeat(wrong).trim() + (wrong ? "  " : "") + (wrong ? parts[Math.min(wrong - 1, parts.length - 1)] : "🙂");
    }
    function renderWord() {
      wordEl.textContent = word.split("").map((c) => (guessed.has(c) ? c : "_")).join(" ");
    }
    function newWord() {
      word = pool[(Math.random() * pool.length) | 0].toUpperCase();
      guessed = new Set();
      Object.values(keys).forEach((b) => { b.disabled = false; b.style.background = "#fff"; });
      tipEl.innerHTML = "💡 Tip: it's <b>" + catOf(word) + "</b> · " + word.length + " letters";
      renderWord();
    }
    function guess(ch) {
      if (over || guessed.has(ch)) return;
      const btn = keys[ch];
      guessed.add(ch);
      if (btn) btn.disabled = true;
      if (word.includes(ch)) {
        if (btn) btn.style.background = "var(--mint-300)";
        scores[turn]++; renderWord(); board();
        if (word.split("").every((c) => guessed.has(c))) {
          wordsFound++;
          api.setStatus("✅ Found <b>" + word + "</b>! Words found: <b>" + wordsFound + "</b> — next word…");
          setTimeout(() => { if (!over) newWord(); }, 950);
        } else {
          api.setStatus("✅ Nice, " + names[turn] + "! Guess again.");
        }
      } else {
        if (btn) btn.style.background = "#f3a79f";
        wrong++; drawGallows();
        if (wrong >= maxWrong) return gameOver();
        if (names.length > 1) { turn = (turn + 1) % names.length; board(); }
        api.setStatus("❌ No '" + ch + "'. " + (maxWrong - wrong) + " wrong left." + (names.length > 1 ? " " + names[turn] + "'s turn." : ""));
      }
    }
    function gameOver() {
      over = true; board();
      wordEl.textContent = word.split("").join(" ");
      if (api.submitScore) api.submitScore(wordsFound); // most words found in one game ranks highest
      api.setStatus("💀 Out of guesses! The word was <b>" + word + "</b>. You found <b>" + wordsFound + "</b> word" + (wordsFound === 1 ? "" : "s") + " this game — hit Restart to try again.");
    }
    function onKey(e) { const k = (e.key || "").toUpperCase(); if (/^[A-Z]$/.test(k)) guess(k); }
    window.addEventListener("keydown", onKey);

    newWord(); drawGallows(); board();
    api.setStatus(names.length > 1 ? names[0] + " starts — pick a letter (or use your keyboard)." : "Pick a letter — type on your keyboard or tap the keys! 💡");
    return { stop() { window.removeEventListener("keydown", onKey); } };
  },
});
