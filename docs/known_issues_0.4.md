# Known Issues — board-combat-alpha-0.4
**Date:** 2026-04-05  
**Milestone:** board-combat-alpha-0.4  

---

## Fixed In This Milestone

### KI-FIX-001 — CombatEngine Ignored Board Piece HP
**Severity:** Critical (blocked KI-001/002 proof)  
**Root cause:** `makeInitialState()` in `CombatEngine.ts` hardcoded Knight HP=20, Sorceress HP=16 regardless of the board piece's actual current HP. The `CombatLaunchPayload` carried the correct HP values but they were silently discarded.  
**Fix:** Added `CombatInitOverrides` interface with optional `lightHp`, `darkHp`, `firstTurn`. `CombatBridge` computes overrides from board payload and threads them through `CombatScene → useCombat → makeInitialState`.  
**Status:** ✅ Fixed in commit `980ae84`

---

## Open — Carry Forward to 0.5

### KI-005 — Combat Turn Order Hardcoded to Light-First in Standalone Mode
**Severity:** Low (cosmetic only in standalone mode)  
**Description:** Standalone combat mode (`?mode=combat`) always starts with Light's turn regardless of board state, because `useCombat` now initializes with no overrides (correct — standalone has no board context). This is expected and by design, but is documented for clarity.  
**Impact:** Standalone combat is not connected to board context — it is a demo/dev tool only. No player-facing impact.  
**Status:** 🔵 Known, accepted — not a bug in standalone context

### KI-006 — CombatScene Title Still Shows "Knight vs Sorceress" Hardcoded
**Severity:** Low (cosmetic)  
**Description:** The intro overlay in `CombatScene.tsx` reads "Knight vs Sorceress — Combat Slice v1" regardless of which pieces are actually fighting. In a board-launched battle this is misleading (e.g., Sorceress vs Knight shows the same text).  
**Impact:** Visual only. Combat mechanics are correct.  
**Workaround:** The `CombatBridge` header ("⚔ Board Battle — Sorceress vs Knight") correctly reflects the actual combatants.  
**Status:** 🟡 Deferred — requires passing piece names into `CombatScene` props (additive change, low risk)

### KI-007 — maxHp Display Shows Roster Max, Not Scenario Max
**Severity:** Low (cosmetic in HP bar)  
**Description:** In the dark-wins setup, Knight displays "1 / 20 HP" — the `/20` reflects the roster max HP, not the scenario starting HP. This looks slightly odd but is technically accurate (it's the character's maximum possible HP).  
**Impact:** Visual only. Gameplay is correct.  
**Status:** 🟡 Deferred — can be addressed by passing `maxHp` override separately if needed

### KI-008 — No Roster Expansion Beyond 4 Pieces
**Severity:** N/A (out of scope for alpha)  
**Description:** Alpha build is capped at 4 pieces (2 per side). Herald and Sentinel share Knight/Sorceress asset tokens.  
**Status:** 🔵 By design for alpha — deferred to post-alpha

---

## Not Applicable / Out of Scope

| Item | Notes |
|---|---|
| Spells / abilities | Out of scope for alpha |
| AI / automated player | Out of scope for alpha |
| Audio in board mode | Board layer has no audio wiring (combat audio works) |
| Save/load game state | Not implemented |
