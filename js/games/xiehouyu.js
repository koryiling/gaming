/* 歇后语大挑战 — 看上半句，选出正确（也最有趣）的下半句。
 * 答对继续，答错扣一条命，共 3 条命。答对越多分越高。 */
Arcade.register({
  id: "xiehouyu",
  name: "歇后语大挑战",
  emoji: "😄",
  tagline: "看上半句，猜出爆笑的下半句！",
  tags: ["Word", "Puzzle", "Solo"],
  category: "chinese",
  minPlayers: 1,
  maxPlayers: 1,
  leaderboard: { type: "score" }, // 一局答对最多，越高越靠前
  rules: [
    "屏幕显示歇后语的上半句。",
    "从选项中选出正确的下半句。",
    "答对继续；答错扣一条命，一共 3 条命。",
    "答对越多分越高——挑战你的歇后语功力！🏆",
  ],

  create(api) {
    const DATA = [
      ["外甥打灯笼", "照旧（舅）"],
      ["泥菩萨过江", "自身难保"],
      ["哑巴吃黄连", "有苦说不出"],
      ["黄鼠狼给鸡拜年", "没安好心"],
      ["八仙过海", "各显神通"],
      ["猫哭老鼠", "假慈悲"],
      ["竹篮打水", "一场空"],
      ["狗拿耗子", "多管闲事"],
      ["张飞穿针", "大眼瞪小眼"],
      ["孔夫子搬家", "净是书（输）"],
      ["小葱拌豆腐", "一清二白"],
      ["兔子尾巴", "长不了"],
      ["热锅上的蚂蚁", "团团转"],
      ["千里送鹅毛", "礼轻情意重"],
      ["芝麻开花", "节节高"],
      ["十五个吊桶打水", "七上八下"],
      ["飞蛾扑火", "自取灭亡"],
      ["老鼠过街", "人人喊打"],
      ["肉包子打狗", "有去无回"],
      ["擀面杖吹火", "一窍不通"],
      ["王婆卖瓜", "自卖自夸"],
      ["周瑜打黄盖", "一个愿打一个愿挨"],
    ];
    let order = [], qi = 0, score = 0, lives = 3, over = false, locked = false;

    const wrap = api.el("div", "");
    wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:12px;width:100%;max-width:460px;margin:0 auto";
    const q = api.el("div", "");
    q.style.cssText = "font-size:26px;font-weight:800;color:#173a2b;text-align:center";
    const dash = api.el("div", "", "—— ？");
    dash.style.cssText = "font-size:18px;color:var(--ink-soft)";
    const opts = api.el("div", "");
    opts.style.cssText = "display:flex;flex-direction:column;gap:10px;width:100%";
    wrap.appendChild(q); wrap.appendChild(dash); wrap.appendChild(opts);
    api.board.appendChild(wrap);

    function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
    function load() {
      locked = false;
      if (qi >= order.length) { order = shuffle(order); qi = 0; } // 循环出题
      const item = DATA[order[qi]];
      q.textContent = item[0];
      const wrongs = shuffle(DATA.filter((d) => d !== item).map((d) => d[1])).slice(0, 3);
      const choices = shuffle([item[1]].concat(wrongs));
      opts.innerHTML = "";
      choices.forEach((c) => {
        const b = api.el("button", "btn ghost", c);
        b.style.cssText += ";width:100%;font-size:18px;padding:12px;font-weight:700";
        b.addEventListener("click", () => answer(c === item[1], b, item[1]));
        opts.appendChild(b);
      });
      sb();
    }
    function answer(correct, b, right) {
      if (over || locked) return;
      locked = true;
      if (correct) {
        score++; b.style.background = "#aee3c8"; api.toast("😄 答对！");
        qi++; setTimeout(load, 350);
      } else {
        lives--; b.style.background = "#f3a79f"; b.style.color = "#fff";
        api.toast("❌ 正确答案：" + right);
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
      if (api.celebrate && score >= 10) api.celebrate("🎉 答对 " + score + " 题！");
      api.setStatus("游戏结束！你答对了 " + score + " 题，" + api.config.username + "。按 Restart 再来一局。");
    }

    order = shuffle(DATA.map((_, i) => i));
    load();
    api.setStatus("看上半句，选出正确的下半句 😄");
    return { stop() { over = true; } };
  },
});
