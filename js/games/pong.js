/* Pong — 2 players (or vs computer), canvas */
Arcade.register({
  id: "pong",
  name: "Pong",
  emoji: "🏓",
  tagline: "The timeless paddle duel. Don't let the ball get past you.",
  tags: ["Arcade", "Duel"],
  minPlayers: 1,
  maxPlayers: 2,
  rules: [
    "Left paddle: W (up) / S (down). Right paddle: ↑ / ↓ arrows.",
    "Bounce the ball past your opponent's paddle to score.",
    "The ball speeds up slightly on every paddle hit.",
    "First to the target score wins. 1 player = face the computer (right paddle).",
  ],
  options: [
    {
      key: "target", label: "Win score", type: "select", default: 5,
      choices: [{ label: "First to 3", value: 3 }, { label: "First to 5", value: 5 }, { label: "First to 7", value: 7 }],
    },
    {
      key: "speed", label: "Ball speed", type: "select", default: 5,
      choices: [{ label: "Slow", value: 4 }, { label: "Normal", value: 5 }, { label: "Fast", value: 7 }],
    },
  ],

  create(api) {
    const W = Math.min(560, window.innerWidth - 40), H = Math.round(W * 0.6);
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    api.board.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    const vsAI = api.config.players.length === 1;
    const names = vsAI ? [api.config.players[0], "🤖 Computer"] : api.config.players;
    const target = api.config.options.target;
    const PH = H / 5, PW = 12, base = api.config.options.speed;
    const left = { y: H / 2 - PH / 2 }, right = { y: H / 2 - PH / 2 };
    let ball, score = [0, 0], over = false;
    const keys = {};

    function resetBall(dir) {
      ball = { x: W / 2, y: H / 2, vx: base * (dir || (Math.random() < 0.5 ? 1 : -1)), vy: (Math.random() * 2 - 1) * base * 0.6 };
    }
    resetBall();

    function board() {
      api.setScores([
        { name: names[0], value: score[0] + "/" + target, color: api.colors[0] },
        { name: names[1], value: score[1] + "/" + target, color: api.colors[2] },
      ]);
    }
    function step() {
      if (over) return;
      const pSpeed = 7;
      if (keys["w"]) left.y -= pSpeed;
      if (keys["s"]) left.y += pSpeed;
      if (vsAI) {
        const center = right.y + PH / 2;
        if (center < ball.y - 12) right.y += Math.min(pSpeed - 1, ball.y - center);
        else if (center > ball.y + 12) right.y -= Math.min(pSpeed - 1, center - ball.y);
      } else {
        if (keys["arrowup"]) right.y -= pSpeed;
        if (keys["arrowdown"]) right.y += pSpeed;
      }
      left.y = Math.max(0, Math.min(H - PH, left.y));
      right.y = Math.max(0, Math.min(H - PH, right.y));

      ball.x += ball.vx; ball.y += ball.vy;
      if (ball.y < 8 || ball.y > H - 8) ball.vy *= -1;
      // left paddle
      if (ball.x < PW + 14 && ball.x > 8 && ball.y > left.y && ball.y < left.y + PH && ball.vx < 0) {
        ball.vx = Math.abs(ball.vx) * 1.05; ball.vy += ((ball.y - (left.y + PH / 2)) / PH) * 3;
      }
      if (ball.x > W - PW - 14 && ball.x < W - 8 && ball.y > right.y && ball.y < right.y + PH && ball.vx > 0) {
        ball.vx = -Math.abs(ball.vx) * 1.05; ball.vy += ((ball.y - (right.y + PH / 2)) / PH) * 3;
      }
      if (ball.x < 0) { score[1]++; point(1); }
      else if (ball.x > W) { score[0]++; point(-1); }
      draw();
    }
    function point(dir) {
      board();
      if (score[0] >= target || score[1] >= target) {
        over = true;
        const w = score[0] >= target ? 0 : 1;
        api.setStatus("🏆 " + names[w] + " wins " + score[w] + "–" + score[1 - w] + "! Hit Restart to rematch.");
      } else {
        resetBall(dir);
      }
    }
    function draw() {
      ctx.fillStyle = "#173a2b"; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(159,224,191,.4)"; ctx.setLineDash([8, 12]); ctx.beginPath();
      ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = api.colors[0]; ctx.fillRect(8, left.y, PW, PH);
      ctx.fillStyle = api.colors[2]; ctx.fillRect(W - PW - 8, right.y, PW, PH);
      ctx.fillStyle = "#f1fbf5"; ctx.beginPath(); ctx.arc(ball.x, ball.y, 8, 0, 7); ctx.fill();
    }
    function kd(e) { keys[e.key.toLowerCase()] = true; if (["arrowup", "arrowdown"].includes(e.key.toLowerCase())) e.preventDefault(); }
    function ku(e) { keys[e.key.toLowerCase()] = false; }
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);

    // touch: drag on the left half to move the left paddle, right half for the right paddle
    function touchMove(e) {
      const rect = canvas.getBoundingClientRect();
      for (const t of e.touches) {
        const y = (t.clientY - rect.top) * (H / rect.height);
        const py = Math.max(0, Math.min(H - PH, y - PH / 2));
        if ((t.clientX - rect.left) < rect.width / 2) left.y = py;
        else if (!vsAI) right.y = py;
      }
      if (e.cancelable) e.preventDefault();
    }
    canvas.style.touchAction = "none";
    canvas.addEventListener("touchstart", touchMove, { passive: false });
    canvas.addEventListener("touchmove", touchMove, { passive: false });

    board(); draw();
    api.setStatus(vsAI ? "Drag (or W/S) to move your paddle. Good luck!" : names[0] + ": W/S or drag left · " + names[1] + ": ↑/↓ or drag right");
    const timer = setInterval(step, 1000 / 60);
    return { stop() { clearInterval(timer); window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); } };
  },
});
