# External Asset Usage Plan — feat/external-asset-usage
**Date:** 2026-04-06
**Branch:** feat/external-asset-usage
**Base:** main @ 9fde5d1

---

## Scope — Frozen

Runtime usage of the 8 imported external assets. No new gameplay mechanics.

| Asset | Target Location | Implementation |
|-------|----------------|----------------|
| `sfx-magic-bolt-v1` | `useCombat.ts` | Play on every attack turn (alongside/replacing sfx-melee-hit for variety) |
| `sfx-melee-hit-heavy-v1` | `useCombat.ts` | Play on death events as a heavier impact SFX |
| `sfx-teleport-dark-v1` | `useCombat.ts` | Play when dark faction takes their turn (handleTurnVoice path) |
| `sfx-teleport-light-v1` | `useCombat.ts` | Play when light faction takes their turn (handleTurnVoice path) |
| `combat-status-stun-v1` | `CombatScene.tsx` | Show as a visible status overlay on the active (attacking) unit during animation |
| `ui-button-hover-v1` | `CombatScene.tsx` | Used as CSS background image on `.btn-attack:hover` via inline CSS var |
| `spell-heal-icon-v1` | `CombatScene.tsx` | Shown in combat log alongside heal/recovery events |
| `spell-imprison-icon-v1` | `CombatScene.tsx` | Shown in combat log alongside imprison/status events |

---

## Out of Scope

- Actual heal/imprison mechanics (no new logic)
- Board-level spell UI
- Any new combat phases
- feat/board-combat-alpha-0.5 cosmetic KIs — still parked

---

## Implementation Notes

- `useCombat.ts` changes: extend `handleAttack` and `handleTurnVoice` to call `playSound()` on new SFX IDs
- `CombatScene.tsx` changes: add stun overlay state + icon rendering in log
- No new components, no new hooks, no new types
- TypeScript must remain at 0 errors
