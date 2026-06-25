/* 眼力王 — 在一格格相似的汉字里，找出唯一不一样的那个「形近字」。
 * 每过一关，格子更多、时间更短；点错或超时即结束。看你能闯多少关！ */
Arcade.register({
  id: "spotchar",
  name: "眼力王",
  emoji: "👀",
  tagline: "在一堆相似的汉字里，找出那个不一样的！",
  tags: ["Puzzle", "Solo"],
  category: "chinese",
  minPlayers: 1,
  maxPlayers: 1,
  leaderboard: { type: "score" }, // 闯过的关数，越高越靠前
  rules: [
    "屏幕上全是同一个字，只有一个是「形近字」——长得很像但不一样。",
    "在时间条用完之前，点出那个不同的字。",
    "每过一关，格子更多、时间更短，越来越难！",
    "点错或超时就结束——看你能闯多少关。",
    "闯关数就是你的分数，越高越靠前！🏆",
  ],

  create(api) {
    const PAIRS = [
      ["己", "已"], ["末", "未"], ["土", "士"], ["日", "曰"], ["大", "太"], ["人", "入"],
      ["干", "千"], ["木", "禾"], ["王", "玉"], ["田", "由"], ["兔", "免"], ["鸟", "乌"],
      ["刀", "力"], ["犬", "大"], ["白", "自"], ["见", "贝"], ["万", "方"], ["历", "厉"],
      ["天", "夫"], ["牛", "午"], ["子", "孑"], ["句", "勾"], ["微", "徽"], ["辩", "辨"],
      ["暮", "幕"], ["戴", "载"], ["拨", "拔"], ["折", "拆"], ["候", "侯"], ["待", "侍"],
    ];
    let round = 0, over = false, deadline = 0, raf = null;

    const wrap = api.el("div", "");
    wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:14px;width:100%;max-width:460px;margin:0 auto";
    const bar = api.el("div", "");
    bar.style.cssText = "width:100%;max-width:360px;height:12px;border-radius:999px;background:var(--mint-100);overflow:hidden";
    const fill = api.el("div", "");
    fill.style.cssText = "height:100%;width:100%;background:linear-gradient(90deg,var(--mint-500),var(--mint-600))";
    bar.appendChild(fill);
    const grid = api.el("div", "");
    grid.style.cssText = "display:grid;gap:6px;justify-content:center";
    wrap.appendChild(bar); wrap.appendChild(grid);
    api.board.appendChild(wrap);

    function gridSize() { return round < 3 ? 3 : round < 6 ? 4 : round < 9 ? 5 : 6; }
    function roundTime() { return Math.max(2200, 6000 - round * 300); } // ms

    function newRound() {
      const n = gridSize();
      const pair = PAIRS[(Math.random() * PAIRS.length) | 0];
      const flip = Math.random() < 0.5;
      const base = flip ? pair[0] : pair[1];
      const odd = flip ? pair[1] : pair[0];
      const total = n * n, oddIdx = (Math.random() * total) | 0;
      const cell = Math.max(34, Math.min(64, Math.floor((Math.min(440, window.innerWidth - 30)) / n)));
      grid.style.gridTemplateColumns = "repeat(" + n + "," + cell + "px)";
      grid.innerHTML = "";
      for (let i = 0; i < total; i++) {
        const b = api.el("button", "", i === oddIdx ? odd : base);
        b.style.cssText = "width:" + cell + "px;height:" + cell + "px;font-size:" + Math.floor(cell * 0.58) + "px;" +
          "font-weight:800;border:2px solid var(--mint-200);border-radius:10px;background:#fff;color:#173a2b;cursor:pointer;line-height:1";
        b.addEventListener("click", () => pick(i === oddIdx, b));
        grid.appendChild(b);
      }
      deadline = performance.now() + roundTime();
      sb();
      if (raf) cancelAnimationFrame(raf);
      tickBar();
    }
    function tickBar() {
      if (over) return;
      const total = roundTime();
      const left = deadline - performance.now();
      fill.style.width = Math.max(0, Math.min(100, (left / total) * 100)) + "%";
      if (left <= 0) { return gameOver("⏰ 超时了！"); }
      raf = requestAnimationFrame(tickBar);
    }
    function pick(correct, b) {
      if (over) return;
      if (correct) { round++; newRound(); }
      else { b.style.background = "#f3a79f"; gameOver("❌ 点错了！"); }
    }
    function sb() {
      api.setScores([
        { name: "关卡", value: "第 " + (round + 1) + " 关", color: "#2e9d6c" },
        { name: "已闯", value: String(round), color: "#e67e22" },
      ]);
    }
    function gameOver(msg) {
      over = true; if (raf) cancelAnimationFrame(raf);
      if (api.submitScore) api.submitScore(round); // 闯过的关数
      if (api.celebrate && round >= 8) api.celebrate("🎉 闯过 " + round + " 关！");
      api.setScores([{ name: "闯关数", value: String(round), color: "#2e9d6c" }]);
      api.setStatus(msg + " 你闯过了 " + round + " 关，" + api.config.username + "！按 Restart 再来。");
    }

    newRound();
    api.setStatus("找出那个不一样的字，手要快！👀");
    return { stop() { over = true; if (raf) cancelAnimationFrame(raf); } };
  },
});
