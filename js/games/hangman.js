/* Hangman — 1 to 4 players, turn based letter guessing */
Arcade.register({
  id: "hangman",
  name: "Hangman",
  emoji: "🔤",
  tagline: "Guess the hidden word one letter at a time before you run out of tries.",
  tags: ["Word", "Memory"],
  minPlayers: 1,
  maxPlayers: 4,
  rules: [
    "A hidden word is shown as blanks. Guess letters using the on-screen keyboard.",
    "Correct letter → it's revealed (you score & go again in multiplayer).",
    "Wrong letter → a piece of the hangman is drawn; next player's turn.",
    "Reveal the whole word to win; too many wrong guesses and it's game over.",
  ],
  options: [
    {
      key: "cat", label: "Category", type: "select", default: "animals",
      choices: [
        { label: "Animals", value: "animals" }, { label: "Fruits", value: "fruits" },
        { label: "Countries", value: "countries" }, { label: "Mixed", value: "mixed" },
      ],
    },
    { key: "lives", label: "Wrong guesses allowed", type: "range", default: 6, min: 4, max: 9, step: 1 },
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
    const word = pool[(Math.random() * pool.length) | 0].toUpperCase();
    const names = api.config.players;
    const scores = names.map(() => 0);
    const maxWrong = api.config.options.lives;
    let wrong = 0, guessed = new Set(), turn = 0, over = false;

    const wrap = api.el("div", "");
    wrap.style.cssText = "text-align:center;width:" + Math.min(520, window.innerWidth - 40) + "px";
    const gallows = api.el("div", "");
    gallows.style.cssText = "font-size:34px;letter-spacing:4px;margin-bottom:6px;min-height:44px";
    const wordEl = api.el("div", "");
    wordEl.style.cssText = "font-size:34px;font-weight:800;letter-spacing:8px;margin:10px 0 18px;color:var(--ink)";
    const kb = api.el("div", "");
    kb.style.cssText = "display:grid;grid-template-columns:repeat(9,1fr);gap:6px";
    wrap.appendChild(gallows); wrap.appendChild(wordEl); wrap.appendChild(kb);
    api.board.appendChild(wrap);

    const keys = {};
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach((ch) => {
      const b = api.el("button", "cell");
      b.style.cssText = "height:42px;font-size:16px;background:#fff;box-shadow:var(--shadow)";
      b.textContent = ch;
      b.addEventListener("click", () => guess(ch, b));
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
    function guess(ch, btn) {
      if (over || guessed.has(ch)) return;
      guessed.add(ch);
      btn.disabled = true;
      if (word.includes(ch)) {
        btn.style.background = "var(--mint-300)";
        scores[turn]++; renderWord(); board();
        if (word.split("").every((c) => guessed.has(c))) return win();
        api.setStatus("✅ Nice, " + names[turn] + "! Guess again.");
      } else {
        btn.style.background = "#f3a79f"; wrong++; drawGallows();
        if (wrong >= maxWrong) return lose();
        if (names.length > 1) { turn = (turn + 1) % names.length; board(); }
        api.setStatus("❌ No '" + ch + "'. " + (maxWrong - wrong) + " wrong guesses left." + (names.length > 1 ? " " + names[turn] + "'s turn." : ""));
      }
    }
    function win() {
      over = true; board();
      if (names.length === 1) { api.setStatus("🎉 You guessed <b>" + word + "</b>! Well done, " + names[0] + "."); return; }
      const max = Math.max(...scores);
      const champs = names.filter((_, i) => scores[i] === max);
      api.setStatus("🎉 The word was <b>" + word + "</b>! " +
        (champs.length > 1 ? "Tie between " + champs.join(" & ") + "!" : "🏆 " + champs[0] + " scored most letters!"));
    }
    function lose() {
      over = true;
      wordEl.textContent = word.split("").join(" ");
      api.setStatus("💀 Out of guesses! The word was <b>" + word + "</b>. Hit Restart for a new word.");
    }

    drawGallows(); renderWord(); board();
    api.setStatus(names.length > 1 ? names[0] + " starts — pick a letter." : "Pick a letter to start guessing!");
    return { stop() {} };
  },
});
