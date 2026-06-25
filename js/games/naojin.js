/* 脑筋急转弯 — 读题，从四个选项里选出那个让人哭笑不得的答案。
 * 答对继续，答错扣一条命，共 3 条命。答对越多分越高。 */
Arcade.register({
  id: "naojin",
  name: "脑筋急转弯",
  emoji: "🤪",
  tagline: "正经地想，你就输了！",
  tags: ["Quiz", "Funny", "Solo"],
  category: "chinese",
  minPlayers: 1,
  maxPlayers: 1,
  leaderboard: { type: "score" }, // 一局答对最多，越高越靠前
  rules: [
    "每题是一个脑筋急转弯，答案往往出人意料、好笑。",
    "从四个选项里选出那个最「歪」的正确答案。",
    "答对继续；答错扣一条命，一共 3 条命。",
    "答对越多分越高——别太认真，越皮越对！🤪",
  ],

  create(api) {
    // [题目, 正确答案, 错误1, 错误2, 错误3]
    const DATA = [
      ["什么东西越洗越脏？", "水", "衣服", "碗", "手"],
      ["什么布剪不断？", "瀑布", "棉布", "麻布", "纱布"],
      ["什么人最怕太阳？", "雪人", "病人", "老人", "懒人"],
      ["哪个月有二十八天？", "每个月都有", "二月", "只有闰月", "二月和八月"],
      ["什么水永远用不完？", "薪水", "海水", "雨水", "自来水"],
      ["什么蛋打不烂、煮不熟、不能吃？", "脸蛋", "鸡蛋", "鸭蛋", "鹅蛋"],
      ["什么人一年只工作一天？", "圣诞老人", "农民", "演员", "老师"],
      ["麒麟到了北极会变成什么？", "冰淇淋", "北极熊", "化石", "雪人"],
      ["什么东西天气越热爬得越高？", "温度计", "蚂蚁", "藤蔓", "气球"],
      ["什么帽不能戴在头上？", "螺帽", "草帽", "礼帽", "棉帽"],
      ["什么东西越生气它越大？", "脾气", "气球", "肚子", "火苗"],
      ["一年四季都盛开的是什么花？", "塑料花", "玫瑰", "菊花", "梅花"],
      ["什么花一摸就受伤？", "火花", "玫瑰", "浪花", "棉花"],
      ["小明的爸爸有三个儿子，老大老二叫什么？", "大毛二毛", "明明亮亮", "小明小亮", "老三老四"],
      ["什么车寸步难行？", "风车", "汽车", "单车", "火车"],
      ["书店里买不到什么书？", "遗书", "课本", "漫画", "字典"],
      ["世界上谁的肚子最大？", "宰相（宰相肚里能撑船）", "孕妇", "胖子", "河马"],
      ["铁放在外面会生锈，金子呢？", "会被偷", "也生锈", "会变黑", "不变"],
    ];

    let order = [], qi = 0, score = 0, lives = 3, over = false, locked = false;

    const wrap = api.el("div", "");
    wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:14px;width:100%;max-width:480px;margin:0 auto";
    const label = api.el("div", "", "脑筋急转弯");
    label.style.cssText = "font-weight:700;color:var(--ink-soft)";
    const q = api.el("div", "");
    q.style.cssText = "font-size:22px;font-weight:800;color:#173a2b;text-align:center;line-height:1.4;" +
      "background:var(--mint-50);border:1.5px solid var(--mint-100);border-radius:12px;padding:16px;width:100%";
    const opts = api.el("div", "");
    opts.style.cssText = "display:flex;flex-direction:column;gap:10px;width:100%";
    wrap.appendChild(label); wrap.appendChild(q); wrap.appendChild(opts);
    api.board.appendChild(wrap);

    function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
    function load() {
      locked = false;
      if (qi >= order.length) { order = shuffle(order); qi = 0; } // 循环出题
      const item = DATA[order[qi]];
      const answer = item[1];
      q.textContent = item[0];
      const choices = shuffle(item.slice(1));
      opts.innerHTML = "";
      choices.forEach((c) => {
        const b = api.el("button", "btn ghost", c);
        b.style.cssText += ";font-size:18px;font-weight:700;padding:13px 14px;width:100%;white-space:normal";
        b.addEventListener("click", () => respond(c === answer, b, answer));
        opts.appendChild(b);
      });
      sb();
    }
    function respond(correct, b, right) {
      if (over || locked) return;
      locked = true;
      if (correct) {
        score++; b.style.background = "#aee3c8"; api.toast("🤪 答对啦！");
        qi++; setTimeout(load, 400);
      } else {
        lives--; b.style.background = "#f3a79f"; b.style.color = "#fff";
        api.toast("❌ 正解：" + right);
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
      if (api.celebrate && score >= 8) api.celebrate("🎉 你皮了 " + score + " 题！");
      api.setStatus("游戏结束！你答对了 " + score + " 题，" + api.config.username + "。按 Restart 再皮一局。");
    }

    order = shuffle(DATA.map((_, i) => i));
    load();
    api.setStatus("别太认真，越皮越对 🤪");
    return { stop() { over = true; } };
  },
});
