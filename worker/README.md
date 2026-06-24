# Mint Arcade — Global Leaderboard backend

A tiny [Cloudflare Worker](https://workers.cloudflare.com/) + [KV](https://developers.cloudflare.com/kv/)
REST API that stores global high scores / win tallies for the arcade. Free tier is
plenty for a hobby project.

## What it does

- `GET  /scores?game=<id>&window=<day|week|month|all>&metric=<score|wins>` → `{ top: [{name, score}, …] }`
- `POST /scores` with `{ game, name, score }` or `{ game, name, win: 1 }` → `{ ok: true }`

Each game's events are kept in one KV key (`game:<id>`), trimmed to ~90 days / last 5000 entries.

## Deploy (one time)

You need a free Cloudflare account and [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/).

```bash
cd worker
npm install -g wrangler        # if you don't have it
wrangler login                 # opens browser to authorize

# 1) create the KV namespace, then copy the printed id into wrangler.toml
wrangler kv namespace create LEADERBOARD

# 2) edit wrangler.toml → replace PUT_YOUR_KV_NAMESPACE_ID_HERE with that id

# 3) deploy
wrangler deploy
```

Wrangler prints your Worker URL, e.g. `https://mint-arcade-leaderboard.<your-subdomain>.workers.dev`.

## Connect the site

Open `js/config.js` in the repo root and set the URL:

```js
window.MINT_CFG = { leaderboardUrl: "https://mint-arcade-leaderboard.<your-subdomain>.workers.dev" };
```

Commit & push — GitHub Pages redeploys, and the **🌍 Global** tab on the leaderboard goes live.
Leave the URL empty to keep local-only leaderboards.

## Notes

- CORS is open (`*`) since scores are public and there are no credentials.
- This is a casual leaderboard: scores are submitted by the public client, so a determined
  user could post fake numbers. Add server-side validation/auth if you need it cheat-proof.
- KV is eventually consistent; a freshly posted score may take a few seconds to appear.
