# 🌿 Mint Arcade

A light, mint-green collection of **12 mini games** you can play right in the browser —
solo or with friends on the same screen. No build step, no dependencies.

## ▶ How to run

**Just open it.** Double-click `index.html` (or drag it into your browser).

Or publish it free with **GitHub Pages**:
1. Push this repo to GitHub.
2. Repo → **Settings → Pages** → Source: `main` branch, `/ (root)`.
3. Your arcade goes live at `https://<user>.github.io/gaming/`.

## ✨ Features

- **Username gate** — enter a name before you play (remembered between visits).
- **Per-game rules** — every game explains itself on its setup screen.
- **Options** — speed, board size, difficulty, round length, win targets, and more.
- **1–4 players** — hot-seat multiplayer where it makes sense; computer opponents where it helps.
- **Mint theme**, responsive layout, search + category filters.

## 🎮 The games

| Game | Players | Notes |
|------|---------|-------|
| 🐍 Snake | 1 | speed, board size, solid-walls toggle |
| ❌ Tic-Tac-Toe | 1–2 | vs friend or computer (easy/smart) |
| 🔴 Connect Four | 2 | classic 7×6 or big 9×7 |
| 🧠 Memory Match | 1–4 | turn-based, 6–12 pairs |
| ✊ Rock Paper Scissors | 1–2 | vs computer or secret hot-seat picks |
| 🐹 Whack-a-Mole | 1–4 | timed rounds, bombs on Hard |
| 🔢 2048 | 1 | target tile 256 / 1024 / 2048 |
| 🎵 Simon Says | 1–4 | memory sequence, longest wins |
| ⚡ Reaction Test | 1–4 | fastest average reaction time |
| 🏓 Pong | 1–2 | W/S vs ↑/↓, or vs computer |
| 💣 Minesweeper | 1 | easy / medium / hard fields |
| 🔤 Hangman | 1–4 | animals / fruits / countries / mixed |

## 🧩 Adding your own game

Each game is a self-contained file in `js/games/` that calls `Arcade.register({...})`.
Copy any existing one, give it a unique `id`, define `rules`, `options`, and a
`create(api)` function, then add a `<script>` tag for it in `index.html`. That's it —
the hub, setup screen, scoreboard, and player setup are all handled for you.

---
Made for fun • plays on one screen 🌱
