# Implementation Plan — board-combat-alpha-0.6 (CORRECTED)
**Branch:** feat/spell-status-skeleton-0.6
**Base:** main @ 4e4ec33 (board-combat-alpha-0.5 tag)
**Date:** 2026-04-07 (scope correction applied)

> **SUPERSEDES** the original implementation_plan_0.6.md.
> The corrected rules below are authoritative.

---

## Goal

Add the minimum real mechanics that give the deferred 0.5 external assets honest meaning.
One active spell. One real status effect. Minimal. No invented complexity.

---

## Corrected Design Rules

1. Only **one active spell** in 0.6: **Imprison**
2. Casting Imprison sets BOTH `imprisoned = true` AND `stunned = true` on the target
3. `stunned` is the **only** combat mechanic in 0.6:
   - A stunned unit **skips its next attack turn**
   - Canonical log: `"Knight is stunned and cannot attack!"`
   - `stunned` clears after the skipped turn
4. `imprisoned` is kept on state **but has no board effect in 0.6** — future-facing
5. **Heal** button: visible but **disabled stub only** — no mechanic, clear UI label
6. `combat-status-stun-v1` renders **ONLY** when `unit.stunned === true`
7. **Teleport SFX** moves to `startBattle` timing (battle-entry only) — NOT on every `turnFaction` change

---

## Canonical Log Strings (deterministic — do not improvise)

- `"Sorceress casts Imprison on Knight!"` — imprison cast event
- `"Knight is stunned and cannot attack!"` — stun skip event

---

## Scope — FROZEN

### IN SCOPE

| Area | Change |
|------|--------|
| `src/lib/types.ts` | Add `stunned?: boolean; imprisoned?: boolean` to `UnitState` |
| `src/features/combat/CombatEngine.ts` | `processSpell(state, 'imprison')` — sets imprisoned+stunned on defender, logs canonical imprison string |
| `src/features/combat/CombatEngine.ts` | `processAttack` — if attacker.stunned: skip, log canonical stun string, clear stunned, advance turn |
| `src/features/combat/useCombat.ts` | `handleCastSpell('imprison')` callback; move teleport SFX to `handleStartBattle` (battle-entry only) |
| `src/features/combat/CombatScene.tsx` | Wire imprison button; disable heal stub; stun overlay on real stunned state |

### OUT OF SCOPE — HARD STOPS

| Item |
|------|
| Full spell system (mana, cooldown, targeting) |
| Separate stun spell button (stun only comes from imprison in 0.6) |
| Heal mechanic |
| Board movement restriction from imprisonment |
| Teleport SFX on every turnFaction change |
| New assets |
| Any AI changes |

---

## Verification

1. `tsc --noEmit` — 0 errors
2. Imprison button clickable during battle → log shows `"Sorceress casts Imprison on Knight!"`
3. Stunned overlay appears on Knight immediately after imprison
4. Knight attacks → log shows `"Knight is stunned and cannot attack!"`, turn advances to Sorceress
5. Knight stunned overlay gone on next Knight turn
6. Heal button visible but disabled (no action on click)
7. Teleport SFX fires only on `handleStartBattle`, not on turn changes

---

## Rollback

Branch only: `git push origin --delete feat/spell-status-skeleton-0.6`
Tag `board-combat-alpha-0.5` at `4e4ec33` is unaffected.
