# 🌿 Mint Arcade

A light, mint-green collection of **25 mini games** you can play right in the browser —
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
| 🎲 Snakes & Ladders | 2–4 | dice race, climb ladders / dodge snakes |
| 🧱 Tetris | 1 | rotate & drop, clear lines, levels up |
| 🚢 Battleship | 2 | place fleet, fire to sink the rival |
| ⬜ Dots & Boxes | 2–4 | close boxes to claim them |
| 🎰 Yahtzee | 1–4 | roll 5 dice, bank the best category |
| ⚫ Reversi | 1–2 | flank & flip discs (vs friend or computer) |
| 🀄 Mahjong Solitaire | 1 | match free tile pairs to clear the layout |
| 🏎️ Car Racer | 1 | dodge highway traffic at speed |
| 🃏 Blackjack | 1–4 | hit or stand, beat the dealer to 21 |
| 🀅 Mahjong (HK) | 1 | simplified 4-player mahjong vs computers |

| 🕵️ Mastermind | 1 | crack the hidden colour code from clues |
| 🔤 Word Master | 1 | Wordle-style: green/yellow letter hints |
| 🔢 Sudoku | 1 | 9×9 number puzzle, easy/medium/hard |

> Note: **Mahjong (HK)** is a simplified version — draw/discard with Pong/Kong/Chow and the
> standard four-sets-plus-a-pair win, but no flowers and no faan scoring (first valid hand wins).

## 🧩 Adding your own game

Each game is a self-contained file in `js/games/` that calls `Arcade.register({...})`.
Copy any existing one, give it a unique `id`, define `rules`, `options`, and a
`create(api)` function, then add a `<script>` tag for it in `index.html`. That's it —
the hub, setup screen, scoreboard, and player setup are all handled for you.

---
Made for fun • plays on one screen 🌱
