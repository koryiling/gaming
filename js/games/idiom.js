/* Guess the Chinese Idiom (看图猜成语) — single player.
 * An emoji clue hints at a 4-character chengyu; pick the right idiom from the
 * choices. 3 guesses per idiom; after a wrong guess a 💡 hint (pinyin + meaning)
 * unlocks. Multiple-choice input works with touch or mouse — no Chinese keyboard. */
Arcade.register({
  id: "idiom",
  name: "Chinese Idioms",
  emoji: "🀄",
  tagline: "Guess the Chinese idiom (chéngyǔ) from an emoji clue.",
  tags: ["Word", "Puzzle", "Solo"],
  minPlayers: 1,
  maxPlayers: 1,
  rules: [
    "An emoji clue hints at a 4-character Chinese idiom (chéngyǔ).",
    "Pick the matching idiom from the choices — you get 3 guesses.",
    "After a wrong guess, tap 💡 Hint to reveal its pinyin & meaning (once per idiom).",
    "Fewer guesses and no hint = more points.",
    "Clear all the rounds to finish with your best score!",
  ],
  options: [
    { key: "rounds", label: "Rounds", type: "select", default: 10,
      choices: [{ label: "5", value: 5 }, { label: "10", value: 10 }, { label: "15", value: 15 }] },
    { key: "choices", label: "Choices", type: "select", default: 4,
      choices: [{ label: "Easy (3)", value: 3 }, { label: "Normal (4)", value: 4 }, { label: "Hard (6)", value: 6 }] },
  ],

  create(api) {
    // idiom, pinyin, emoji clue, English meaning (en), Chinese meaning (cn)
    const DATA = [
      { idiom: "一石二鸟", pinyin: "yī shí èr niǎo", emoji: "🪨🐦🐦", en: "One stone, two birds — achieve two goals at once.", cn: "一个动作同时达到两个目的。" },
      { idiom: "画蛇添足", pinyin: "huà shé tiān zú", emoji: "🐍➕🦶", en: "Draw a snake and add feet — ruin it by overdoing it.", cn: "多此一举，反而把事情弄糟。" },
      { idiom: "对牛弹琴", pinyin: "duì niú tán qín", emoji: "🐮🎶🎸", en: "Play the lute to a cow — talk to the wrong audience.", cn: "对不懂的人讲道理，白费力气。" },
      { idiom: "守株待兔", pinyin: "shǒu zhū dài tù", emoji: "🌳🐰⏳", en: "Wait by a tree for a rabbit — hope for luck, not effort.", cn: "妄想不劳而获，坐等好运。" },
      { idiom: "亡羊补牢", pinyin: "wáng yáng bǔ láo", emoji: "🐑🚪🔧", en: "Mend the pen after the sheep are lost — better late than never.", cn: "出了问题后及时补救，为时未晚。" },
      { idiom: "井底之蛙", pinyin: "jǐng dǐ zhī wā", emoji: "🐸🕳️", en: "A frog at the bottom of a well — a narrow outlook.", cn: "比喻见识短浅的人。" },
      { idiom: "狐假虎威", pinyin: "hú jiǎ hǔ wēi", emoji: "🦊🐯", en: "The fox borrows the tiger's might — bully using others' power.", cn: "借别人的威势来欺压人。" },
      { idiom: "三心二意", pinyin: "sān xīn èr yì", emoji: "3️⃣❤️2️⃣", en: "Three hearts, two minds — half-hearted, indecisive.", cn: "犹豫不决，不专心。" },
      { idiom: "七上八下", pinyin: "qī shàng bā xià", emoji: "7️⃣⬆️8️⃣⬇️", en: "Seven up, eight down — anxious and unsettled.", cn: "形容心里慌乱不安。" },
      { idiom: "火上加油", pinyin: "huǒ shàng jiā yóu", emoji: "🔥➕🛢️", en: "Add oil to the fire — make a bad situation worse.", cn: "使矛盾或情绪更加激化。" },
      { idiom: "雪上加霜", pinyin: "xuě shàng jiā shuāng", emoji: "❄️➕🌨️", en: "Frost on top of snow — one misfortune after another.", cn: "比喻接连遭受灾难。" },
      { idiom: "鸡飞狗跳", pinyin: "jī fēi gǒu tiào", emoji: "🐔💨🐕", en: "Chickens fly, dogs leap — utter chaos.", cn: "形容乱成一团，秩序大乱。" },
      { idiom: "指鹿为马", pinyin: "zhǐ lù wéi mǎ", emoji: "🦌➡️🐴", en: "Call a deer a horse — deliberately distort the truth.", cn: "故意颠倒黑白，混淆是非。" },
      { idiom: "水滴石穿", pinyin: "shuǐ dī shí chuān", emoji: "💧🪨", en: "Dripping water bores through stone — perseverance wins.", cn: "坚持不懈，终能成功。" },
      { idiom: "开门见山", pinyin: "kāi mén jiàn shān", emoji: "🚪⛰️", en: "Open the door, see the mountain — get straight to the point.", cn: "说话写文章直截了当。" },
      { idiom: "笑里藏刀", pinyin: "xiào lǐ cáng dāo", emoji: "😊🔪", en: "A knife hidden in a smile — friendly outside, vicious within.", cn: "外表和善，内心狠毒。" },
      { idiom: "一帆风顺", pinyin: "yī fān fēng shùn", emoji: "⛵💨", en: "A sail with a fair wind — smooth sailing all the way.", cn: "比喻非常顺利，毫无阻碍。" },
      { idiom: "龙争虎斗", pinyin: "lóng zhēng hǔ dòu", emoji: "🐉⚔️🐯", en: "Dragon and tiger fight — a fierce, evenly-matched struggle.", cn: "形容双方实力相当，激烈争斗。" },
      { idiom: "爱屋及乌", pinyin: "ài wū jí wū", emoji: "❤️🏠🐦", en: "Love the house and its crows — love me, love my dog.", cn: "爱一个人，连带喜欢与他有关的一切。" },
    ];

    const opts = api.config.options;
    const TOTAL = Math.min(opts.rounds, DATA.length);
    const NCHOICES = opts.choices;
    const lang = (window.I18n && I18n.lang) || "en";
    const zh = lang === "zh";
    const meaningOf = (e) => (zh ? e.cn : e.en);

    function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }

    const list = shuffle(DATA).slice(0, TOTAL);
    let idx = 0, score = 0, solved = 0;
    let cur, attempts, hintUsed, done;

    // ---- layout ----
    const wrap = api.el("div", "");
    wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:14px;width:100%;max-width:520px;padding:6px";

    const clue = api.el("div", "");
    clue.style.cssText = "font-size:46px;line-height:1.25;text-align:center;min-height:58px;letter-spacing:4px";

    const boxes = api.el("div", "");
    boxes.style.cssText = "display:flex;gap:8px;justify-content:center";
    const boxEls = [];
    for (let i = 0; i < 4; i++) {
      const b = api.el("div", "");
      b.style.cssText = "width:52px;height:52px;border:2px solid var(--mint-300);border-radius:10px;display:grid;place-items:center;font-size:30px;font-weight:800;color:var(--ink);background:#fff";
      boxEls.push(b); boxes.appendChild(b);
    }

    const pinyin = api.el("div", "");
    pinyin.style.cssText = "font-size:15px;color:var(--ink-soft);min-height:20px;font-style:italic;text-align:center;max-width:480px";

    const optWrap = api.el("div", "");
    optWrap.style.cssText = "display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;width:100%;max-width:440px";

    const tools = api.el("div", "");
    tools.style.cssText = "display:flex;gap:10px;flex-wrap:wrap;justify-content:center";
    const hintBtn = api.el("button", "btn ghost", "💡 " + (zh ? "提示" : "Hint"));
    const nextBtn = api.el("button", "btn primary", (zh ? "下一题 ▶" : "Next ▶"));
    tools.appendChild(hintBtn); tools.appendChild(nextBtn);

    wrap.appendChild(clue);
    wrap.appendChild(boxes);
    wrap.appendChild(pinyin);
    wrap.appendChild(optWrap);
    wrap.appendChild(tools);
    api.board.appendChild(wrap);

    hintBtn.addEventListener("click", useHint);
    nextBtn.addEventListener("click", next);

    function setScore() {
      api.setScores([
        { name: api.config.username, value: score, color: "#2e9d6c" },
        { name: zh ? "回合" : "Round", value: Math.min(idx + 1, TOTAL) + "/" + TOTAL, color: "#3498db" },
        { name: zh ? "答对" : "Solved", value: solved, color: "#e67e22" },
      ]);
    }

    function reveal() {
      const chars = cur.idiom.split("");
      boxEls.forEach((b, i) => { b.textContent = chars[i] || ""; b.style.background = "var(--mint-100)"; });
      pinyin.textContent = cur.pinyin + " · " + meaningOf(cur);
    }

    function endRound() {
      done = true;
      [...optWrap.children].forEach((b) => (b.disabled = true));
      reveal();
      nextBtn.style.display = "";
      nextBtn.textContent = (idx + 1 >= TOTAL) ? (zh ? "完成 🎉" : "Finish 🎉") : (zh ? "下一题 ▶" : "Next ▶");
      hintBtn.disabled = true; hintBtn.style.opacity = "0.5";
    }

    function guess(ch, btn) {
      if (done) return;
      if (ch.idiom === cur.idiom) {
        btn.style.background = "#aee3c8"; btn.style.borderColor = "var(--mint-500)";
        let pts = 100 - (3 - attempts) * 30 - (hintUsed ? 40 : 0);
        if (pts < 10) pts = 10;
        score += pts; solved++;
        api.setStatus((zh ? "✅ 答对！+" : "✅ Correct! +") + pts + "  ·  " + cur.idiom + " (" + cur.pinyin + ")");
        endRound();
      } else {
        btn.style.background = "#f3a79f"; btn.style.borderColor = "#e74c3c"; btn.disabled = true;
        attempts--;
        hintBtn.disabled = false; hintBtn.style.opacity = "1";
        if (attempts <= 0) {
          api.setStatus((zh ? "❌ 机会用完！答案是 " : "❌ Out of tries! The answer was ") + cur.idiom + " (" + cur.pinyin + ")");
          endRound();
        } else {
          api.setStatus((zh ? "再试试！还剩 " + attempts + " 次。点 💡 看提示。" : "Try again! " + attempts + " tries left. Tap 💡 for a hint."));
        }
      }
      setScore();
    }

    function useHint() {
      if (done || hintUsed || hintBtn.disabled) return;
      hintUsed = true; hintBtn.disabled = true; hintBtn.style.opacity = "0.5";
      pinyin.textContent = cur.pinyin + " · " + meaningOf(cur);
      api.setStatus("💡 " + (zh ? "提示：" : "Hint: ") + meaningOf(cur));
    }

    function loadRound() {
      cur = list[idx]; attempts = 3; hintUsed = false; done = false;
      clue.textContent = cur.emoji;
      boxEls.forEach((b) => { b.textContent = "❓"; b.style.background = "#fff"; b.style.borderColor = "var(--mint-300)"; b.style.color = "var(--ink)"; });
      pinyin.textContent = "";
      const distract = shuffle(DATA.filter((d) => d.idiom !== cur.idiom)).slice(0, NCHOICES - 1);
      const choices = shuffle(distract.concat(cur));
      optWrap.innerHTML = "";
      choices.forEach((ch) => {
        const b = api.el("button", "btn ghost", ch.idiom);
        b.style.cssText += ";font-size:22px;font-weight:800;letter-spacing:3px;padding:14px 8px;min-height:54px";
        b.addEventListener("click", () => guess(ch, b));
        optWrap.appendChild(b);
      });
      hintBtn.disabled = true; hintBtn.style.opacity = "0.5";
      nextBtn.style.display = "none";
      api.setStatus(zh ? "看表情符号猜成语 — 你有 3 次机会 🀄" : "Guess the idiom from the emoji — you have 3 tries 🀄");
      setScore();
    }

    function next() {
      if (idx + 1 >= TOTAL) {
        [...optWrap.children].forEach((b) => (b.disabled = true));
        nextBtn.style.display = "none";
        api.setStatus((zh ? "🎉 全部完成！得分 " : "🎉 All done! Final score ") + "<b>" + score + "</b> — " +
          (zh ? "答对 " : "solved ") + solved + "/" + TOTAL + ". " + (zh ? "按重新开始再玩一次。" : "Hit Restart to play again."));
        setScore();
        return;
      }
      idx++; loadRound();
    }

    loadRound();
    return { stop() {} };
  },
});
