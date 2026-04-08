# Implementation Plan — board-combat-alpha-0.8
**Branch:** feat/imprisonment-cure-0.8
**Base:** main @ 9df3013 (board-combat-alpha-0.7 tag)
**Date:** 2026-04-08

---

## Goal

Implement a clear/cure mechanic for the `imprisoned` flag on board pieces. A piece imprisoned in 0.7 stays locked indefinitely — 0.8 gives it a defined exit condition.

---

## 0.8 Scope — FROZEN

### IN SCOPE

| Item | Detail |
|------|--------|
| **Cure trigger: turn timeout** | An imprisoned piece is freed after N turns have passed (proposed: 2 full round-trips = 2 turns for the owning faction) |
| **Cure trigger: death** | Dying in combat already clears imprisonment (unit is gone) — existing behavior |
| **Board-layer turn counter on imprisoned pieces** | `BoardPieceExtension` gets `imprisonedTurnsRemaining?: number` |
| **applyCombatResult / turnAdvance hook** | After each turn, check imprisoned pieces and clear if threshold is passed |
| **Visual clear** | Amber ring + badge disappear when `imprisoned` clears |
| **Sidebar update** | Shows turns remaining: "Imprisoned — N turn(s) remaining" |

### OUT OF SCOPE — HARD STOPS

| Item |
|------|
| Heal mechanic |
| Spell targeting redesign |
| AI changes |
| Changes to `board-combat-contract.ts` (FROZEN) |
| Cure-via-spell (separate mechanic, 0.9+) |
| Cure-via-adjacent-ally (complex, 0.9+) |

---

## Design Decisions Requiring Sign-Off

Before coding begins, confirm these decisions:

**[DECISION 1] Clear rule**: Which trigger releases imprisonment?
- Option A — **Turn timeout (recommended)**: Imprisoned piece is freed after passing N of the owning faction's turns (N = 2 suggested).
- Option B — **Round timeout**: Freed after N full rounds (both factions move once).
- Option C — **Manual cure only**: No auto-clear in 0.8; just add the counter + UI, keep piece locked until a future cure spell.

**[DECISION 2] Turn count threshold**: If turn timeout, how many turns locked?
- Suggested: **2 turns** (imprisoned piece skips 2 of its faction's turns before being freed).

**[DECISION 3] Counter location**: Where does the turn counter live?
- `BoardPieceExtension.imprisonedTurnsRemaining?: number` stored alongside `imprisoned` in board-layer state. Not in the frozen contract.

---

## Proposed Architecture (pending sign-off)

### Extension to BoardPieceExtension (boardState.ts)

```typescript
export interface BoardPieceExtension {
  imprisoned?: boolean;
  imprisonedTurnsRemaining?: number; // 0.8: countdown to release
}
```

### Turn Advance Hook (boardState.ts)

After each faction turn completes, run:

```typescript
const IMPRISONMENT_TURNS = 2; // configurable

function tickImprisonmentCounters(
  pieces: Record<string, BoardPieceState>,
  justMovedFaction: Faction,
): Record<string, BoardPieceState> {
  const updated = { ...pieces };
  for (const [id, piece] of Object.entries(updated)) {
    if (piece.imprisoned && piece.faction === justMovedFaction) {
      const remaining = (piece.imprisonedTurnsRemaining ?? IMPRISONMENT_TURNS) - 1;
      if (remaining <= 0) {
        updated[id] = { ...piece, imprisoned: false, imprisonedTurnsRemaining: undefined };
      } else {
        updated[id] = { ...piece, imprisonedTurnsRemaining: remaining };
      }
    }
  }
  return updated;
}
```

### Sidebar Text (BoardScene.tsx)

Replace static "Imprisoned — cannot move" with:
```
🔒 Imprisoned — {piece.imprisonedTurnsRemaining ?? 2} turn(s) remaining
```

---

## Files to Change (pending design approval)

| File | Change |
|------|--------|
| `src/features/board/boardState.ts` | `imprisonedTurnsRemaining` in `BoardPieceExtension`; `tickImprisonmentCounters`; call from `executeMove` and `applyCombatResult` with initial count |
| `src/features/board/BoardScene.tsx` | Sidebar shows turns remaining |
| `src/index.css` | No new styles (amber ring clears automatically when `imprisoned` becomes false) |

**NOT changed:** `board-combat-contract.ts` (FROZEN), all combat-layer files.

---

## Verification Plan

1. `tsc --noEmit` — 0 errors
2. `git diff HEAD -- src/lib/board-combat-contract.ts` — empty
3. Imprison a piece → amber ring appears → N turns pass → ring and badge disappear
4. Sidebar shows countdown: "2 turn(s) remaining" → "1 turn(s) remaining" → freed
5. Non-imprisoned pieces unaffected

---

## Rollback

`git push origin --delete feat/imprisonment-cure-0.8`
Tag `board-combat-alpha-0.7` at `9df3013` unaffected.

---

> **Status: 🔴 AWAITING DESIGN SIGN-OFF**
> Decisions 1, 2, 3 must be confirmed before implementation begins.
