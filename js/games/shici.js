/* 诗词填空 — 名句缺一字，从选项中选出正确的那个字。
 * 答对继续，答错扣一条命，共 3 条命。答对越多分越高。 */
Arcade.register({
  id: "shici",
  name: "诗词填空",
  emoji: "📜",
  tagline: "千古名句缺一字，你能补上吗？",
  tags: ["Word", "Poetry", "Solo"],
  category: "chinese",
  minPlayers: 1,
  maxPlayers: 1,
  leaderboard: { type: "score" }, // 一局答对最多，越高越靠前
  rules: [
    "屏幕给出一句古诗词，其中缺了一个字（用 ◯ 表示）。",
    "从四个选项里选出正确的那个字。",
    "答对继续；答错扣一条命，一共 3 条命。",
    "答对越多分越高，考考你的诗词功底！📜",
  ],

  create(api) {
    // [上句, 下句模板(用 ◯ 占位), 正确字]
    const DATA = [
      ["床前明月光，", "疑是地上◯", "霜"],
      ["春眠不觉晓，", "处处闻啼◯", "鸟"],
      ["举头望明月，", "低头思故◯", "乡"],
      ["白日依山尽，", "黄河入海◯", "流"],
      ["欲穷千里目，", "更上一层◯", "楼"],
      ["千山鸟飞绝，", "万径人踪◯", "灭"],
      ["锄禾日当午，", "汗滴禾下◯", "土"],
      ["谁知盘中餐，", "粒粒皆辛◯", "苦"],
      ["红豆生南国，", "春来发几◯", "枝"],
      ["海内存知己，", "天涯若比◯", "邻"],
      ["飞流直下三千尺，", "疑是银河落九◯", "天"],
      ["两个黄鹂鸣翠柳，", "一行白鹭上青◯", "天"],
      ["停车坐爱枫林晚，", "霜叶红于二月◯", "花"],
      ["离离原上草，", "一岁一枯◯", "荣"],
      ["野火烧不尽，", "春风吹又◯", "生"],
      ["会当凌绝顶，", "一览众山◯", "小"],
      ["孤帆远影碧空尽，", "唯见长江天际◯", "流"],
      ["桃花潭水深千尺，", "不及汪伦送我◯", "情"],
    ];
    const ALL = DATA.map((d) => d[2]);

    let order = [], qi = 0, score = 0, lives = 3, over = false, locked = false;

    const wrap = api.el("div", "");
    wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:14px;width:100%;max-width:480px;margin:0 auto";
    const label = api.el("div", "", "补全名句");
    label.style.cssText = "font-weight:700;color:var(--ink-soft)";
    const q = api.el("div", "");
    q.style.cssText = "font-size:24px;font-weight:800;letter-spacing:2px;color:#173a2b;text-align:center;line-height:1.6;" +
      "background:var(--mint-50);border:1.5px solid var(--mint-100);border-radius:12px;padding:16px;width:100%";
    const opts = api.el("div", "");
    opts.style.cssText = "display:grid;grid-template-columns:repeat(4,1fr);gap:10px;width:100%;max-width:320px";
    wrap.appendChild(label); wrap.appendChild(q); wrap.appendChild(opts);
    api.board.appendChild(wrap);

    function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
    function load() {
      locked = false;
      if (qi >= order.length) { order = shuffle(order); qi = 0; } // 循环出题
      const item = DATA[order[qi]];
      const answer = item[2];
      const blanked = item[1].replace("◯", "<span style='color:#e67e22'>◯</span>");
      q.innerHTML = item[0] + "<br>" + blanked;
      const wrongs = shuffle(ALL.filter((c) => c !== answer)).slice(0, 3);
      const choices = shuffle([answer].concat(wrongs));
      opts.innerHTML = "";
      choices.forEach((c) => {
        const b = api.el("button", "btn ghost", c);
        b.style.cssText += ";font-size:26px;font-weight:800;padding:12px 0;min-width:0";
        b.addEventListener("click", () => respond(c === answer, b, answer, item));
        opts.appendChild(b);
      });
      sb();
    }
    function respond(correct, b, right, item) {
      if (over || locked) return;
      locked = true;
      if (correct) {
        score++; b.style.background = "#aee3c8";
        q.innerHTML = item[0] + "<br>" + item[1].replace("◯", "<span style='color:#2e9d6c'>" + right + "</span>");
        api.toast("📜 答对！");
        qi++; setTimeout(load, 450);
      } else {
        lives--; b.style.background = "#f3a79f"; b.style.color = "#fff";
        api.toast("❌ 应填：" + right);
        sb();
        if (lives <= 0) { return setTimeout(end, 900); }
        qi++; setTimeout(load, 1200);
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
      if (api.celebrate && score >= 8) api.celebrate("🎉 答对 " + score + " 句！");
      api.setStatus("游戏结束！你答对了 " + score + " 句，" + api.config.username + "。按 Restart 再来一局。");
    }

    order = shuffle(DATA.map((_, i) => i));
    load();
    api.setStatus("名句缺一字，选出正确的那个字 📜");
    return { stop() { over = true; } };
  },
});
