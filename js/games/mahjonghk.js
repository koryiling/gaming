/* Hong Kong Mahjong (simplified) — you vs 3 computers.
   Draw/discard with Pong, Kong, Chow and standard 4-sets-plus-a-pair win.
   Note: simplified rules — no flowers and no faan scoring; first to a valid hand wins. */
Arcade.register({
  id: "mahjonghk",
  name: "Mahjong (HK)",
  emoji: "🀅",
  tagline: "Hong-Kong-style 4-player mahjong vs the computer. Build 4 sets + a pair.",
  tags: ["Tiles", "Strategy", "Solo"],
  minPlayers: 1,
  maxPlayers: 1,
  rules: [
    "Form a winning hand: four sets (a run or a triplet) plus one pair.",
    "On your turn, draw a tile then discard one (tap a tile to discard).",
    "Claim another player's discard: Pong (2 same), Kong (3 same), Chow (run, from left player only), or Mahjong to win.",
    "Simplified: no flowers, no faan scoring — first valid hand wins the round.",
  ],
  options: [
    { key: "speed", label: "Computer speed", type: "select", default: 650,
      choices: [{ label: "Relaxed", value: 1000 }, { label: "Normal", value: 650 }, { label: "Fast", value: 350 }] },
  ],

  create(api) {
    const SP = api.config.options.speed;
    const SEAT = ["You", "🤖 South", "🤖 West", "🤖 North"];
    const COLORS = ["#2e9d6c", "#e67e22", "#3498db", "#9b59b6"];
    // tile types 0-33
    function tileChar(t) {
      if (t < 9) return String.fromCodePoint(0x1F007 + t);       // man 1-9
      if (t < 18) return String.fromCodePoint(0x1F019 + (t - 9)); // pin (circles) 1-9
      if (t < 27) return String.fromCodePoint(0x1F010 + (t - 18));// sou (bamboo) 1-9
      if (t < 31) return String.fromCodePoint(0x1F000 + (t - 27));// winds E S W N
      return String.fromCodePoint(0x1F004 + (t - 31));            // dragons R G W
    }
    function suitOf(t) { return t < 9 ? 0 : t < 18 ? 1 : t < 27 ? 2 : 3; }

    // ---- win logic ----
    function canFormMelds(counts, need) {
      let i = 0; while (i < 34 && counts[i] === 0) i++;
      if (i === 34) return need === 0;
      if (need === 0) return false;
      if (counts[i] >= 3) { counts[i] -= 3; if (canFormMelds(counts, need - 1)) { counts[i] += 3; return true; } counts[i] += 3; }
      if (i < 27 && (i % 9) <= 6 && counts[i + 1] > 0 && counts[i + 2] > 0) {
        counts[i]--; counts[i + 1]--; counts[i + 2]--;
        if (canFormMelds(counts, need - 1)) { counts[i]++; counts[i + 1]++; counts[i + 2]++; return true; }
        counts[i]++; counts[i + 1]++; counts[i + 2]++;
      }
      return false;
    }
    function isWin(counts, need) {
      for (let i = 0; i < 34; i++) if (counts[i] >= 2) {
        counts[i] -= 2; const ok = canFormMelds(counts, need); counts[i] += 2;
        if (ok) return true;
      }
      return false;
    }
    function countsOf(tiles) { const c = Array(34).fill(0); tiles.forEach((t) => c[t]++); return c; }
    function winCheck(tiles, melds) {
      const need = 4 - melds;
      if (tiles.length !== 14 - 3 * melds) return false;
      return isWin(countsOf(tiles), need);
    }

    // ---- state ----
    let wall, players, current, phase, pending = null, over = false;
    function deal() {
      wall = [];
      for (let t = 0; t < 34; t++) for (let k = 0; k < 4; k++) wall.push(t);
      for (let i = wall.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [wall[i], wall[j]] = [wall[j], wall[i]]; }
      players = SEAT.map(() => ({ hand: [], melds: [], discards: [] }));
      for (let k = 0; k < 13; k++) players.forEach((p) => p.hand.push(wall.pop()));
      players.forEach((p) => p.hand.sort((a, b) => a - b));
      current = 0; phase = "draw"; over = false; pending = null;
      render();
      step();
    }

    // ---- DOM ----
    const root = api.el("div", "");
    root.style.cssText = "display:flex;flex-direction:column;gap:12px;width:" + Math.min(620, window.innerWidth - 30) + "px";
    const oppEl = api.el("div", ""); oppEl.style.cssText = "display:flex;flex-direction:column;gap:6px";
    const tableEl = api.el("div", ""); tableEl.style.cssText = "min-height:46px;background:#cdeede;border-radius:12px;padding:8px;display:flex;flex-wrap:wrap;gap:3px;align-items:center";
    const meldEl = api.el("div", ""); meldEl.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;min-height:10px";
    const handEl = api.el("div", ""); handEl.style.cssText = "display:flex;flex-wrap:wrap;gap:4px;background:#fff;border-radius:12px;padding:10px;box-shadow:var(--shadow)";
    const actEl = api.el("div", ""); actEl.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;justify-content:center;min-height:20px";
    root.appendChild(oppEl); root.appendChild(api.el("div", "", "<div style='text-align:center;color:var(--ink-soft);font-size:13px'>🀫 Discards</div>"));
    root.appendChild(tableEl); root.appendChild(meldEl); root.appendChild(handEl); root.appendChild(actEl);
    api.board.appendChild(root);

    function tileSpan(t, big, faceDown) {
      const s = api.el("span", "");
      const sz = big ? 30 : 22;
      s.style.cssText = "display:inline-grid;place-items:center;min-width:" + (sz * 0.95) + "px;height:" + (sz * 1.35) + "px;" +
        "font-size:" + sz + "px;background:" + (faceDown ? "#9fe0bf" : "#fcfff9") + ";border:1px solid #cfe7da;border-radius:5px;padding:0 2px";
      s.textContent = faceDown ? "🀫" : tileChar(t);
      if (t >= 27) s.style.color = t >= 31 ? "#c0392b" : "#2980b9";
      return s;
    }
    function meldBox(p) {
      return p.melds.map((m) => {
        const box = api.el("span", ""); box.style.cssText = "display:inline-flex;gap:1px;padding:2px;background:#eafaf0;border-radius:6px";
        m.tiles.forEach((t) => box.appendChild(tileSpan(t, false)));
        return box;
      });
    }
    function render() {
      // opponents
      oppEl.innerHTML = "";
      [1, 2, 3].forEach((i) => {
        const p = players[i];
        const row = api.el("div", "");
        row.style.cssText = "display:flex;align-items:center;gap:8px;background:#fff;border-radius:10px;padding:5px 10px;box-shadow:var(--shadow);" +
          "border:2px solid " + (current === i && !over ? COLORS[i] : "transparent");
        const label = api.el("span", "", "<b style='color:" + COLORS[i] + "'>" + SEAT[i] + "</b> ×" + p.hand.length);
        label.style.minWidth = "120px";
        row.appendChild(label);
        meldBox(p).forEach((b) => row.appendChild(b));
        const last = p.discards.slice(-6);
        if (last.length) { const d = api.el("span", "", " 🗑 "); d.style.opacity = ".6"; row.appendChild(d); last.forEach((t) => row.appendChild(tileSpan(t, false))); }
        oppEl.appendChild(row);
      });
      // table = all discards interleaved (recent)
      tableEl.innerHTML = "";
      const all = [];
      players.forEach((p, i) => p.discards.forEach((t, k) => all.push({ t, i, k })));
      all.slice(-28).forEach((d) => { const s = tileSpan(d.t, false); s.style.opacity = ".95"; tableEl.appendChild(s); });
      // human melds + hand
      meldEl.innerHTML = "<span style='color:var(--ink-soft);font-size:13px;align-self:center'>Your melds:</span>";
      meldBox(players[0]).forEach((b) => meldEl.appendChild(b));
      renderHand();
      scoreboard();
    }
    function renderHand() {
      handEl.innerHTML = "";
      const me = players[0];
      me.hand.forEach((t, idx) => {
        const s = tileSpan(t, true);
        const canDiscard = !over && phase === "discard" && current === 0;
        if (canDiscard) { s.style.cursor = "pointer"; s.addEventListener("click", () => humanDiscard(idx)); s.addEventListener("mouseenter", () => (s.style.transform = "translateY(-6px)")); s.addEventListener("mouseleave", () => (s.style.transform = "none")); s.style.transition = "transform .1s"; }
        handEl.appendChild(s);
      });
    }
    function scoreboard() {
      api.setScores(SEAT.map((n, i) => ({ name: n, value: players[i].melds.length + " melds", color: COLORS[i], turn: current === i && !over })));
    }

    // ---- turn flow ----
    function step() {
      if (over) return;
      if (current === 0) drawFor(0);
      else setTimeout(() => drawFor(current), SP);
    }
    function drawFor(p) {
      if (over) return;
      if (!wall.length) { phase = "done"; over = true; api.setStatus("🀄 Wall empty — draw game. Hit Restart for a new round."); return; }
      const t = wall.pop();
      players[p].hand.push(t);
      players[p].hand.sort((a, b) => a - b);
      if (winCheck(players[p].hand, players[p].melds.length)) {
        if (p === 0) {
          phase = "discard"; render();
          api.setStatus("🎉 You can declare <b>Mahjong</b>! " +
            "<button class='btn primary small' id='mj-win'>🀄 Mahjong!</button> or discard to keep playing.");
          const b = document.getElementById("mj-win"); if (b) b.addEventListener("click", () => declareWin(0, true));
          return;
        } else { return declareWin(p, true); }
      }
      phase = "discard"; current = p; render();
      if (p === 0) api.setStatus("Your turn — tap a tile to discard.");
      else { api.setStatus(SEAT[p] + " is thinking…"); setTimeout(() => aiDiscard(p), SP); }
    }
    function humanDiscard(idx) {
      if (phase !== "discard" || current !== 0) return;
      const t = players[0].hand.splice(idx, 1)[0];
      players[0].discards.push(t);
      render();
      afterDiscard(0, t);
    }
    function aiDiscard(p) {
      if (over) return;
      const hand = players[p].hand;
      const c = countsOf(hand);
      function score(t) {
        if (t >= 27) return c[t] >= 2 ? 6 : 0;
        let s = c[t] >= 2 ? 5 : 0;
        const r = t % 9;
        if (r > 0 && c[t - 1]) s += 2; if (r < 8 && c[t + 1]) s += 2;
        if (r > 1 && c[t - 2]) s += 1; if (r < 7 && c[t + 2]) s += 1;
        return s;
      }
      let worst = 0, ws = 1e9;
      hand.forEach((t, i) => { const s = score(t) + Math.random() * 0.3; if (s < ws) { ws = s; worst = i; } });
      const t = hand.splice(worst, 1)[0];
      players[p].discards.push(t);
      render();
      afterDiscard(p, t);
    }

    // ---- claims on a discard ----
    function canChow(p, tile) {
      if (tile >= 27) return false;
      const c = countsOf(players[p].hand); const r = tile % 9;
      if (r >= 2 && c[tile - 2] && c[tile - 1]) return [tile - 2, tile - 1];
      if (r >= 1 && r <= 7 && c[tile - 1] && c[tile + 1]) return [tile - 1, tile + 1];
      if (r <= 6 && c[tile + 1] && c[tile + 2]) return [tile + 1, tile + 2];
      return false;
    }
    function afterDiscard(d, tile) {
      if (over) return;
      // gather candidate claims
      const cands = [];
      for (let off = 1; off <= 3; off++) {
        const p = (d + off) % 4;
        const cnt = countsOf(players[p].hand)[tile];
        const handPlusTile = players[p].hand.concat(tile);
        if (winCheck(handPlusTile, players[p].melds.length)) cands.push({ p, kind: "win", prio: 3 });
        if (cnt >= 3) cands.push({ p, kind: "kong", prio: 2 });
        else if (cnt >= 2) cands.push({ p, kind: "pong", prio: 2 });
        const isNext = p === (d + 1) % 4;
        if (isNext) { const ch = canChow(p, tile); if (ch) cands.push({ p, kind: "chow", prio: 1, run: ch }); }
      }
      const humanCands = cands.filter((c) => c.p === 0);
      if (humanCands.length) {
        offerHumanClaims(d, tile, cands, humanCands);
      } else {
        resolveClaims(d, tile, cands, null);
      }
    }
    function offerHumanClaims(d, tile, cands, humanCands) {
      phase = "claim";
      actEl.innerHTML = "";
      const seen = {};
      humanCands.forEach((c) => {
        if (seen[c.kind]) return; seen[c.kind] = true;
        const labels = { win: "🀄 Mahjong!", pong: "Pong", kong: "Kong", chow: "Chow" };
        const b = api.el("button", "btn " + (c.kind === "win" ? "primary" : "ghost") + " small", labels[c.kind]);
        b.addEventListener("click", () => { actEl.innerHTML = ""; resolveClaims(d, tile, cands, c); });
        actEl.appendChild(b);
      });
      const pass = api.el("button", "btn ghost small", "Pass");
      pass.addEventListener("click", () => { actEl.innerHTML = ""; resolveClaims(d, tile, cands, null); });
      actEl.appendChild(pass);
      api.setStatus("You can claim <b>" + tile2name(tile) + "</b> — choose an action.");
    }
    function aiAccepts(c) {
      if (c.kind === "win") return true;
      if (c.kind === "pong" || c.kind === "kong") return Math.random() < 0.5;
      return false; // AI doesn't chow in this simplified version
    }
    function resolveClaims(d, tile, cands, humanChoice) {
      const accepted = [];
      if (humanChoice) accepted.push(humanChoice);
      cands.filter((c) => c.p !== 0).forEach((c) => { if (aiAccepts(c)) accepted.push(c); });
      if (!accepted.length) { phase = "draw"; current = (d + 1) % 4; render(); return step(); }
      accepted.sort((a, b) => b.prio - a.prio || ((a.p - d + 4) % 4) - ((b.p - d + 4) % 4));
      const win = accepted[0];
      if (win.kind === "win") return declareWin(win.p, false, tile, d);
      executeMeld(win, tile, d);
    }
    function executeMeld(claim, tile, d) {
      const p = players[claim.p];
      if (claim.kind === "chow") {
        claim.run.forEach((t) => p.hand.splice(p.hand.indexOf(t), 1));
        p.melds.push({ type: "chow", tiles: [claim.run[0], claim.run[1], tile].sort((a, b) => a - b) });
      } else {
        const n = claim.kind === "kong" ? 3 : 2;
        for (let k = 0; k < n; k++) p.hand.splice(p.hand.indexOf(tile), 1);
        p.melds.push({ type: claim.kind, tiles: Array(n + 1).fill(tile) });
      }
      // remove the claimed tile from discarder's pile
      players[d].discards.pop();
      current = claim.p; render();
      if (claim.kind === "kong") {
        // draw replacement
        if (wall.length) { const r = wall.pop(); p.hand.push(r); p.hand.sort((a, b) => a - b); }
      }
      phase = "discard";
      if (claim.p === 0) { render(); api.setStatus("You claimed " + claim.kind.toUpperCase() + " — now discard a tile."); }
      else { render(); api.setStatus(SEAT[claim.p] + " claimed " + claim.kind.toUpperCase() + "."); setTimeout(() => aiDiscard(claim.p), SP); }
    }
    function tile2name(t) {
      const suits = ["Characters", "Circles", "Bamboo"];
      if (t < 27) return (t % 9 + 1) + " " + suits[suitOf(t)];
      return ["East", "South", "West", "North", "Red Dragon", "Green Dragon", "White Dragon"][t - 27];
    }
    function declareWin(p, selfDraw, tile, d) {
      over = true; phase = "done";
      if (tile != null && d != null) { players[d].discards.pop(); players[p].hand.push(tile); players[p].hand.sort((a, b) => a - b); }
      render();
      api.setStatus("🏆 " + SEAT[p] + (selfDraw ? " self-drew" : " claimed the winning tile") + " — <b>Mahjong!</b> 🎉 Hit Restart for a new round.");
    }

    deal();
    return { stop() { over = true; } };
  },
});
