/* Word Recall — memorise the flashed word, then type it back */
Arcade.register({
  id: "wordrecall",
  name: "Word Recall",
  emoji: "📝",
  tagline: "A word flashes for a moment — burn it into memory, then type it back from recall.",
  tags: ["Word", "Memory", "Solo"],
  category: "english",
  minPlayers: 1,
  maxPlayers: 1,
  leaderboard: { type: "score" }, // your best single game ranks highest → lowest (scores don't add up)
  rules: [
    "A word appears briefly, then hides.",
    "Type exactly what you saw and press Enter (or tap ✓ Enter).",
    "10 words per game — each correct recall scores points and the next flashes faster.",
    "You may miss twice; the third wrong answer ends the game.",
  ],
  options: [
    { key: "speed", label: "Flash time", type: "select", default: 1200,
      choices: [{ label: "Slow", value: 1700 }, { label: "Normal", value: 1200 }, { label: "Fast", value: 800 }] },
  ],

  create(api) {
    const WORDS = ["mint", "garden", "river", "sunset", "dragon", "planet", "harmony", "whisper", "lantern", "blossom", "compass", "voyage", "thunder", "crystal", "meadow", "falcon", "marble", "October", "diamond", "village", "kingdom", "treasure", "midnight", "festival"];
    const flashMs = api.config.options.speed;
    const ROUNDS = 10;      // 10 words per game
    const MAX_WRONG = 2;    // two misses allowed; the third wrong answer ends the game
    let round = 0, score = 0, wrong = 0, answer = "", over = false, timer = null;

    const wrap = api.el("div", "");
    wrap.style.cssText = "display:flex;flex-direction:column;gap:18px;align-items:center;padding:10px";
    const display = api.el("div", "");
    display.style.cssText = "min-height:60px;font-size:38px;font-weight:800;letter-spacing:2px;color:var(--ink);text-transform:uppercase";
    const input = api.el("input");
    input.type = "text"; input.disabled = true;
    input.style.cssText = "padding:12px;font-size:22px;width:240px;text-align:center;border-radius:12px;border:2px solid var(--mint-300);text-transform:uppercase;outline:none";
    // ✓ Enter button — lets touch/mobile players submit the current word without a keyboard Enter
    const enterBtn = api.el("button", "btn primary", "✓ Enter");
    enterBtn.addEventListener("click", () => { input.focus(); submit(); });
    const go = api.el("button", "btn ghost", "Start ▶");
    wrap.appendChild(display); wrap.appendChild(input); wrap.appendChild(enterBtn); wrap.appendChild(go);
    api.board.appendChild(wrap);

    function setScore() { api.setScores([
      { name: api.config.username, value: score, color: api.colors[0] },
      { name: "Word", value: Math.min(round, ROUNDS) + "/" + ROUNDS, color: "#3498db" },
      { name: "Misses", value: wrong + "/" + MAX_WRONG, color: "#e74c3c" },
    ]); }

    function nextOrFinish() { if (round >= ROUNDS) finish("🎉 All " + ROUNDS + " done! Final score <b>" + score + "</b>. Hit Play again to beat it."); else flash(); }
    function finish(msg) {
      over = true; input.disabled = true; enterBtn.disabled = true;
      go.textContent = "Play again ▶"; go.disabled = false;
      if (api.submitScore) api.submitScore(score); // best single game ranks highest
      setScore();
      api.setStatus(msg);
    }
    function flash() {
      round++;
      answer = WORDS[Math.random() * WORDS.length | 0].toUpperCase();
      display.textContent = answer;
      display.style.color = "var(--mint-700)";
      input.disabled = true; input.value = "";
      const ms = Math.max(450, flashMs - round * 40);
      timer = setTimeout(() => {
        display.textContent = "❓"; display.style.color = "var(--ink)";
        input.disabled = false; input.focus();
        api.setStatus("Word " + round + "/" + ROUNDS + " — type what you saw and press Enter!");
      }, ms);
      setScore();
    }
    function submit() {
      if (input.disabled || over) return;
      if ((input.value || "").trim().toUpperCase() === answer) {
        score += answer.length * 5;
        setScore();
        api.setStatus("✅ Correct! +" + (answer.length * 5) + " — next one…");
        input.disabled = true;
        setTimeout(nextOrFinish, 600);
      } else {
        wrong++;
        display.textContent = answer;
        if (wrong > MAX_WRONG) {
          finish("❌ It was " + answer + ". Third miss — game over. Final score <b>" + score + "</b>.");
        } else {
          setScore();
          api.setStatus("❌ It was " + answer + " — miss " + wrong + "/" + MAX_WRONG + " (a third ends the game). Next…");
          input.disabled = true;
          setTimeout(nextOrFinish, 1000);
        }
      }
    }
    go.addEventListener("click", () => { if (over) { score = 0; round = 0; wrong = 0; over = false; enterBtn.disabled = false; } go.disabled = true; flash(); });
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });

    setScore();
    api.setStatus("Press Start, watch the word, then type it from memory 🧠");
    return { stop() { if (timer) clearTimeout(timer); } };
  },
});
