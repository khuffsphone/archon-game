# Implementation Plan — board-combat-alpha-1.0
**Branch:** feat/imprison-heal-vertical-slice-1.0
**Base:** main @ c7967d7 (board-combat-alpha-0.10 tag)
**Date:** 2026-04-10
**Status:** 🟡 DESIGN REVIEW — scope confirmed, implementation may begin on approval

---

## Goal

Prove the complete imprison/heal gameplay loop end-to-end in a single playthrough without needing developer knowledge. All individual mechanics already exist in the codebase (milestones 0.6–0.10). 1.0 is a **vertical-slice QA and polish pass** — close the UX gaps that prevent a first-time player from understanding what is happening.

---

## What Already Works (do NOT re-implement)

| Mechanic | Milestone | Status |
|----------|-----------|--------|
| Imprison spell cast in combat | 0.6 | ✅ CombatEngine.ts — sets `imprisoned: true, stunned: true` on defender |
| Stunned skip in combat | 0.6 | ✅ CombatEngine.ts — attacker skips attack turn, log entry generated |
| Imprisonment propagates to board | 0.7 | ✅ CombatBridge → ExtendedCombatResultPayload → applyCombatResult |
| Imprisoned piece selectable but 0 legal moves | 0.7 | ✅ computeLegalMoves gates on imprisoned flag |
| Amber ring + lock badge on imprisoned piece | 0.7 | ✅ CSS + PieceToken |
| Sidebar shows "Imprisoned — N turn(s) remaining" | 0.8 | ✅ BoardScene sidebar |
| Auto-clear after 2 faction turns | 0.8 | ✅ tickImprisonmentCounters in executeMove + applyCombatResult |
| Heal Ally clears imprisonment | 0.9 | ✅ healAlly() |
| Heal Ally ticks other faction counters first | 0.9 | ✅ tickImprisonmentCounters before cure |
| Heal Ally restores 3 HP | 0.10 | ✅ Math.min(hp + HEAL_AMOUNT, maxHp) |
| Dynamic Heal button label | 0.10 | ✅ "Cure + Heal / Cure Ally / Heal Ally (+N HP)" |

---

## 1.0 Gap Analysis — What Needs Closing

| Gap | Priority | What to fix |
|-----|----------|-------------|
| **Turn indicator missing** | HIGH | No UI element shows whose turn it is. A player cannot tell when their imprisoned piece will auto-cure. |
| **Combat log does not surface stun/imprison/heal events** | HIGH | Log exists but only shows attack outcomes. Stun-skip, imprisonment, and Heal events are silent to the board. |
| **Cured piece has no visual confirmation** | MEDIUM | When imprisonment clears (auto or Heal), the amber ring disappears but no feedback is shown. |
| **Heal button tooltip is weak** | LOW | Title attr only. Should show inline text "ally will be freed" for clarity. |

---

## 1.0 Proposed Changes (pending sign-off)

### 1. Turn indicator (Board layer)

**File:** `src/features/board/BoardScene.tsx`

Add a visible turn banner above the board grid:
```tsx
<div className="board-turn-banner" id="board-turn-banner">
  {board.phase === 'gameover'
    ? '⚔ Game Over'
    : `${board.turnFaction === 'light' ? '☀ Light' : '🌑 Dark'} — Turn ${board.turnNumber}`}
</div>
```
**File:** `src/index.css` — `.board-turn-banner` style.

### 2. Board-layer event log

**File:** `src/features/board/boardState.ts`

Add optional `log?: string[]` to `BoardState` (board-layer additive, not in contract). Append entries from:
- `executeMove` — "Light Knight moved to E5"
- `healAlly` — "Light Herald healed Dark Sorceress — imprisoned cleared, +3 HP"
- `applyCombatResult` — "Dark Sorceress was imprisoned after combat"
- `tickImprisonmentCounters` (when counter hits 0) — "Dark Sorceress imprisonment expired"

**File:** `src/features/board/BoardScene.tsx` — render last 5 log entries below the board.

### 3. Cure flash confirmation

**File:** `src/index.css`

Add `@keyframes cure-flash` — a brief green pulse on the piece token when `imprisoned` goes from `true` to `false`. Triggered by a transient CSS class `piece-token--just-cured` applied in `BoardScene` for one render cycle.

---

## Out of Scope — Hard Stops

| Item | Reason |
|------|--------|
| Full mana system | Not designed |
| Full spell targeting UI | Not designed |
| AI | Not designed |
| Major UI redesign | Out of scope |
| New units or content | Out of scope |
| `board-combat-contract.ts` changes | FROZEN |
| HP restore amount tuning | Out of scope (HEAL_AMOUNT=3 fixed) |

---

## Files to Change

| File | Change |
|------|--------|
| `src/features/board/boardState.ts` | Add `log?: string[]` to local BoardState extension; append log entries in executeMove, healAlly, applyCombatResult, tickImprisonmentCounters |
| `src/features/board/BoardScene.tsx` | Turn banner; board log panel; cure-flash class toggle |
| `src/index.css` | `.board-turn-banner`; `.board-log`; `@keyframes cure-flash`; `.piece-token--just-cured` |

**NOT changed:** `board-combat-contract.ts`, any combat-layer files.

---

## Verification Plan

### Automated
1. `tsc --noEmit` — 0 errors
2. `git diff HEAD -- src/lib/board-combat-contract.ts` — empty

### Manual loop QA (browser)
1. Start game — turn banner shows "☀ Light — Turn 1"
2. Light Knight attacks Dark Sorceress — combat opens
3. Knight casts Imprison — combat log shows stun skip; combat closes
4. Board: Dark Sorceress has amber ring + badge + "2 turn(s) remaining" — board log shows "Dark Sorceress was imprisoned"
5. Dark turn: unimprisoned piece moves — board log shows move; Sorceress counter unchanged (it's Dark's turn, Dark imprisoned pieces tick)
   - Wait — Sorceress is Dark. Dark moving = Sorceress ticks → "1 turn(s) remaining"
6. Light turn: move — Sorceress unaffected
7. Dark turn: Sorceress auto-clears — board log "Dark Sorceress imprisonment expired" — ring gone
8. Alternate path: Light Herald adjacent to imprisoned Sorceress? No — Sorceress is Dark. Heal only works on same-faction allies. Correct.
9. Alternate path: Dark Herald (if adjacent to imprisoned Dark Sorceress) → "✨ Cure + Heal (+3 HP)" button visible → click → board log "Dark Herald healed Dark Sorceress" → ring gone → HP +3

---

## Rollback

`git push origin --delete feat/imprison-heal-vertical-slice-1.0`
Tags `board-combat-alpha-0.10` at `c7967d7` and all prior tags unaffected.

---

> **Status: 🟡 AWAITING SIGN-OFF before implementation begins.**
> All mechanics exist. 1.0 is QA + turn log + turn indicator + cure flash only.
