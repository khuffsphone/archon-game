# Octane Street Racer — Firebase Multiplayer Workspace

This folder is a Codex-accessible workspace for building out **Octane Street Racer**, a browser-based arcade racing game with Firebase-backed remote multiplayer rooms.

## Purpose

Use this folder to evolve the current standalone HTML prototype into a cleaner, more polished game project.

## Current target features

- Arcade-style browser racing game
- Static deployable web app
- Firebase anonymous authentication
- Firestore multiplayer room creation
- Join room by code
- Two-player lobby
- Ready state
- Synchronized countdown and race start
- Low-frequency opponent ghost sync
- Finish reporting and winner calculation

## Important limitation

Firebase is currently intended for room/lobby/state sync. It is **not** an authoritative real-time racing server. Do not claim the game is cheat-proof or production-grade multiplayer until movement validation is server-side.

## Suggested next structure

```text
experiments/octane-street-racer/
├── README.md
├── CODEX_HANDOFF.md
├── firebase.rules
├── index.html
├── src/
│   ├── firebase-room.js
│   ├── game-loop.js
│   ├── renderer.js
│   ├── input.js
│   └── ui.js
└── assets/
```

## Recommended Codex sequence

1. Start from the current single-file HTML prototype.
2. Preserve behavior before visual changes.
3. Make the UI prettier only after the multiplayer room flow still works.
4. Split JavaScript into modules only after smoke testing the baseline.
5. Keep the app static-host compatible unless explicitly asked otherwise.

## Firebase setup required later

The final game will require a real Firebase Web App config and these Firebase products enabled:

- Firebase Authentication with Anonymous sign-in
- Cloud Firestore
- Firebase Hosting, optional but recommended
