# External Asset Integration Plan — archon-game
**Date:** 2026-04-05
**Branch:** feat/external-asset-integration
**Base:** main @ 240eae6 (board-combat-alpha-0.4 merge)
**Repo:** archon-game
**Status:** BRANCH OPEN — implementation not yet started

---

## Scope — FROZEN

This branch integrates **exactly 8 external assets** from `archon-external-pack-v1` into the game's asset manifest copy. No other work is in scope.

### Assets In Scope

| Asset ID | Type | Category | Faction | Current Game Status |
|----------|------|----------|---------|---------------------|
| `ui-button-hover-v1` | image | ui | neutral | Not in game manifest |
| `spell-heal-icon-v1` | image | spell | light | Not in game manifest |
| `spell-imprison-icon-v1` | image | spell | dark | Not in game manifest |
| `combat-status-stun-v1` | image | status | neutral | Not in game manifest |
| `sfx-magic-bolt-v1` | audio | sfx | neutral | Not in game manifest |
| `sfx-melee-hit-heavy-v1` | audio | sfx | neutral | Not in game manifest |
| `sfx-teleport-dark-v1` | audio | sfx | dark | Not in game manifest |
| `sfx-teleport-light-v1` | audio | sfx | light | Not in game manifest |

---

## Out of Scope — Explicit Exclusions

- KI-006/007/009/010 cosmetic game fixes (feat/board-combat-alpha-0.5 parked — separate concern)
- Any board state changes
- Any combat engine changes
- Any new unit or roster additions
- Any Workshop server changes
- board-combat-contract.ts — FROZEN

---

## Integration Approach (TBD on PHASE 1 execution)

The game's asset manifest (`asset-manifest.json`) is consumed at runtime via the Workshop server export. Options:

1. **Update game-side asset-manifest copy** — if archon-game ships its own copy
2. **Wire new asset IDs into the game pack** — export a new combat pack from Workshop that includes the new asset IDs

Investigation needed:
- Does archon-game reference asset IDs from `asset-manifest.json` directly?
- Does the game consume assets via the Workshop URL or from a local copy?
- Which of the 8 assets are referenced in existing game code vs. need new wiring?

---

## Definition of Done

- [ ] Integration approach determined (game-side asset wiring method)
- [ ] All 8 external assets accessible from game at runtime
- [ ] No regression to existing 235 baseline assets
- [ ] TypeScript: 0 errors
- [ ] Smoke tests: 59/59 PASS
- [ ] docs/external_integration_report_0.5.md committed
- [ ] PR opened → main
- [ ] PR merged
- [ ] Tag created (if applicable)

---

## Rollback

Delete `feat/external-asset-integration` — no game-side changes committed yet. Zero risk.

---

## What Is Parked (Do NOT Resume Without Explicit Instruction)

| Branch | What | Status |
|--------|------|--------|
| `feat/board-combat-alpha-0.5` | KI-006/007/009/010 cosmetic fixes | 🔵 Parked at b35862b |
