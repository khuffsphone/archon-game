# QA Report — External Asset Usage Fix (PR #5 Correction)
**Date:** 2026-04-06
**Branch:** feat/external-asset-usage @ correction pass
**Milestone:** board-combat-alpha-0.5

---

## Honesty Audit Results

### Finding 1: ui-button-hover-v1 hover effect
- **Before correction:** `--btn-hover-img` CSS var set on parent div but `.btn-attack:hover` rule never read it
- **After correction:** `.btn-attack:hover:not(:disabled)` now applies `background-image: var(--btn-hover-img, none)` with `background-size: cover; background-blend-mode: overlay`
- **QA Result:** ✅ PASS — hover screenshot (`attack_button_hover_state_1775517928781.png`) shows button in clearly activated state with red background visible

### Finding 2: sfx-magic-bolt-v1 mapping
- **Before correction:** Played on every non-death attack — including Knight (melee)
- **After correction:** Gated on `state.turnFaction === 'dark'` — plays only when Sorceress attacks
- **QA Result:** ✅ PASS — Knight attack completed without magic-bolt. No errors. Sorceress turn waiting.

### Finding 3: combat-status-stun-v1 stun overlay
- **Before correction:** Stun overlay appeared on every non-death hit regardless of stun state — no stun mechanic in engine
- **After correction:** Stun overlay removed entirely. Note in code: "combat-status-stun-v1 deferred — no stun mechanic exists in CombatEngine yet."
- **QA Result:** ✅ PASS — Post-attack screenshot shows no stun overlay on attacker side

### Finding 4: spell-heal-icon-v1 / spell-imprison-icon-v1
- **Before correction:** Log-scan approach (`entry.includes('heal')`) — never triggered because CombatEngine log only writes attack/death events
- **After correction:** Persistent `spell-action-strip` below combat log, always visible during battle phase when assets are in pack
- **QA Result:** ✅ PASS — DOM inspection confirmed `#spell-action-strip` present with both img src attributes set. Below viewport fold at 880px height (structural/layout — not a bug).

---

## Screenshot Proof

| Screenshot | Path |
|-----------|------|
| Battle field initial state | `battlefield_initial_state_1775517888560.png` |
| Hover effect on attack button | `attack_button_hover_state_1775517928781.png` |
| Post Knight attack — no stun, log updated | `post_attack_state_1775517940815.png` |
| QA recording | `pr5_qa_proof_1775517858319.webp` |

---

## TypeScript
- `tsc --noEmit`: exit 0, 0 errors

---

## Files Changed in Correction

| File | Change |
|------|--------|
| `src/index.css` | `.btn-attack:hover` now reads `--btn-hover-img`; added `.spell-action-strip` + `.spell-action-icon` |
| `src/features/combat/useCombat.ts` | `sfx-magic-bolt-v1` gated on `state.turnFaction === 'dark'` |
| `src/features/combat/CombatScene.tsx` | Removed `stunOverlay` state/effect/JSX; replaced log-scan icons with persistent `spell-action-strip` |
| `docs/pr5_audit_0.5.md` | Audit artifact |
| `docs/qa_report_external_asset_usage_fix.md` | This file |

---

## Deferred

| Item | Reason |
|------|--------|
| `combat-status-stun-v1` overlay | No stun mechanic in CombatEngine. Wired to future KI when stun is implemented. |
