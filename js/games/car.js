/* Car Racer — single player driving / dodging, canvas */
Arcade.register({
  id: "car",
  name: "Car Racer",
  emoji: "🏎️",
  tagline: "Weave through highway traffic at speed. How far can you drive?",
  tags: ["Arcade", "Reflex", "Solo"],
  minPlayers: 1,
  maxPlayers: 1,
  rules: [
    "Steer with ← / → (or A / D) to dodge oncoming cars.",
    "↑ / ↓ speeds up or slows down — faster means more points but less reaction time.",
    "Crashing into traffic ends the run.",
    "Survive as long as you can to rack up distance!",
  ],
  options: [
    { key: "traffic", label: "Traffic", type: "select", default: "normal",
      choices: [{ label: "Light", value: "light" }, { label: "Normal", value: "normal" }, { label: "Heavy", value: "heavy" }] },
    { key: "night", label: "Night drive", type: "toggle", default: false },
  ],

  create(api) {
    const LANES = 4;
    const W = Math.min(360, window.innerWidth - 40);
    const H = Math.round(W * 1.6);
    const laneW = W / LANES;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H; canvas.tabIndex = 0;
    api.board.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    const night = api.config.options.night;
    const spawnGap = { light: 1500, normal: 1000, heavy: 650 }[api.config.options.traffic];
    const ENEMY = ["🚙", "🚕", "🚐", "🚚", "🚓"];

    let px, baseSpeed, speed, enemies, score, alive, best = 0;
    let lastSpawn = 0, roadY = 0, t = 0;
    const keys = {};

    function reset() {
      px = W / 2 - laneW * 0.3; baseSpeed = 4; speed = baseSpeed;
      enemies = []; score = 0; alive = true; lastSpawn = 0; roadY = 0;
      updateScore();
      api.setStatus("← → steer · ↑ ↓ speed. Don't crash! 🏁");
    }
    function updateScore() {
      api.setScores([{ name: api.config.username, value: Math.floor(score), color: "#2e9d6c" },
        { name: "Best", value: best, color: "#e67e22" }, { name: "Speed", value: Math.round(speed) + "x", color: "#3498db" }]);
    }
    const carW = laneW * 0.62, carH = carW * 1.7;

    function spawn() {
      const lane = (Math.random() * LANES) | 0;
      const x = lane * laneW + (laneW - carW) / 2;
      // avoid spawning overlapping a recent same-lane car
      if (enemies.some((e) => e.lane === lane && e.y < carH * 1.6)) return;
      enemies.push({ x, y: -carH, lane, sym: ENEMY[(Math.random() * ENEMY.length) | 0] });
    }
    function step(dt) {
      if (!alive) return;
      t += dt;
      if (keys.left) px -= 6;
      if (keys.right) px += 6;
      if (keys.up) speed = Math.min(11, speed + 0.12);
      if (keys.down) speed = Math.max(2.5, speed - 0.18);
      px = Math.max(4, Math.min(W - carW - 4, px));
      // natural speed creep
      speed += 0.0008 * dt;
      roadY = (roadY + speed) % 60;
      if (t - lastSpawn > spawnGap / (speed / baseSpeed)) { spawn(); lastSpawn = t; }
      enemies.forEach((e) => (e.y += speed));
      // collision
      const pyTop = H - carH - 16;
      for (const e of enemies) {
        if (e.y + carH > pyTop && e.y < pyTop + carH && Math.abs(e.x - px) < carW * 0.85) return crash();
      }
      enemies = enemies.filter((e) => e.y < H + carH);
      score += speed * dt * 0.01;
      updateScore();
      draw();
    }
    function crash() {
      alive = false; best = Math.max(best, Math.floor(score)); updateScore();
      api.setStatus("💥 Crash! Distance <b>" + Math.floor(score) + "</b>. Press <b>Space</b> or Restart to drive again.");
      draw();
    }
    function draw() {
      ctx.fillStyle = night ? "#16302a" : "#7fb89a"; ctx.fillRect(0, 0, W, H);
      // road
      ctx.fillStyle = night ? "#222" : "#444"; ctx.fillRect(laneW * 0.2, 0, W - laneW * 0.4, H);
      // lane dashes
      ctx.strokeStyle = night ? "#6a6a3a" : "#f1fbf5"; ctx.lineWidth = 4; ctx.setLineDash([26, 26]);
      for (let l = 1; l < LANES; l++) { ctx.beginPath(); ctx.lineDashOffset = -roadY; ctx.moveTo(l * laneW, 0); ctx.lineTo(l * laneW, H); ctx.stroke(); }
      ctx.setLineDash([]);
      // enemies
      ctx.font = carH + "px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      enemies.forEach((e) => ctx.fillText(e.sym, e.x + carW / 2, e.y + carH / 2));
      // player (facing up)
      ctx.fillText("🏎️", px + carW / 2, H - carH / 2 - 16);
      if (night) { // headlight glow
        const g = ctx.createRadialGradient(px + carW / 2, H - carH - 16, 4, px + carW / 2, H - carH - 16, 120);
        g.addColorStop(0, "rgba(255,255,200,.25)"); g.addColorStop(1, "rgba(255,255,200,0)");
        ctx.fillStyle = g; ctx.fillRect(px - 60, H - carH - 150, carW + 120, 150);
      }
    }
    function kd(e) {
      const k = e.key.toLowerCase();
      if (!alive && k === " ") { reset(); return; }
      if (k === "arrowleft" || k === "a") keys.left = true;
      else if (k === "arrowright" || k === "d") keys.right = true;
      else if (k === "arrowup" || k === "w") keys.up = true;
      else if (k === "arrowdown" || k === "s") keys.down = true;
      else return;
      e.preventDefault();
    }
    function ku(e) {
      const k = e.key.toLowerCase();
      if (k === "arrowleft" || k === "a") keys.left = false;
      else if (k === "arrowright" || k === "d") keys.right = false;
      else if (k === "arrowup" || k === "w") keys.up = false;
      else if (k === "arrowdown" || k === "s") keys.down = false;
    }
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);

    reset(); draw(); canvas.focus();
    let last = 0, raf;
    function loop(ts) { const dt = Math.min(40, ts - last || 16); last = ts; step(dt); raf = requestAnimationFrame(loop); }
    raf = requestAnimationFrame(loop);

    return { stop() { cancelAnimationFrame(raf); window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); } };
  },
});
