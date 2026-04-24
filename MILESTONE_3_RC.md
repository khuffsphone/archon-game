# Archon — Milestone 3.1 Release Candidate

> Status: **RC — Ready for Playtest**  
> Build date: 2026-04-24  
> Tests: **339 / 339** · TSC: **0 errors**

---

## Shipped Features

### Milestone 1.x — Board Engine
| Feature | Summary |
|---|---|
| 9×9 Board | Full grid, piece tokens, legal-move highlighting, attack indicators |
| 7-vs-7 Roster | Knight, Herald, Archer, Golem, Phoenix, Troll, Banshee per faction |
| Move Profiles | Per-piece movement rules (warrior slide, caster jump, sentinel hold, herald warp) |
| AI (Dark Faction) | CPU-controlled Dark side — advances, seeks power squares, initiates combat |
| Power Squares | 5 marked squares; +2 HP/turn regen; capture all 5 for instant win |
| Imprisonment Loop | Herald can imprison enemies; allies can cure imprisonment |
| Game Over | Win by elimination or power-square control; modal overlay + HUD |
| Event Log | Live board log showing moves, attacks, heals, combat outcomes |
| Audio | Board music, move/combat/death SFX, mute toggle (M key) |

### Milestone 2.x — Arena Combat
| Feature | Summary |
|---|---|
| 2D Arena | Side-scrolling arena scene with gravity, jumping, platforms |
| Melee + Ranged | Per-unit attack profiles; projectiles with lifetime |
| Difficulty | Easy (slower AI) / Normal (tactical AI) selectable on title screen |
| Phoenix Rebirth | Phoenix survives first lethal hit once per fight |
| Troll Regen | Troll regenerates HP passively during combat |
| Banshee Wail | Radial AoE on cooldown; VFX ring |
| Arena → Board | Combat results carry back to board (winner survives, HP preserved) |
| Round System | Countdown (3-2-1-FIGHT), active phase, result pause |
| Arena Polish | Invuln tuning, HP bar low-health pulse, projectile trim, hit/death FX |

### Milestone 2.7 — Save / Resume
| Feature | Summary |
|---|---|
| Auto-save | Board state + log saved to `localStorage` on every change |
| Continue Game | Title screen shows Continue button when a valid save exists |
| New Game | Clears save, resets board, routes through Campaign Map |
| Reset Save | Board HUD "↺ Reset" button with confirm dialog |
| Combat-phase safety | Save during arena fight restores to last clean board state |
| Versioned payload | `saveVersion: 1` schema; corrupt/stale saves rejected gracefully |

### Milestone 3.0 — Campaign Map v1
| Feature | Summary |
|---|---|
| Campaign Map | Encounter selection screen between title and board |
| 3 Encounters | Tutorial Skirmish · Standard Battle · Arena Test |
| Per-theme styling | Teal / Gold / Purple per encounter type |
| Encounter badge | HUD badge on board shows active encounter |
| Keyboard nav | Enter/Space to launch, Esc to go back |

### Milestone 3.1-rc — RC Polish
| Fix | Detail |
|---|---|
| Version string | Footer updated to `v3.1-rc` |
| Difficulty copy | "Normal" description cleaned up |
| Controls section | Added keyboard controls reference to Title Screen |
| Arena Test copy | Subtitle changed to player-facing copy |
| Backspace shortcut | Removed Backspace as Campaign Map back key (browser footgun) |
| "Board Alpha" label | Hidden when encounter badge is active (redundant) |
| Redundant HUD button | Removed gameover "New Game" from HUD |
| GameOverModal labels | "Play Again" → "New Game"; added "← Return to Title" |
| M key mute | Added M keyboard shortcut for mute toggle on board |
| 4 new tests | RC copy-quality regression tests |

---

## Test Summary

| Suite | Tests | Status |
|---|---|---|
| boardState.test.ts | 57 | ✅ |
| boardSave.test.ts | 40 | ✅ |
| campaignMap.test.ts | 38 | ✅ |
| arenaResultIntegration.test.ts | 20 | ✅ |
| arenaRoundSystem.test.ts | 44 | ✅ |
| arenaPolish.test.ts | 41 | ✅ |
| bansheeWail.test.ts | 30 | ✅ |
| trollRegen.test.ts | 22 | ✅ |
| phoenixRebirth.test.ts | 19 | ✅ |
| difficultyConfig.test.ts | 19 | ✅ |
| arenaAI.test.ts | 9 | ✅ |
| **Total** | **339** | **✅ All passing** |

---

## Known Limitations

| # | Area | Limitation |
|---|---|---|
| L-01 | Campaign | Tutorial Skirmish uses the same full 7-vs-7 roster as Standard Battle |
| L-02 | Campaign | No progression, unlocks, or rewards between encounters |
| L-03 | Arena | Hard AI deferred — Easy and Normal only |
| L-04 | Arena | `?arena=1` URL param still required for arena routing |
| L-05 | Save | Single save slot only |
| L-06 | Save | Save not migrated on `saveVersion` change — old save silently discarded |
| L-07 | Board | Coord debug labels visible on each square |
| L-08 | Audio | Browser autoplay policy may delay music start until first click |
| L-09 | Difficulty | Difficulty selector affects arena AI only; board AI is unaffected |

---

## Recommended Playtest Path

1. Fresh load → confirm title screen (no save = New Game only)
2. New Game → Campaign Map → Tutorial Skirmish → confirm encounter badge
3. Play 2–3 turns → confirm save auto-writes
4. Reload → confirm Continue Game appears on title
5. Continue Game → confirm board restores exactly
6. Trigger Game Over (or use `?setup=gameover`) → confirm modal shows "New Game" + "Return to Title"
7. Return to Title → confirm title screen, no stale save
8. New Game → Standard Battle → play to completion
9. Arena Test → confirm encounter badge; board loads normally
10. QA URLs: `?setup=adjacent`, `?setup=gameover`, `?arena=1`, `?mode=combat`
11. Mute: press M to mute, M again to unmute
12. Reset: Board HUD "↺ Reset" → confirm dialog → full reset

---

## QA URL Reference

| URL | Expected behavior |
|---|---|
| `/` | Title screen |
| `/?setup=adjacent` | Board, adjacent contest setup |
| `/?setup=dark-attacker` | Board, dark attacker setup |
| `/?setup=gameover` | Board, light-wins game-over state |
| `/?setup=dark-wins` | Board, dark-wins proof setup |
| `/?mode=combat` | Standalone combat bridge |
| `/?arena=1` | Board with arena routing active |

---

*Archon v3.1-rc · Headless Studios · 2026*
