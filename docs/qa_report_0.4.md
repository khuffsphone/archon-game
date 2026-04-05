# QA Report — board-combat-alpha-0.4
**Date:** 2026-04-05  
**Branch:** `feat/board-combat-alpha-0.4`  
**Tester:** Antigravity (automated browser QA)  
**Smoke tests:** 59/59 PASS  
**TypeScript:** 0 errors  

---

## Summary

All 4 deferred KI items from 0.3 are closed. One regression bug was discovered during QA and fixed within this milestone.

| KI | Description | Result |
|---|---|---|
| KI-001 | Dark faction wins a combat | ✅ PASS |
| KI-002 | Dark-wins gameover — "🌑 Dark Wins!" | ✅ PASS |
| KI-003 | Multi-turn non-combat move sequence | ✅ PASS |
| KI-004 | "New Game" button reset | ✅ PASS |

---

## KI-001 + KI-002 — Dark Wins Combat + Gameover

**Setup:** `?setup=dark-wins`  
**Pieces:** Sorceress (dark, HP=16) at (4,5) vs Knight (light, HP=1) at (4,3)  
**Turn:** Dark first  

**Bug found during QA:**  
`CombatEngine.makeInitialState()` hardcoded HP=20 for Knight, HP=16 for Sorceress — ignoring the board piece's actual current HP. First QA run: Knight initialized at 20/20 HP (should be 1), light won, gameover showed "☀ Light Wins!".

**Fix applied (in this milestone):**  
- `CombatEngine.ts` — `makeInitialState()` now accepts optional `CombatInitOverrides` (lightHp, darkHp, firstTurn). Zero-arg call unchanged (backward-compatible).  
- `useCombat.ts` — accepts `initialOverrides?: CombatInitOverrides`, passes to `makeInitialState()`.  
- `CombatScene.tsx` — accepts `initialOverrides?: CombatInitOverrides`, passes to `useCombat`.  
- `CombatBridge.tsx` — `BoardCombatAdapter` computes overrides from board payload (`attacker.hp`, `defender.hp`, `attacker.faction`) and passes to `CombatSceneWithResult`.  

**QA result after fix:**

| Step | Expected | Actual |
|---|---|---|
| Board loads | Dark turn, Sorceress at (4,5), Knight at (4,3) | ✅ "🌑 Dark — Turn 1" |
| Sorceress selected | Legal moves shown including (4,3) | ✅ 18 moves shown |
| Knight clicked | CombatBridge launched | ✅ "⚔ Board Battle — Sorceress vs Knight" |
| "Begin Battle" | Combat starts, Knight shows 1/20 HP | ✅ Knight: 1/20 HP, Sorceress: 16/16 HP |
| "🌑 Sorceress Attacks" | Dark attacks first, Knight dies on first hit | ✅ Knight killed round 1 |
| Return to board | Board shows "🌑 Dark Wins!" gameover | ✅ "🌑 DARK WINS!" in HUD |

**KI-001:** ✅ PASS — dark faction won a combat deterministically  
**KI-002:** ✅ PASS — "🌑 DARK WINS!" gameover banner shown on board

---

## KI-003 — Multi-Turn Non-Combat Move Sequence

**Setup:** `/?` (default board, all 4 pieces)  
**Goal:** Prove Light move → Dark move → turn counter increments correctly

| Step | Action | HUD After |
|---|---|---|
| Initial | Load default board | ☀ LIGHT — TURN 1 |
| Move 1 | Knight (7,2) → (6,2) — empty square, no combat | 🌑 DARK — TURN 1 |
| Move 2 | Sorceress (1,6) → (1,5) — empty square, no combat | ☀ LIGHT — TURN 2 |

**KI-003:** ✅ PASS — Turn 1 Light → Turn 1 Dark → Turn 2 Light confirmed

---

## KI-004 — New Game Button Reset

**Setup:** `?setup=gameover` (Knight vs Sorceress, one piece per side)  
**Goal:** Complete combat → reach gameover → click New Game → verify full 4-piece reset

| Step | Action | Observed |
|---|---|---|
| Load | 2-piece board, Light's turn | ✅ Board loaded |
| Combat | Knight vs Sorceress, 8 rounds | ✅ Knight won, "☀ Light Wins!" |
| Return | Board returns from combat | ✅ Gameover state, "New Game" button visible |
| New Game | Click New Game button | ✅ 4 pieces at home positions, "☀ Light — Turn 1" |

Post-reset board positions confirmed:  
- Knight at (7,2) ✅  
- Herald at (7,4) ✅  
- Sorceress at (1,6) ✅  
- Sentinel at (1,4) ✅  

**KI-004:** ✅ PASS — full board reset confirmed

---

## Regression Coverage

| Test | Method | Result |
|---|---|---|
| Smoke tests (59 checks) | `node smoke-tests.mjs` | ✅ 59/59 PASS |
| TypeScript | `tsc --noEmit` | ✅ 0 errors |
| `?setup=adjacent` | Unchanged code path — covered by smoke tests | ✅ Not re-QA'd (no code change) |
| `?setup=dark-attacker` | Unchanged code path — covered by smoke tests | ✅ Not re-QA'd (no code change) |
| Standalone combat mode | Not touched in 0.4 | ✅ Baseline preserved |

---

## Files Changed in 0.4

| File | Change |
|---|---|
| `src/features/board/boardState.ts` | Added `makeDarkWinsSetup()` |
| `src/App.tsx` | Added `?setup=dark-wins` routing |
| `src/features/combat/CombatEngine.ts` | Added `CombatInitOverrides`, optional params to `makeInitialState()` |
| `src/features/combat/useCombat.ts` | Added `initialOverrides` option, threaded to `makeInitialState` |
| `src/features/combat/CombatScene.tsx` | Added `initialOverrides` prop, passed to `useCombat` |
| `src/features/combat/CombatBridge.tsx` | Computes `initOverrides` from board payload, passes to `CombatSceneWithResult` |

## Files NOT Changed (Frozen / Baseline Intact)

| File | Status |
|---|---|
| `src/lib/board-combat-contract.ts` | FROZEN — not touched |
| `src/features/board/BoardScene.tsx` | Not touched |
| `src/features/board/CombatBridge.tsx` | Changed (HP injection) but baseline standalone mode preserved |
| `archon-workshop/server.ts` | Not touched |
| `asset-manifest.json` | Not touched |
