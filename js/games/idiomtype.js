/* Type the Chinese Idiom (打字猜成语) — single player.
 * An emoji clue + its meaning hint at a 4-character chéngyǔ; TYPE the idiom using your
 * device's Chinese keyboard. 3 difficulties set how many idioms you clear: Easy 8,
 * Medium 12, Hard 15. Time-based leaderboard per difficulty (like Sudoku); each 💡 hint
 * reveals one character and adds +10 seconds. */
Arcade.register({
  id: "idiomtype",
  name: "打字猜成语",
  emoji: "⌨️",
  tagline: "看表情符号线索，打字写出中文成语。",
  tags: ["Word", "Puzzle", "Solo"],
  category: "chinese",
  minPlayers: 1,
  maxPlayers: 1,
  leaderboard: {
    type: "time", // fastest full clear first; each difficulty ranked separately (like Sudoku)
    categories: [
      { key: "Hard", label: "🔴 Hard" },
      { key: "Medium", label: "🟠 Medium" },
      { key: "Easy", label: "🟢 Easy" },
    ],
  },
  rules: [
    "表情符号线索和释义会提示一个四字成语（chéngyǔ）。",
    "用中文输入法打出成语，按 Enter（或点「检查」）。",
    "💡 提示会揭示下一个字，但每次提示 +10 秒。",
    "选择难度：简单（8 题）、中等（12 题）或困难（15 题）。",
    "计时进行——越快越好，每个难度分别排名！🏆",
  ],
  options: [
    { key: "count", label: "难度", type: "select", default: 8,
      choices: [{ label: "简单（8 题）", value: 8 }, { label: "中等（12 题）", value: 12 }, { label: "困难（15 题）", value: 15 }] },
  ],

  create(api) {
    const COUNT = { 8: 8, 12: 12, 15: 15 }[api.config.options.count] || 8;
    const CAT = { 8: "Easy", 12: "Medium", 15: "Hard" }[COUNT] || "Easy";
    const HINT_PENALTY = 10; // seconds added per hint, like Sudoku

    // idiom, emoji clue, Chinese meaning
    const DATA = [
      { idiom: "画蛇添足", emoji: "🐍➕🦶", cn: "多此一举，反而把事情弄糟。" },
      { idiom: "一石二鸟", emoji: "🪨🐦🐦", cn: "做一件事同时得到两种好处。" },
      { idiom: "守株待兔", emoji: "🌳⏳🐰", cn: "不主动努力，妄想坐等收获。" },
      { idiom: "亡羊补牢", emoji: "🐑🚪🔧", cn: "出了问题及时补救还不算晚。" },
      { idiom: "井底之蛙", emoji: "🕳️🐸", cn: "比喻见识短浅的人。" },
      { idiom: "对牛弹琴", emoji: "🐂🎵🎹", cn: "对不懂的人讲道理，白费力气。" },
      { idiom: "杯弓蛇影", emoji: "🍷🏹🐍", cn: "因疑神疑鬼而自相惊扰。" },
      { idiom: "狐假虎威", emoji: "🦊🎭🐯", cn: "倚仗别人的势力欺压人。" },
      { idiom: "掩耳盗铃", emoji: "🙉🔔🦹", cn: "自欺欺人，掩盖不了事实。" },
      { idiom: "刻舟求剑", emoji: "🚣✂️🗡️", cn: "拘泥成法，不知变通。" },
      { idiom: "揠苗助长", emoji: "🌱⬆️🙌", cn: "违背规律急于求成反坏事。" },
      { idiom: "盲人摸象", emoji: "🦯👨🐘", cn: "只凭片面就妄下结论。" },
      { idiom: "画龙点睛", emoji: "🐉🖌️👁️", cn: "在关键处点明使之传神。" },
      { idiom: "胸有成竹", emoji: "🫀🎋✅", cn: "做事之前已有完整把握。" },
      { idiom: "滥竽充数", emoji: "🎶🙅🔢", cn: "无本事的人混在行家里凑数。" },
      { idiom: "叶公好龙", emoji: "🧑🐉😱", cn: "表面爱好，实际并不真喜欢。" },
      { idiom: "愚公移山", emoji: "👴⛰️🪏", cn: "有恒心毅力终能成功。" },
      { idiom: "卧薪尝胆", emoji: "🛏️🌿👅", cn: "刻苦自励，发愤图强。" },
      { idiom: "负荆请罪", emoji: "🎒🌿🙇", cn: "主动向人认错赔罪。" },
      { idiom: "纸上谈兵", emoji: "📃🗣️⚔️", cn: "空谈理论，不能解决实际问题。" },
      { idiom: "破釜沉舟", emoji: "🍳💥⛵", cn: "下定决心，不留退路。" },
      { idiom: "指鹿为马", emoji: "👉🦌🐴", cn: "故意颠倒黑白，混淆是非。" },
      { idiom: "望梅止渴", emoji: "🍑👀🥤", cn: "用空想来安慰自己。" },
      { idiom: "一箭双雕", emoji: "🏹🦅🦅", cn: "一举两得，一次得到两种好处。" },
      { idiom: "九牛一毛", emoji: "🐂9️⃣🧶", cn: "极大数量中微不足道的一点。" },
      { idiom: "一目了然", emoji: "👁️💡✅", cn: "一看就完全明白。" },
      { idiom: "一帆风顺", emoji: "⛵💨😄", cn: "事情进行得非常顺利。" },
      { idiom: "一见钟情", emoji: "👀❤️💘", cn: "初次见面就产生爱情。" },
      { idiom: "一鸣惊人", emoji: "🐓📢😲", cn: "平时无声，一下子做出惊人成绩。" },
      { idiom: "一丝不苟", emoji: "🧵🔍✅", cn: "做事认真，丝毫不马虎。" },
      { idiom: "一心一意", emoji: "❤️🎯🧠", cn: "专心专意，没有别的念头。" },
      { idiom: "三心二意", emoji: "3️⃣❤️😕", cn: "犹豫不定，不专心。" },
      { idiom: "七上八下", emoji: "7️⃣⬆️8️⃣⬇️", cn: "形容心神不定，慌乱不安。" },
      { idiom: "千钧一发", emoji: "⚖️🧶⚠️", cn: "情况极其危急。" },
      { idiom: "对症下药", emoji: "🩺🎯💊", cn: "针对问题采取有效办法。" },
      { idiom: "半途而废", emoji: "🛤️🚶🛑", cn: "事情没做完就中途停止。" },
      { idiom: "锦上添花", emoji: "🧵➕🌸", cn: "在美好的基础上再添美好。" },
      { idiom: "雪中送炭", emoji: "❄️🎁🔥", cn: "在别人困难时给予帮助。" },
      { idiom: "废寝忘食", emoji: "🛌🚫🍚", cn: "专心努力到顾不上吃睡。" },
      { idiom: "争分夺秒", emoji: "⏱️🏃💨", cn: "抓紧每一点时间。" },
      { idiom: "全力以赴", emoji: "💪🏃🔥", cn: "用尽全部力量去做。" },
      { idiom: "持之以恒", emoji: "🤲⏳♾️", cn: "长久坚持，不间断。" },
      { idiom: "滴水穿石", emoji: "💧⏳🪨", cn: "坚持不懈终能成功。" },
      { idiom: "熟能生巧", emoji: "🔁🛠️✨", cn: "熟练了就能找到窍门。" },
      { idiom: "温故知新", emoji: "📖🔁💡", cn: "复习旧知识获得新理解。" },
      { idiom: "鹤立鸡群", emoji: "🦢🐔🐔", cn: "一个人的才能仪表超群。" },
      { idiom: "独一无二", emoji: "1️⃣🚫2️⃣", cn: "没有第二个，独特无比。" },
      { idiom: "实事求是", emoji: "📋🔍✅", cn: "按照实际情况办事。" },
    ];

    // pick COUNT distinct idioms at random
    const pool = DATA.slice();
    for (let i = pool.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const quiz = pool.slice(0, Math.min(COUNT, pool.length));
    const TOTAL = quiz.length;

    let idx = 0, solved = 0, hints = 0, revealed = 0, over = false, cur = null;
    let t0 = performance.now(), tick = null, finalElapsed = 0;
    function elapsedSec() { return Math.max(0, Math.round((performance.now() - t0) / 1000)); }
    function fmt(sec) { const m = Math.floor(sec / 60), s = sec % 60; return m + ":" + (s < 10 ? "0" : "") + s; }

    // ---- layout ----
    const wrap = api.el("div", "");
    wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:14px;max-width:460px;margin:0 auto;width:100%";
    const prog = api.el("div", "");
    prog.style.cssText = "font-weight:700;color:var(--ink-soft)";
    const emojiEl = api.el("div", "");
    emojiEl.style.cssText = "font-size:52px;line-height:1.25;text-align:center";
    const meaningEl = api.el("div", "");
    meaningEl.style.cssText = "font-size:16px;color:var(--ink);text-align:center;background:var(--mint-50);border:1.5px solid var(--mint-100);border-radius:12px;padding:10px 14px";
    const boxes = api.el("div", "");
    boxes.style.cssText = "display:flex;gap:8px;justify-content:center";
    const input = document.createElement("input");
    input.type = "text"; input.placeholder = "输入成语… (type the idiom)";
    input.autocomplete = "off"; input.autocapitalize = "off"; input.spellcheck = false;
    input.style.cssText = "width:100%;max-width:300px;padding:12px 14px;border-radius:12px;border:2px solid var(--mint-200);font-size:20px;text-align:center;font-family:inherit;outline:none";
    input.addEventListener("focus", () => (input.style.borderColor = "var(--mint-500)"));
    input.addEventListener("blur", () => (input.style.borderColor = "var(--mint-200)"));
    const btnRow = api.el("div", "");
    btnRow.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;justify-content:center";
    const checkBtn = api.el("button", "btn primary", "✅ 检查 Check");
    const hintBtn = api.el("button", "btn ghost", "💡 提示 Hint (+" + HINT_PENALTY + "s)");
    btnRow.appendChild(checkBtn); btnRow.appendChild(hintBtn);
    wrap.appendChild(prog); wrap.appendChild(emojiEl); wrap.appendChild(meaningEl);
    wrap.appendChild(boxes); wrap.appendChild(input); wrap.appendChild(btnRow);
    api.board.appendChild(wrap);

    function renderBoxes() {
      boxes.innerHTML = "";
      const w = cur.idiom;
      for (let i = 0; i < w.length; i++) {
        const b = api.el("div", "", i < revealed ? w[i] : "");
        b.style.cssText = "width:46px;height:46px;display:grid;place-items:center;border:2px solid var(--mint-300);" +
          "border-radius:10px;font-size:26px;font-weight:800;color:#173a2b;background:#fff";
        boxes.appendChild(b);
      }
    }
    function load() {
      cur = quiz[idx]; revealed = 0;
      emojiEl.textContent = cur.emoji;
      meaningEl.textContent = "意思：" + cur.cn;
      input.value = "";
      hintBtn.disabled = false;
      prog.textContent = "成语 " + (idx + 1) + " / " + TOTAL + "（" + CAT + "）";
      renderBoxes();
      input.focus();
    }
    function score() {
      const elapsed = over ? finalElapsed : elapsedSec();
      api.setScores([
        { name: "Time", value: fmt(elapsed + hints * HINT_PENALTY), color: "#2e9d6c" },
        { name: "Solved", value: solved + "/" + TOTAL, color: "#e67e22" },
        { name: "Difficulty", value: CAT, color: "#3498db" },
        { name: "Hints", value: String(hints) + (hints ? " (+" + hints * HINT_PENALTY + "s)" : ""), color: "#9b59b6" },
      ]);
    }
    function check() {
      if (over) return;
      const val = (input.value || "").trim();
      if (!val) return;
      if (val === cur.idiom) {
        solved++; idx++;
        api.toast("✅ " + cur.idiom);
        if (idx >= TOTAL) {
          over = true; finalElapsed = elapsedSec();
          if (tick) { clearInterval(tick); tick = null; }
          const total = finalElapsed + hints * HINT_PENALTY;
          if (api.submitScore) api.submitScore(total, { cat: CAT }); // time-metric, ranked within its difficulty
          score();
          if (api.celebrate) api.celebrate("🎉 全部答对！用时 " + fmt(total));
          api.setStatus("🎉 你答对了全部 " + TOTAL + " 个成语，用时 " + fmt(total) + "（含提示罚时），" + api.config.username + "！Restart 再来一局。");
          input.disabled = true; checkBtn.disabled = true; hintBtn.disabled = true;
          return;
        }
        load(); score();
      } else {
        api.toast("❌ 再试一次 Try again");
        input.select();
      }
    }
    function hint() {
      if (over) return;
      if (revealed >= cur.idiom.length - 1) { api.toast("没有更多提示了 No more hints"); return; }
      revealed++; hints++;
      renderBoxes();
      if (revealed >= cur.idiom.length - 1) hintBtn.disabled = true;
      api.toast("💡 +" + HINT_PENALTY + "s");
      score(); input.focus();
    }

    checkBtn.addEventListener("click", check);
    hintBtn.addEventListener("click", hint);
    function onKey(e) { if (e.key === "Enter" && !e.isComposing) { check(); e.preventDefault(); } }
    input.addEventListener("keydown", onKey);

    load();
    t0 = performance.now();
    tick = setInterval(() => { if (!over) score(); }, 1000);
    score();
    api.setStatus("看 emoji 和意思，输入四字成语并按 Enter。💡 提示每次 +" + HINT_PENALTY + "s ⌨️");
    return { stop() { if (tick) { clearInterval(tick); tick = null; } } };
  },
});
