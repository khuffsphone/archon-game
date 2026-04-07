# Implementation Plan — board-combat-alpha-0.6
**Branch:** feat/spell-status-skeleton-0.6
**Base:** main @ 4e4ec33 (board-combat-alpha-0.5 tag)
**Date:** 2026-04-07

---

## Goal

Add real, minimal spell and status mechanics that give the deferred external assets honest runtime meaning. Not cosmetic — each asset must map to a real game-state change.

---

## Scope — FROZEN

### IN SCOPE

#### 1. Status flags on UnitState
Add optional boolean flags to `UnitState`:
- `stunned?: boolean` — unit loses next attack turn
- `imprisoned?: boolean` — unit cannot move (board layer, deferred effect)

**File:** `src/lib/types.ts`

---

#### 2. CombatEngine — stun/imprison events
Add `processSpell(state, spell: 'stun' | 'imprison')` function that:
- Sets `stunned` or `imprisoned` on the target unit
- Appends a log entry: `"Sorceress casts Imprison on Knight!"` / `"Knight uses Stun!"` (canonical strings)
- Returns a new `CombatState` — pure, no mutation
- Does NOT add full mana/cost mechanics yet

**File:** `src/features/combat/CombatEngine.ts`

---

#### 3. useCombat — spell dispatch
Add `handleCastSpell(spell: 'stun' | 'imprison')` callback:
- Calls `processSpell(state, spell)`
- Sets state to result
- Not gated on any mana system — just available during battle phase for now

**File:** `src/features/combat/useCombat.ts`

---

#### 4. CombatScene — spell action tray
Wire `spell-heal-icon-v1` and `spell-imprison-icon-v1` from the persistent strip to actual spell buttons:
- Clicking `spell-imprison-icon-v1` calls `handleCastSpell('imprison')`
- Clicking `spell-heal-icon-v1` is a stub button (heal mechanic deferred — icon shows as disabled/greyed with title "Heal — not yet implemented")
- Strip changes from decorative to interactive

**File:** `src/features/combat/CombatScene.tsx`

---

#### 5. CombatScene — combat-status-stun-v1 on real stun state
Show `combat-status-stun-v1` overlay on the stunned unit's side ONLY when `state.units[faction].stunned === true`.
- Overlay persists (not just flash) until stun clears
- Stun clears after the stunned unit's skipped turn

**File:** `src/features/combat/CombatScene.tsx`

---

#### 6. CombatEngine — stun skip logic
In `processAttack`, if the attacking unit is `stunned`:
- Skip the attack
- Log: `"Knight is stunned and cannot attack!"`
- Clear `stunned` flag
- Advance turn as normal

**File:** `src/features/combat/CombatEngine.ts`

---

#### 7. Teleport SFX timing
Move `sfx-teleport-dark-v1` / `sfx-teleport-light-v1` from `handleTurnVoice` (manual button) to auto-trigger on `state.phase` transition into `'battle'` and on each `turnFaction` change in `CombatScene`.
- More honest: teleport = unit entering the arena, not a manual announcement SFX

**File:** `src/features/combat/CombatScene.tsx` (useEffect on `state.turnFaction`)

---

### OUT OF SCOPE FOR 0.6

| Item | Reason |
|------|--------|
| Full spell system (mana, cooldown, targeting) | Too broad — deferred to 0.7+ |
| Full AI opponent | Separate milestone |
| Major UI redesign | Separate KI (feat/board-combat-alpha-0.5 cosmetics, parked) |
| Heal mechanic implementation | Needs balancing design first |
| Board-layer imprisonment effect | Board integration is a separate feature |
| New assets beyond those already imported | Scope frozen to existing 8 external assets |

---

## Files to Change

| File | Change |
|------|--------|
| `src/lib/types.ts` | Add `stunned?: boolean; imprisoned?: boolean` to `UnitState` |
| `src/features/combat/CombatEngine.ts` | `processSpell()`, stun-skip in `processAttack()` |
| `src/features/combat/useCombat.ts` | `handleCastSpell()` exposed from hook |
| `src/features/combat/CombatScene.tsx` | Spell tray → interactive; stun overlay on real state; teleport SFX timing |

---

## Verification Plan

1. `tsc --noEmit` — 0 errors required
2. Unit attack while stunned → skip turn logged, stun clears
3. Cast imprison → log entry, `imprisoned: true` on target unit
4. `combat-status-stun-v1` overlay visible ONLY when `unit.stunned === true`
5. `spell-imprison-icon-v1` button is clickable and triggers log
6. Teleport SFX fires on turn change (not manual button only)

---

## Rollback

Delete branch: `git push origin --delete feat/spell-status-skeleton-0.6`
Tag remains: `board-combat-alpha-0.5` at `4e4ec33`
