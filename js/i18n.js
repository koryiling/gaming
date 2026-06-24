/* Mint Arcade — internationalization (English / Bahasa Melayu / 简体中文).
 *
 *   I18n.lang                 current language code ("en" | "ms" | "zh")
 *   I18n.t(key, vars)         translate a UI string; {name} etc. interpolated from vars
 *   I18n.game(id)             { name, tagline, rules } for a game in the current language, or null
 *   I18n.set(lang)            switch language (persists + applies static strings + fires onChange)
 *   I18n.onChange(fn)         run fn(lang) whenever the language changes
 *   I18n.applyStatic(root)    fill [data-i18n] textContent and [data-i18n-ph] placeholders
 *
 * Per-game text lives in i18n-games.js (window.__GAME_I18N); English falls back to the game def.
 */
(function () {
  "use strict";
  const LS = "mint_lang";
  const SUPPORTED = ["en", "ms", "zh"];
  const LABELS = { en: "English", ms: "Bahasa Melayu", zh: "中文" };

  const UI = {
    en: {
      switchUser: "Switch user",
      loginSubtitle: "10+ mini games. Bring your friends. Pick a name to begin.",
      usernameLabel: "Your username",
      usernamePh: "e.g. MintNinja",
      enterArcade: "Enter the arcade →",
      loginFoot: "Made for fun • plays on one screen • 1–4 players",
      hubGreet: "Choose a game, {name} 👋",
      leaderboard: "🏆 Leaderboard",
      searchPh: "🔍 Search games…",
      allGames: "← All games",
      howToPlay: "📖 How to play",
      optionsH: "⚙️ Options",
      playersH: "👥 Players",
      startGame: "▶ Start game",
      restart: "↻ Restart",
      setupBtn: "⚙ Setup",
      leaderboardTitle: "🏆 Leaderboard",
      close: "✕ Close",
      gameLabel: "Game",
      overallAvg: "All games (avg)",
      clearGame: "🗑 Clear this game",
      scopeDevice: "📱 This device",
      scopeGlobal: "🌍 Global",
      winToday: "Today", winWeek: "Week", winMonth: "Month", winAll: "All time",
      sDay: "Day", sWeek: "Week", sMonth: "Month", sAll: "All",
      top10: "🏆 Top 10 — {name}", top10plain: "🏆 Top 10",
      noRecord: "🏆 No high score yet — set the first!",
      recordScore: "🏆 High score: {score} by {name} — beat it!",
      recordWins: "🏆 Most wins: {name} ({n}) — beat it!",
      welcome: "Welcome, {name}! 🌿",
      nameMin: "Please enter at least 2 characters.",
      changeName: "Change your username:",
      nameUpdated: "Name updated ✔",
      noMatch: "No games match that search 🌱",
      scoresCleared: "Scores cleared for this game 🗑",
      noScores: "No scores yet 🌱",
      beFirst: "No scores yet — be the first! 🌱",
      setRecord: "No scores yet — go play and set a record! 🌱",
      globalNotSetup: "🌍 Global board isn't set up yet.",
      loadingGlobal: "Loading global scores… ⏳",
      noGlobal: "No global scores yet — be the first! 🌍",
      globalErr: "⚠ Couldn't reach the global board.",
      noOptions: "No options — just hit start! 🎮",
      turnOf: "{name}’s turn",
      onePlayer: "1 player", nPlayers: "{n} players", nmPlayers: "{min}–{max} players",
      win: "win", wins: "wins",
      justNow: "just now", minsAgo: "{n}m ago", hrsAgo: "{n}h ago", daysAgo: "{n}d ago",
      tag: { All: "All", Classic: "Classic", Arcade: "Arcade", Puzzle: "Puzzle", Solo: "Solo", Duel: "Duel", Quick: "Quick", Family: "Family", Word: "Word", Number: "Number", Reflex: "Reflex", Strategy: "Strategy" },
    },
    ms: {
      switchUser: "Tukar pengguna",
      loginSubtitle: "10+ permainan mini. Bawa rakan anda. Pilih nama untuk bermula.",
      usernameLabel: "Nama pengguna anda",
      usernamePh: "cth. MintNinja",
      enterArcade: "Masuk arked →",
      loginFoot: "Dibuat untuk keseronokan • main pada satu skrin • 1–4 pemain",
      hubGreet: "Pilih permainan, {name} 👋",
      leaderboard: "🏆 Papan Pendahulu",
      searchPh: "🔍 Cari permainan…",
      allGames: "← Semua permainan",
      howToPlay: "📖 Cara bermain",
      optionsH: "⚙️ Pilihan",
      playersH: "👥 Pemain",
      startGame: "▶ Mula main",
      restart: "↻ Mula semula",
      setupBtn: "⚙ Tetapan",
      leaderboardTitle: "🏆 Papan Pendahulu",
      close: "✕ Tutup",
      gameLabel: "Permainan",
      overallAvg: "Semua (purata)",
      clearGame: "🗑 Kosongkan permainan ini",
      scopeDevice: "📱 Peranti ini",
      scopeGlobal: "🌍 Global",
      winToday: "Hari ini", winWeek: "Minggu", winMonth: "Bulan", winAll: "Sepanjang masa",
      sDay: "Hari", sWeek: "Minggu", sMonth: "Bulan", sAll: "Semua",
      top10: "🏆 10 Teratas — {name}", top10plain: "🏆 10 Teratas",
      noRecord: "🏆 Belum ada rekod — jadilah yang pertama!",
      recordScore: "🏆 Skor tertinggi: {score} oleh {name} — pecahkannya!",
      recordWins: "🏆 Paling banyak menang: {name} ({n}) — pecahkannya!",
      welcome: "Selamat datang, {name}! 🌿",
      nameMin: "Sila masukkan sekurang-kurangnya 2 aksara.",
      changeName: "Tukar nama pengguna anda:",
      nameUpdated: "Nama dikemas kini ✔",
      noMatch: "Tiada permainan sepadan dengan carian itu 🌱",
      scoresCleared: "Skor permainan ini dikosongkan 🗑",
      noScores: "Belum ada skor 🌱",
      beFirst: "Belum ada skor — jadilah yang pertama! 🌱",
      setRecord: "Belum ada skor — main dan cipta rekod! 🌱",
      globalNotSetup: "🌍 Papan global belum disediakan.",
      loadingGlobal: "Memuatkan skor global… ⏳",
      noGlobal: "Belum ada skor global — jadilah yang pertama! 🌍",
      globalErr: "⚠ Tidak dapat menghubungi papan global.",
      noOptions: "Tiada pilihan — terus tekan mula! 🎮",
      turnOf: "Giliran {name}",
      onePlayer: "1 pemain", nPlayers: "{n} pemain", nmPlayers: "{min}–{max} pemain",
      win: "kemenangan", wins: "kemenangan",
      justNow: "baru sahaja", minsAgo: "{n}m lalu", hrsAgo: "{n}j lalu", daysAgo: "{n}h lalu",
      tag: { All: "Semua", Classic: "Klasik", Arcade: "Arked", Puzzle: "Teka-teki", Solo: "Solo", Duel: "Duel", Quick: "Pantas", Family: "Keluarga", Word: "Perkataan", Number: "Nombor", Reflex: "Refleks", Strategy: "Strategi" },
    },
    zh: {
      switchUser: "切换用户",
      loginSubtitle: "10+ 款迷你游戏。呼朋唤友，输入名字即可开始。",
      usernameLabel: "你的用户名",
      usernamePh: "例如 MintNinja",
      enterArcade: "进入游戏厅 →",
      loginFoot: "纯为娱乐 • 同屏游玩 • 1–4 名玩家",
      hubGreet: "选个游戏吧，{name} 👋",
      leaderboard: "🏆 排行榜",
      searchPh: "🔍 搜索游戏…",
      allGames: "← 所有游戏",
      howToPlay: "📖 玩法说明",
      optionsH: "⚙️ 选项",
      playersH: "👥 玩家",
      startGame: "▶ 开始游戏",
      restart: "↻ 重新开始",
      setupBtn: "⚙ 设置",
      leaderboardTitle: "🏆 排行榜",
      close: "✕ 关闭",
      gameLabel: "游戏",
      overallAvg: "全部（平均）",
      clearGame: "🗑 清除此游戏记录",
      scopeDevice: "📱 本设备",
      scopeGlobal: "🌍 全球",
      winToday: "今天", winWeek: "本周", winMonth: "本月", winAll: "全部",
      sDay: "日", sWeek: "周", sMonth: "月", sAll: "全部",
      top10: "🏆 前 10 名 — {name}", top10plain: "🏆 前 10 名",
      noRecord: "🏆 还没有最高分——来创造第一个吧！",
      recordScore: "🏆 最高分：{score}，保持者 {name}——来挑战吧！",
      recordWins: "🏆 最多胜场：{name}（{n}）——来挑战吧！",
      welcome: "欢迎，{name}！🌿",
      nameMin: "请至少输入 2 个字符。",
      changeName: "修改你的用户名：",
      nameUpdated: "用户名已更新 ✔",
      noMatch: "没有匹配的游戏 🌱",
      scoresCleared: "已清除此游戏的分数 🗑",
      noScores: "暂无分数 🌱",
      beFirst: "暂无分数 — 来抢第一吧！🌱",
      setRecord: "暂无分数 — 快去游戏创造纪录吧！🌱",
      globalNotSetup: "🌍 全球排行榜尚未设置。",
      loadingGlobal: "正在加载全球分数… ⏳",
      noGlobal: "暂无全球分数 — 来抢第一吧！🌍",
      globalErr: "⚠ 无法连接全球排行榜。",
      noOptions: "无选项 — 直接开始吧！🎮",
      turnOf: "轮到 {name}",
      onePlayer: "1 名玩家", nPlayers: "{n} 名玩家", nmPlayers: "{min}–{max} 名玩家",
      win: "胜", wins: "胜",
      justNow: "刚刚", minsAgo: "{n}分钟前", hrsAgo: "{n}小时前", daysAgo: "{n}天前",
      tag: { All: "全部", Classic: "经典", Arcade: "街机", Puzzle: "益智", Solo: "单人", Duel: "对决", Quick: "快速", Family: "家庭", Word: "文字", Number: "数字", Reflex: "反应", Strategy: "策略" },
    },
  };

  let lang = localStorage.getItem(LS) || (navigator.language || "").slice(0, 2).toLowerCase();
  if (SUPPORTED.indexOf(lang) === -1) lang = "en";

  const listeners = [];

  function interp(str, vars) {
    if (!vars || typeof str !== "string") return str;
    return str.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
  }
  function t(key, vars) {
    const d = UI[lang] || UI.en;
    let v = d[key];
    if (v == null) v = UI.en[key];
    if (v == null) v = key;
    return interp(v, vars);
  }
  function tag(label) {
    const d = (UI[lang] && UI[lang].tag) || UI.en.tag;
    return d[label] != null ? d[label] : label;
  }
  function game(id) {
    const G = window.__GAME_I18N;
    if (lang === "en" || !G || !G[lang]) return null;
    return G[lang][id] || null;
  }
  function applyStatic(root) {
    root = root || document;
    root.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    root.querySelectorAll("[data-i18n-ph]").forEach((el) => {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph")));
    });
    document.documentElement.lang = lang;
  }
  function set(l) {
    if (SUPPORTED.indexOf(l) === -1 || l === lang) return;
    lang = l;
    try { localStorage.setItem(LS, l); } catch (e) {}
    applyStatic();
    listeners.forEach((fn) => { try { fn(l); } catch (e) {} });
  }
  function onChange(fn) { listeners.push(fn); }

  window.I18n = {
    get lang() { return lang; },
    supported: SUPPORTED,
    labels: LABELS,
    t: t, tag: tag, game: game, set: set, onChange: onChange, applyStatic: applyStatic,
  };
})();
