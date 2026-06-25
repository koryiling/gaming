/* Pong — 2 players (or vs computer), canvas */
Arcade.register({
  id: "pong",
  name: "Pong",
  emoji: "🏓",
  tagline: "The timeless paddle duel. Don't let the ball get past you.",
  tags: ["Arcade", "Duel"],
  minPlayers: 1,
  maxPlayers: 2,
  leaderboard: { type: "wins" }, // counts wins; each victory adds one (computer wins aren't recorded)
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
    const ctx = canvas.getContext("2d");

    const vsAI = api.config.players.length === 1;
    const names = vsAI ? [api.config.players[0], "🤖 Computer"] : api.config.players;
    const target = api.config.options.target;
    const PH = H / 5, PW = 12, base = api.config.options.speed;
    const left = { y: H / 2 - PH / 2 }, right = { y: H / 2 - PH / 2 };
    let ball, score = [0, 0], over = false;
    const keys = {};

    // left-side info table: each player's score and how many points they still need to win
    const info = api.el("div", "");
    info.style.cssText = "background:#fff;border-radius:var(--radius);box-shadow:var(--shadow);padding:12px 14px;min-width:150px;align-self:center";
    function renderInfo() {
      info.innerHTML = "<div style='font-weight:800;margin-bottom:8px;color:var(--ink)'>🏓 Scoreboard</div>" +
        "<table style='border-collapse:collapse;font-size:14px'>" +
        "<tr style='color:var(--ink-soft);font-weight:700'><td style='padding:4px 8px'>Player</td><td style='padding:4px 6px;text-align:center'>Score</td><td style='padding:4px 6px;text-align:center'>To win</td></tr>" +
        names.map((n, i) => "<tr><td style='padding:4px 8px;font-weight:700;color:" + (i === 0 ? api.colors[0] : api.colors[2]) + "'>" + n +
          "</td><td style='padding:4px 6px;text-align:center;font-weight:800'>" + score[i] +
          "</td><td style='padding:4px 6px;text-align:center'>" + Math.max(0, target - score[i]) + "</td></tr>").join("") +
        "</table>";
    }
    const outer = api.el("div", "");
    outer.style.cssText = "display:flex;gap:14px;align-items:flex-start;justify-content:center;flex-wrap:wrap";
    outer.appendChild(info); outer.appendChild(canvas);
    api.board.appendChild(outer);

    function resetBall(dir) {
      ball = { x: W / 2, y: H / 2, vx: base * (dir || (Math.random() < 0.5 ? 1 : -1)), vy: (Math.random() * 2 - 1) * base * 0.6 };
    }
    resetBall();
    let aiLock = false, aiErr = 0; // beatable-AI state, re-rolled each rally

    function board() {
      api.setScores([
        { name: names[0], value: score[0] + "/" + target, color: api.colors[0] },
        { name: names[1], value: score[1] + "/" + target, color: api.colors[2] },
      ]);
      renderInfo();
    }
    function step() {
      if (over) return;
      const pSpeed = 7;
      if (keys["w"]) left.y -= pSpeed;
      if (keys["s"]) left.y += pSpeed;
      if (vsAI) {
        // beatable AI: when the ball turns toward it, half the time it aims sloppily, and it
        // tracks slower than the player — so sharp angles get past it roughly half the time.
        if (ball.vx > 0) { if (!aiLock) { aiLock = true; aiErr = Math.random() < 0.5 ? (Math.random() * 2 - 1) * PH : 0; } }
        else aiLock = false;
        const aiCap = pSpeed - 3;
        const target = ball.y + aiErr, center = right.y + PH / 2;
        if (center < target - 12) right.y += Math.min(aiCap, target - center);
        else if (center > target + 12) right.y -= Math.min(aiCap, center - target);
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
        if (api.recordWin && !(vsAI && w === 1)) api.recordWin(names[w]);
        api.setStatus("🏆 " + names[w] + " wins " + score[w] + "–" + score[1 - w] + "! Hit Restart to rematch.");
      } else {
        resetBall(dir);
      }
    }
    function draw() {
      ctx.fillStyle = "#173a2b"; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(159,224,191,.4)"; ctx.setLineDash([8, 12]); ctx.beginPath();
      ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke(); ctx.setLineDash([]);
      // names + big scores so it's clear who's who
      ctx.textBaseline = "top";
      ctx.font = "700 14px sans-serif";
      ctx.fillStyle = api.colors[0]; ctx.textAlign = "left"; ctx.fillText(names[0], 14, 10);
      ctx.fillStyle = api.colors[2]; ctx.textAlign = "right"; ctx.fillText(names[1], W - 14, 10);
      ctx.font = "800 30px sans-serif";
      ctx.fillStyle = "rgba(241,251,245,.85)";
      ctx.textAlign = "center"; ctx.fillText(score[0], W / 2 - 40, 8); ctx.fillText(score[1], W / 2 + 40, 8);
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
