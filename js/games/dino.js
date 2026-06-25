/* Dino Run — the offline "no internet" dinosaur game.
 * Jump the cacti, duck the birds, run as far as you can. Highest distance is your record. */
Arcade.register({
  id: "dino",
  name: "Dino Run",
  emoji: "🦖",
  tagline: "No internet? No problem. Jump the cacti and run as far as you can.",
  tags: ["Arcade", "Reflex", "Solo"],
  minPlayers: 1,
  maxPlayers: 1,
  leaderboard: { type: "score" }, // farthest run kept per player, highest first
  rules: [
    "Press Space / ↑ / tap to JUMP over cacti.",
    "Press ↓ to DUCK under flying birds.",
    "The longer you survive, the higher your score climbs.",
    "Pick a speed in Options — it ramps up as you go. One hit ends the run. Beat your best! 🦖",
  ],
  options: [
    { key: "diff", label: "Speed", type: "select", default: "normal",
      choices: [{ label: "🐢 Chill", value: "easy" }, { label: "🏃 Normal", value: "normal" }, { label: "⚡ Fast", value: "hard" }] },
  ],

  create(api) {
    const W = Math.min(620, window.innerWidth - 28), H = Math.min(220, Math.round(W * 0.36));
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H; canvas.tabIndex = 0;
    canvas.style.cssText = "max-width:100%;border-radius:12px;border:2px solid #d8c4a0;background:#fcf8ef;touch-action:manipulation";
    api.board.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    // difficulty: starting speed + how quickly it ramps up
    const TUNE = {
      easy:   { start: 3.2, ramp: 0.0008 },
      normal: { start: 4.2, ramp: 0.0013 },
      hard:   { start: 5.6, ramp: 0.0020 },
    }[api.config.options.diff] || { start: 4.2, ramp: 0.0013 };

    const GROUND = H - 26;
    const GRAV = 0.7, JUMP = -11.5;
    let best = api.loadBest();
    let dino, obs, score, speed, alive, started, raf, frame, ducking;

    function reset() {
      dino = { x: 46, y: GROUND, vy: 0, w: 22, h: 26, onGround: true };
      obs = []; score = 0; speed = TUNE.start; alive = true; started = false; frame = 0; ducking = false;
      updateScore();
      api.setStatus("Space / ↑ / tap to jump · ↓ to duck 🦖");
    }
    function updateScore() {
      api.setScores([
        { name: api.config.username, value: Math.floor(score), color: "#c0712f" },
        { name: "Best", value: best, color: "#e67e22" },
      ]);
    }
    function jump() {
      if (!alive) { reset(); cancelAnimationFrame(raf); raf = requestAnimationFrame(step); return; }
      started = true;
      if (dino.onGround) { dino.vy = JUMP; dino.onGround = false; }
    }
    function setDuck(on) { ducking = on && dino.onGround; }

    function spawn() {
      // bird (duck under) appears only once it's fast enough; otherwise a cactus (jump over)
      const bird = speed > 5.5 && Math.random() < 0.3;
      if (bird) {
        obs.push({ x: W + 10, y: GROUND - 38, w: 26, h: 18, bird: true });
      } else {
        const big = Math.random() < 0.4;
        obs.push({ x: W + 10, y: GROUND - (big ? 40 : 28), w: big ? 20 : 16, h: big ? 40 : 28, bird: false });
      }
    }

    function hit(o) {
      const dh = ducking ? 14 : dino.h;
      const dy = dino.y - dh;
      const dx = dino.x;
      return dx + dino.w > o.x && dx < o.x + o.w && dy + dh > o.y && dy < o.y + o.h;
    }

    function step() {
      frame++;
      ctx.clearRect(0, 0, W, H);
      // sandy ground line
      ctx.strokeStyle = "#c2a878"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, GROUND + 2); ctx.lineTo(W, GROUND + 2); ctx.stroke();
      // drifting ground specks
      ctx.fillStyle = "#e0cda6";
      for (let i = 0; i < 6; i++) { const gx = (W - ((frame * speed * 0.5 + i * 120) % (W + 60))); ctx.fillRect(gx, GROUND + 8, 6, 3); }

      if (started && alive) {
        score += speed * 0.04;
        if (Math.floor(score) > best) { best = Math.floor(score); api.saveBest(best); }
        speed += TUNE.ramp; // gradual ramp-up
        // physics
        dino.vy += GRAV; dino.y += dino.vy;
        if (dino.y >= GROUND) { dino.y = GROUND; dino.vy = 0; dino.onGround = true; }
        // obstacles
        const gap = Math.max(46, 120 - speed * 4);
        if (!obs.length || (W - obs[obs.length - 1].x) > gap + Math.random() * 120) spawn();
        obs.forEach((o) => (o.x -= speed));
        obs = obs.filter((o) => o.x + o.w > -4);
        for (const o of obs) if (hit(o)) return die();
        updateScore();
      }

      // obstacles draw — cacti in a warm sandy brown (not green)
      obs.forEach((o) => {
        if (o.bird) {
          ctx.font = "20px serif"; ctx.textAlign = "left"; ctx.textBaseline = "top";
          ctx.fillText(frame % 20 < 10 ? "🐦" : "🕊️", o.x, o.y - 2);
        } else {
          ctx.fillStyle = "#b07a36";
          ctx.fillRect(o.x, o.y, o.w, o.h);
          ctx.fillStyle = "#8a5d24"; // arms + shading
          ctx.fillRect(o.x - 5, o.y + o.h * 0.35, 5, 4);
          ctx.fillRect(o.x + o.w, o.y + o.h * 0.2, 5, 4);
        }
      });

      // dino
      ctx.font = (ducking ? 22 : 28) + "px serif"; ctx.textAlign = "left"; ctx.textBaseline = "bottom";
      ctx.fillText(alive ? "🦖" : "💥", dino.x - 4, dino.y + 4);

      // score readout
      ctx.fillStyle = "#5a4426"; ctx.font = "bold 16px monospace"; ctx.textAlign = "right"; ctx.textBaseline = "top";
      ctx.fillText("HI " + String(best).padStart(5, "0") + "  " + String(Math.floor(score)).padStart(5, "0"), W - 10, 10);

      if (alive) raf = requestAnimationFrame(step);
    }

    function die() {
      if (!alive) return;
      alive = false;
      updateScore();
      api.setStatus("💥 You ran <b>" + Math.floor(score) + "</b>! Space / tap to run again.");
      // draw the crash frame
      ctx.font = "28px serif"; ctx.textAlign = "left"; ctx.textBaseline = "bottom";
      ctx.fillText("💥", dino.x - 4, dino.y + 4);
    }

    function key(e) {
      if (e.key === " " || e.key === "ArrowUp") { jump(); e.preventDefault(); }
      else if (e.key === "ArrowDown") { setDuck(true); e.preventDefault(); }
    }
    function keyUp(e) { if (e.key === "ArrowDown") setDuck(false); }
    function touchStart(e) { e.preventDefault(); jump(); }
    window.addEventListener("keydown", key);
    window.addEventListener("keyup", keyUp);
    canvas.addEventListener("mousedown", jump);
    canvas.addEventListener("touchstart", touchStart, { passive: false });

    reset(); canvas.focus(); raf = requestAnimationFrame(step);
    return {
      stop() {
        cancelAnimationFrame(raf);
        window.removeEventListener("keydown", key);
        window.removeEventListener("keyup", keyUp);
        canvas.removeEventListener("touchstart", touchStart);
      },
    };
  },
});
