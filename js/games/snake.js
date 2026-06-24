/* Snake — single player, canvas */
Arcade.register({
  id: "snake",
  name: "Snake",
  emoji: "🐍",
  tagline: "Eat the apples, grow longer, don't bite yourself.",
  tags: ["Classic", "Arcade"],
  minPlayers: 1,
  maxPlayers: 1,
  rules: [
    "Steer the snake with the Arrow keys or W/A/S/D.",
    "Eat 🍎 apples to grow longer and score points.",
    "Don't run into your own tail.",
    "With 'Walls' on, hitting an edge ends the game; with it off you wrap around.",
  ],
  options: [
    {
      key: "speed", label: "Speed", type: "select", default: 9,
      choices: [{ label: "Chill", value: 6 }, { label: "Normal", value: 9 }, { label: "Fast", value: 14 }],
    },
    {
      key: "size", label: "Board size", type: "select", default: 17,
      choices: [{ label: "Small", value: 13 }, { label: "Medium", value: 17 }, { label: "Large", value: 22 }],
    },
    { key: "walls", label: "Solid walls", type: "toggle", default: false },
  ],

  create(api) {
    const N = api.config.options.size;
    const CELL = Math.floor(Math.min(440, window.innerWidth - 60) / N);
    const PX = CELL * N;
    const canvas = document.createElement("canvas");
    canvas.width = PX; canvas.height = PX;
    canvas.tabIndex = 0;
    api.board.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    let snake, dir, nextDir, food, score, alive, best = 0;

    function reset() {
      snake = [{ x: (N / 2) | 0, y: (N / 2) | 0 }];
      dir = { x: 1, y: 0 }; nextDir = dir;
      score = 0; alive = true;
      placeFood();
      api.setStatus("Swipe, or use Arrow keys / WASD to move 🎮");
      updateScore();
    }
    function placeFood() {
      do {
        food = { x: (Math.random() * N) | 0, y: (Math.random() * N) | 0 };
      } while (snake.some((s) => s.x === food.x && s.y === food.y));
    }
    function updateScore() {
      api.setScores([{ name: api.config.username, value: score, color: "#2e9d6c" }, { name: "Best", value: best, color: "#e67e22" }]);
    }

    function step() {
      if (!alive) return;
      dir = nextDir;
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (api.config.options.walls) {
        if (head.x < 0 || head.y < 0 || head.x >= N || head.y >= N) return die();
      } else {
        head.x = (head.x + N) % N; head.y = (head.y + N) % N;
      }
      if (snake.some((s) => s.x === head.x && s.y === head.y)) return die();
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        score++; best = Math.max(best, score); updateScore(); placeFood();
      } else {
        snake.pop();
      }
      draw();
    }
    function die() {
      alive = false;
      api.setStatus("💥 Game over — score <b>" + score + "</b>. Press <b>Space</b> or Restart to play again.");
    }

    function draw() {
      ctx.fillStyle = "#f1fbf5"; ctx.fillRect(0, 0, PX, PX);
      // subtle grid
      ctx.fillStyle = "#e3f7ec";
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if ((i + j) % 2) ctx.fillRect(i * CELL, j * CELL, CELL, CELL);
      // food
      ctx.font = (CELL * 0.8) + "px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("🍎", food.x * CELL + CELL / 2, food.y * CELL + CELL / 2 + 1);
      // snake
      snake.forEach((s, i) => {
        ctx.fillStyle = i === 0 ? "#247a55" : "#43b884";
        const p = 2;
        roundRect(s.x * CELL + p, s.y * CELL + p, CELL - p * 2, CELL - p * 2, 5);
      });
    }
    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.fill();
    }

    const keymap = {
      ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
      w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 },
    };
    function onKey(e) {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === " " && !alive) { reset(); draw(); return; }
      const nd = keymap[k];
      if (!nd) return;
      e.preventDefault();
      if (nd.x === -dir.x && nd.y === -dir.y) return; // no reverse
      nextDir = nd;
    }
    window.addEventListener("keydown", onKey);

    // touch: swipe to steer, tap to restart when dead
    const SWIPE = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
    if (window.Touch) Touch.swipe(canvas, {
      onSwipe(d) { const nd = SWIPE[d]; if (!nd) return; if (nd.x === -dir.x && nd.y === -dir.y) return; nextDir = nd; },
      onTap() { if (!alive) { reset(); draw(); } },
    });

    reset(); draw();
    canvas.focus();
    const timer = setInterval(step, 1000 / api.config.options.speed);

    return { stop() { clearInterval(timer); window.removeEventListener("keydown", onKey); } };
  },
});
