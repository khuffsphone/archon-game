# Release Summary — board-combat-alpha-0.4
**Date:** 2026-04-05  
**Tag:** `board-combat-alpha-0.4`  
**Baseline:** `board-combat-alpha-0.3` (PR #2 merged)  
**Branch:** `feat/board-combat-alpha-0.4`  
**Status:** ✅ SHIPPED

---

## Scope

Narrow milestone — closes exactly the 4 KI items that were deferred from 0.3 due to RNG non-determinism or missing browser QA coverage. No new features added.

---

## What Changed

### Code Changes

#### `src/features/board/boardState.ts`
- Added `makeDarkWinsSetup()` — deterministic dark-wins proof setup:
  - Sorceress (dark, HP=16) at (4,5), Knight (light, HP=1) at (4,3)
  - `turnFaction: 'dark'` — dark attacks first
  - Activated via `?setup=dark-wins`

#### `src/App.tsx`
- Added `?setup=dark-wins` URL param routing case (2 lines)

#### `src/features/combat/CombatEngine.ts`
- Added `CombatInitOverrides` interface (`lightHp?`, `darkHp?`, `firstTurn?`)
- `makeInitialState()` now accepts optional overrides — zero-arg call unchanged
- Board layer can inject actual piece HP and first-turn faction into combat

#### `src/features/combat/useCombat.ts`
- Added `initialOverrides?: CombatInitOverrides` option
- Passes overrides into `makeInitialState()` initializer

#### `src/features/combat/CombatScene.tsx`
- Added `initialOverrides?: CombatInitOverrides` prop
- Passes to `useCombat`

#### `src/features/combat/CombatBridge.tsx`
- `BoardCombatAdapter` now computes `initOverrides` from board payload
  - Maps `attacker.hp` / `defender.hp` → `lightHp` / `darkHp` by faction
  - Sets `firstTurn: attacker.faction` so board attacker always goes first in combat
- Passes `initOverrides` through `CombatSceneWithResult → CombatScene`

### Files NOT Changed
| File | Reason |
|---|---|
| `board-combat-contract.ts` | FROZEN — no changes needed |
| `BoardScene.tsx` | Not touched |
| `archon-workshop/server.ts` | Not touched |
| `asset-manifest.json` | Not touched |

---

## Bug Fixed

**CombatEngine ignored board piece HP** (discovered during QA, fixed in this milestone):  
The `CombatLaunchPayload` correctly carried `attacker.hp` / `defender.hp` from the board layer, but `CombatEngine.makeInitialState()` hardcoded HP values — so a Knight with `hp=1` on the board would enter combat with HP=20. The fix threads HP overrides from the board payload into the engine without modifying the public contract.

---

## QA Results

| Test | Result |
|---|---|
| Smoke tests | ✅ 59/59 PASS |
| TypeScript | ✅ 0 errors |
| KI-001: Dark wins combat | ✅ PASS — Sorceress kills Knight (HP=1) on round 1 |
| KI-002: Dark wins gameover | ✅ PASS — "🌑 DARK WINS!" shown on board |
| KI-003: Multi-turn non-combat | ✅ PASS — HUD: Light Turn 1 → Dark Turn 1 → Light Turn 2 |
| KI-004: New Game reset | ✅ PASS — 4-piece board + Turn 1 confirmed after reset |

---

## Commits

| SHA | Message |
|---|---|
| `cc4d8d7` | feat: add makeDarkWinsSetup — dark-wins gameover proof (KI-001 + KI-002) |
| `980ae84` | fix: inject board piece HP into CombatEngine via CombatInitOverrides (KI-001/002 fix) |

---

## Tags in archon-game

| Tag | Milestone |
|---|---|
| `combat-slice-v1.1` | Part 1 |
| `combat-slice-v1.1.1` | Part 1 stabilization |
| `board-combat-alpha-0.1` | Board shell (Part 2 entry) |
| `board-combat-alpha-0.2` | Board persistence + round-trip proven |
| `board-combat-alpha-0.3` | Dark attacker, gameover, multi-turn stability |
| `board-combat-alpha-0.4` | KI-001–004 closed, HP injection fix ← **CURRENT** |

---

## Deferred to 0.5

| Item | Notes |
|---|---|
| KI-006 — CombatScene title hardcoded | "Knight vs Sorceress" always shown in intro — cosmetic only |
| KI-007 — maxHp shows roster max not scenario max | "1 / 20 HP" display quirk — cosmetic only |
| Roster expansion | 4-piece alpha cap by design |
| Standalone combat turn-order | Light-first hardcoded in standalone — by design |

---

## What Is Now Technically True

| Behavior | Status |
|---|---|
| Board renders 9×9 with 4 pieces | ✅ Proven |
| Board state persists across mode switches | ✅ Proven (0.2) |
| Legal move highlights work | ✅ Proven (0.2) |
| Contest detected when moving onto enemy | ✅ Proven (0.2) |
| CombatBridge launched from board contest | ✅ Proven (0.2) |
| Light wins combat from board | ✅ Proven (0.2/0.3) |
| Dark wins combat from board | ✅ Proven (0.4) |
| Dark wins gameover banner | ✅ Proven (0.4) |
| Board piece HP injected into combat engine | ✅ Proven (0.4) |
| board attacker always goes first in combat | ✅ Proven (0.4) |
| Multi-turn non-combat moves + turn alternation | ✅ Proven (0.4) |
| New Game resets full 4-piece board | ✅ Proven (0.4) |
| Defeated piece removed from board | ✅ Proven (0.3) |
| Attacker advances to defender's square on win | ✅ Proven (0.2) |
| Standalone combat mode still works | ✅ Preserved |
| VFX on correct side in combat | ✅ Preserved from v1.1.1 |
