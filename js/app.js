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
    // Chinese-category games are authored in Chinese and always shown in Chinese — never localized
    const tr = def.category === "chinese" ? null : (window.I18n && I18n.game(def.id));
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
    activeCategory: "All",
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
    // top `limit` within a time window. metric "wins" sums wins; "time" keeps each
    // player's fastest (lowest, lower-is-better); otherwise max score per player.
    // each row also carries `ts` — when the player achieved it (best value's time, or latest win).
    top(gameId, win, metric, limit, cat) {
      const span = WINDOWS[win] || Infinity;
      const cutoff = span === Infinity ? 0 : Date.now() - span;
      const events = (this.all()[gameId] || []).filter((e) => (e.ts || 0) >= cutoff && (!cat || e.cat === cat));
      const lower = metric === "time" || metric === "low"; // lower is better (fastest time / fewest tries)
      const agg = {};
      events.forEach((e) => {
        const a = agg[e.name] || (agg[e.name] = { score: 0, ts: 0, cat: e.cat, set: false });
        if (metric === "wins") {
          a.score += (e.win || 0);
          if (e.win && (e.ts || 0) > a.ts) a.ts = e.ts || 0; // most recent win
        } else {
          const s = Number(e.score) || 0;
          if (lower ? (!a.set || s < a.score) : (s > a.score || !a.set)) { a.score = s; a.ts = e.ts || 0; a.cat = e.cat; a.set = true; }
        }
      });
      return Object.keys(agg).map((name) => ({ name, score: agg[name].score, ts: agg[name].ts, cat: agg[name].cat }))
        .filter((r) => (metric === "wins" ? r.score > 0 : (lower ? r.score > 0 : true)))
        .sort((a, b) => (lower ? a.score - b.score : b.score - a.score)).slice(0, limit || 50);
    },
    // overall ranking: each player's best-per-game value averaged across all games played
    overall(win, limit) {
      const span = WINDOWS[win] || Infinity;
      const cutoff = span === Infinity ? 0 : Date.now() - span;
      const all = this.all();
      const sums = {};
      Object.keys(all).forEach((gameId) => {
        const metric = gameMetric(gameId);
        if (metric === "time" || metric === "low") return; // lower-is-better units — skip the cross-game average
        const best = {};
        (all[gameId] || []).filter((e) => (e.ts || 0) >= cutoff).forEach((e) => {
          const b = best[e.name] || (best[e.name] = { v: 0, ts: 0 });
          if (metric === "wins") {
            b.v += (e.win || 0);
            if (e.win && (e.ts || 0) > b.ts) b.ts = e.ts || 0;
          } else {
            const s = Number(e.score) || 0;
            if (s > b.v || b.ts === 0) { b.v = s; b.ts = e.ts || 0; }
          }
        });
        Object.keys(best).forEach((name) => {
          const ps = sums[name] || (sums[name] = { sum: 0, count: 0, ts: 0 });
          ps.sum += best[name].v; ps.count++;
          if (best[name].ts > ps.ts) ps.ts = best[name].ts; // latest achievement across games
        });
      });
      return Object.keys(sums).map((name) => ({ name, score: Math.round(sums[name].sum / sums[name].count), games: sums[name].count, ts: sums[name].ts }))
        .sort((a, b) => b.score - a.score).slice(0, limit || 50);
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
  function fetchGlobalTop(gameId, win, metric, cat) {
    const base = globalURL();
    if (!base) return Promise.reject(new Error("not-configured"));
    let u = base + "/scores?game=" + encodeURIComponent(gameId) + "&window=" + win + "&metric=" + metric;
    if (cat) u += "&cat=" + encodeURIComponent(cat);
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
      // no inline account switching: you must log out (Switch user) first, so each player's records stay clean
      toast(T("switchHint"));
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

  // top-level category navigation: Classic / Chinese / English (+ a reserved tab for later)
  const NAV = [
    { key: "All", label: "🎮 All" },
    { key: "classic", label: "🕹️ Classic" },
    { key: "chinese", label: "🀄 Chinese" },
    { key: "english", label: "🔤 English" },
    { key: "number", label: "🔢 Number" },
  ];
  function renderNav() {
    const wrap = $("#game-nav");
    if (!wrap) return;
    wrap.innerHTML = "";
    NAV.forEach((n) => {
      const b = el("button", "nav-tab" + (n.key === state.activeCategory ? " active" : ""), n.label);
      b.addEventListener("click", () => {
        state.activeCategory = n.key;
        renderNav();
        renderCards();
      });
      wrap.appendChild(b);
    });
    // reserved slot — a new section is coming here later; disabled for now
    const soon = el("button", "nav-tab soon", "✨ More soon");
    soon.disabled = true;
    soon.title = "Coming soon";
    wrap.appendChild(soon);
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
      const cat = g.category || "classic"; // games without a category are Classic
      const matchNav = state.activeCategory === "All" || cat === state.activeCategory;
      const matchCat = state.activeFilter === "All" || (g.tags || []).includes(state.activeFilter);
      const gt = gameText(g);
      const hay = (g.name + " " + g.tagline + " " + gt.name + " " + gt.tagline).toLowerCase();
      const matchText = !q || hay.includes(q);
      return matchNav && matchCat && matchText;
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
    renderNav();
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

  // some games (e.g. Connect Four) reset their leaderboard once per calendar year
  function maybeYearlyReset(def) {
    if (!def || !def.leaderboard || def.leaderboard.reset !== "year") return;
    const key = "mint_yr_" + def.id;
    const yr = String(new Date().getFullYear());
    if (localStorage.getItem(key) !== yr) {
      board.clear(def.id);
      localStorage.setItem(key, yr);
    }
  }

  function launch() {
    stopGame();
    sessionScores = {};
    sessionGameId = state.current && state.current.id;
    maybeYearlyReset(state.current);
    const boardEl = $("#board");
    boardEl.style.transform = "none";
    const api = {
      board: boardEl,
      config: state.config,
      setStatus: (html) => ($("#status-line").innerHTML = html),
      setScores: renderScores,
      recordWin: (name) => recordWinFor(state.current && state.current.id, name),
      submitScore: (value, meta) => recordScoreFor(state.current && state.current.id, value, meta),
      celebrate: (msg) => celebrate(msg),
      toast,
      colors: PALETTE,
      el,
      // persisted personal best for "Best" displays — per game + player, survives across sessions.
      // loadBest() seeds the value on launch; saveBest(v) renews it when the player beats it.
      loadBest: () => {
        const v = Number(localStorage.getItem("mint_best:" + (state.current && state.current.id) + ":" + ((state.config && state.config.username) || "guest")));
        return Number.isFinite(v) ? v : 0;
      },
      saveBest: (v) => {
        if (!Number.isFinite(v)) return;
        try { localStorage.setItem("mint_best:" + (state.current && state.current.id) + ":" + ((state.config && state.config.username) || "guest"), String(v)); } catch (e) {}
      },
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

  // ---------- winner celebration: confetti ribbons + fanfare + banner ----------
  let _audioCtx = null;
  function playFanfare() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      _audioCtx = _audioCtx || new AC();
      const ac = _audioCtx;
      if (ac.state === "suspended") ac.resume();
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => { // C5 E5 G5 C6
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = "triangle"; o.frequency.value = f;
        const t = ac.currentTime + i * 0.12;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.25, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        o.connect(g); g.connect(ac.destination);
        o.start(t); o.stop(t + 0.24);
      });
    } catch (e) {}
  }
  function confettiBurst() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cv = document.createElement("canvas");
    cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999";
    cv.width = window.innerWidth; cv.height = window.innerHeight;
    document.body.appendChild(cv);
    const cx = cv.getContext("2d");
    const colors = ["#f1c40f", "#e74c3c", "#43b884", "#3498db", "#9b59b6", "#e67e22", "#2e9d6c"];
    const parts = [];
    for (let i = 0; i < 150; i++) parts.push({
      x: cv.width / 2 + (Math.random() - 0.5) * 140, y: cv.height * 0.32 + (Math.random() - 0.5) * 60,
      vx: (Math.random() - 0.5) * 12, vy: Math.random() * -13 - 4,
      w: 6 + Math.random() * 7, h: 9 + Math.random() * 11,
      rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4, col: colors[(Math.random() * colors.length) | 0],
    });
    let frame = 0;
    (function tick() {
      frame++;
      cx.clearRect(0, 0, cv.width, cv.height);
      parts.forEach((p) => {
        p.vy += 0.32; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.rot += p.vr;
        cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot);
        cx.globalAlpha = Math.max(0, 1 - frame / 135); cx.fillStyle = p.col;
        cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); cx.restore();
      });
      if (frame < 135) requestAnimationFrame(tick); else cv.remove();
    })();
  }
  let _celebrateAt = 0;
  function celebrate(message) {
    const now = (window.performance && performance.now) ? performance.now() : 0;
    if (now && now - _celebrateAt < 800) return; // de-dupe rapid double-calls
    _celebrateAt = now;
    confettiBurst();
    playFanfare();
    const banner = document.createElement("div");
    banner.textContent = message || "🏆 You win!";
    banner.style.cssText = "position:fixed;top:24%;left:50%;transform:translate(-50%,-50%) scale(.7);" +
      "z-index:10000;background:rgba(23,58,43,.93);color:#fff;font-weight:800;font-size:25px;" +
      "padding:16px 28px;border-radius:18px;box-shadow:0 16px 44px rgba(0,0,0,.3);pointer-events:none;opacity:0;" +
      "transition:opacity .25s ease,transform .25s ease;text-align:center;max-width:90vw";
    document.body.appendChild(banner);
    requestAnimationFrame(() => { banner.style.opacity = "1"; banner.style.transform = "translate(-50%,-50%) scale(1)"; });
    setTimeout(() => { banner.style.opacity = "0"; setTimeout(() => banner.remove(), 320); }, 1900);
  }

  // games call api.recordWin(name) when someone wins (win-metric leaderboards)
  function recordWinFor(gameId, name) {
    if (!gameId || !name) return;
    board.log(gameId, { name: name, win: 1 });
    postGlobal(gameId, { name: name, win: 1 });
    celebrate("🏆 " + name + " wins!");
    renderGameLB();
  }

  // games may call api.submitScore(value, meta) to bank a score immediately (e.g. on game over).
  // meta.cat tags the entry with a leaderboard category (e.g. Sudoku difficulty).
  function recordScoreFor(gameId, value, meta) {
    if (!gameId || !Number.isFinite(value)) return;
    const name = state.config && state.config.username;
    if (!name) return;
    const entry = { name: name, score: value };
    if (meta && meta.cat) entry.cat = meta.cat;
    board.log(gameId, entry);
    postGlobal(gameId, entry);
    delete sessionScores[name]; // already banked — avoid double-logging at session end
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
  // format a duration in seconds as m:ss (used by time-metric leaderboards, e.g. Sudoku)
  function fmtTime(sec) {
    sec = Math.max(0, Math.round(Number(sec) || 0));
    const m = Math.floor(sec / 60), s = sec % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }
  // format an achievement timestamp into a short, locale-aware "when" label
  function fmtWhen(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    if (isNaN(d.getTime())) return "";
    const now = Date.now();
    const diff = now - ts;
    if (diff >= 0 && diff < 6048e5) { // within the last week → relative
      const mins = Math.floor(diff / 6e4);
      if (mins < 1) return T("justNow");
      if (mins < 60) return T("minsAgo", { n: mins });
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return T("hrsAgo", { n: hrs });
      const days = Math.floor(hrs / 24);
      return T("daysAgo", { n: days });
    }
    try { return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); }
    catch (e) { return d.toLocaleDateString(); }
  }
  function renderRows(ol, list, metric, emptyMsg) {
    ol.innerHTML = "";
    if (!list.length) { ol.appendChild(el("li", "lb-empty", emptyMsg)); return; }
    list.forEach((e, i) => {
      const row = el("li", "lb-row" + (i < 3 ? " top" + (i + 1) : ""));
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : String(i + 1);
      row.appendChild(el("span", "lb-rank", medal));
      const nameWrap = el("span", "lb-name");
      nameWrap.appendChild(el("span", "lb-name-text", e.name));
      const when = fmtWhen(e.ts);
      if (when) {
        const w = el("span", "lb-when", "🕒 " + when);
        if (e.ts) { const full = new Date(e.ts); if (!isNaN(full.getTime())) w.title = full.toLocaleString(); }
        nameWrap.appendChild(w);
      }
      row.appendChild(nameWrap);
      const val = metric === "wins" ? e.score + " " + (e.score === 1 ? T("win") : T("wins"))
        : metric === "time" ? fmtTime(e.score)
        : metric === "low" ? e.score + " " + (e.score === 1 ? T("try") : T("tries"))
        : String(e.score);
      row.appendChild(el("span", "lb-score", val));
      ol.appendChild(row);
    });
  }
  // fill one ranked list (optionally filtered to a category) into the given <ol>
  function fillListInto(ol, gameId, metric, emptyMsg, limit, cat) {
    if (lbScope === "global") {
      if (!globalURL()) { ol.innerHTML = ""; ol.appendChild(el("li", "lb-empty", T("globalNotSetup"))); return; }
      ol.innerHTML = ""; ol.appendChild(el("li", "lb-empty", T("loadingGlobal")));
      const reqId = ++globalReqId; ol._req = reqId;
      fetchGlobalTop(gameId, lbWindow, metric, cat)
        .then((list) => { if (ol._req === reqId) renderRows(ol, list, metric, T("noGlobal")); })
        .catch(() => { if (ol._req === reqId) { ol.innerHTML = ""; ol.appendChild(el("li", "lb-empty", T("globalErr"))); } });
      return;
    }
    // time metric sorts ascending in board.top — shortest time first
    renderRows(ol, board.top(gameId, lbWindow, metric, limit, cat), metric, emptyMsg || T("noScores"));
  }
  function fillLBList(ol, gameId, emptyMsg, limit) {
    const metric = gameMetric(gameId);
    const def = GAMES.find((g) => g.id === gameId);
    const cats = def && def.leaderboard && def.leaderboard.categories;
    if (cats && cats.length) {
      // one labelled, separately-ranked section per category (Sudoku: Hard, Medium, Easy)
      ol.innerHTML = "";
      cats.forEach((c) => {
        ol.appendChild(el("li", "lb-cat-head", c.label));
        const sub = el("ol", "lb-cat-list");
        ol.appendChild(sub);
        fillListInto(sub, gameId, metric, emptyMsg, limit, c.key);
      });
      return;
    }
    fillListInto(ol, gameId, metric, emptyMsg, limit);
  }

  // local vs global scope (shared by modal + in-game panel)
  function setLBScope(s) {
    lbScope = s;
    localStorage.setItem("mint_lb_scope", s);
    ["#lb-scope", "#game-lb-scope"].forEach((sel) => {
      const c = $(sel);
      if (c) [...c.children].forEach((b) => b.classList.toggle("active", b.dataset.scope === s));
    });
    $("#lb-clear").style.display = (s === "global" || lbGameSel === OVERALL) ? "none" : "";
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

  // leaderboard modal: which game is selected (a game id, or OVERALL for the all-games average)
  const OVERALL = "__overall__";
  let lbGameSel = null;

  function renderLeaderboard() {
    const ol = $("#lb-list");
    if (lbGameSel === OVERALL) {
      // average across all games — computed from local data (top 50)
      renderRows(ol, board.overall(lbWindow, 50), "score", T("noScores"));
      return;
    }
    fillLBList(ol, lbGameSel, T("setRecord"), 50);
  }

  function buildLBPills() {
    const wrap = $("#lb-game-pills");
    if (!wrap) return;
    wrap.innerHTML = "";
    const ov = el("button", "lb-game-pill" + (lbGameSel === OVERALL ? " active" : ""), "🌐 " + T("overallAvg"));
    ov.addEventListener("click", () => selectLBGame(OVERALL));
    wrap.appendChild(ov);
    GAMES.forEach((g) => {
      const b = el("button", "lb-game-pill" + (lbGameSel === g.id ? " active" : ""), g.emoji + " " + gameText(g).name);
      b.addEventListener("click", () => selectLBGame(g.id));
      wrap.appendChild(b);
    });
  }
  function selectLBGame(id) {
    lbGameSel = id;
    buildLBPills();
    $("#lb-clear").style.display = (id === OVERALL || lbScope === "global") ? "none" : "";
    renderLeaderboard();
  }

  // in-game side panel — shows the current game's top 10
  const SIDE_KEY = "mint_lb_side";
  function applyLBSide() {
    $("#play-main").classList.toggle("lb-left", localStorage.getItem(SIDE_KEY) === "left");
  }
  // per-session show/hide of the in-game leaderboard (phones only — the CSS .lb-hidden rule and
  // the toggle button are scoped to the mobile breakpoint, so desktop always shows the panel).
  // Not persisted: a reload resets to shown.
  let lbHidden = false;
  function applyLBHidden() {
    $("#play-main").classList.toggle("lb-hidden", lbHidden);
    const t = $("#lb-toggle");
    if (t) { t.classList.toggle("active", !lbHidden); t.setAttribute("aria-pressed", String(!lbHidden)); }
  }
  function renderGameLB() {
    const def = state.current;
    if (!def) return;
    // games with leaderboard:false are just-for-fun — hide the panel and the record banner entirely
    const lbPanel = $("#game-lb");
    if (def.leaderboard === false) {
      if (lbPanel) lbPanel.hidden = true;
      $("#record-banner").hidden = true;
      return;
    }
    if (lbPanel) lbPanel.hidden = false;
    $("#game-lb-title").textContent = T("top10", { name: gameText(def).name });
    fillLBList($("#game-lb-list"), def.id, T("beFirst"), 10);
    applyLBSide();
    renderRecord(def);
  }

  // "record to beat" banner — shows the all-time #1 (and who holds it) for the current game,
  // on every device, to give players a target to challenge
  let recordReq = 0;
  function renderRecord(def) {
    const banner = $("#record-banner");
    if (!banner || !def) return;
    banner.hidden = false;
    const metric = gameMetric(def.id);
    const show = (top) => {
      banner.textContent = top
        ? (metric === "wins" ? T("recordWins", { name: top.name, n: top.score })
          : metric === "time" ? T("recordTime", { name: top.name, time: fmtTime(top.score) }) + (top.cat ? " [" + top.cat + "]" : "")
          : metric === "low" ? T("recordLow", { name: top.name, n: top.score })
          : T("recordScore", { name: top.name, score: top.score }))
        : T("noRecord");
    };
    if (lbScope === "global" && globalURL()) {
      const reqId = ++recordReq; banner._req = reqId;
      fetchGlobalTop(def.id, "all", metric)
        .then((list) => { if (banner._req === reqId) show(list[0]); })
        .catch(() => { if (banner._req === reqId) show(board.top(def.id, "all", metric, 1)[0]); });
    } else {
      show(board.top(def.id, "all", metric, 1)[0]);
    }
  }

  function openLeaderboard() {
    if (lbGameSel == null) lbGameSel = state.current ? state.current.id : (GAMES[0] && GAMES[0].id);
    buildLBPills();
    $("#lb-clear").style.display = (lbGameSel === OVERALL || lbScope === "global") ? "none" : "";
    renderLeaderboard();
    $("#lb-overlay").hidden = false;
  }

  function initLeaderboard() {
    $("#leaderboard-btn").addEventListener("click", openLeaderboard);
    $("#lb-close").addEventListener("click", () => ($("#lb-overlay").hidden = true));
    $("#lb-clear").addEventListener("click", () => {
      if (lbGameSel === OVERALL) return;
      board.clear(lbGameSel);
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
    $("#lb-toggle").addEventListener("click", () => { lbHidden = !lbHidden; applyLBHidden(); scheduleFit(); });
    $("#game-lb-hide").addEventListener("click", () => { lbHidden = true; applyLBHidden(); scheduleFit(); });
    wireWindowSeg("#lb-window");
    wireWindowSeg("#game-lb-window");
    wireScopeSeg("#lb-scope");
    wireScopeSeg("#game-lb-scope");
    setLBWindow(lbWindow);
    setLBScope(lbScope);
    applyLBSide();
    applyLBHidden();
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
    if (!$("#lb-overlay").hidden) { buildLBPills(); renderLeaderboard(); }
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
