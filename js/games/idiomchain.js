/* 成语接龙 — 看上一个成语，选出能接龙的下一个成语（首字＝上一个成语的尾字）。
 * 答对继续接龙，答错扣一条命，共 3 条命。接得越长分越高。 */
Arcade.register({
  id: "idiomchain",
  name: "成语接龙",
  emoji: "🐉",
  tagline: "尾字接首字，一条龙接到底！",
  tags: ["Word", "Puzzle", "Solo"],
  category: "chinese",
  minPlayers: 1,
  maxPlayers: 1,
  leaderboard: { type: "score" }, // 一局接得最多，越高越靠前
  rules: [
    "屏幕给出一个成语，请接出下一个成语。",
    "规则：下一个成语的「首字」要和上一个成语的「尾字」相同。",
    "从四个选项里选出正确的接龙成语。",
    "答对继续；答错扣一条命，一共 3 条命。接得越长分越高！🐉",
  ],

  create(api) {
    // [上一个成语, 正确接龙成语] —— 接龙成语的首字 = 上一个成语的尾字
    const PAIRS = [
      ["一心一意", "意气风发"],
      ["五光十色", "色色俱全"],
      ["千军万马", "马到成功"],
      ["守株待兔", "兔死狐悲"],
      ["画蛇添足", "足智多谋"],
      ["名副其实", "实事求是"],
      ["朝三暮四", "四面八方"],
      ["九牛一毛", "毛遂自荐"],
      ["万众一心", "心想事成"],
      ["龙飞凤舞", "舞文弄墨"],
      ["称心如意", "意气用事"],
      ["三头六臂", "臂力过人"],
      ["开门见山", "山清水秀"],
      ["水到渠成", "成千上万"],
      ["十全十美", "美中不足"],
      ["井井有条", "条分缕析"],
    ];
    // 干扰项成语池（用于凑选项）
    const POOL = PAIRS.map((p) => p[1]).concat([
      "对牛弹琴", "高谈阔论", "鸡飞狗跳", "风和日丽", "异想天开", "天衣无缝",
      "古色古香", "津津有味", "九死一生", "胸有成竹", "目瞪口呆", "守口如瓶",
    ]);

    let order = [], qi = 0, score = 0, lives = 3, over = false, locked = false;

    const wrap = api.el("div", "");
    wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:14px;width:100%;max-width:460px;margin:0 auto";
    const label = api.el("div", "", "上一个成语");
    label.style.cssText = "font-weight:700;color:var(--ink-soft)";
    const q = api.el("div", "");
    q.style.cssText = "font-size:30px;font-weight:800;letter-spacing:4px;color:#173a2b;text-align:center;" +
      "background:var(--mint-50);border:1.5px solid var(--mint-100);border-radius:12px;padding:14px 16px;width:100%";
    const tip = api.el("div", "");
    tip.style.cssText = "font-size:15px;color:var(--ink-soft)";
    const opts = api.el("div", "");
    opts.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%";
    wrap.appendChild(label); wrap.appendChild(q); wrap.appendChild(tip); wrap.appendChild(opts);
    api.board.appendChild(wrap);

    function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
    function load() {
      locked = false;
      if (qi >= order.length) { order = shuffle(order); qi = 0; } // 循环出题
      const item = PAIRS[order[qi]];
      const head = item[0], answer = item[1];
      const linkChar = head.charAt(head.length - 1);
      q.textContent = head;
      tip.innerHTML = "请接出首字为「<b style='color:#e67e22'>" + linkChar + "</b>」的成语";
      const wrongs = shuffle(POOL.filter((c) => c !== answer && c.charAt(0) !== linkChar)).slice(0, 3);
      const choices = shuffle([answer].concat(wrongs));
      opts.innerHTML = "";
      choices.forEach((c) => {
        const b = api.el("button", "btn ghost", c);
        b.style.cssText += ";font-size:20px;font-weight:800;letter-spacing:2px;padding:12px 0;min-width:0";
        b.addEventListener("click", () => respond(c === answer, b, answer));
        opts.appendChild(b);
      });
      sb();
    }
    function respond(correct, b, right) {
      if (over || locked) return;
      locked = true;
      if (correct) {
        score++; b.style.background = "#aee3c8"; api.toast("🐉 接得好！");
        qi++; setTimeout(load, 350);
      } else {
        lives--; b.style.background = "#f3a79f"; b.style.color = "#fff";
        api.toast("❌ 应接：" + right);
        sb();
        if (lives <= 0) { return setTimeout(end, 800); }
        qi++; setTimeout(load, 1100);
      }
    }
    function sb() {
      api.setScores([
        { name: "接龙", value: String(score), color: "#2e9d6c" },
        { name: "生命", value: lives > 0 ? "❤️".repeat(lives) : "💀", color: "#e74c3c" },
      ]);
    }
    function end() {
      over = true; sb();
      if (api.submitScore) api.submitScore(score);
      if (api.celebrate && score >= 8) api.celebrate("🎉 接了 " + score + " 条龙！");
      api.setStatus("游戏结束！你接了 " + score + " 个成语，" + api.config.username + "。按 Restart 再来一条龙。");
    }

    order = shuffle(PAIRS.map((_, i) => i));
    load();
    api.setStatus("尾字接首字，看看你能接多长 🐉");
    return { stop() { over = true; } };
  },
});
