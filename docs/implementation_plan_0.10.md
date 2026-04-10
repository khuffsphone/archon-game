# Implementation Plan — board-combat-alpha-0.10
**Branch:** feat/hp-restore-0.10
**Base:** main @ 0669641 (board-combat-alpha-0.9 tag)
**Date:** 2026-04-10
**Status:** 🔴 DESIGN FREEZE — awaiting rule sign-off, no code begins until confirmed

---

## Goal

Extend the Heal Ally board action to restore HP in addition to clearing imprisonment. In 0.9, Heal was cure-only by design decision. 0.10 adds the HP component that was deliberately deferred.

---

## 0.10 Scope — FROZEN

### IN SCOPE

| Item | Detail |
|------|--------|
| **HP restoration on Heal** | `healAlly()` restores a fixed amount of HP to the target, capped at `maxHp` |
| **Heal works on non-imprisoned allies** | If no adjacent ally is imprisoned, Heal can still restore HP to a damaged adjacent ally |
| **Sidebar shows HP restore amount** | Button label updates to `✨ Heal Ally (+N HP)` |

### OUT OF SCOPE — HARD STOPS

| Item | Reason |
|------|--------|
| Full mana/spell resource system | Not designed |
| Heal restoring to full HP always | Balance concern — fixed delta only in 0.10 |
| Targeting a specific ally when multiple are adjacent | Alpha has at most 2 allies total; auto-target first valid adjacent |
| New unit types or roster expansion | Out of scope |
| Changes to `board-combat-contract.ts` | FROZEN throughout |
| AI using Heal | Out of scope |

---

## Design Decisions Requiring Sign-Off

> **[DECISION 1] How much HP does Heal restore?**
>
> **Recommended: fixed `HEAL_AMOUNT = 3`** — a constant exported from `boardState.ts`, same pattern as `IMPRISONMENT_TURNS`. Capped at `p.maxHp`.

> **[DECISION 2] Can Heal target a non-imprisoned but damaged adjacent ally?**
>
> **Recommended: YES** — Heal is useful even without imprisonment. `getAdjacentHealTargets()` returns adjacent allies that are either imprisoned OR below max HP (or both). This makes the button useful in more situations without scope creep.

> **[DECISION 3] Does the sidebar Heal button show the HP delta?**
>
> **Recommended: YES** — `✨ Heal Ally (+3 HP)` when target is damaged. `✨ Cure Ally` when target is imprisoned at full HP. Shows intent clearly.

---

## Proposed Architecture (pending sign-off)

### New constant (boardState.ts)

```typescript
export const HEAL_AMOUNT = 3;
```

### Updated helper (boardState.ts)

Rename `getAdjacentImprisonedAllies` → keep existing, add:

```typescript
export function getAdjacentHealTargets(
  state: BoardState,
  casterPieceId: string,
): string[] {
  // Returns allies that are imprisoned OR below maxHp
}
```

### Updated healAlly (boardState.ts)

```typescript
// After tick + cure:
newPieces[targetPieceId] = {
  ...target,
  imprisoned: false,
  imprisonedTurnsRemaining: undefined,
  hp: Math.min(target.hp + HEAL_AMOUNT, target.maxHp),
};
```

### Sidebar update (BoardScene.tsx)

```tsx
const healTarget = healTargets[0];
const targetPiece = healTarget ? board.pieces[healTarget] as BoardPieceState : null;
const hpDelta = targetPiece && targetPiece.hp < targetPiece.maxHp ? HEAL_AMOUNT : 0;
const btnLabel = targetPiece?.imprisoned
  ? `✨ Cure + Heal (+${hpDelta} HP)`
  : `✨ Heal Ally (+${hpDelta} HP)`;
```

---

## Files to Change (pending design approval)

| File | Change |
|------|--------|
| `src/features/board/boardState.ts` | `HEAL_AMOUNT` constant; `getAdjacentHealTargets()` (superset of current imprisoned-only helper); `healAlly()` restores HP in the cure overwrite step |
| `src/features/board/BoardScene.tsx` | Use `getAdjacentHealTargets`; dynamic button label showing HP delta |
| `src/index.css` | No new rules required |

**NOT changed:** `board-combat-contract.ts` (FROZEN), all combat-layer files.

---

## Verification Plan

1. `tsc --noEmit` — 0 errors
2. `git diff HEAD -- src/lib/board-combat-contract.ts` — empty
3. Adjacent imprisoned ally → button shows `✨ Cure + Heal (+3 HP)` → click → ring gone, HP +3
4. Adjacent non-imprisoned damaged ally → button shows `✨ Heal Ally (+3 HP)` → click → HP +3
5. No adjacent healable ally → button hidden
6. HP capped at maxHp (cannot overheal)
7. Turn advances after Heal

---

## Rollback

`git push origin --delete feat/hp-restore-0.10`
Tag `board-combat-alpha-0.9` at `0669641` unaffected.

---

> **Status: 🔴 AWAITING SIGN-OFF on DECISIONS 1, 2, 3 before any implementation begins.**
