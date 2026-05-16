# CODEX HANDOFF

## Local Smoke-Test Checklist

- [ ] Solo mode loads without Firebase config.
- [ ] Firebase placeholders fail gracefully.
- [ ] Player A creates room.
- [ ] Player B joins room.
- [ ] Both players set ready.
- [ ] Countdown starts once.
- [ ] Race starts once per client.
- [ ] Ghost car updates.
- [ ] Gameover writes finish state.
- [ ] Both finished resolves result.

## Firebase Assumptions

- Firebase is used as a prototype lobby, room, race-state, and ghost-sync service.
- Multiplayer state is non-authoritative and not cheat-proof.
- Clients currently publish their own race position and finish data.
- Firestore rules should be tightened before any public/competitive deployment.

## Known Limitations

- Countdown uses client wall-clock time for prototype synchronization.
- Movement is not server-validated.
- Race finish order can be spoofed by a modified client.
- This is intentionally still a static HTML prototype, not a production multiplayer server architecture.
