# Implementation Plan — board-combat-alpha-0.9
**Branch:** feat/cure-heal-rules-0.9
**Base:** main @ b54eb26 (board-combat-alpha-0.8 tag)
**Date:** 2026-04-09
**Status:** 🔴 DESIGN FREEZE — awaiting rule sign-off, no code begins until confirmed

---

## Goal

Freeze the exact cure/heal rules for 0.9 before a single line of implementation is written. This pass exclusively defines semantics — no mechanic work begins until these three decisions are locked.

---

## 0.9 Scope — FROZEN

### IN SCOPE (design decisions only, pending sign-off)

| Decision | Question |
|----------|----------|
| **DECISION 1** | Does the Heal spell remove imprisonment? |
| **DECISION 2** | Is Heal cast on the board (outside combat) or inside combat? |
| **DECISION 3** | Does Heal restore HP, or only remove the imprisoned flag? |

### OUT OF SCOPE — HARD STOPS

| Item | Reason |
|------|--------|
| Full mana system | Not designed |
| Full spell targeting UI | Not designed |
| AI control of spells | Not designed |
| Major UI redesign | Out of scope |
| Broad content / new units | Out of scope |
| Changes to `board-combat-contract.ts` | FROZEN throughout |

---

## Proposed Rule Decisions (pending user sign-off)

> **[DECISION 1] Does the Heal spell remove imprisonment?**
>
> **Recommended: YES.** The Heal spell's 0.9 effect is a single-use cure: it clears the `imprisoned` flag (and `imprisonedTurnsRemaining`) from the target piece immediately. No other effect in 0.9.

> **[DECISION 2] Where is Heal cast — board or combat?**
>
> **Recommended: BOARD level.** A piece on its faction's turn selects an imprisoned ally and uses the Heal action from the board sidebar. No entry into combat required. This keeps the combat engine untouched and makes the cure a board-layer operation only.
>
> Alternative: Combat only (Heal is cast inside the CombatScene spell tray, targeting own unit). More complex — deferred to 0.10.

> **[DECISION 3] Does Heal restore HP?**
>
> **Recommended: NO, imprisonment cure only in 0.9.** HP restoration is a separate mechanic with balance implications. Keep 0.9 strictly: `imprisoned → false`, `imprisonedTurnsRemaining → undefined`, amber ring disappears, legal moves restored immediately.

---

## Design Principles Derived From Decisions (if all recommended options approved)

- A faction piece can, on its turn, perform a **Heal action** as an alternative to moving
- Heal targets an adjacent imprisoned ally (1 square orthogonal or diagonal)
- Heal clears imprisonment instantly (no countdown needed)
- Performing the Heal action ends the caster's turn (same as a normal move)
- The auto-clear countdown (0.8) still runs in parallel — Heal is an early cure only
- Heal is disabled (greyed out, no-op) if no imprisoned ally is adjacent

---

## If Decisions Are Approved — Proposed Implementation Scope (0.9)

### Files to change

| File | Change |
|------|--------|
| `src/features/board/boardState.ts` | `healAlly(state, casterPieceId, targetPieceId)` — clears imprisoned flag; returns `BoardState` with turn advancing |
| `src/features/board/BoardScene.tsx` | Board-layer Heal button in sidebar, active only when caster has adjacent imprisoned ally |
| `src/index.css` | Minimal: Heal button styling (reuse existing amber/success palette) |

### Files NOT changed

| File | Reason |
|------|--------|
| `board-combat-contract.ts` | FROZEN |
| `CombatEngine.ts` | Heal is board-only |
| `CombatScene.tsx` | Heal is board-only |
| `CombatBridge.tsx` | No interface change |

---

## Verification Plan (if approved)

1. `tsc --noEmit` — 0 errors
2. `git diff HEAD -- src/lib/board-combat-contract.ts` — empty
3. Select caster adjacent to imprisoned ally → Heal button appears in sidebar
4. Click Heal → imprisoned flag clears → amber ring disappears → legal moves restore
5. Heal button absent when no imprisoned ally in range
6. Turn advances after Heal (same as a normal move)

---

## Rollback

`git push origin --delete feat/cure-heal-rules-0.9`
Tag `board-combat-alpha-0.8` at `b54eb26` unaffected.

---

> **Status: 🔴 AWAITING SIGN-OFF on DECISIONS 1, 2, 3 before any implementation begins.**
