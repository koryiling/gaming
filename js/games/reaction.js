/* Reaction Test — 1 to 4 players compare reaction times */
Arcade.register({
  id: "reaction",
  name: "Reaction Test",
  emoji: "⚡",
  tagline: "Wait for green, then tap as fast as you can. No early taps!",
  tags: ["Reflex", "Quick"],
  minPlayers: 1,
  maxPlayers: 4,
  rules: [
    "The panel turns red — wait for it.",
    "When it flashes green, click/tap as fast as possible.",
    "Tap too early and the round is void — patience matters!",
    "Best average over several tries wins (lower is better).",
  ],
  options: [
    { key: "tries", label: "Tries per player", type: "range", default: 3, min: 1, max: 5, step: 1 },
  ],

  create(api) {
    const names = api.config.players;
    const tries = api.config.options.tries;
    const times = names.map(() => []);
    let playerIdx = 0, tryNo = 0;
    let phase = "idle", t0 = 0, timer = null;

    const panel = api.el("button", "");
    panel.style.cssText = "width:" + Math.min(440, window.innerWidth - 50) + "px;height:300px;border:none;border-radius:var(--radius);" +
      "cursor:pointer;font-size:24px;font-weight:800;color:#fff;box-shadow:var(--shadow);transition:background .1s";
    panel.addEventListener("click", tap);
    api.board.appendChild(panel);

    function avg(a) { return a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null; }
    function board() {
      api.setScores(names.map((n, i) => ({
        name: n, value: avg(times[i]) == null ? "—" : avg(times[i]) + "ms", color: api.colors[i], turn: i === playerIdx && phase !== "done",
      })));
    }
    function setPanel(bg, text) { panel.style.background = bg; panel.textContent = text; }

    function ready() {
      phase = "ready";
      setPanel("#e74c3c", "Wait for green… 🔴");
      const delay = 1200 + Math.random() * 2600;
      timer = setTimeout(() => { phase = "go"; t0 = performance.now(); setPanel("#43b884", "TAP NOW! 🟢"); }, delay);
    }
    function tap() {
      if (phase === "idle" || phase === "done") {
        api.setStatus("");
        if (phase === "done") return;
        ready();
        api.setStatus(names[playerIdx] + " — try " + (tryNo + 1) + "/" + tries);
        return;
      }
      if (phase === "ready") { // too early
        clearTimeout(timer);
        phase = "idle";
        setPanel("#9b59b6", "Too early! 😅 Tap to retry this try.");
        return;
      }
      if (phase === "go") {
        const ms = Math.round(performance.now() - t0);
        times[playerIdx].push(ms); board();
        tryNo++;
        if (tryNo < tries) {
          phase = "idle";
          setPanel("#2e9d6c", ms + " ms! Tap for next try (" + (tryNo + 1) + "/" + tries + ")");
        } else {
          // next player or finish
          if (playerIdx < names.length - 1) {
            playerIdx++; tryNo = 0; phase = "idle";
            setPanel("#2e8b57", ms + " ms! ➡ " + names[playerIdx] + ", tap to begin.");
            board();
          } else {
            finish(ms);
          }
        }
      }
    }
    function finish(lastMs) {
      phase = "done";
      const avgs = times.map(avg);
      const valid = avgs.filter((a) => a != null);
      const min = Math.min(...valid);
      const champs = names.filter((_, i) => avgs[i] === min);
      setPanel("#247a55", "Done! 🏁");
      board();
      api.setStatus(
        names.length === 1
          ? "⚡ Your average: <b>" + avgs[0] + " ms</b>. " + verdict(avgs[0])
          : (champs.length > 1 ? "🤝 Tie at " + min + " ms!" : "🏆 " + champs[0] + " is fastest at <b>" + min + " ms</b>!")
      );
    }
    function verdict(ms) {
      if (ms < 220) return "Lightning reflexes! ⚡";
      if (ms < 300) return "Great timing! 👏";
      if (ms < 400) return "Solid. 🙂";
      return "Keep practising! 🌱";
    }

    board();
    setPanel("#2e9d6c", (names.length > 1 ? names[0] + ", tap" : "Tap") + " to start ▶");
    api.setStatus("Wait for green, then tap fast. Early taps don't count!");
    return { stop() { clearTimeout(timer); } };
  },
});
