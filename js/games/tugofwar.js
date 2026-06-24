/* Tug of War — two players mash their key to pull the rope */
Arcade.register({
  id: "tugofwar",
  name: "Tug of War",
  emoji: "💪",
  tagline: "A frantic key-mashing duel — out-tap your rival and drag the rope across the line.",
  tags: ["Quick", "Duel", "Family"],
  minPlayers: 2,
  maxPlayers: 2,
  leaderboard: { type: "wins" },
  rules: [
    "Two players, one keyboard. Left player taps A, right player taps L.",
    "Each tap pulls the knot toward your side.",
    "Drag the knot past your edge to win — fastest, busiest fingers triumph!",
    "(On touch screens, mash the on-screen pull buttons.)",
  ],
  options: [
    { key: "goal", label: "Rope length", type: "select", default: 20,
      choices: [{ label: "Short (12)", value: 12 }, { label: "Normal (20)", value: 20 }, { label: "Long (30)", value: 30 }] },
  ],

  create(api) {
    const names = api.config.players;
    const colors = [api.colors[0], api.colors[4]];
    const GOAL = api.config.options.goal;
    let pos = 0, over = false; // negative = player 0 winning, positive = player 1

    const wrap = api.el("div", "");
    wrap.style.cssText = "display:flex;flex-direction:column;gap:18px;align-items:center;padding:10px;width:100%;max-width:560px";

    const ends = api.el("div", "");
    ends.style.cssText = "display:flex;justify-content:space-between;width:100%;font-weight:800;font-size:18px";
    const e0 = api.el("span", "", "💪 " + names[0]); e0.style.color = colors[0];
    const e1 = api.el("span", "", names[1] + " 💪"); e1.style.color = colors[1];
    ends.appendChild(e0); ends.appendChild(e1);

    const track = api.el("div", "");
    track.style.cssText = "position:relative;width:100%;height:46px;background:linear-gradient(90deg," + colors[0] + "22 0 50%," + colors[1] + "22 50% 100%);border-radius:23px;border:2px solid var(--mint-200);overflow:hidden";
    const center = api.el("div", "");
    center.style.cssText = "position:absolute;left:50%;top:0;width:2px;height:100%;background:var(--mint-300)";
    const knot = api.el("div", "");
    knot.style.cssText = "position:absolute;top:50%;transform:translate(-50%,-50%);width:26px;height:26px;border-radius:50%;" +
      "background:radial-gradient(circle at 35% 30%,#fff,#8a5a2b);border:2px solid #5c3b1e;box-shadow:0 2px 5px rgba(0,0,0,.25);transition:left .07s linear;left:50%";
    track.appendChild(center); track.appendChild(knot);

    const btns = api.el("div", "");
    btns.style.cssText = "display:flex;justify-content:space-between;width:100%;gap:12px";
    const b0 = api.el("button", "btn primary", "⬅ Pull (A)"); b0.style.flex = "1";
    const b1 = api.el("button", "btn primary", "Pull (L) ➡"); b1.style.flex = "1";
    btns.appendChild(b0); btns.appendChild(b1);

    wrap.appendChild(ends); wrap.appendChild(track); wrap.appendChild(btns);
    api.board.appendChild(wrap);

    function render() {
      const pct = 50 + (pos / GOAL) * 48;
      knot.style.left = Math.max(2, Math.min(98, pct)) + "%";
      api.setScores(names.map((n, i) => ({ name: n, value: i === 0 ? Math.max(0, -pos) + "/" + GOAL : Math.max(0, pos) + "/" + GOAL, color: colors[i], turn: false })));
    }
    function pull(dir) {
      if (over) return;
      pos += dir;
      if (pos <= -GOAL || pos >= GOAL) {
        over = true;
        const w = pos <= -GOAL ? 0 : 1;
        render();
        api.recordWin(names[w]);
        api.setStatus("🏆 " + names[w] + " wins the tug of war! 💪 (win recorded)");
        b0.disabled = b1.disabled = true;
        return;
      }
      render();
    }
    b0.addEventListener("click", () => pull(-1));
    b1.addEventListener("click", () => pull(1));
    function onKey(e) {
      const k = e.key.toLowerCase();
      if (k === "a") { pull(-1); e.preventDefault(); }
      else if (k === "l") { pull(1); e.preventDefault(); }
    }
    window.addEventListener("keydown", onKey);

    render();
    api.setStatus("Mash your keys — " + names[0] + " taps A, " + names[1] + " taps L. Go! 💪");
    return { stop() { window.removeEventListener("keydown", onKey); } };
  },
});
