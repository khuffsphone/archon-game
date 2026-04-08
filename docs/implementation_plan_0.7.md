# Implementation Plan — board-combat-alpha-0.7 (CORRECTED)
**Branch:** feat/board-imprisonment-effects-0.7
**Base:** main @ 4c0eb74 (board-combat-alpha-0.6 tag)
**Date:** 2026-04-08 (scope correction applied)

> **SUPERSEDES** previous implementation_plan_0.7.md.
> The corrected rules below are authoritative.

---

## Goal

Make the `imprisoned` flag (set in combat) a real board-layer movement restriction. Imprisoned pieces remain selectable, show zero legal moves, and display a visible badge. board-combat-contract.ts stays frozen.

---

## Corrected Design Rules

1. `board-combat-contract.ts` — **FROZEN, zero changes**
2. Imprisoned pieces **remain selectable** (clicking them opens the sidebar)
3. Imprisoned pieces have **exactly zero legal moves** — `computeLegalMoves` returns `[]`
4. When selected, the sidebar shows: **"Imprisoned — cannot move"** instead of "N moves available"
5. Imprisoned pieces display the **spell-imprison-icon-v1 badge** on their board token
6. Imprisonment **persists until death or a future cure mechanic** — no timer, no auto-clear in 0.7
7. No heal mechanic in 0.7
8. No cure/clear mechanic in 0.7 — explicitly deferred to 0.8

---

## Exact Propagation Rules

| Scenario | Board result |
|----------|-------------|
| Imprisoned unit **dies** in combat | `isDead = true` — no `imprisoned` applied (unit is gone) |
| Imprisoned unit **survives** combat and returns to board | `imprisoned = true` applied to the surviving board piece |
| Non-imprisoned unit **survives** | `imprisoned` remains undefined/false — not added |

---

## Architecture — Contract-Safe Approach

### Local BoardPieceState Extension (boardState.ts only)

```typescript
// boardState.ts — local extension, NOT in board-combat-contract.ts
export interface BoardPieceExtension {
  imprisoned?: boolean;
}
// All board.pieces entries use: BoardPiece & BoardPieceExtension
```

`BoardState.pieces` is typed `Record<string, BoardPiece>` in the frozen contract.
The local board layer casts to `Record<string, BoardPiece & BoardPieceExtension>` where needed.
TypeScript widening: safe — BoardPiece & BoardPieceExtension is a superset of BoardPiece.

### ExtendedCombatResultPayload (CombatBridge.tsx only)

```typescript
// CombatBridge.tsx — local, NOT in board-combat-contract.ts
interface ExtendedCombatResultPayload extends CombatResultPayload {
  survivingAttackerImprisoned?: boolean;
  survivingDefenderImprisoned?: boolean;
}
```

CombatBridge reads imprisonment from `CombatState` via a DOM data-attribute set by
CombatScene on the combat-scene root div:
- `data-attacker-imprisoned="true|false"`
- `data-defender-imprisoned="true|false"`

CombatScene already has access to `state.units[faction].imprisoned`.

### applyCombatResult (boardState.ts)

`applyCombatResult` signature stays compatible with `CombatResultPayload` (contract type).
BoardScene passes an `ExtendedCombatResultPayload` — since it extends the contract type, no type error.
Inside `applyCombatResult`, read extended fields via optional chaining.

---

## Files to Change

| File | Change |
|------|--------|
| `src/features/board/boardState.ts` | `BoardPieceExtension` interface; `computeLegalMoves` returns `[]` if imprisoned; `applyCombatResult` applies `imprisoned` from extended result |
| `src/features/combat/CombatBridge.tsx` | `ExtendedCombatResultPayload`; reads imprisoned flags from CombatScene DOM data-attrs; builds extended result |
| `src/features/combat/CombatScene.tsx` | Set `data-attacker-imprisoned` / `data-defender-imprisoned` data attributes on `#combat-scene` root div |
| `src/features/board/BoardScene.tsx` | Pass `imprisoned` to `PieceToken`; show "Imprisoned — cannot move" in sidebar; imprison badge on token |
| `src/index.css` | `.piece-token--imprisoned` ring style; `.sidebar-imprisoned-status` text style |

---

## NOT Changed

- `src/lib/board-combat-contract.ts` — ZERO changes
- `src/lib/types.ts` — already has `stunned`/`imprisoned` on UnitState (0.6 work)
- `src/features/combat/CombatEngine.ts` — no changes needed
- `src/features/combat/useCombat.ts` — no changes needed

---

## Verification Plan

1. `tsc --noEmit` — 0 errors
2. `git diff HEAD -- src/lib/board-combat-contract.ts` — empty (no changes)
3. Cast imprison in combat → return to board → surviving piece has imprisoned badge
4. Click imprisoned piece → selected (sidebar opens) → 0 moves available → "Imprisoned — cannot move"
5. Non-imprisoned pieces move normally
6. No legal move dots show for imprisoned piece

---

## Rollback

Branch: `git push origin --delete feat/board-imprisonment-effects-0.7`
Tag `board-combat-alpha-0.6` at `4c0eb74` unaffected.
