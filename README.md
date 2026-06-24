# 🌿 Mint Arcade

A light, mint-green collection of **35 mini games** you can play right in the browser —
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
| 🚢 Battleship | 2–4 | place fleet, ring-fire to sink rivals; last afloat wins |
| ⬜ Dots & Boxes | 2–4 | close boxes to claim them |
| 🎰 Yahtzee | 1–4 | roll 5 dice, bank the best category |
| 🏎️ Car Racer | 1 | dodge highway traffic at speed |
| 🃏 Blackjack | 1–4 | hit or stand, beat the dealer to 21 |
| 🕵️ Mastermind | 1 | crack the hidden colour code from clues |
| 🔤 Word Master | 1 | Wordle-style: green/yellow letter hints |
| 🔢 Sudoku | 1 | 9×9 number puzzle, easy/medium/hard |
| ♟️ Checkers | 2 | jump & capture, crown your kings |
| 🔵 Five in a Row | 1–2 | Gomoku — line up five (vs friend or computer) |
| 🧱 Breakout | 1 | bounce the ball, smash all the bricks |
| 🐤 Flappy | 1 | one-tap flapping through the pipes |
| 🎲 Pig (Dice) | 2–4 | push-your-luck dice race to the target |
| 🕵️ Number Detective | 1 | crack the secret number from higher/lower clues |
| 🔐 Code Crack | 1 | bulls & cows digit deduction |
| 🗺️ Treasure Hunt | 1 | dig for treasure with hot/cold clues |
| 🃏 Higher or Lower | 1 | call the next card, ride your streak |
| 🃏 Crazy Eights | 2 | match suit/rank, play wild 8s, empty your hand |
| 🔤 Word Scramble | 1 | unscramble the jumbled word |
| 📝 Word Recall | 1 | memorise the flashed word, type it back |
| 💪 Tug of War | 2 | mash your key to drag the rope across the line |
| 💡 Lights Out | 1 | toggle lights and neighbours until all go dark |

> The leaderboard records high scores (and win tallies for duels like Battleship, War, Dice Duel),
> filterable by **Today / Week / Month / All time**, shown both in a hub modal and beside each game.

## 🧩 Adding your own game

Each game is a self-contained file in `js/games/` that calls `Arcade.register({...})`.
Copy any existing one, give it a unique `id`, define `rules`, `options`, and a
`create(api)` function, then add a `<script>` tag for it in `index.html`. That's it —
the hub, setup screen, scoreboard, and player setup are all handled for you.

---
Made for fun • plays on one screen 🌱
