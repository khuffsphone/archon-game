# Release Summary — board-combat-alpha-0.3

**Tag:** `board-combat-alpha-0.3` (to be applied after PR merge)  
**Branch:** `feat/board-combat-alpha-0.3`  
**Date:** 2026-04-03  
**Base:** `board-combat-alpha-0.2` (board state persistence + light-attacker round-trip)

---

## What Was Delivered

### Milestone A — Dark Attacker Setup & Round-Trip ✅
- Added `makeDarkAttackerContestSetup()` to `boardState.ts`
- Places Sorceress (dark) at (4,5), Herald (light) at (4,3), `turnFaction='dark'`
- Accessible via `?setup=dark-attacker`
- **Visually proven:** CombatBridge launches with "✕ Board Battle — Sorceress vs Herald" — dark is the named attacker

### Milestone B — Multi-Turn Stability ✅ (architectural)
- `executeMove()` correctly flips `turnFaction` after every move (existing code, verified correct)
- `applyCombatResult()` also flips `turnFaction` after combat resolution (existing code, verified correct)
- Board state persists across all mode switches (from 0.2 baseline — code unchanged, behavior confirmed)

### Milestone C — Game-Over / Winner State ✅
- Added `makeGameOverSetup()` to `boardState.ts`
- Single piece per side — Knight (light) vs Sorceress (dark), `turnFaction='light'`
- Accessible via `?setup=gameover`
- When Knight wins: `applyCombatResult` detects `darkAlive=false` → `phase='gameover'`
- **Visually proven:** Board HUD shows "✺ Light Wins!" after combat, Knight advances, Sorceress shown as defeated, "New Game" button rendered

---

## Files Changed

| File | Change |
|---|---|
| `src/features/board/boardState.ts` | Added `makeDarkAttackerContestSetup()` and `makeGameOverSetup()` (+~100 lines) |
| `src/App.tsx` | Added `?setup=dark-attacker` and `?setup=gameover` URL param handling (+6 lines) |
| `docs/qa_report_0.3.md` | NEW |
| `docs/known_issues_0.3.md` | NEW |
| `docs/release_summary_0.3.md` | NEW (this file) |

## Files NOT Changed (intentionally)

| File | Reason |
|---|---|
| `src/lib/board-combat-contract.ts` | FROZEN — no contract changes needed |
| `src/features/combat/CombatScene.tsx` | FROZEN — faction-neutral, works as-is for dark attacker |
| `src/features/combat/CombatBridge.tsx` | No change needed — attacker identity in bridge header works correctly |
| `src/features/board/BoardScene.tsx` | No change needed — gameover HUD already existed |

---

## QA Results

| Test | Result |
|---|---|
| Smoke tests | 59/59 PASS |
| TypeScript | 0 errors |
| `?setup=adjacent` (regression) | ✅ Code unchanged — 0.2 QA artifacts still valid |
| `?setup=dark-attacker` round-trip | ✅ Visually proven — screenshot confirms bridge header |
| `?setup=gameover` game-over state | ✅ Visually proven — HUD shows "✺ Light Wins!", New Game button |

---

## Honesty Statement

The following were NOT proven in 0.3:
- Dark faction winning a combat (RNG resulted in light winning in the dark-attacker QA run)
- Dark-wins gameover banner
- Non-combat multi-turn move sequence in browser
- New Game button reset behavior

These are deferred to 0.4 as KI-001 through KI-004.

---

## Deferred to 0.4

| Item | Description |
|---|---|
| Dark wins combat proof | Need dark to win at least one combat in QA |
| Dark wins gameover proof | "🌑 Dark Wins!" banner |
| Non-combat multi-turn browser proof | Several non-combat moves + contest |
| New Game button reset proof | Click New Game → board resets |
| Workshop Lane 2 | Optional: board-state preview in Scene Lab |
