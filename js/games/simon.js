/* Simon — memory sequence, 1 to 4 players (highest round wins) */
Arcade.register({
  id: "simon",
  name: "Simon Says",
  emoji: "🎵",
  tagline: "Watch the colour sequence, then repeat it. It gets longer each round.",
  tags: ["Memory", "Solo"],
  minPlayers: 1,
  maxPlayers: 4,
  rules: [
    "Watch the pads light up in a sequence.",
    "Repeat the exact sequence by tapping the pads.",
    "Each round adds one more step to remember.",
    "One mistake ends your turn — longest sequence wins (multiplayer).",
  ],
  options: [
    {
      key: "speed", label: "Playback speed", type: "select", default: 600,
      choices: [{ label: "Slow", value: 850 }, { label: "Normal", value: 600 }, { label: "Fast", value: 380 }],
    },
  ],

  create(api) {
    const PADS = [
      { c: "#43b884", lit: "#9fe0bf" }, { c: "#e67e22", lit: "#f6c896" },
      { c: "#3498db", lit: "#a9d4f2" }, { c: "#e74c3c", lit: "#f3a79f" },
    ];
    const names = api.config.players;
    const results = names.map(() => 0);
    const speed = api.config.options.speed;
    let playerIdx = 0, seq = [], input = [], lock = true;

    const wrap = api.el("div", "");
    wrap.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:14px;width:" + Math.min(330, window.innerWidth - 60) + "px";
    const pads = PADS.map((p, i) => {
      const b = api.el("button", "");
      b.style.cssText = "height:140px;border:none;border-radius:20px;cursor:pointer;background:" + p.c + ";box-shadow:var(--shadow);transition:background .12s";
      b.addEventListener("click", () => press(i));
      wrap.appendChild(b);
      return b;
    });
    api.board.appendChild(wrap);

    function board() {
      api.setScores(names.map((n, i) => ({ name: n, value: results[i], color: api.colors[i], turn: i === playerIdx })));
    }
    function flash(i) {
      return new Promise((res) => {
        pads[i].style.background = PADS[i].lit;
        setTimeout(() => { pads[i].style.background = PADS[i].c; setTimeout(res, speed * 0.25); }, speed * 0.6);
      });
    }
    async function playSeq() {
      lock = true;
      api.setStatus("👀 Watch closely…");
      await new Promise((r) => setTimeout(r, 500));
      for (const i of seq) await flash(i);
      lock = false;
      input = [];
      api.setStatus("🎯 Your turn — repeat " + seq.length + " step" + (seq.length > 1 ? "s" : "") + "!");
    }
    function next() {
      seq.push((Math.random() * 4) | 0);
      playSeq();
    }
    function press(i) {
      if (lock) return;
      pads[i].style.background = PADS[i].lit;
      setTimeout(() => (pads[i].style.background = PADS[i].c), 150);
      input.push(i);
      const step = input.length - 1;
      if (input[step] !== seq[step]) return fail();
      if (input.length === seq.length) {
        results[playerIdx] = seq.length; board();
        lock = true;
        api.setStatus("✅ Round " + seq.length + " cleared!");
        setTimeout(next, 700);
      }
    }
    function fail() {
      lock = true;
      results[playerIdx] = seq.length - 1; board();
      if (playerIdx < names.length - 1) {
        playerIdx++;
        seq = [];
        api.setStatus("❌ Missed at round " + (results[playerIdx - 1] + 1) + ". " +
          "Next up: " + names[playerIdx] + " — <button class='btn primary small' id='simon-go'>Start</button>");
        const b = document.getElementById("simon-go");
        if (b) b.addEventListener("click", () => next());
        board();
      } else {
        const max = Math.max(...results);
        const champs = names.filter((_, i) => results[i] === max);
        api.setStatus(
          names.length === 1
            ? "💥 Game over! You remembered <b>" + results[0] + "</b> steps."
            : (champs.length > 1 ? "🤝 Tie at " + max + " steps!" : "🏆 " + champs[0] + " wins with " + max + " steps!")
        );
      }
    }

    board();
    if (names.length === 1) { api.setStatus("Ready? <button class='btn primary small' id='simon-go'>Start</button>"); }
    else { api.setStatus(names[0] + " goes first — <button class='btn primary small' id='simon-go'>Start</button>"); }
    const go = document.getElementById("simon-go");
    if (go) go.addEventListener("click", () => next());

    return { stop() { lock = true; } };
  },
});
