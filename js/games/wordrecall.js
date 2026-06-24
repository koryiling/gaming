/* Word Recall — memorise the flashed word, then type it back */
Arcade.register({
  id: "wordrecall",
  name: "Word Recall",
  emoji: "📝",
  tagline: "A word flashes for a moment — burn it into memory, then type it back from recall.",
  tags: ["Word", "Memory", "Solo"],
  minPlayers: 1,
  maxPlayers: 1,
  rules: [
    "A word appears briefly, then hides.",
    "Type exactly what you saw and press Enter.",
    "Each correct recall scores points and the next word gets longer & flashes faster!",
  ],
  options: [
    { key: "speed", label: "Flash time", type: "select", default: 1200,
      choices: [{ label: "Slow", value: 1700 }, { label: "Normal", value: 1200 }, { label: "Fast", value: 800 }] },
  ],

  create(api) {
    const WORDS = ["mint", "garden", "river", "sunset", "dragon", "planet", "harmony", "whisper", "lantern", "blossom", "compass", "voyage", "thunder", "crystal", "meadow", "falcon", "marble", "October", "diamond", "village", "kingdom", "treasure", "midnight", "festival"];
    const flashMs = api.config.options.speed;
    let round = 0, score = 0, answer = "", over = false, timer = null;

    const wrap = api.el("div", "");
    wrap.style.cssText = "display:flex;flex-direction:column;gap:18px;align-items:center;padding:10px";
    const display = api.el("div", "");
    display.style.cssText = "min-height:60px;font-size:38px;font-weight:800;letter-spacing:2px;color:var(--ink);text-transform:uppercase";
    const input = api.el("input");
    input.type = "text"; input.disabled = true;
    input.style.cssText = "padding:12px;font-size:22px;width:240px;text-align:center;border-radius:12px;border:2px solid var(--mint-300);text-transform:uppercase;outline:none";
    const go = api.el("button", "btn primary", "Start ▶");
    wrap.appendChild(display); wrap.appendChild(input); wrap.appendChild(go);
    api.board.appendChild(wrap);

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
        api.setStatus("Type what you saw and press Enter!");
      }, ms);
      api.setScores([{ name: api.config.username, value: score, color: api.colors[0] }]);
    }
    function submit() {
      if (input.disabled || over) return;
      if ((input.value || "").trim().toUpperCase() === answer) {
        score += answer.length * 5;
        api.setStatus("✅ Correct! +" + (answer.length * 5) + " — next one…");
        api.setScores([{ name: api.config.username, value: score, color: api.colors[0] }]);
        setTimeout(flash, 600);
      } else {
        over = true; input.disabled = true; go.textContent = "Play again ▶"; go.disabled = false;
        display.textContent = answer;
        api.setStatus("❌ It was " + answer + ". Final score " + score + ".");
      }
    }
    go.addEventListener("click", () => { if (over) { score = 0; round = 0; over = false; } go.disabled = true; flash(); });
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });

    api.setScores([{ name: api.config.username, value: 0, color: api.colors[0] }]);
    api.setStatus("Press Start, watch the word, then type it from memory 🧠");
    return { stop() { if (timer) clearTimeout(timer); } };
  },
});
