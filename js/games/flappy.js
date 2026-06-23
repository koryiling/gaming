/* Flappy — single player one-tap reflex, canvas */
Arcade.register({
  id: "flappy",
  name: "Flappy",
  emoji: "🐤",
  tagline: "Tap to flap through the gaps. One touch, endless challenge.",
  tags: ["Arcade", "Reflex", "Solo"],
  minPlayers: 1,
  maxPlayers: 1,
  rules: [
    "Click, tap, or press Space to flap upward.",
    "Fly through the gaps between the pipes.",
    "Each pipe you pass scores a point.",
    "Hit a pipe or the ground and it's over — try again!",
  ],
  options: [
    { key: "gap", label: "Gap size", type: "select", default: 150,
      choices: [{ label: "Roomy", value: 180 }, { label: "Normal", value: 150 }, { label: "Tight", value: 120 }] },
  ],

  create(api) {
    const W = Math.min(420, window.innerWidth - 40), H = Math.round(W * 1.3);
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H; canvas.tabIndex = 0;
    api.board.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    const GAP = api.config.options.gap, PIPE_W = 56, SPEED = 2.4, GRAV = 0.42, FLAP = -7;
    let bird, pipes, score, best = 0, alive, started, raf, frame;

    function reset() {
      bird = { y: H / 2, v: 0, x: W * 0.28 };
      pipes = []; score = 0; alive = true; started = false; frame = 0;
      updateScore();
      api.setStatus("Tap / click / Space to flap 🐤");
    }
    function updateScore() { api.setScores([{ name: api.config.username, value: score, color: "#2e9d6c" }, { name: "Best", value: best, color: "#e67e22" }]); }
    function flap() { if (!alive) { reset(); cancelAnimationFrame(raf); raf = requestAnimationFrame(step); return; } started = true; bird.v = FLAP; }
    function spawn() { const top = 50 + Math.random() * (H - GAP - 130); pipes.push({ x: W, top, passed: false }); }
    function step() {
      frame++;
      ctx.fillStyle = "#9fe0bf"; ctx.fillRect(0, 0, W, H);
      // clouds
      ctx.fillStyle = "rgba(255,255,255,.5)";
      for (let i = 0; i < 3; i++) { const cx = (W - ((frame * 0.3 + i * 160) % (W + 80))); ctx.beginPath(); ctx.arc(cx, 60 + i * 40, 22, 0, 7); ctx.fill(); }
      if (started) {
        bird.v += GRAV; bird.y += bird.v;
        if (frame % 95 === 0) spawn();
        pipes.forEach((p) => (p.x -= SPEED));
        pipes = pipes.filter((p) => p.x + PIPE_W > 0);
        for (const p of pipes) {
          if (!p.passed && p.x + PIPE_W < bird.x) { p.passed = true; score++; best = Math.max(best, score); updateScore(); }
          if (bird.x + 14 > p.x && bird.x - 14 < p.x + PIPE_W && (bird.y - 14 < p.top || bird.y + 14 > p.top + GAP)) die();
        }
        if (bird.y > H - 14 || bird.y < 0) die();
      }
      // pipes
      ctx.fillStyle = "#2e9d6c";
      pipes.forEach((p) => { ctx.fillRect(p.x, 0, PIPE_W, p.top); ctx.fillRect(p.x, p.top + GAP, PIPE_W, H - p.top - GAP);
        ctx.fillStyle = "#247a55"; ctx.fillRect(p.x - 3, p.top - 16, PIPE_W + 6, 16); ctx.fillRect(p.x - 3, p.top + GAP, PIPE_W + 6, 16); ctx.fillStyle = "#2e9d6c"; });
      // ground
      ctx.fillStyle = "#247a55"; ctx.fillRect(0, H - 8, W, 8);
      // bird
      ctx.font = "30px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.save(); ctx.translate(bird.x, bird.y); ctx.rotate(Math.max(-0.5, Math.min(1, bird.v / 12))); ctx.fillText("🐤", 0, 0); ctx.restore();
      // score
      ctx.fillStyle = "#fff"; ctx.font = "bold 34px sans-serif"; ctx.fillText(score, W / 2, 50);
      if (alive) raf = requestAnimationFrame(step);
    }
    function die() {
      if (!alive) return;
      alive = false;
      api.setStatus("💥 Score <b>" + score + "</b>! Tap / Space to fly again.");
    }
    function key(e) { if (e.key === " " || e.key === "ArrowUp") { flap(); e.preventDefault(); } }
    window.addEventListener("keydown", key);
    canvas.addEventListener("click", flap);

    reset(); canvas.focus(); raf = requestAnimationFrame(step);
    return { stop() { cancelAnimationFrame(raf); window.removeEventListener("keydown", key); } };
  },
});
