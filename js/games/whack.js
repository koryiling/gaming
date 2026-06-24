/* Whack-a-Mole — 1 to 4 players take sequential timed rounds */
Arcade.register({
  id: "whack",
  name: "Whack-a-Mole",
  emoji: "🐹",
  tagline: "Bonk the moles as they pop up. Fastest reflexes win.",
  tags: ["Arcade", "Reflex"],
  minPlayers: 1,
  maxPlayers: 4,
  rules: [
    "Moles 🐹 pop out of holes — tap them before they hide!",
    "Each tap scores a point. Avoid wasting time on empty holes.",
    "Watch out for bombs 💣 (on Hard) — tapping one costs a point!",
    "Each player gets a timed round; highest score wins.",
  ],
  options: [
    {
      key: "time", label: "Round length", type: "range", default: 20, min: 10, max: 40, step: 5, suffix: "s",
    },
    {
      key: "diff", label: "Difficulty", type: "select", default: "normal",
      choices: [{ label: "Easy", value: "easy" }, { label: "Normal", value: "normal" }, { label: "Hard", value: "hard" }],
    },
  ],

  create(api) {
    const names = api.config.players;
    const finalScores = names.map(() => null);
    const pop = { easy: 900, normal: 650, hard: 430 }[api.config.options.diff];
    const bombs = api.config.options.diff === "hard";
    let playerIdx = 0;

    const holes = [];
    const grid = api.el("div", "grid-board");
    grid.style.gridTemplateColumns = "repeat(3,1fr)";
    const size = Math.floor(Math.min(420, window.innerWidth - 50) / 3) - 8;
    for (let i = 0; i < 9; i++) {
      const h = api.el("button", "cell");
      h.style.width = h.style.height = size + "px";
      h.style.fontSize = size * 0.6 + "px";
      h.style.background = "var(--mint-200)";
      h.dataset.kind = "";
      h.addEventListener("click", () => hit(h));
      grid.appendChild(h); holes.push(h);
    }

    // Play area: the 3×3 grid with a big Start button on the side. A large side button is
    // far easier to tap than the small inline button that used to sit under the board.
    const wrap = api.el("div", "");
    wrap.style.cssText = "display:flex;gap:16px;align-items:center;justify-content:center";
    const side = api.el("div", "");
    side.style.cssText = "display:flex;flex-direction:column;gap:10px;align-items:center;justify-content:center;min-width:120px";
    const sideMsg = api.el("div", "");
    sideMsg.style.cssText = "font-weight:800;color:var(--ink);text-align:center;font-size:14px;max-width:150px";
    const startBtn = api.el("button", "btn primary", "▶ Start");
    startBtn.style.cssText = "font-size:20px;padding:16px 26px;border-radius:16px";
    let pendingStart = null;
    startBtn.addEventListener("click", () => { const fn = pendingStart; if (fn) { pendingStart = null; fn(); } });
    side.appendChild(sideMsg); side.appendChild(startBtn);
    wrap.appendChild(grid); wrap.appendChild(side);
    api.board.appendChild(wrap);

    // show the side Start button with a prompt; hide it (showing whose round it is) during play
    function showStart(msg, label, onClick) {
      sideMsg.innerHTML = msg;
      startBtn.textContent = label;
      startBtn.style.display = "";
      pendingStart = onClick;
    }
    function hideStart(msg) { startBtn.style.display = "none"; sideMsg.innerHTML = msg || ""; }

    let score = 0, timeLeft = 0, running = false, spawnT = null, tickT = null, hideT = null;

    function board() {
      const items = names.map((n, i) => ({
        name: n, value: finalScores[i] == null ? "—" : finalScores[i], color: api.colors[i], turn: i === playerIdx && running,
      }));
      api.setScores(items);
    }
    function spawn() {
      holes.forEach((h) => { h.textContent = ""; h.dataset.kind = ""; });
      const idx = (Math.random() * 9) | 0;
      const isBomb = bombs && Math.random() < 0.22;
      holes[idx].textContent = isBomb ? "💣" : "🐹";
      holes[idx].dataset.kind = isBomb ? "bomb" : "mole";
      clearTimeout(hideT);
      hideT = setTimeout(() => { if (holes[idx].dataset.kind) { holes[idx].textContent = ""; holes[idx].dataset.kind = ""; } }, pop);
    }
    function hit(h) {
      if (!running || !h.dataset.kind) return;
      if (h.dataset.kind === "bomb") { score = Math.max(0, score - 1); api.toast("💥 -1"); }
      else { score++; }
      h.textContent = ""; h.dataset.kind = "";
      api.setStatus("⏱ " + timeLeft + "s · Score: <b>" + score + "</b>");
    }
    function startRound() {
      score = 0; timeLeft = api.config.options.time; running = true;
      hideStart("🎮 " + names[playerIdx]);
      board();
      api.setStatus("⏱ " + timeLeft + "s · Score: <b>0</b>");
      spawn();
      spawnT = setInterval(spawn, pop);
      tickT = setInterval(() => {
        timeLeft--;
        api.setStatus("⏱ " + timeLeft + "s · Score: <b>" + score + "</b>");
        if (timeLeft <= 0) endRound();
      }, 1000);
    }
    function endRound() {
      running = false;
      clearInterval(spawnT); clearInterval(tickT); clearTimeout(hideT);
      holes.forEach((h) => { h.textContent = ""; h.dataset.kind = ""; });
      finalScores[playerIdx] = score;
      board();
      if (playerIdx < names.length - 1) {
        playerIdx++;
        promptNext();
      } else {
        finish();
      }
    }
    function promptNext() {
      board();
      api.setStatus("🎮 " + names[playerIdx] + ", you're up — tap ▶ Start round.");
      showStart(names[playerIdx] + ", you're up!", "▶ Start round", () => { api.setStatus(""); startRound(); });
    }
    function finish() {
      hideStart("🏁");
      const max = Math.max(...finalScores);
      const champs = names.filter((_, i) => finalScores[i] === max);
      api.setStatus(
        names.length === 1
          ? "🎉 Time! " + names[0] + " bonked <b>" + finalScores[0] + "</b> moles."
          : (champs.length > 1 ? "🤝 Tie at " + max + " between " + champs.join(" & ") + "!" : "🏆 " + champs[0] + " wins with " + max + " bonks!")
      );
    }

    board();
    api.setStatus("Tap ▶ Start to bonk some moles! 🐹");
    showStart(
      names.length === 1 ? "Get ready!" : ("🎮 " + names[0] + " goes first"),
      names.length === 1 ? "▶ Start!" : "▶ Start round",
      () => { api.setStatus(""); startRound(); }
    );

    return { stop() { running = false; clearInterval(spawnT); clearInterval(tickT); clearTimeout(hideT); } };
  },
});
