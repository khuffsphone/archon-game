# QA Report — board-combat-alpha-0.3

**Date:** 2026-04-03  
**Branch:** `feat/board-combat-alpha-0.3`  
**Status:** ✅ PASS

---

## Automated Tests

### Smoke Tests
```
Results: 59 passed, 0 failed
✅ All smoke tests passed.
```

### TypeScript
```
npx tsc --noEmit (from C:\Dev\archon-game)
Exit code: 0 — 0 errors
```

---

## New Setup Functions Added

| Function | URL Param | Purpose |
|---|---|---|
| `makeDarkAttackerContestSetup()` | `?setup=dark-attacker` | Sorceress (dark) attacks Herald (light), turnFaction='dark' |
| `makeGameOverSetup()` | `?setup=gameover` | Single piece per side, light attacks, proves gameover phase |

---

## Visual Browser QA Results

### Test A: Regression — Light Attacker Path (`?setup=adjacent`)
**Status:** ✅ PASS (carried from 0.2 — not re-run in 0.3 but code is unchanged)

### Test B: Dark Attacker Round-Trip (`?setup=dark-attacker`)
**URL:** `http://localhost:5173/?setup=dark-attacker`  
**Steps:**
1. Board loads — HUD shows "🌑 Dark — Turn 1" ✅
2. Dark piece (Sorceress) visible at (4,5), light piece (Herald) at (4,3) ✅
3. Click Sorceress → selected, attack ring shows on Herald ✅
4. Click Herald → CombatBridge launches with header **"✕ Board Battle — Sorceress vs Herald"** ✅
5. Begin Battle → combat runs normally ✅
6. Light wins in this run — `result.winner = 'light'` ✅
7. CombatBridge fires `onResult`: `outcome = 'defender_wins'` (Herald defended) ✅
8. Board returns — `applyCombatResult` runs with `defender_wins` path ✅

**Key proof:** CombatBridge header correctly shows "Sorceress vs Herald" — dark is the attacker  
**Screenshot:** `combat_bridge_header_1775230869427.png`  
**Recording:** `dark_attacker_qa_1775230741591.webp`

### Test C: Game-Over Proof (`?setup=gameover`)
**URL:** `http://localhost:5173/?setup=gameover`  
**Steps:**
1. Board loads — HUD shows "☀ Light — Turn 1" ✅
2. Only Knight (light) at (4,3) and Sorceress (dark) at (4,5) ✅
3. Click Knight → attack ring appears on Sorceress ✅
4. Click Sorceress → CombatBridge launches (Knight vs Sorceress) ✅
5. Light wins combat → `onResult` fires with `outcome = 'attacker_wins'` ✅
6. `applyCombatResult` checks: `darkAlive = false` → `phase = 'gameover'` ✅
7. Board returns showing **"✺ Light Wins!"** in HUD center ✅
8. Knight has advanced to Sorceress's former square (4,5) ✅
9. Sorceress shown as defeated token ✅
10. "New Game" button visible ✅

**Key proof:** HUD shows "✺ Light Wins!" — not a turn indicator — confirming `phase='gameover'`  
**Screenshot:** `final_board_state_light_wins_gameover_1775230847844.png`  
**Recording:** `gameover_qa_1775230936957.webp`

---

## What Is Technically True (not inflated)

| Behavior | Status |
|---|---|
| Light-attacker round-trip | ✅ Proven in 0.2, code unchanged |
| Dark-attacker round-trip | ✅ Proven in 0.3 — Sorceress shown as attacker in bridge |
| Dark-as-attacker: light wins the combat | ✅ Proven (defender wins in one run — still a valid dark-attacker test) |
| Game-over phase triggered | ✅ Proven — `applyCombatResult` correctly sets `phase='gameover'` |
| Game-over HUD renders correctly | ✅ Proven — "✺ Light Wins!" shown |
| New Game button renders on game-over | ✅ Proven |
| Smoke tests passed | ✅ 59/59 |
| TypeScript clean | ✅ 0 errors |
| No frozen files touched | ✅ CombatScene.tsx, CombatBridge.tsx, board-combat-contract.ts untouched |

## What Is NOT Proven in 0.3

| Behavior | Status |
|---|---|
| Dark faction WINS the combat in the dark-attacker scenario | ❌ RNG resulted in light winning — defender wins was still valid for the bridge test |
| Multi-turn board flow (non-combat moves) | ❌ Not browser-proven in 0.3 |
| Game-over with dark winning | ❌ Not proven — only light-wins gameover was QA'd |
| New Game button actually resets correctly | ❌ Button renders but reset flow not browser-tested |
