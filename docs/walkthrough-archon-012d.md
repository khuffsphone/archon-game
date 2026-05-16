# Walkthrough — ARCHON-012D: Projectile VFX Browser Playtest Verification

**Date:** 2026-05-16  
**Task:** ARCHON-012D — Browser/playtest verification for ARCHON-012C projectile VFX  
**Status:** COMPLETE — verification only, no source changes  
**Repos modified:** `archon-game` (this doc only)

---

## 1. Files Changed

**None.** ARCHON-012D is a read-only browser playtest verification milestone.

No source code, tests, manifests, assets, or configuration files were modified.

The only new file is this walkthrough document:

```
docs/walkthrough-archon-012d.md  (this file — NEW, untracked)
```

---

## 2. Browser Route Tested

```
http://localhost:5173/?setup=adjacent
```

The `?setup=adjacent` query parameter bypasses the title and campaign screens,
placing the Knight (light) and Sorceress (dark) one legal move apart on the board
for immediate contest QA.

---

## 3. Confirmation: Board-Launched Combat Path

The tested route exercises the **board-launched combat path**:

- `App.tsx` detects `?setup=adjacent` → `makeAdjacentContestSetup()` → `mode='board'`
- Player selects Knight, moves onto Sorceress square → `handleLaunchCombat()` fires
- `CombatBridge` renders in `mode='board'` with `BoardCombatAdapter`
- Projectile VFX overlay lives inside `BoardCombatAdapter` as a sibling to `CombatSceneWithResult`
- Standalone mode (`?mode=combat`) and arena mode (`?arena=1`) were NOT tested — out of scope

---

## 4. Light Projectile Result

**PASS.** When the Knight (light) attacked:

- The `combat:projectile-cue` event fired with `{ faction: 'light' }`
- `CombatBridge` set `projVfx = { id: 'combat-projectile-light', side: 'right' }`
- The projectile overlay rendered with class `vfx-overlay--right vfx-overlay--projectile`
- The `combat-projectile-light` PNG asset was resolved by `getAssetUrl()` and displayed
- The projectile moved from left to **right** (toward the dark defender)
- The overlay cleared after ~250ms

---

## 5. Dark Projectile Result

**PASS.** When the Sorceress (dark) attacked:

- The `combat:projectile-cue` event fired with `{ faction: 'dark' }`
- `CombatBridge` set `projVfx = { id: 'combat-projectile-dark', side: 'left' }`
- The projectile overlay rendered with class `vfx-overlay--left vfx-overlay--projectile`
- The `combat-projectile-dark` PNG asset was resolved by `getAssetUrl()` and displayed
- The projectile moved from right to **left** (toward the light defender)
- The overlay cleared after ~250ms

---

## 6. Hit Flash Regression Result

**PASS — no regression.** The existing hit flash VFX (`combat-hit-flash-light` /
`combat-hit-flash-dark`) rendered correctly on every non-lethal attack:

- Hit flashes appeared on the correct defender side
- Z-index layering was correct (hit flash rendered above the projectile overlay)
- Timing was unaffected — hit flash appeared immediately after attack resolution
- No visual artifacts, flicker, or occlusion observed

---

## 7. Death Burst Result

**PASS — observed naturally.** The Sorceress was defeated during the playtest session:

- The Knight delivered a killing blow (Sorceress HP reached 0)
- The `combat-death-burst-dark` VFX rendered correctly on the right (dark defender) side
- The death burst was not occluded by the projectile overlay (projectile clears after 250ms;
  death burst starts at attack resolution)
- The victory banner (`☀ Light Wins!`) appeared correctly after the death burst

---

## 8. Combat Result Integrity

**PASS.** Combat math and state transitions were verified visually:

- HP decreased correctly on each hit (Knight 20 → 16 → 11 → 6; Sorceress 16 → 13 → 10 → 7 → 2 → 0)
- Damage values fell within expected ranges (Knight 3–6, Sorceress 4–7)
- Turn alternation worked correctly (light → dark → light → ...)
- Victory phase triggered correctly when Sorceress HP reached 0
- Return to board restored the surviving Knight with correct remaining HP
- Board score updated correctly (1L / 0D)
- No `setState(next)` delay was introduced — combat remained responsive

---

## 9. Console / Browser Observations

- No console errors were generated during the combat sequence or VFX rendering
- No warnings related to projectile assets, event listeners, or state management
- The `combat:projectile-cue` CustomEvent dispatched and was received without error
- The transient `.vfx-overlay--projectile` state correctly self-cleaned after each attack

---

## 10. Commands Run

```bash
# Verification pass (archon-game)

npm run lint
# Exit: 0 — tsc --noEmit, 0 errors

npm run test:run
# Exit: 0 — 577/577 passing (18 test files)

git status -uall --short
# (empty — clean)

git ls-files --others --exclude-standard
# (empty — no untracked files before walkthrough creation)

git diff --stat
# (empty — no modifications)

git diff --name-only
# (empty — no modifications)

git status -sb
# ## main...origin/main
# (clean)
```

---

## 11. Test Results

```
Test Files  18 passed (18)
     Tests  577 passed (577)
  Start at  17:46:18
  Duration  2.13s
```

No test regressions. Baseline unchanged from ARCHON-012C.

---

## 12. Git Diff / Stat / Name-Only

All empty — zero source modifications:

```bash
git diff --stat
# (empty)

git diff --name-only
# (empty)
```

---

## 13. Local Path Hygiene

This document does not contain:

- Antigravity app-data directory references
- Browser subagent feedback screenshot references
- Local user home directory path references

---

## 14. Final Git Status

```
## main...origin/main
(clean — HEAD 237698f)
```

The only new file after walkthrough creation will be:

```
?? docs/walkthrough-archon-012d.md
```

---

## 15. Known Limitations

1. **Standalone mode untested.** The `?mode=combat` standalone path does not use
   `BoardCombatAdapter` and therefore does not render projectile VFX. This is by design
   (ARCHON-012B scoped projectile VFX to board-launched only).

2. **Arena mode untested.** The `?arena=1` path routes to `ArenaScene`, which has its own
   separate projectile rendering pipeline (ARCHON-012A). Not in scope for 012D.

3. **No pre-impact travel window.** Projectile and hit flash render simultaneously.
   A future animation-phase milestone could introduce a 200ms `setState` delay for
   pre-impact travel.

4. **Stun-skip not visually verified.** The stun-skip guard (`lastEvent !== 'none'`)
   was not triggered during this playtest because neither unit was imprisoned/stunned.
   The guard is covered by unit tests (`combatProjectileVfx.test.ts`).

---

## 16. Recommended Next Task

No immediate follow-up is required for the projectile VFX pipeline.

Potential future milestones:

- **Animation-phase milestone:** Introduce a pre-impact travel window (200ms `setState`
  delay) so the projectile visually arrives before the hit flash renders.
- **Standalone mode projectile VFX:** If `?mode=combat` standalone should also show
  projectiles, a similar overlay would need to be added to `CombatScene.tsx` (requires
  unfreezing) or a standalone wrapper similar to `BoardCombatAdapter`.
- **Stun-skip visual QA:** A targeted playtest using the Imprison spell to verify
  no projectile fires during stun-skipped turns.

---

*ARCHON-012D browser playtest verification complete.*  
*No source, test, manifest, or asset files were modified.*
