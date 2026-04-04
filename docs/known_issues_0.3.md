# Known Issues — board-combat-alpha-0.3

**Milestone:** `board-combat-alpha-0.3`  
**Date:** 2026-04-03

---

## Open Issues

### KI-001: Dark faction winning a combat not yet QA'd
- **Severity:** Low
- **Description:** In the dark-attacker QA run, the light faction (Herald) won the combat, which tested the `defender_wins` path of `applyCombatResult`. The `attacker_wins` path with dark as attacker was not observed. The code path exists — RNG was unfavorable.
- **Target:** 0.4

### KI-002: Game-over with dark winning not QA'd
- **Severity:** Low
- **Description:** Only "Light Wins!" gameover was browser-proven. The dark-wins gameover branch (BoardScene line 107: "🌑 Dark Wins!") exists in code but was not triggered in this milestone.
- **Target:** 0.4

### KI-003: Multi-turn non-combat flow not browser-proven
- **Severity:** Low
- **Description:** Board state persistence across non-contest moves (piece moves without triggering combat) was verified architecturally but not browser-demonstrated in 0.3 QA.
- **Target:** 0.4

### KI-004: New Game button (gameover reset) not browser-tested
- **Severity:** Low
- **Description:** The "New Game" button renders correctly on gameover but clicking it to reset to `makeInitialBoardState()` was not exercised in 0.3 browser QA.
- **Target:** 0.4

### KI-005: Workshop Lane 2 (board-state preview) still deferred
- **Severity:** Low
- **Description:** Scene Lab in archon-workshop does not show board piece slots or missing slot warnings. This was deferred from 0.2 and remains out of scope for 0.3.
- **Target:** Separate Workshop lane

### KI-006 (RESOLVED): gitpush/ temp directory
- **Status:** ✅ Resolved — `C:\Dev\gitpush/` was cleaned up

---

## Resolved in 0.3

- ✅ Dark-attacker board setup — `makeDarkAttackerContestSetup()` added
- ✅ Game-over board setup — `makeGameOverSetup()` added
- ✅ URL routing for `?setup=dark-attacker` and `?setup=gameover`
- ✅ Game-over phase visually proven (board-level `phase='gameover'`, "Light Wins!" HUD)
- ✅ CombatBridge correctly identifies dark as attacker in board-launched mode

## Resolved in 0.2

- ✅ Board state reset on mode switch — fixed by lifting boardState to App.tsx
- ✅ `node_modules` tracked in git — cleaned from index
- ✅ VFX anchor targeting — fixed in v1.1.1

## Resolved in v1.1.1

- ✅ Hit VFX anchored to wrong side — corrected
- ✅ Manifest duplicate entries — dedup guard added
