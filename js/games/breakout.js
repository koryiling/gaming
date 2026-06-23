/* Breakout — single player, canvas */
Arcade.register({
  id: "breakout",
  name: "Breakout",
  emoji: "🧱",
  tagline: "Bounce the ball off your paddle to smash every brick.",
  tags: ["Arcade", "Reflex", "Solo"],
  minPlayers: 1,
  maxPlayers: 1,
  rules: [
    "Move the paddle with ← / → or your mouse.",
    "Keep the ball in play and clear all the bricks.",
    "Each brick smashed scores points; lower rows are worth more.",
    "You have a few lives — lose the ball too often and it's game over.",
  ],
  options: [
    { key: "rows", label: "Brick rows", type: "select", default: 5,
      choices: [{ label: "4 (easy)", value: 4 }, { label: "5", value: 5 }, { label: "7 (hard)", value: 7 }] },
    { key: "lives", label: "Lives", type: "range", default: 3, min: 1, max: 5, step: 1 },
  ],

  create(api) {
    const W = Math.min(520, window.innerWidth - 40), H = Math.round(W * 0.78);
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H; canvas.tabIndex = 0;
    api.board.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    const ROWS = api.config.options.rows, COLS = 9;
    const BW = (W - 20) / COLS, BH = 22, TOP = 40;
    const BRICK_COLORS = ["#e74c3c", "#e67e22", "#f1c40f", "#2ecc71", "#16a085", "#3498db", "#9b59b6"];
    let bricks, paddle, ball, score, lives, alive, won, raf, started;
    const keys = {};

    function reset() {
      bricks = [];
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) bricks.push({ x: 10 + c * BW, y: TOP + r * (BH + 4), r, alive: true });
      paddle = { x: W / 2 - 45, w: 90, h: 12 };
      resetBall(); score = 0; lives = api.config.options.lives; alive = true; won = false; started = false;
      updateScore();
      api.setStatus("Move with ← → or mouse. Click / press Space to launch 🚀");
    }
    function resetBall() { ball = { x: W / 2, y: H - 40, vx: 0, vy: 0, r: 7 }; started = false; }
    function launch() { if (started || !alive) return; started = true; ball.vx = (Math.random() < 0.5 ? -1 : 1) * 3.4; ball.vy = -4.2; }
    function updateScore() {
      api.setScores([{ name: api.config.username, value: score, color: "#2e9d6c" }, { name: "Lives", value: "❤".repeat(Math.max(0, lives)), color: "#e74c3c" },
        { name: "Bricks", value: bricks.filter((b) => b.alive).length, color: "#e67e22" }]);
    }
    function step() {
      if (keys.left) paddle.x -= 7;
      if (keys.right) paddle.x += 7;
      paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));
      if (!started) { ball.x = paddle.x + paddle.w / 2; }
      else {
        ball.x += ball.vx; ball.y += ball.vy;
        if (ball.x < ball.r || ball.x > W - ball.r) ball.vx *= -1;
        if (ball.y < ball.r) ball.vy *= -1;
        // paddle
        if (ball.y + ball.r > H - 24 && ball.y < H - 12 && ball.x > paddle.x && ball.x < paddle.x + paddle.w && ball.vy > 0) {
          ball.vy = -Math.abs(ball.vy); ball.vx += ((ball.x - (paddle.x + paddle.w / 2)) / paddle.w) * 4;
          const sp = Math.min(8, Math.hypot(ball.vx, ball.vy)); const a = Math.atan2(ball.vy, ball.vx); ball.vx = Math.cos(a) * sp; ball.vy = Math.sin(a) * sp;
        }
        // bricks
        for (const b of bricks) if (b.alive && ball.x > b.x && ball.x < b.x + BW - 4 && ball.y - ball.r < b.y + BH && ball.y + ball.r > b.y) {
          b.alive = false; ball.vy *= -1; score += (ROWS - b.r) * 10; updateScore(); break;
        }
        if (bricks.every((b) => !b.alive)) { won = true; alive = false; api.setStatus("🎉 Cleared every brick — you win with " + score + "! Restart to replay."); }
        if (ball.y > H) {
          lives--; updateScore();
          if (lives <= 0) { alive = false; api.setStatus("💥 Game over — score <b>" + score + "</b>. Press Space or Restart."); }
          else { resetBall(); api.setStatus("Ball lost! " + lives + " left. Click / Space to launch."); }
        }
      }
      draw();
      if (alive) raf = requestAnimationFrame(step);
    }
    function draw() {
      ctx.fillStyle = "#173a2b"; ctx.fillRect(0, 0, W, H);
      bricks.forEach((b) => { if (b.alive) { ctx.fillStyle = BRICK_COLORS[b.r % BRICK_COLORS.length]; ctx.fillRect(b.x, b.y, BW - 4, BH); ctx.fillStyle = "rgba(255,255,255,.2)"; ctx.fillRect(b.x, b.y, BW - 4, 5); } });
      ctx.fillStyle = "#9fe0bf"; ctx.fillRect(paddle.x, H - 24, paddle.w, paddle.h);
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, 7); ctx.fill();
    }
    function restart() { reset(); cancelAnimationFrame(raf); raf = requestAnimationFrame(step); }
    function kd(e) { const k = e.key.toLowerCase(); if (k === "arrowleft" || k === "a") keys.left = true; else if (k === "arrowright" || k === "d") keys.right = true; else if (k === " ") { if (!alive && !won) restart(); else launch(); } else return; e.preventDefault(); }
    function ku(e) { const k = e.key.toLowerCase(); if (k === "arrowleft" || k === "a") keys.left = false; if (k === "arrowright" || k === "d") keys.right = false; }
    function mm(e) { const rect = canvas.getBoundingClientRect(); paddle.x = Math.max(0, Math.min(W - paddle.w, (e.clientX - rect.left) * (W / rect.width) - paddle.w / 2)); }
    function mc() { if (!alive && !won) restart(); else launch(); }
    window.addEventListener("keydown", kd); window.addEventListener("keyup", ku);
    canvas.addEventListener("mousemove", mm); canvas.addEventListener("click", mc);

    reset(); canvas.focus(); raf = requestAnimationFrame(step);
    return { stop() { cancelAnimationFrame(raf); window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); } };
  },
});
