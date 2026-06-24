/**
 * Mint Arcade — global leaderboard API (Cloudflare Worker + KV)
 *
 * Routes:
 *   GET  /scores?game=<id>&window=<day|week|month|all>&metric=<score|wins|time>
 *        → { top: [ { name, score, ts }, ... up to 10 ] }
 *          ts = when the player achieved it (best-score time, or latest win)
 *   POST /scores   body: { game, name, score }  or  { game, name, win: 1 }
 *        → { ok: true }
 *
 * Storage: one KV key per game ("game:<id>") holding a JSON array of events
 *          { n: name, t: timestamp, s?: score, w?: 1 }. Events older than
 *          ~90 days (or beyond the last 5000) are trimmed on write.
 *
 * Binding: a KV namespace bound as `LEADERBOARD` (see wrangler.toml).
 */

const SPANS = { day: 864e5, week: 6048e5, month: 2592e6, all: Infinity };
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

    const url = new URL(request.url);
    if (url.pathname !== "/scores") return json({ error: "not found" }, 404);

    const kv = env.LEADERBOARD;

    if (request.method === "GET") {
      const game = (url.searchParams.get("game") || "").slice(0, 40);
      const win = url.searchParams.get("window") || "all";
      const m = url.searchParams.get("metric");
      const metric = m === "wins" ? "wins" : m === "time" ? "time" : "score";
      if (!game) return json({ error: "missing game" }, 400);

      const raw = await kv.get("game:" + game);
      const events = raw ? JSON.parse(raw) : [];
      const span = SPANS[win] || Infinity;
      const cutoff = span === Infinity ? 0 : Date.now() - span;
      const lower = metric === "time"; // lower is better — keep each player's fastest

      const agg = Object.create(null);
      for (const e of events) {
        if ((e.t || 0) < cutoff) continue;
        const a = agg[e.n] || (agg[e.n] = { score: 0, ts: 0, set: false });
        if (metric === "wins") {
          a.score += (e.w || 0);
          if (e.w && (e.t || 0) > a.ts) a.ts = e.t || 0; // most recent win
        } else {
          const s = Number(e.s) || 0;
          if (lower ? (!a.set || s < a.score) : (s > a.score || !a.set)) { a.score = s; a.ts = e.t || 0; a.set = true; }
        }
      }
      const top = Object.keys(agg)
        .map((n) => ({ name: n, score: agg[n].score, ts: agg[n].ts }))
        .filter((r) => (metric === "wins" ? r.score > 0 : (lower ? r.score > 0 : true)))
        .sort((a, b) => (lower ? a.score - b.score : b.score - a.score))
        .slice(0, 10);
      return json({ top });
    }

    if (request.method === "POST") {
      let body;
      try { body = await request.json(); } catch (e) { return json({ error: "bad json" }, 400); }

      const game = String(body.game || "").slice(0, 40).trim();
      const name = String(body.name || "").slice(0, 24).trim();
      if (!game || !name) return json({ error: "missing game/name" }, 400);

      const entry = { n: name, t: Date.now() };
      if (body.win) {
        entry.w = 1;
      } else {
        const s = Number(body.score);
        if (!isFinite(s)) return json({ error: "bad score" }, 400);
        entry.s = Math.round(s);
      }

      const key = "game:" + game;
      const raw = await kv.get(key);
      const events = raw ? JSON.parse(raw) : [];
      events.push(entry);
      const minT = Date.now() - 90 * 864e5;
      const trimmed = events.filter((e) => (e.t || 0) >= minT).slice(-5000);
      await kv.put(key, JSON.stringify(trimmed));
      return json({ ok: true });
    }

    return json({ error: "method not allowed" }, 405);
  },
};
