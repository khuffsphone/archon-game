# PHASE 0 — PR #5 Audit Artifact
**Date:** 2026-04-06
**Branch:** feat/external-asset-usage
**Audit of:** da0cc4c

---

## Findings vs Claims

### Finding 1 — ui-button-hover-v1 not visible
- **Claim:** "CSS --btn-hover-img var on battle-controls div"
- **Reality:** `CombatScene.tsx` sets `--btn-hover-img` on the div. `index.css` `.btn-attack:hover` rule uses `transform` + `box-shadow` only — the variable is never read.
- **Decision:** FIX — wire `--btn-hover-img` to `background-image` on `.btn-attack:hover` in `index.css`

### Finding 2 — sfx-magic-bolt-v1 mapped to all non-death attacks
- **Claim:** "Plays 60ms after every non-death attack (layered with sfx-melee-hit)"
- **Reality:** The Knight (melee) triggers this as often as the Sorceress. "Magic bolt" for a Knight lunge is semantically dishonest.
- **Decision:** FIX — restrict to dark faction (Sorceress) attacks only. Sorceress is canonically magic/ranged.

### Finding 3 — combat-status-stun-v1 has no true stun state
- **Claim:** "Visible stun overlay on attacker side during non-death animations"
- **Reality:** No stun state exists in CombatEngine. The overlay fires on every hit regardless of game state. The asset ID says "stun" but the behavior is "attacker hit-echo" — semantically misleading.
- **Decision:** REMOVE from this PR. Add a TODO comment. Defer to a future KI when stun mechanics are added.

### Finding 4 — spell icons never appear in runtime
- **Claim:** "Icon prefix on log entries containing 'heal' / 'imprison' / 'stun'"
- **Reality:** CombatEngine log only generates:
  - "Battle begins!"
  - "{Name} attacks {Name} for {N} damage."
  - "{Name} has been defeated!"
  - None of these contain "heal", "imprison", or "stun".
- **Decision:** REPLACE log-scan approach with a persistent action-icon strip below the log. Shows both spell icons always when the assets are in the pack. Honest — visible regardless of log text.

---

## Fix Set Decision Summary

| Asset | Action | Rationale |
|-------|--------|-----------|
| ui-button-hover-v1 | FIX: wire CSS var to hover rule | One-line CSS change, makes claim true |
| sfx-magic-bolt-v1 | FIX: restrict to dark (Sorceress) attacks | Semantically honest — magic/ranged unit |
| combat-status-stun-v1 | REMOVE: defer to real stun mechanic | No stun state exists — claim is false |
| spell-heal-icon-v1 | FIX: persistent icon strip (not log scan) | Always visible, no engine change needed |
| spell-imprison-icon-v1 | FIX: persistent icon strip (not log scan) | Always visible, no engine change needed |

---

## Files to Change
- `src/index.css` — add `--btn-hover-img` to `.btn-attack:hover`
- `src/features/combat/useCombat.ts` — restrict magic-bolt to dark attacks
- `src/features/combat/CombatScene.tsx` — remove stun overlay; replace log-icon scan with action strip

---

## Rollback
All changes are on `feat/external-asset-usage`. Rollback = `git revert da0cc4c` or delete branch.
