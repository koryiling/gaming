/* 猜字谜 — 读谜面，从选项中选出谜底（一个汉字）。
 * 答对继续，答错扣一条命，共 3 条命。答对越多分越高。 */
Arcade.register({
  id: "zimi",
  name: "猜字谜",
  emoji: "🧩",
  tagline: "读谜面，猜出那一个汉字！",
  tags: ["Word", "Puzzle", "Solo"],
  category: "chinese",
  minPlayers: 1,
  maxPlayers: 1,
  leaderboard: { type: "score" }, // 一局答对最多，越高越靠前
  rules: [
    "每题给出一个字谜（谜面）。",
    "从选项中选出谜底——那一个汉字。",
    "答对继续；答错扣一条命，一共 3 条命。",
    "答对越多分越高，挑战你的脑力！🏆",
  ],

  create(api) {
    const DATA = [
      ["山上还有山", "出"],
      ["二人土上坐", "坐"],
      ["千里相逢", "重"],
      ["人在草木中", "茶"],
      ["自大一点", "臭"],
      ["王先生白小姐坐在石头上", "碧"],
      ["一夜又一夜", "多"],
      ["十个口，一颗心", "思"],
      ["田里长草", "苗"],
      ["心字头上一把刀", "忍"],
      ["一人一张口，口下长只手", "拿"],
      ["三人同日去看花", "春"],
      ["一口咬掉牛尾巴", "告"],
      ["太阳西边下，月亮东边挂", "明"],
      ["半个月亮", "胖"],
      ["不上不下", "卡"],
    ];
    const ALL = DATA.map((d) => d[1]);
    let order = [], qi = 0, score = 0, lives = 3, over = false, locked = false;

    const wrap = api.el("div", "");
    wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:14px;width:100%;max-width:460px;margin:0 auto";
    const label = api.el("div", "", "谜面");
    label.style.cssText = "font-weight:700;color:var(--ink-soft)";
    const q = api.el("div", "");
    q.style.cssText = "font-size:24px;font-weight:800;color:#173a2b;text-align:center;background:var(--mint-50);" +
      "border:1.5px solid var(--mint-100);border-radius:12px;padding:14px 16px;width:100%";
    const tip = api.el("div", "", "（打一字）");
    tip.style.cssText = "font-size:14px;color:var(--ink-soft)";
    const opts = api.el("div", "");
    opts.style.cssText = "display:grid;grid-template-columns:repeat(4,1fr);gap:10px;width:100%;max-width:320px";
    wrap.appendChild(label); wrap.appendChild(q); wrap.appendChild(tip); wrap.appendChild(opts);
    api.board.appendChild(wrap);

    function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
    function load() {
      locked = false;
      if (qi >= order.length) { order = shuffle(order); qi = 0; } // 循环出题
      const item = DATA[order[qi]];
      q.textContent = item[0];
      const wrongs = shuffle(ALL.filter((c) => c !== item[1])).slice(0, 3);
      const choices = shuffle([item[1]].concat(wrongs));
      opts.innerHTML = "";
      choices.forEach((c) => {
        const b = api.el("button", "btn ghost", c);
        b.style.cssText += ";font-size:28px;font-weight:800;padding:10px 0;min-width:0";
        b.addEventListener("click", () => answer(c === item[1], b, item[1]));
        opts.appendChild(b);
      });
      sb();
    }
    function answer(correct, b, right) {
      if (over || locked) return;
      locked = true;
      if (correct) {
        score++; b.style.background = "#aee3c8"; api.toast("🧩 答对！");
        qi++; setTimeout(load, 350);
      } else {
        lives--; b.style.background = "#f3a79f"; b.style.color = "#fff";
        api.toast("❌ 谜底是：" + right);
        sb();
        if (lives <= 0) { return setTimeout(end, 700); }
        qi++; setTimeout(load, 1000);
      }
    }
    function sb() {
      api.setScores([
        { name: "答对", value: String(score), color: "#2e9d6c" },
        { name: "生命", value: lives > 0 ? "❤️".repeat(lives) : "💀", color: "#e74c3c" },
      ]);
    }
    function end() {
      over = true; sb();
      if (api.submitScore) api.submitScore(score);
      if (api.celebrate && score >= 8) api.celebrate("🎉 答对 " + score + " 题！");
      api.setStatus("游戏结束！你答对了 " + score + " 题，" + api.config.username + "。按 Restart 再来一局。");
    }

    order = shuffle(DATA.map((_, i) => i));
    load();
    api.setStatus("读谜面，选出那一个汉字 🧩");
    return { stop() { over = true; } };
  },
});
