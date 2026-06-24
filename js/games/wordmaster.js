/* Word Master — Wordle-style word guessing, single player */
Arcade.register({
  id: "wordmaster",
  name: "Word Master",
  emoji: "🔤",
  tagline: "Guess the hidden word in ten tries. Green = right spot, yellow = wrong spot.",
  tags: ["Word", "Puzzle", "Solo"],
  minPlayers: 1,
  maxPlayers: 1,
  rules: [
    "Guess the secret word. Type a word and press Enter.",
    "🟨 Yellow = correct letter in the correct spot.",
    "🟩 Green = letter is in the word, but a different spot.",
    "⬜ Grey = letter is not in the word. Crack it within 10 guesses!",
    "Past guesses and their results are listed in the History panel on the right.",
  ],
  options: [
    { key: "len", label: "Word length", type: "select", default: 5,
      choices: [{ label: "4 letters", value: 4 }, { label: "5 letters", value: 5 }, { label: "6 letters", value: 6 }] },
  ],

  create(api) {
    const WORDS = {
      4: ["mint","leaf","game","play","star","moon","fish","bird","tree","frog","lime","jade","cool","wave","glow","seed","vine","kiwi","sage","fern","bean","reef","palm","dawn","echo","gift","hero","jump","luck","nest"],
      5: ["mints","green","plant","apple","beach","cloud","dance","eagle","flute","grape","happy","ivory","jelly","koala","lemon","mango","ninja","olive","piano","quilt","river","sunny","tiger","umbra","vivid","whale","xenon","yacht","zebra","bloom","charm","dream","earth","fairy","glide","honey","lucky","melon","ocean","pearl"],
      6: ["garden","planet","bamboo","cherry","dragon","forest","guitar","hunter","island","jungle","kitten","ladder","meadow","nature","orange","parrot","quartz","rocket","silver","turtle","violet","wonder","yellow","breeze","castle","flower","golden","icicle","sunset","basket","candle","frozen","gather","hidden","indigo","kettle","lizard","mellow","napkin","pepper"],
    };
    const LEN = api.config.options.len;
    const ROWS = 10;
    // 🟨 yellow = right letter & right spot · 🟩 green = right letter, wrong spot · grey = absent
    const COL = { correct: "#f1c40f", present: "#43b884", absent: "#9aa6a0" };
    const FG = { correct: "#173a2b", present: "#fff", absent: "#fff" };
    const pool = WORDS[LEN].filter((w) => w.length === LEN);
    const answer = pool[(Math.random() * pool.length) | 0].toUpperCase();
    let row = 0, col = 0, over = false;
    const grid = [];

    // outer: play column (board + keyboard) on the left, history panel on the right
    const outer = api.el("div", "");
    outer.style.cssText = "display:flex;gap:18px;align-items:flex-start;justify-content:center;flex-wrap:wrap";
    const wrap = api.el("div", "");
    wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:14px";
    // 10 guesses laid out in two columns of 5 (left = tries 1–5, right = 6–10)
    const HALF = Math.ceil(ROWS / 2);
    const boardEl = api.el("div", "");
    boardEl.style.cssText = "display:flex;gap:16px;align-items:flex-start;justify-content:center";
    const cols = [api.el("div", ""), api.el("div", "")];
    cols.forEach((cw) => (cw.style.cssText = "display:grid;grid-template-rows:repeat(" + HALF + ",1fr);gap:6px"));
    const cellSize = Math.min(44, Math.floor((Math.min(360, window.innerWidth - 40)) / LEN) - 6);
    for (let r = 0; r < ROWS; r++) {
      const rowEl = api.el("div", "");
      rowEl.style.cssText = "display:grid;grid-template-columns:repeat(" + LEN + ",1fr);gap:6px";
      grid[r] = [];
      for (let c = 0; c < LEN; c++) {
        const cell = api.el("div", "");
        cell.style.cssText = "width:" + cellSize + "px;height:" + cellSize + "px;border:2px solid var(--mint-200);border-radius:8px;" +
          "display:grid;place-items:center;font-size:" + (cellSize * 0.5) + "px;font-weight:800;color:var(--ink);text-transform:uppercase";
        rowEl.appendChild(cell); grid[r][c] = cell;
      }
      cols[r < HALF ? 0 : 1].appendChild(rowEl);
    }
    boardEl.appendChild(cols[0]);
    boardEl.appendChild(cols[1]);
    wrap.appendChild(boardEl);

    // on-screen keyboard
    const KB = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
    const keyEls = {};
    const kbWrap = api.el("div", "");
    kbWrap.style.cssText = "display:flex;flex-direction:column;gap:6px;align-items:center";
    KB.forEach((rowStr, i) => {
      const kr = api.el("div", ""); kr.style.cssText = "display:flex;gap:5px";
      if (i === 2) { const ent = key("⏎", "ENTER"); kr.appendChild(ent); }
      rowStr.split("").forEach((ch) => kr.appendChild(key(ch, ch)));
      if (i === 2) { const del = key("⌫", "DEL"); kr.appendChild(del); }
      kbWrap.appendChild(kr);
    });
    wrap.appendChild(kbWrap);

    // ---- history panel (bordered) ----
    const hist = api.el("div", "");
    hist.style.cssText = "border:2px solid var(--mint-300);border-radius:14px;padding:14px 16px;background:#fff;" +
      "box-shadow:var(--shadow);min-width:190px;max-width:250px";
    const histTitle = api.el("div", "", "📜 History");
    histTitle.style.cssText = "font-weight:800;margin-bottom:12px;color:var(--ink);font-size:16px";
    const histList = api.el("div", "");
    histList.style.cssText = "display:flex;flex-direction:column;gap:9px";
    const histEmpty = api.el("div", "", "No guesses yet 🌱");
    histEmpty.style.cssText = "color:var(--ink-soft);font-style:italic;font-size:13px";
    histList.appendChild(histEmpty);
    hist.appendChild(histTitle);
    hist.appendChild(histList);

    outer.appendChild(hist);   // history on the left
    outer.appendChild(wrap);
    api.board.appendChild(outer);

    function addHistory(guess, res, n) {
      if (histEmpty.parentNode) histEmpty.remove();
      const item = api.el("div", "");
      item.style.cssText = "display:flex;align-items:center;gap:8px";
      const num = api.el("span", "", n + ".");
      num.style.cssText = "font-weight:700;color:var(--ink-soft);width:22px;flex:none";
      const word = api.el("span", "", guess);
      word.style.cssText = "font-weight:800;letter-spacing:1px;text-transform:uppercase";
      const squares = api.el("span", "");
      squares.style.cssText = "display:flex;gap:3px;margin-left:auto;flex:none";
      res.forEach((r) => {
        const sq = api.el("span", "");
        sq.style.cssText = "width:14px;height:14px;border-radius:3px;background:" + COL[r];
        squares.appendChild(sq);
      });
      item.appendChild(num);
      item.appendChild(word);
      item.appendChild(squares);
      histList.appendChild(item);
    }

    function key(label, code) {
      const b = api.el("button", "");
      const w = code.length > 1 ? 52 : 32;
      b.style.cssText = "min-width:" + w + "px;height:46px;border:none;border-radius:7px;background:var(--mint-200);color:var(--ink);" +
        "font-weight:700;font-size:15px;cursor:pointer";
      b.textContent = label;
      b.addEventListener("click", () => handle(code));
      if (code.length === 1) keyEls[code] = b;
      return b;
    }
    function board() { api.setScores([{ name: api.config.username, value: "row " + Math.min(row + 1, ROWS) + "/" + ROWS, color: "#2e9d6c" }]); }

    function handle(code) {
      if (over) return;
      if (code === "ENTER") return submit();
      if (code === "DEL") { if (col > 0) { col--; grid[row][col].textContent = ""; grid[row][col].style.borderColor = "var(--mint-200)"; } return; }
      if (col < LEN && /^[A-Z]$/.test(code)) { grid[row][col].textContent = code; grid[row][col].style.borderColor = "var(--mint-400)"; col++; }
    }
    function submit() {
      if (col < LEN) { api.toast("Not enough letters"); return; }
      const g = grid[row].map((c) => c.textContent).join("");
      // score
      const ans = answer.split(""), res = Array(LEN).fill("absent"), used = Array(LEN).fill(false);
      for (let i = 0; i < LEN; i++) if (g[i] === ans[i]) { res[i] = "correct"; used[i] = true; }
      for (let i = 0; i < LEN; i++) if (res[i] !== "correct") {
        const j = ans.findIndex((ch, k) => !used[k] && ch === g[i]);
        if (j >= 0) { res[i] = "present"; used[j] = true; }
      }
      grid[row].forEach((cell, i) => {
        cell.style.background = COL[res[i]]; cell.style.borderColor = COL[res[i]]; cell.style.color = FG[res[i]];
        const k = keyEls[g[i]];
        if (k) { const cur = k.dataset.state; const rank = { absent: 0, present: 1, correct: 2 };
          if (!cur || rank[res[i]] > rank[cur]) { k.dataset.state = res[i]; k.style.background = COL[res[i]]; k.style.color = FG[res[i]]; } }
      });
      addHistory(g, res, row + 1);
      if (g === answer) { over = true; api.setStatus("🎉 Got it — <b>" + answer + "</b>! Solved in " + (row + 1) + ". Restart for a new word."); board(); return; }
      row++; col = 0; board();
      if (row >= ROWS) { over = true; api.setStatus("💥 Out of guesses! The word was <b>" + answer + "</b>. Hit Restart."); }
      else api.setStatus("Keep going — " + (ROWS - row) + " guesses left.");
    }
    function onKey(e) {
      const k = e.key;
      if (k === "Enter") handle("ENTER");
      else if (k === "Backspace") handle("DEL");
      else if (/^[a-zA-Z]$/.test(k)) handle(k.toUpperCase());
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);

    board();
    api.setStatus("Type a " + LEN + "-letter word and press Enter ⌨️");
    return { stop() { window.removeEventListener("keydown", onKey); } };
  },
});
