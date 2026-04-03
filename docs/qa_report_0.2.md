# QA Report — board-combat-alpha-0.2

**Date:** 2026-04-02  
**Tag:** `board-combat-alpha-0.2`  
**Branch:** `feat/board-combat-alpha-0.2`  
**Status:** ✅ PASS

---

## Automated Tests

### Smoke Tests
```
node smoke-tests.mjs (from C:\Dev)
Results: 59 passed, 0 failed
✅ All smoke tests passed.
```

### TypeScript
```
npx tsc --noEmit (from C:\Dev\archon-game)
Exit code: 0 — 0 errors
```

---

## Visual Browser QA

### Test: Board State Persistence (Milestone B)
**URL:** `http://localhost:5173/`  
**Steps:**
1. Load board mode
2. Click a Light piece (Knight at row 7, col 2)
3. Click a highlighted legal move square (row 7, col 3)
4. Switch to ⚔ Combat mode tab
5. Switch back to ⊞ Board mode
6. Verify Knight is still at (7,3) and turn still shows Dark

**Result:** ✅ PASS — Knight at (7,3), "🌑 Dark — Turn 1" confirmed after mode round-trip  
**Screenshot artifact:** `persistence_check_board_mode_1775170931800.png`

### Test: Board → Combat → Board Round-Trip (Milestone C)
**URL:** `http://localhost:5173/?setup=adjacent`  
**Setup:** Knight (light-warrior) at (4,3), Sorceress (dark-caster) at (4,5), 2 squares apart within Knight's legal range  
**Steps:**
1. Click Knight at (4,3) — selection ring appears
2. Attack ring visible on Sorceress at (4,5) — confirms legal contested target
3. Click Sorceress at (4,5) — `executeMove` returns `{type: 'contest'}`
4. `CombatBridge` launches in board mode — header: "✕ Board Battle — Knight vs Sorceress"
5. Click "Begin Battle"
6. Combat runs through to completion
7. Light wins — victory banner displayed
8. DOM poller detects victory → `onResult()` fires with `attacker_wins`
9. Board returns — HUD shows "☀ Light Wins!"
10. Knight at (4,5) (contested square), Sorceress eliminated

**Result:** ✅ FULL ROUND-TRIP CONFIRMED  
**Recording artifact:** `board_alpha_02_roundtrip_1775170893170.webp`  
**Screenshots:**
- `combat_bridge_launching_1775170948995.png` — CombatBridge header visible
- `combat_started_adjacent_1775170958734.png` — Battle in progress
- `milestone_c_return_to_board_1775171003377.png` — "☀ Light Wins!", Knight at (4,5), Sorceress gone

---

## What Is Technically True (not inflated)

| Behavior | Status |
|---|---|
| Board renders 9×9 with pieces | ✅ Proven |
| Board state persists across mode switches | ✅ Proven — screenshot shows Knight position preserved |
| Legal move highlights work | ✅ Proven |
| Contest detected when moving onto enemy | ✅ Proven |
| CombatBridge launched from board contest | ✅ Proven — browser screenshot of bridge header |
| CombatScene runs normally inside bridge | ✅ Proven |
| Victory detected via DOM poll | ✅ Proven |
| Combat result payload returned to board | ✅ Proven |
| Attacker advances to defender's square on win | ✅ Proven |
| Defeated piece removed from board | ✅ Proven |
| Standalone combat mode still works | ✅ Preserved (v1.1.1 baseline untouched) |
| VFX on correct side in combat | ✅ Preserved from v1.1.1 |
| Workshop manifest dedup guard live | ✅ Preserved |

## What Is NOT Yet Proven

| Behavior | Status |
|---|---|
| Dark faction as attacker in round-trip | ❌ Not tested in 0.2 — deferred to 0.3 |
| Full 4-piece multi-turn game flow | ❌ Not tested |
| Game-over edge case (last piece eliminated) | ❌ Code exists, QA not run |
| Non-combat move persistence in multi-turn | ❌ Not tested end-to-end |
