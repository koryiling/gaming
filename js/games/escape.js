/* Escape Room — search the room for clues, crack each door's code, escape fastest.
 * Number tips collect in the notebook on the LEFT; search objects + keypad on the RIGHT.
 * Pick 5 / 10 / 20 rooms — each length is ranked separately (fastest total time wins). */
Arcade.register({
  id: "escape",
  name: "Escape Room",
  emoji: "🚪",
  tagline: "Search for hidden clues, crack the lock code, and escape every room against the clock.",
  tags: ["Puzzle", "Detective", "Solo"],
  minPlayers: 1,
  maxPlayers: 1,
  leaderboard: {
    type: "time", // fastest total escape time ranks highest (lower is better)
    categories: [ // a separate ranking per length, shown 20 → 10 → 5
      { key: "20", label: "🔴 20 questions" },
      { key: "10", label: "🟠 10 questions" },
      { key: "5", label: "🟢 5 questions" },
    ],
  },
  rules: [
    "Tap objects in the room to search them — some hide a lock-code digit.",
    "Your notebook on the left lists every digit you've found, in lock order.",
    "Type the full code on the keypad and press 🔓 to crack the lock.",
    "Choose 5, 10 or 20 rooms — each length has its own ranking. Escape fastest to top it! 🏆",
  ],
  options: [
    { key: "count", label: "Questions", type: "select", default: 10,
      choices: [{ label: "5 questions", value: 5 }, { label: "10 questions", value: 10 }, { label: "20 questions", value: 20 }] },
  ],

  create(api) {
    const OBJS = [
      { e: "🖼️", n: "painting" }, { e: "🗄️", n: "drawer" }, { e: "📚", n: "bookshelf" },
      { e: "🕰️", n: "clock" }, { e: "🪴", n: "plant pot" }, { e: "🗑️", n: "waste bin" },
      { e: "🧯", n: "extinguisher" }, { e: "🪟", n: "window sill" }, { e: "🛋️", n: "sofa" }, { e: "🗝️", n: "key box" },
    ];
    const HERRING = [
      "nothing useful inside, just dust.",
      "empty — but a nice hiding spot.",
      "some loose change. Not a clue.",
      "cobwebs and an old receipt. Useless.",
      "locked tight — and empty anyway.",
    ];
    const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };

    const totalRooms = api.config.options.count;
    const CAT = String(totalRooms); // leaderboard category — one ranking per length
    let roomIdx = 0, elapsed = 0, over = false;
    let room, found, entry;

    function makeRoom(idx) {
      const codeLen = 3 + (idx >= 2 ? 1 : 0);     // later rooms need a longer code
      const nHerr = 2;
      const code = Array.from({ length: codeLen }, () => (Math.random() * 10) | 0);
      const pool = shuffle(OBJS.slice());
      const items = [];
      for (let i = 0; i < codeLen; i++) items.push({ obj: pool[i], digit: code[i], pos: i });
      for (let j = 0; j < nHerr; j++) items.push({ obj: pool[codeLen + j], digit: null, herr: HERRING[j % HERRING.length] });
      return { code: code.join(""), codeLen, items: shuffle(items) };
    }

    /* ---- layout (responsive: tips on the LEFT, search + keypad on the RIGHT; wraps on phones) ---- */
    const root = api.el("div", "");
    root.style.cssText = "width:min(520px,calc(100vw - 28px));display:flex;flex-direction:column;gap:12px;color:var(--ink)";

    // header (room + timer)
    const head = api.el("div", "");
    head.style.cssText = "display:flex;justify-content:space-between;align-items:center;gap:8px;font-weight:800;color:var(--mint-700)";
    const roomLbl = api.el("div", "");
    roomLbl.style.fontSize = "16px";
    const timeLbl = api.el("div", "");
    timeLbl.style.cssText = "font-size:16px;font-variant-numeric:tabular-nums";
    head.appendChild(roomLbl); head.appendChild(timeLbl);

    // body: two columns that wrap on narrow screens
    const body = api.el("div", "");
    body.style.cssText = "display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start";

    // LEFT column — notebook (number tips)
    const left = api.el("div", "");
    left.style.cssText = "flex:1 1 150px;min-width:140px";
    const note = api.el("div", "");
    note.style.cssText = "background:var(--mint-50);border:2px solid var(--mint-200);border-radius:14px;padding:11px 13px;min-height:54px";
    const noteHead = api.el("div", "", "📓 Notebook");
    noteHead.style.cssText = "font-weight:800;color:var(--mint-700);font-size:14px;margin-bottom:6px";
    const noteList = api.el("div", "");
    noteList.style.cssText = "display:flex;flex-direction:column;gap:4px;font-size:14px;font-weight:600";
    note.appendChild(noteHead); note.appendChild(noteList);
    left.appendChild(note);

    // RIGHT column — objects to search, code display, keypad
    const right = api.el("div", "");
    right.style.cssText = "flex:2 1 250px;min-width:228px;display:flex;flex-direction:column;gap:11px";

    const objGrid = api.el("div", "");
    objGrid.style.cssText = "display:grid;grid-template-columns:repeat(5,1fr);gap:8px";

    const display = api.el("div", "");
    display.style.cssText =
      "text-align:center;font-size:30px;font-weight:900;letter-spacing:10px;color:var(--mint-700);" +
      "background:#fff;border:2px solid var(--mint-300);border-radius:14px;padding:12px;min-height:30px;transition:transform .08s";

    const pad = api.el("div", "");
    pad.style.cssText = "display:grid;grid-template-columns:repeat(3,1fr);gap:9px";

    right.appendChild(objGrid);
    right.appendChild(display);
    right.appendChild(pad);

    body.appendChild(left);
    body.appendChild(right);
    root.appendChild(head);
    root.appendChild(body);
    api.board.appendChild(root);

    const padBtns = [];
    function mkKey(label, fn, cls) {
      const b = api.el("button", "btn " + (cls || "ghost"), label);
      b.style.cssText = "font-size:21px;padding:15px 0;border-radius:14px";
      b.addEventListener("click", fn);
      pad.appendChild(b);
      padBtns.push(b);
      return b;
    }

    function digit(d) { if (over) return; if (entry.length < room.codeLen) { entry += d; renderDisplay(); } }
    function back() { if (over) return; entry = entry.slice(0, -1); renderDisplay(); }
    function renderDisplay() {
      display.textContent = entry.padEnd(room.codeLen, "•");
    }
    function shake() {
      display.style.transform = "translateX(-6px)";
      setTimeout(() => (display.style.transform = "translateX(6px)"), 70);
      setTimeout(() => (display.style.transform = ""), 140);
    }
    function submit() {
      if (over) return;
      if (entry.length < room.codeLen) { api.setStatus("Enter all " + room.codeLen + " digits."); shake(); return; }
      if (entry === room.code) {
        if (roomIdx + 1 >= totalRooms) return win();
        api.setStatus("🔓 Door opened! On to room " + (roomIdx + 2) + "…");
        roomIdx++;
        startRoom();
      } else {
        api.setStatus("❌ Wrong code — check your notebook and try again.");
        shake();
        entry = ""; renderDisplay();
      }
    }

    function buildPad() {
      pad.innerHTML = ""; padBtns.length = 0;
      [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach((d) => mkKey(String(d), () => digit(String(d))));
      mkKey("⌫", back);
      mkKey("0", () => digit("0"));
      mkKey("🔓", submit, "primary");
    }

    function renderObjects() {
      objGrid.innerHTML = "";
      room.items.forEach((it) => {
        const b = api.el("button", "");
        b.type = "button";
        b.textContent = it.obj.e;
        b.style.cssText =
          "font-size:30px;padding:12px 0;background:#fff;border:2px solid var(--mint-200);border-radius:14px;" +
          "cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;transition:transform .07s,border-color .15s,opacity .15s";
        b.addEventListener("click", () => searchObj(it, b));
        objGrid.appendChild(b);
      });
    }

    function searchObj(it, btn) {
      if (over) return;
      btn.style.transform = "scale(.9)";
      setTimeout(() => (btn.style.transform = ""), 120);
      if (it.searched) { api.setStatus("You already searched the " + it.obj.n + "."); return; }
      it.searched = true;
      btn.style.opacity = ".5";
      btn.style.borderColor = "var(--mint-400)";
      if (it.digit != null) {
        found.push({ pos: it.pos, digit: it.digit, where: it.obj.n });
        renderNote();
        api.setStatus("🔎 The " + it.obj.n + " hides lock digit #" + (it.pos + 1) + " = " + it.digit + "!");
      } else {
        api.setStatus("🔎 The " + it.obj.n + " — " + it.herr);
      }
    }

    function renderNote() {
      noteList.innerHTML = "";
      if (!found.length) {
        const p = api.el("div", "", "Search the objects to uncover the code…");
        p.style.cssText = "color:#5c8a73;font-weight:600"; noteList.appendChild(p);
        return;
      }
      found.slice().sort((a, b) => a.pos - b.pos).forEach((f) => {
        const row = api.el("div", "", "🔑 Digit #" + (f.pos + 1) + " = " + f.digit + "  (in the " + f.where + ")");
        noteList.appendChild(row);
      });
      if (found.length < room.codeLen) {
        const more = api.el("div", "", "…" + (room.codeLen - found.length) + " digit(s) still hidden.");
        more.style.cssText = "color:#5c8a73;font-weight:600"; noteList.appendChild(more);
      }
    }

    function fmtTime(s) { const m = (s / 60) | 0, ss = s % 60; return m + ":" + (ss < 10 ? "0" : "") + ss; }

    function startRoom() {
      room = makeRoom(roomIdx);
      found = []; entry = "";
      roomLbl.textContent = "🚪 Room " + (roomIdx + 1) + " / " + totalRooms;
      renderObjects(); renderNote(); renderDisplay();
    }

    function win() {
      over = true;
      clearInterval(timer);
      padBtns.forEach((b) => (b.disabled = true));
      if (api.submitScore) api.submitScore(elapsed, { cat: CAT }); // fewer seconds ranks higher, within this length
      if (api.celebrate) api.celebrate("🔓 Escaped in " + fmtTime(elapsed) + "!");
      api.setStatus("🎉 You escaped all " + totalRooms + " rooms in " + fmtTime(elapsed) + "! Faster times rank higher 🏆.");
    }

    const timer = setInterval(() => { if (over) return; elapsed++; timeLbl.textContent = "⏱ " + fmtTime(elapsed); }, 1000);

    buildPad();
    startRoom();
    timeLbl.textContent = "⏱ 0:00";
    api.setStatus("🔍 Tap the objects to search for the lock code, then key it in!");

    return { stop() { over = true; clearInterval(timer); } };
  },
});
