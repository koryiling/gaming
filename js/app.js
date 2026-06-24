/* ===== Mint Arcade core ===== */
(function () {
  "use strict";

  // Game registry — each game file calls Arcade.register(def)
  const GAMES = [];
  const PALETTE = ["#2e9d6c", "#e67e22", "#3498db", "#9b59b6", "#e74c3c", "#16a085"];

  const $ = (sel) => document.querySelector(sel);
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };

  /* ---------- i18n helpers (fall back to English game defs / keys) ---------- */
  const T = (key, vars) => (window.I18n ? I18n.t(key, vars) : key);
  const TAG = (label) => (window.I18n ? I18n.tag(label) : label);
  function gameText(def) {
    const tr = window.I18n && I18n.game(def.id);
    return {
      name: (tr && tr.name) || def.name,
      tagline: (tr && tr.tagline) || def.tagline,
      rules: (tr && tr.rules) || def.rules || [],
    };
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  const state = {
    username: "",
    current: null,        // active game def
    config: null,         // { players:[names], options:{}, username }
    instance: null,       // running game instance { stop() }
    activeFilter: "All",
  };

  /* ---------- storage ---------- */
  const store = {
    get: () => localStorage.getItem("mint_user") || "",
    set: (v) => localStorage.setItem("mint_user", v),
    clear: () => localStorage.removeItem("mint_user"),
  };

  /* ---------- leaderboard (timestamped event log per game) ---------- */
  const LB_KEY = "mint_leaderboard";
  const WINDOWS = { day: 864e5, week: 6048e5, month: 2592e6, all: Infinity };
  const board = {
    all() { try { return JSON.parse(localStorage.getItem(LB_KEY)) || {}; } catch (e) { return {}; } },
    save(d) { localStorage.setItem(LB_KEY, JSON.stringify(d)); },
    // append an event: { name, score } for score games, or { name, win:1 } for win games
    log(gameId, entry) {
      const d = this.all();
      const list = d[gameId] || (d[gameId] = []);
      entry.ts = Date.now();
      list.push(entry);
      if (list.length > 1000) d[gameId] = list.slice(-1000);
      this.save(d);
    },
    // top 10 within a time window; metric "wins" sums wins, otherwise max score per player
    top(gameId, win, metric) {
      const span = WINDOWS[win] || Infinity;
      const cutoff = span === Infinity ? 0 : Date.now() - span;
      const events = (this.all()[gameId] || []).filter((e) => (e.ts || 0) >= cutoff);
      const agg = {};
      events.forEach((e) => {
        if (metric === "wins") agg[e.name] = (agg[e.name] || 0) + (e.win || 0);
        else { const s = Number(e.score) || 0; if (!(e.name in agg) || s > agg[e.name]) agg[e.name] = s; }
      });
      return Object.keys(agg).map((name) => ({ name, score: agg[name] }))
        .filter((r) => (metric === "wins" ? r.score > 0 : true))
        .sort((a, b) => b.score - a.score).slice(0, 10);
    },
    clear(gameId) { const d = this.all(); delete d[gameId]; this.save(d); },
  };
  function gameMetric(gameId) {
    const g = GAMES.find((x) => x.id === gameId);
    return (g && g.leaderboard && g.leaderboard.type) || "score";
  }
  // best numeric score per real player during the current game session
  let sessionScores = {}, sessionGameId = null;
  let lbWindow = localStorage.getItem("mint_lb_window") || "all";
  let lbScope = localStorage.getItem("mint_lb_scope") || "local";

  /* ---------- global leaderboard (Cloudflare Worker) ---------- */
  const globalURL = () => ((window.MINT_CFG && window.MINT_CFG.leaderboardUrl) || "").replace(/\/$/, "");
  let globalReqId = 0;
  function fetchGlobalTop(gameId, win, metric) {
    const base = globalURL();
    if (!base) return Promise.reject(new Error("not-configured"));
    const u = base + "/scores?game=" + encodeURIComponent(gameId) + "&window=" + win + "&metric=" + metric;
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 7000);
    return fetch(u, { signal: ctrl.signal })
      .then((r) => { clearTimeout(to); if (!r.ok) throw new Error("http " + r.status); return r.json(); })
      .then((d) => d.top || []);
  }
  function postGlobal(gameId, entry) {
    const base = globalURL();
    if (!base || !gameId) return;
    fetch(base + "/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ game: gameId }, entry)),
    }).catch(() => {});
  }

  /* ---------- screen switching ---------- */
  function show(screen) {
    ["login-screen", "hub-screen", "game-screen"].forEach((id) => {
      $("#" + id).hidden = id !== screen;
    });
    $("#topbar").hidden = screen === "login-screen";
    window.scrollTo(0, 0);
  }

  function toast(msg, ms) {
    const t = $("#toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(t._t);
    t._t = setTimeout(() => (t.hidden = true), ms || 1800);
  }

  /* ---------- login ---------- */
  function setUser(name) {
    state.username = name;
    store.set(name);
    $("#user-name").textContent = name;
    $("#user-avatar").textContent = name.charAt(0).toUpperCase();
    updateGreeting();
  }

  function updateGreeting() {
    const h = $("#hub-greet-h");
    if (!h) return;
    const name = state.username || "friend";
    h.innerHTML = T("hubGreet").replace("{name}", '<span id="hub-greet-name">' + escapeHtml(name) + "</span>");
  }

  function initLogin() {
    const form = $("#login-form");
    const input = $("#username-input");
    const hint = $("#login-hint");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = input.value.trim();
      if (name.length < 2) {
        hint.textContent = T("nameMin");
        return;
      }
      hint.textContent = "";
      setUser(name);
      renderHub();
      show("hub-screen");
      toast(T("welcome", { name: name }));
    });

    $("#logout-btn").addEventListener("click", () => {
      store.clear();
      state.username = "";
      input.value = "";
      show("login-screen");
      input.focus();
    });

    $("#user-chip").addEventListener("click", () => {
      const n = prompt(T("changeName"), state.username);
      if (n && n.trim().length >= 2) {
        setUser(n.trim());
        renderHub();
        toast(T("nameUpdated"));
      }
    });

    $("#brand-home").addEventListener("click", () => {
      stopGame();
      show("hub-screen");
    });
  }

  /* ---------- hub ---------- */
  function playerBadge(def) {
    if (def.maxPlayers <= 1) return T("onePlayer");
    if (def.minPlayers === def.maxPlayers) return T("nPlayers", { n: def.maxPlayers });
    return T("nmPlayers", { min: def.minPlayers, max: def.maxPlayers });
  }

  function renderFilters() {
    const cats = ["All"];
    GAMES.forEach((g) => (g.tags || []).forEach((t) => !cats.includes(t) && cats.push(t)));
    const wrap = $("#filter-pills");
    wrap.innerHTML = "";
    cats.forEach((c) => {
      const p = el("button", "pill" + (c === state.activeFilter ? " active" : ""), TAG(c));
      p.addEventListener("click", () => {
        state.activeFilter = c;
        renderFilters();
        renderCards();
      });
      wrap.appendChild(p);
    });
  }

  function renderCards() {
    const grid = $("#game-grid");
    const q = ($("#game-search").value || "").toLowerCase();
    grid.innerHTML = "";
    const list = GAMES.filter((g) => {
      const matchCat = state.activeFilter === "All" || (g.tags || []).includes(state.activeFilter);
      const gt = gameText(g);
      const hay = (g.name + " " + g.tagline + " " + gt.name + " " + gt.tagline).toLowerCase();
      const matchText = !q || hay.includes(q);
      return matchCat && matchText;
    });
    if (!list.length) {
      grid.appendChild(el("p", "", T("noMatch")));
      return;
    }
    list.forEach((g, i) => {
      const gt = gameText(g);
      const card = el("div", "game-card");
      card.style.animationDelay = i * 0.03 + "s";
      card.innerHTML =
        '<div class="game-emoji">' + g.emoji + "</div>" +
        "<h3>" + escapeHtml(gt.name) + "</h3>" +
        "<p>" + escapeHtml(gt.tagline) + "</p>" +
        '<div class="game-tags"><span class="tag">' + playerBadge(g) + "</span>" +
        (g.tags || []).map((t) => '<span class="tag">' + TAG(t) + "</span>").join("") +
        "</div>";
      card.addEventListener("click", () => openGame(g));
      grid.appendChild(card);
    });
  }

  function renderHub() {
    renderFilters();
    renderCards();
  }

  /* ---------- setup screen ---------- */
  function openGame(def) {
    state.current = def;
    const gt = gameText(def);
    $("#game-title").textContent = def.emoji + " " + gt.name;
    $("#setup-tagline").textContent = gt.tagline;

    // rules
    const ul = $("#rules-list");
    ul.innerHTML = "";
    gt.rules.forEach((r) => ul.appendChild(el("li", "", r)));

    buildOptions(def);
    buildPlayers(def);

    $("#setup-panel").hidden = false;
    $("#play-panel").hidden = true;
    show("game-screen");
  }

  // option values held here while on setup
  let optionValues = {};
  function buildOptions(def) {
    const form = $("#options-form");
    form.innerHTML = "";
    optionValues = {};
    if (!def.options || !def.options.length) {
      form.appendChild(el("p", "game-tagline", T("noOptions")));
      return;
    }
    def.options.forEach((opt) => {
      optionValues[opt.key] = opt.default;
      const row = el("div", "opt-row");
      row.appendChild(el("label", "", opt.label));

      if (opt.type === "select") {
        const seg = el("div", "seg");
        opt.choices.forEach((c) => {
          const b = el("button", c.value === opt.default ? "active" : "", c.label);
          b.type = "button";
          b.addEventListener("click", () => {
            optionValues[opt.key] = c.value;
            [...seg.children].forEach((x) => x.classList.remove("active"));
            b.classList.add("active");
          });
          seg.appendChild(b);
        });
        row.appendChild(seg);
      } else if (opt.type === "range") {
        const valSpan = el("span", "range-val", String(opt.default) + (opt.suffix || ""));
        const lab = row.querySelector("label");
        lab.appendChild(document.createTextNode("  "));
        lab.appendChild(valSpan);
        const inp = el("input");
        inp.type = "range";
        inp.min = opt.min; inp.max = opt.max; inp.step = opt.step || 1; inp.value = opt.default;
        inp.addEventListener("input", () => {
          optionValues[opt.key] = Number(inp.value);
          valSpan.textContent = inp.value + (opt.suffix || "");
        });
        row.appendChild(inp);
      } else if (opt.type === "toggle") {
        const seg = el("div", "seg");
        [{ value: true, label: "On" }, { value: false, label: "Off" }].forEach((c) => {
          const b = el("button", c.value === opt.default ? "active" : "", c.label);
          b.type = "button";
          b.addEventListener("click", () => {
            optionValues[opt.key] = c.value;
            [...seg.children].forEach((x) => x.classList.remove("active"));
            b.classList.add("active");
          });
          seg.appendChild(b);
        });
        row.appendChild(seg);
      }
      form.appendChild(row);
    });
  }

  let playerCount = 1;
  function buildPlayers(def) {
    const block = $("#players-block");
    if (def.maxPlayers <= 1) {
      block.hidden = true;
      playerCount = 1;
      return;
    }
    block.hidden = false;
    playerCount = Math.max(def.minPlayers, Math.min(2, def.maxPlayers));
    const row = $("#player-count-row");
    row.innerHTML = "";
    for (let n = def.minPlayers; n <= def.maxPlayers; n++) {
      const b = el("button", n === playerCount ? "active" : "", String(n));
      b.addEventListener("click", () => {
        playerCount = n;
        [...row.children].forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        renderPlayerNames(def);
      });
      row.appendChild(b);
    }
    renderPlayerNames(def);
  }

  function renderPlayerNames(def) {
    const wrap = $("#player-names");
    wrap.innerHTML = "";
    for (let i = 0; i < playerCount; i++) {
      const r = el("div", "pn-row");
      const dot = el("span", "pn-dot");
      dot.style.background = PALETTE[i % PALETTE.length];
      const inp = el("input");
      inp.type = "text";
      inp.maxLength = 14;
      inp.value = i === 0 ? state.username : "Player " + (i + 1);
      inp.dataset.idx = i;
      r.appendChild(dot);
      r.appendChild(inp);
      wrap.appendChild(r);
    }
  }

  function collectPlayers(def) {
    if (def.maxPlayers <= 1) return [state.username];
    return [...document.querySelectorAll("#player-names input")].map(
      (inp, i) => inp.value.trim() || "Player " + (i + 1)
    );
  }

  /* ---------- play ---------- */
  function startGame() {
    const def = state.current;
    state.config = {
      username: state.username,
      players: collectPlayers(def),
      options: Object.assign({}, optionValues),
      colors: PALETTE,
    };
    $("#setup-panel").hidden = true;
    $("#play-panel").hidden = false;
    $("#board").innerHTML = "";
    $("#board").style.transform = "none";
    $("#turn-banner").hidden = true;
    $("#scoreboard").innerHTML = "";
    $("#status-line").textContent = "";
    launch();
  }

  function launch() {
    stopGame();
    sessionScores = {};
    sessionGameId = state.current && state.current.id;
    const boardEl = $("#board");
    boardEl.style.transform = "none";
    const api = {
      board: boardEl,
      config: state.config,
      setStatus: (html) => ($("#status-line").innerHTML = html),
      setScores: renderScores,
      recordWin: (name) => recordWinFor(state.current && state.current.id, name),
      toast,
      colors: PALETTE,
      el,
    };
    try {
      state.instance = state.current.create(api) || {};
    } catch (err) {
      console.error(err);
      $("#status-line").textContent = "⚠ Something went wrong loading this game.";
    }
    // refresh the in-game leaderboard panel for this game
    renderGameLB();
    // size the freshly-rendered board to fit the window (now + after late layout)
    scheduleFit();
    setTimeout(scheduleFit, 150);
  }

  /* ---------- auto-fit board to any desktop size ---------- */
  let fitObserver = null, fitScheduled = false;
  function fitBoard() {
    const boardEl = $("#board");
    const wrap = $("#board-fit");
    if (!boardEl || !wrap || $("#play-panel").hidden || !state.instance) return;
    // reset, measure natural size
    boardEl.style.transform = "none";
    wrap.style.height = "auto";
    const natW = boardEl.scrollWidth, natH = boardEl.scrollHeight;
    if (!natW || !natH) return;
    const availW = wrap.clientWidth || (window.innerWidth - 28);
    // Only shrink to fit the WIDTH so nothing is cut off sideways. Never scale down
    // for height — keep games at full, readable (desktop) size and let the page
    // scroll if a board is tall, so everything stays visible.
    let s = availW / natW;
    if (!isFinite(s) || s <= 0) s = 1;
    if (s > 1) s = 1;
    boardEl.style.transformOrigin = "top center";
    boardEl.style.transform = "scale(" + s + ")";
    wrap.style.height = natH * s + "px";
  }
  function scheduleFit() {
    if (fitScheduled) return;
    fitScheduled = true;
    requestAnimationFrame(() => { fitScheduled = false; fitBoard(); });
  }
  function initAutoFit() {
    window.addEventListener("resize", scheduleFit);
    if (window.ResizeObserver) {
      fitObserver = new ResizeObserver(scheduleFit);
      fitObserver.observe($("#board"));
    }
  }

  function renderScores(items) {
    // items: [{name, value, color, turn}]
    const sb = $("#scoreboard");
    sb.innerHTML = "";
    items.forEach((it) => {
      const chip = el("div", "score-chip" + (it.turn ? " turn" : ""));
      if (it.color) {
        const d = el("span", "sc-dot");
        d.style.background = it.color;
        chip.appendChild(d);
      }
      chip.appendChild(el("span", "", it.name + " "));
      if (it.value != null) chip.appendChild(el("span", "sc-val", String(it.value)));
      sb.appendChild(chip);
      // capture numeric scores for real players only (skip stat chips like "Lines"/"Level")
      const num = Number(it.value);
      const players = (state.config && state.config.players) || [];
      if (Number.isFinite(num) && players.indexOf(it.name) !== -1) {
        if (!(it.name in sessionScores) || num > sessionScores[it.name]) sessionScores[it.name] = num;
      }
    });
    // "whose turn" banner — driven by whichever score item is flagged turn:true
    const banner = $("#turn-banner");
    const active = items.find((it) => it.turn);
    if (active) {
      banner.innerHTML = "";
      if (active.color) {
        const d = el("span", "tb-dot");
        d.style.background = active.color;
        banner.appendChild(d);
      }
      banner.appendChild(el("span", "tb-text", T("turnOf", { name: active.name })));
      banner.hidden = false;
    } else {
      banner.hidden = true;
    }
  }

  function stopGame() {
    if (state.instance && typeof state.instance.stop === "function") {
      try { state.instance.stop(); } catch (e) {}
    }
    state.instance = null;
    commitScores();
  }

  function commitScores() {
    if (sessionGameId && gameMetric(sessionGameId) !== "wins") {
      Object.keys(sessionScores).forEach((name) => {
        const v = sessionScores[name];
        if (Number.isFinite(v)) { board.log(sessionGameId, { name: name, score: v }); postGlobal(sessionGameId, { name: name, score: v }); }
      });
    }
    sessionScores = {};
    sessionGameId = null;
  }

  // games call api.recordWin(name) when someone wins (win-metric leaderboards)
  function recordWinFor(gameId, name) {
    if (!gameId || !name) return;
    board.log(gameId, { name: name, win: 1 });
    postGlobal(gameId, { name: name, win: 1 });
    renderGameLB();
  }

  function initGameScreen() {
    $("#back-btn").addEventListener("click", () => {
      stopGame();
      show("hub-screen");
    });
    $("#start-btn").addEventListener("click", startGame);
    $("#restart-btn").addEventListener("click", () => {
      $("#board").innerHTML = "";
      $("#turn-banner").hidden = true;
      $("#scoreboard").innerHTML = "";
      $("#status-line").textContent = "";
      launch();
    });
    $("#setup-btn").addEventListener("click", () => {
      stopGame();
      openGame(state.current);
    });
    $("#game-search").addEventListener("input", renderCards);
  }

  /* ---------- leaderboard rendering ---------- */
  function renderRows(ol, list, metric, emptyMsg) {
    ol.innerHTML = "";
    if (!list.length) { ol.appendChild(el("li", "lb-empty", emptyMsg)); return; }
    list.forEach((e, i) => {
      const row = el("li", "lb-row" + (i < 3 ? " top" + (i + 1) : ""));
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : String(i + 1);
      row.appendChild(el("span", "lb-rank", medal));
      row.appendChild(el("span", "lb-name", e.name));
      const val = metric === "wins" ? e.score + " " + (e.score === 1 ? T("win") : T("wins")) : String(e.score);
      row.appendChild(el("span", "lb-score", val));
      ol.appendChild(row);
    });
  }
  function fillLBList(ol, gameId, emptyMsg) {
    const metric = gameMetric(gameId);
    if (lbScope === "global") {
      if (!globalURL()) { ol.innerHTML = ""; ol.appendChild(el("li", "lb-empty", T("globalNotSetup"))); return; }
      ol.innerHTML = ""; ol.appendChild(el("li", "lb-empty", T("loadingGlobal")));
      const reqId = ++globalReqId; ol._req = reqId;
      fetchGlobalTop(gameId, lbWindow, metric)
        .then((list) => { if (ol._req === reqId) renderRows(ol, list, metric, T("noGlobal")); })
        .catch(() => { if (ol._req === reqId) { ol.innerHTML = ""; ol.appendChild(el("li", "lb-empty", T("globalErr"))); } });
      return;
    }
    renderRows(ol, board.top(gameId, lbWindow, metric), metric, emptyMsg || T("noScores"));
  }

  // local vs global scope (shared by modal + in-game panel)
  function setLBScope(s) {
    lbScope = s;
    localStorage.setItem("mint_lb_scope", s);
    ["#lb-scope", "#game-lb-scope"].forEach((sel) => {
      const c = $(sel);
      if (c) [...c.children].forEach((b) => b.classList.toggle("active", b.dataset.scope === s));
    });
    $("#lb-clear").style.display = s === "global" ? "none" : "";
    if (!$("#lb-overlay").hidden) renderLeaderboard();
    renderGameLB();
  }
  function wireScopeSeg(sel) {
    const c = $(sel);
    if (c) [...c.children].forEach((b) => b.addEventListener("click", () => setLBScope(b.dataset.scope)));
  }

  // time-window filter (shared by modal + in-game panel)
  function setLBWindow(w) {
    lbWindow = w;
    localStorage.setItem("mint_lb_window", w);
    ["#lb-window", "#game-lb-window"].forEach((sel) => {
      const c = $(sel);
      if (c) [...c.children].forEach((b) => b.classList.toggle("active", b.dataset.w === w));
    });
    if (!$("#lb-overlay").hidden) renderLeaderboard();
    renderGameLB();
  }
  function wireWindowSeg(sel) {
    const c = $(sel);
    if (c) [...c.children].forEach((b) => b.addEventListener("click", () => setLBWindow(b.dataset.w)));
  }

  function renderLeaderboard() {
    fillLBList($("#lb-list"), $("#lb-game").value, T("setRecord"));
  }

  // in-game side panel — shows the current game's top 10
  const SIDE_KEY = "mint_lb_side";
  function applyLBSide() {
    $("#play-main").classList.toggle("lb-left", localStorage.getItem(SIDE_KEY) === "left");
  }
  function renderGameLB() {
    const def = state.current;
    if (!def) return;
    $("#game-lb-title").textContent = T("top10", { name: gameText(def).name });
    fillLBList($("#game-lb-list"), def.id, T("beFirst"));
    applyLBSide();
  }

  function repopulateLBGames() {
    const sel = $("#lb-game");
    const cur = sel.value;
    sel.innerHTML = "";
    GAMES.forEach((g) => {
      const o = document.createElement("option");
      o.value = g.id;
      o.textContent = g.emoji + " " + gameText(g).name;
      sel.appendChild(o);
    });
    if (cur && GAMES.some((g) => g.id === cur)) sel.value = cur;
    else if (state.current) sel.value = state.current.id;
  }

  function openLeaderboard() {
    repopulateLBGames();
    renderLeaderboard();
    $("#lb-overlay").hidden = false;
  }

  function initLeaderboard() {
    $("#leaderboard-btn").addEventListener("click", openLeaderboard);
    $("#lb-close").addEventListener("click", () => ($("#lb-overlay").hidden = true));
    $("#lb-game").addEventListener("change", renderLeaderboard);
    $("#lb-clear").addEventListener("click", () => {
      const gameId = $("#lb-game").value;
      board.clear(gameId);
      renderLeaderboard();
      toast(T("scoresCleared"));
    });
    $("#lb-overlay").addEventListener("click", (e) => {
      if (e.target === $("#lb-overlay")) $("#lb-overlay").hidden = true;
    });
    $("#game-lb-side").addEventListener("click", () => {
      const left = localStorage.getItem(SIDE_KEY) === "left";
      localStorage.setItem(SIDE_KEY, left ? "right" : "left");
      applyLBSide();
      scheduleFit();
    });
    wireWindowSeg("#lb-window");
    wireWindowSeg("#game-lb-window");
    wireScopeSeg("#lb-scope");
    wireScopeSeg("#game-lb-scope");
    setLBWindow(lbWindow);
    setLBScope(lbScope);
    applyLBSide();
  }

  /* ---------- language ---------- */
  function refreshAll() {
    [$("#lang-select"), $("#lang-select-login")].forEach((s) => { if (s) s.value = I18n.lang; });
    updateGreeting();
    renderFilters();
    renderCards();
    // setup screen texts (only when a game's setup panel is showing)
    if (state.current && !$("#game-screen").hidden && !$("#setup-panel").hidden) {
      const gt = gameText(state.current);
      $("#game-title").textContent = state.current.emoji + " " + gt.name;
      $("#setup-tagline").textContent = gt.tagline;
      const ul = $("#rules-list"); ul.innerHTML = "";
      gt.rules.forEach((r) => ul.appendChild(el("li", "", r)));
    }
    if (state.current) renderGameLB();
    if (!$("#lb-overlay").hidden) { repopulateLBGames(); renderLeaderboard(); }
  }

  function initLang() {
    if (!window.I18n) return;
    const fill = (sel) => {
      if (!sel) return;
      sel.innerHTML = "";
      I18n.supported.forEach((code) => {
        const o = document.createElement("option");
        o.value = code; o.textContent = I18n.labels[code] || code;
        sel.appendChild(o);
      });
      sel.value = I18n.lang;
      sel.addEventListener("change", () => I18n.set(sel.value));
    };
    fill($("#lang-select"));
    fill($("#lang-select-login"));
    I18n.onChange(refreshAll);
    I18n.applyStatic();
  }

  /* ---------- public API ---------- */
  window.Arcade = {
    register: (def) => GAMES.push(def),
    boot: function () {
      initLang();
      initLogin();
      initGameScreen();
      initAutoFit();
      initLeaderboard();
      const saved = store.get();
      if (saved) {
        setUser(saved);
        renderHub();
        show("hub-screen");
      } else {
        show("login-screen");
        $("#username-input").focus();
      }
    },
  };
})();
