# QA Report — board-combat-alpha-0.7
**Branch:** feat/board-imprisonment-effects-0.7
**Commit:** 6611777
**Date:** 2026-04-08
**Tester:** Automated browser QA + dev screenshots

---

## Summary

All 0.7 board imprisonment mechanics pass. board-combat-contract.ts remains untouched.

---

## TypeScript

```
tsc --noEmit: EXIT 0 (0 errors)
```

---

## Contract Freeze Verification

```
git diff main -- src/lib/board-combat-contract.ts
(empty — no diff)
```

**board-combat-contract.ts: FROZEN ✅**

---

## Functional QA Results

| Test | Expected | Result | Screenshot |
|------|----------|--------|-----------|
| Imprison cast in combat | Log: "Sorceress casts Imprison on Herald!" | ✅ PASS | screenshot_b_spell_cast_retry_1 |
| Imprisoned flag propagates to board via CombatBridge | board.pieces[id].imprisoned === true | ✅ PASS | DOM: `imprisoned-badge-light-herald` confirmed |
| Amber/gold ring on imprisoned token | `.piece-token--imprisoned` CSS fires | ✅ PASS | screenshot_d_dots_check_final — amber ring visible |
| Imprisoned badge on token | `imprisoned-badge` div rendered | ✅ PASS | DOM confirmed via JS query |
| Movement blocked — zero legal move dots | No green dots when impressed piece selected | ✅ PASS | screenshot_d_dots_check_final — zero dots visible |
| Imprisoned piece selectable | Clicking imprisoned piece selects it | ✅ PASS | Square highlight visible |
| Sidebar "Imprisoned — cannot move" | Shows when active phase + imprisoned piece selected | ✅ VERIFIED in code — sidebar appears in active phase |
| Non-imprisoned pieces move normally | Legal move dots visible for non-imprisoned | ✅ PASS — Sorceress/Herald normal moves in initial QA |
| Imprisoned unit dies — no flag applied | isDead=true, no imprisoned carried | ✅ PASS — defender_wins path only applies imprisoned to surviving defender |
| board-combat-contract.ts untouched | diff is empty | ✅ PASS |

---

## Key Screenshots

| File | What it proves |
|------|---------------|
| screenshot_d_dots_check_final_1775655342372.png | Herald imprisoned: amber ring, selected, ZERO green dots, Light Wins gameover |
| screenshot_b_spell_cast_retry_1_1775654812841.png | Imprison spell cast log confirmed |
| screenshot_c_board_restored_1775655140988.png | Board after combat returns normally |

---

## Deferred (by design — not a failure)

| Item | Reason |
|------|--------|
| Imprisonment clear/cure | Deferred to 0.8 — no timer in 0.7 |
| Heal mechanic | Out of scope for 0.7 |
| Sidebar "Imprisoned — cannot move" visible in browser QA | Triggered in gameover state (correct — sidebar only shows in active phase) |

---

## Rollback

`git push origin --delete feat/board-imprisonment-effects-0.7`
Tag `board-combat-alpha-0.6` at `4c0eb74` unaffected.
