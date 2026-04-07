# QA Report — board-combat-alpha-0.6 Spell/Status Skeleton
**Date:** 2026-04-07
**Branch:** feat/spell-status-skeleton-0.6
**TypeScript:** 0 errors (tsc --noEmit, exit 0)

---

## Test Results

| # | Test | Expected | Result | Status |
|---|------|----------|--------|--------|
| 1 | Battle starts | Intro screen → Battle with spell tray | Confirmed | ✅ |
| 2 | Spell tray has two buttons | Imprison (active) + Heal (disabled) | DOM confirmed: `btn-spell-heal` (disabled=true), `btn-spell-imprison` | ✅ |
| 3 | Heal button disabled | No action on click | disabled=true confirmed, no mechanic triggered | ✅ |
| 4 | Imprison button clickable | Log: "Knight casts Imprison on Sorceress!" | Exact canonical log string appeared in screenshot C | ✅ |
| 5 | Stun skip on next attack | Log: "Sorceress is stunned and cannot attack!" | Exact canonical log string appeared in screenshot D, turn advanced | ✅ |
| 6 | Turn advances after stun skip | Knight's turn after Sorceress skip | Turn 2 banner shows Light faction after skip confirmed | ✅ |
| 7 | Normal attack after stun clears | Post-stun attack lands normally | "Knight attacks Sorceress for N damage." in log | ✅ |
| 8 | combat-status-stun-v1 overlay DOM | Stun div renders only when unit.stunned === true | DOM element `vfx-stun-dark` confirmed present during stun | ✅ |
| 9 | Stun overlay clears after skip | No stun div after turn advances | Stun cleared from state, overlay removed | ✅ |
| 10 | Teleport SFX at battle start only | No teleport on turn changes | Removed from handleTurnVoice, fires in handleStartBattle | ✅ |

---

## Canonical Log Strings Confirmed

- `"Knight casts Imprison on Sorceress!"` — exact match ✅
- `"Sorceress is stunned and cannot attack!"` — exact match ✅

---

## Note on Stun Overlay Visual

The `combat-status-stun-v1.png` placeholder is 68 bytes — a stub asset from the ingestion pass.
The overlay div renders correctly (DOM confirmed). Visual impact will improve when a real asset is supplied.
This is not a code defect — the gating logic (`unit.stunned === true`) is correct.

---

## Screenshots

| Label | File | Confirms |
|-------|------|---------|
| Screenshot B | `archon_06_qa_screenshot_b_1775568833896.png` | Battle with spell tray visible |
| Screenshot C | `archon_06_qa_screenshot_c_1775568858878.png` | "Knight casts Imprison on Sorceress!" in log |
| Screenshot D | `archon_06_qa_screenshot_d_1775568900642.png` | "Sorceress is stunned and cannot attack!" in log |
| Screenshot F | `archon_06_qa_screenshot_f_final_1775568950666.png` | Normal attack post-stun |

---

## Rollback

`git revert HEAD` or `git push origin --delete feat/spell-status-skeleton-0.6`
Tag `board-combat-alpha-0.5` at `4e4ec33` is unaffected.
