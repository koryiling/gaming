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
    $("#hub-greet-name").textContent = name;
  }

  function initLogin() {
    const form = $("#login-form");
    const input = $("#username-input");
    const hint = $("#login-hint");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = input.value.trim();
      if (name.length < 2) {
        hint.textContent = "Please enter at least 2 characters.";
        return;
      }
      hint.textContent = "";
      setUser(name);
      renderHub();
      show("hub-screen");
      toast("Welcome, " + name + "! 🌿");
    });

    $("#logout-btn").addEventListener("click", () => {
      store.clear();
      state.username = "";
      input.value = "";
      show("login-screen");
      input.focus();
    });

    $("#user-chip").addEventListener("click", () => {
      const n = prompt("Change your username:", state.username);
      if (n && n.trim().length >= 2) {
        setUser(n.trim());
        renderHub();
        toast("Name updated ✔");
      }
    });

    $("#brand-home").addEventListener("click", () => {
      stopGame();
      show("hub-screen");
    });
  }

  /* ---------- hub ---------- */
  function playerBadge(def) {
    if (def.maxPlayers <= 1) return "1 player";
    if (def.minPlayers === def.maxPlayers) return def.maxPlayers + " players";
    return def.minPlayers + "–" + def.maxPlayers + " players";
  }

  function renderFilters() {
    const cats = ["All"];
    GAMES.forEach((g) => (g.tags || []).forEach((t) => !cats.includes(t) && cats.push(t)));
    const wrap = $("#filter-pills");
    wrap.innerHTML = "";
    cats.forEach((c) => {
      const p = el("button", "pill" + (c === state.activeFilter ? " active" : ""), c);
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
      const matchText = !q || (g.name + " " + g.tagline).toLowerCase().includes(q);
      return matchCat && matchText;
    });
    if (!list.length) {
      grid.appendChild(el("p", "", "No games match that search 🌱"));
      return;
    }
    list.forEach((g, i) => {
      const card = el("div", "game-card");
      card.style.animationDelay = i * 0.03 + "s";
      card.innerHTML =
        '<div class="game-emoji">' + g.emoji + "</div>" +
        "<h3>" + g.name + "</h3>" +
        "<p>" + g.tagline + "</p>" +
        '<div class="game-tags"><span class="tag">' + playerBadge(g) + "</span>" +
        (g.tags || []).map((t) => '<span class="tag">' + t + "</span>").join("") +
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
    $("#game-title").textContent = def.emoji + " " + def.name;
    $("#setup-tagline").textContent = def.tagline;

    // rules
    const ul = $("#rules-list");
    ul.innerHTML = "";
    (def.rules || []).forEach((r) => ul.appendChild(el("li", "", r)));

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
      form.appendChild(el("p", "game-tagline", "No options — just hit start! 🎮"));
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
    $("#scoreboard").innerHTML = "";
    $("#status-line").textContent = "";
    launch();
  }

  function launch() {
    stopGame();
    const board = $("#board");
    const api = {
      board,
      config: state.config,
      setStatus: (html) => ($("#status-line").innerHTML = html),
      setScores: renderScores,
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
    });
  }

  function stopGame() {
    if (state.instance && typeof state.instance.stop === "function") {
      try { state.instance.stop(); } catch (e) {}
    }
    state.instance = null;
  }

  function initGameScreen() {
    $("#back-btn").addEventListener("click", () => {
      stopGame();
      show("hub-screen");
    });
    $("#start-btn").addEventListener("click", startGame);
    $("#restart-btn").addEventListener("click", () => {
      $("#board").innerHTML = "";
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

  /* ---------- public API ---------- */
  window.Arcade = {
    register: (def) => GAMES.push(def),
    boot: function () {
      initLogin();
      initGameScreen();
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
