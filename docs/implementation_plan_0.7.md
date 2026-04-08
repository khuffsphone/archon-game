# Implementation Plan — board-combat-alpha-0.7
**Branch:** feat/board-imprisonment-effects-0.7
**Base:** main @ 4c0eb74 (board-combat-alpha-0.6 tag)
**Date:** 2026-04-08

---

## Goal

Apply the `imprisoned` flag (set in combat via Sorceress's Imprison spell) as a real board-layer movement restriction. A imprisoned piece cannot move until the restriction is cleared. Visual status is shown on its board token.

---

## Key Design Constraint — Contract is FROZEN

`board-combat-contract.ts` is **frozen since 0.1** and must not be modified.

This means:
- `BoardPiece` (in the contract) carries NO imprisonment state — it's a combat-payload type
- Imprisonment is a **board-layer local state** only: stored in `BoardState.pieces` via a **BoardPiece extension** in `boardState.ts`
- The `CombatResultPayload` does NOT carry imprisonment — it carries HP and survival
- Imprisonment must be **propagated via the combat result bridge**: when a unit wins combat, we carry its `imprisoned` flag back from `CombatState.units[faction].imprisoned` through the `CombatBridge` to `applyCombatResult`

---

## Propagation Path

```
CombatEngine.processSpell('imprison')
  → CombatState.units[dark].imprisoned = true
  → CombatState.units[dark].stunned = true

Combat ends (any outcome)
  → CombatBridge.handleResult()
  → CombatResultPayload.survivingAttacker / survivingDefender (contract, no imprisoned field)
  → NEW: CombatBridge must pass imprisoned flags separately via an EXTENDED result type
  → applyCombatResult sets boardPiece.imprisoned = true
```

**Precise approach:** Extend `CombatResultPayload` locally (not in the contract file) via an extended interface in `CombatBridge.tsx`:

```typescript
// Local extension — NOT in board-combat-contract.ts
interface ExtendedCombatResult extends CombatResultPayload {
  survivingAttackerImprisoned?: boolean;
  survivingDefenderImprisoned?: boolean;
}
```

This avoids touching the frozen contract while still propagating the flag.

---

## BoardPiece Extension (board-layer only)

`boardState.ts` already imports `BoardPiece` from the contract. We extend it **locally** in boardState.ts:

```typescript
// boardState.ts — local extension, NOT in contract
export interface BoardPieceState extends BoardPiece {
  /** 0.7: board-layer imprisonment. Movement blocked until cleared. */
  imprisoned?: boolean;
}

// Change: pieces Record uses BoardPieceState instead of BoardPiece
export interface LocalBoardState extends BoardState {
  pieces: Record<string, BoardPieceState>;
}
```

Since `BoardState` in the contract types `pieces` as `Record<string, BoardPiece>`, the local extension is a widening (compatible). All existing boardState functions continue to work — they just gain access to `.imprisoned`.

---

## Scope — FROZEN

### IN SCOPE

| Area | Change |
|------|--------|
| `src/features/board/boardState.ts` | `BoardPieceState` extension interface; `selectPiece` gates on `imprisoned`; `computeLegalMoves` returns `[]` for imprisoned piece; `applyCombatResult` sets `imprisoned` from extended result |
| `src/features/combat/CombatBridge.tsx` | `ExtendedCombatResult` local interface; passes `imprisoned` flags from `CombatState` into extended result on `handleResult` |
| `src/features/board/BoardScene.tsx` (token render) | Show `spell-imprison-icon-v1` badge on imprisoned piece token |

### OUT OF SCOPE — HARD STOPS

| Item |
|------|
| Changes to `board-combat-contract.ts` |
| Heal mechanic |
| Full spell system |
| AI changes |
| New external assets |
| Clear/cure mechanic for imprisonment (deferred to 0.8) |

---

## Imprisonment Clear Rule (0.7)

Imprisonment does NOT clear automatically during the skipped turn (stun handles the skip in combat). On the board layer in 0.7:
- Imprisonment persists indefinitely until the piece dies or a future cure mechanic is added
- No clear/cure mechanic in 0.7 — that is an explicit 0.8 deferred item
- This is intentional and documented, not an omission

---

## Files to Change

| File | Change |
|------|--------|
| `src/features/board/boardState.ts` | `BoardPieceState` interface; gating in `selectPiece` + `computeLegalMoves`; `applyCombatResult` processes extended result |
| `src/features/combat/CombatBridge.tsx` | `ExtendedCombatResult`; propagate `unit.imprisoned` from CombatState |
| `src/features/board/BoardScene.tsx` | Imprisoned token badge (spell-imprison-icon-v1) overlay |

---

## Verification Plan

1. `tsc --noEmit` — 0 errors required
2. Cast imprison in combat → combatant returns to board with `imprisoned = true`
3. Attempting to select and move the imprisoned piece → no legal moves shown
4. Imprisoned piece token shows spell-imprison-icon-v1 badge
5. Non-imprisoned pieces move normally
6. Contract file unchanged (verify via `git diff board-combat-contract.ts` — expect empty)

---

## Rollback

Branch only: `git push origin --delete feat/board-imprisonment-effects-0.7`
Tag `board-combat-alpha-0.6` at `4c0eb74` is unaffected.
Frozen contract is unmodified by design.
