# Codex Handoff — Octane Street Racer

## Assignment

Build out and polish the Octane Street Racer multiplayer prototype.

The user has a single-file HTML canvas racing game that was enhanced with Firebase multiplayer room support. The next step is to make it cleaner, more maintainable, and more visually polished while preserving multiplayer behavior.

## Non-negotiable constraints

1. Do not remove Firebase anonymous auth.
2. Do not remove Firestore room creation.
3. Do not remove join-by-code behavior.
4. Do not remove ready-state synchronization.
5. Do not remove synchronized countdown/start.
6. Do not remove opponent ghost sync.
7. Do not claim Firebase provides cheat-proof real-time racing.
8. Keep the project deployable as a static web app unless the user explicitly authorizes a server.
9. Do not introduce React, Next.js, Phaser, Vite, or another framework unless you first preserve the current single-file baseline.
10. Improve visuals after functionality is stable.

## Recommended implementation plan

### Phase 1 — Baseline import

- Add the finalized HTML prototype as `index.html`.
- Confirm it opens locally in a browser.
- Confirm it still shows the splash screen, menu, and race loop without Firebase configured.
- Firebase should fail gracefully when config placeholders are still present.

### Phase 2 — Multiplayer smoke test

After Firebase config is added:

- Browser A creates room.
- Browser B joins by code.
- Both players appear in lobby.
- Both players can toggle ready.
- Countdown starts only when both are ready.
- Race starts once for each client.
- Opponent ghost appears or degrades safely.
- Game over writes final score.

### Phase 3 — Refactor

Only after Phase 1 and Phase 2 pass:

- Move Firebase room logic into `src/firebase-room.js`.
- Move input handling into `src/input.js`.
- Move drawing helpers into `src/renderer.js`.
- Move UI/screen functions into `src/ui.js`.
- Keep `index.html` as the static entrypoint.

### Phase 4 — Visual polish

- Make the lobby look like an arcade racing terminal.
- Improve room-code presentation.
- Improve ready-state cards.
- Add clearer multiplayer status messages.
- Improve game-over result comparison.
- Add a proper mobile layout for room controls.

## Firebase data model

```text
rooms/{roomCode}
  roomCode
  status: waiting | countdown | playing | finished
  player1Id
  player2Id
  player1Ready
  player2Ready
  createdAt
  countdownStartedAt
  targetStartTime
  startedAt
  winnerId

rooms/{roomCode}/players/{playerId}
  uid
  slot
  ready
  joinedAt
  lastSeen
  finalScore
  finished
  finishedAt

rooms/{roomCode}/raceState/{playerId}
  x
  y
  speed
  score
  distance
  lives
  updatedAt
```

## Networking rule

Do not write every animation frame to Firestore. Throttle race-state writes to approximately 5 times per second or less.

## Production warning

This is a prototype multiplayer model. For authoritative real-time racing, add a server-side movement validator or dedicated WebSocket/game server later.
