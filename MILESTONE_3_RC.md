# Archon — Milestone 3.3 Release

> **Status: Released — Ready for Playtest**
> Build date: 2026-04-24 · Version: **v3.3**
> Tests: **377 / 377** · TSC: **0 errors**

---

## How to Run

### Option A — Desktop Launcher (recommended)
1. Double-click **`▶ Play Archon.bat`** on the Desktop (`C:\Users\KHuff\Desktop\Archon Game\`)
2. A console window will open and start a local HTTP server on **http://127.0.0.1:5175**
3. Your browser will open automatically after a 2-second delay
4. Keep the console window open while you play — close it to stop the server

> The desktop launcher serves the latest compiled build.
> Re-run `npm run build` in `C:\Dev\archon-game` and re-deploy to update it (see § Updating the Launcher below).

### Option B — Dev Server (live reload)
```
cd C:\Dev\archon-game
npm run dev
```
Opens at **http://localhost:5173** (or next available port). Use this for active development.

### Updating the Desktop Launcher After a Code Change
```powershell
cd C:\Dev\archon-game
npm run build

# Deploy fresh bundle to desktop launcher
Copy-Item dist\index.html "C:\Users\KHuff\Desktop\Archon Game\index.html" -Force
Get-ChildItem "C:\Users\KHuff\Desktop\Archon Game\assets" -Filter "index-*" | Remove-Item -Force
Get-ChildItem dist\assets | Copy-Item -Destination "C:\Users\KHuff\Desktop\Archon Game\assets\" -Force
```

---

## Shipped Features

### Milestone 1.x — Board Engine
| Feature | Summary |
|---|---|
| 9×9 Board | Full grid, piece tokens, legal-move highlighting, attack indicators |
| 7-vs-7 Roster | Knight, Herald, Archer, Golem, Phoenix, Troll, Banshee per faction |
| Move Profiles | Per-piece rules: warrior slide, caster jump, sentinel hold, herald warp |
| AI (Dark) | CPU-controlled Dark — advances, seeks power squares, initiates combat |
| Power Squares | 5 marked squares; +2 HP/turn; capture all 5 for instant win |
| Imprisonment Loop | Herald imprisons enemies; allies cure with Heal action |
| Game Over | Win by elimination or power-square control; overlay modal |
| Event Log | Live board log of moves, attacks, heals, combat outcomes |
| Audio | Battle music, move/combat/death SFX, mute toggle |

### Milestone 2.x — Arena Combat
| Feature | Summary |
|---|---|
| 2D Arena | Side-scrolling arena with gravity, jumping, platforms |
| Melee + Ranged | Per-unit attack profiles; projectiles with lifetime |
| Difficulty | Easy / Normal selectable on title screen |
| Phoenix Rebirth | Phoenix survives first lethal hit once per fight |
| Troll Regen | Troll regenerates HP passively during combat |
| Banshee Wail | Radial AoE on cooldown; purple VFX ring |
| Arena → Board | Combat results return to board (winner survives, HP preserved) |
| Round System | Countdown 3-2-1-FIGHT, active phase, result pause |
| Arena Polish | Invuln frames, HP bar pulse, projectile trim, hit/death FX |

### Milestone 2.7 — Save / Resume
| Feature | Summary |
|---|---|
| Auto-save | Board state + log saved to `localStorage` after every change |
| Continue Game | Title screen shows Continue when valid save exists |
| New Game | Clears save, routes through Campaign Map |
| Reset | Board HUD "↺ Reset" button with confirm dialog |
| Combat-safety | Save during arena fight restores to last clean board state |
| Versioned schema | `saveVersion: 1`; corrupt/stale saves rejected gracefully |

### Milestone 3.0 — Campaign Map
| Feature | Summary |
|---|---|
| Campaign Map | Encounter selection screen between title and board |
| 3 Encounters | Tutorial Skirmish · Standard Battle · Arena Test |
| Per-theme styling | Teal / Gold / Purple per encounter type |
| Encounter badge | HUD badge on board shows active encounter |
| Keyboard nav | Enter/Space to launch, Esc to go back |

### Milestone 3.1 — RC Polish
| Fix | Detail |
|---|---|
| Controls section | Keyboard shortcuts reference on Title Screen |
| GameOverModal | "New Game" + "← Return to Title" secondary action |
| M key | M toggles mute from anywhere on the board |
| Copy fixes | Difficulty desc, Arena Test subtitle, "Board Alpha" removed |
| Backspace | Removed from Campaign Map (browser footgun) |
| Version footer | Live version + year in title footer |

### Milestone 3.2 — Tutorial Skirmish v1
| Feature | Summary |
|---|---|
| Reduced 3-vs-3 roster | Light: Knight, Archer, Unicorn · Dark: Sentinel, Banshee, Troll |
| Closer start positions | Row 6 vs row 2 — ~4-row gap, engage in 2–3 turns |
| Campaign routing | App switches on `boardSetup` field: `'skirmish'` or `'initial'` |
| No new assets | All pieces drawn from existing ALPHA_ROSTER |

### Milestone 3.3 — Release Packaging
| Item | Detail |
|---|---|
| Desktop launcher updated | Fresh 3.3 build deployed to `C:\Users\KHuff\Desktop\Archon Game\` |
| Version bump | Footer now shows `v3.3` |
| MILESTONE_3_RC.md | Updated to current test count, features, and limitations |

---

## Test Summary

| Suite | Tests | Status |
|---|---|---|
| boardState.test.ts | 57 | ✅ |
| boardSave.test.ts | 40 | ✅ |
| campaignMap.test.ts | 38 | ✅ |
| skirmishSetup.test.ts | 38 | ✅ |
| arenaResultIntegration.test.ts | 20 | ✅ |
| arenaRoundSystem.test.ts | 44 | ✅ |
| arenaPolish.test.ts | 41 | ✅ |
| bansheeWail.test.ts | 30 | ✅ |
| trollRegen.test.ts | 22 | ✅ |
| phoenixRebirth.test.ts | 19 | ✅ |
| difficultyConfig.test.ts | 19 | ✅ |
| arenaAI.test.ts | 9 | ✅ |
| **Total** | **377** | **✅ All passing** |

---

## Controls Reference

| Input | Action |
|---|---|
| Click piece | Select / deselect |
| Click square | Move or attack |
| Heal button (sidebar) | Cure or heal adjacent ally |
| M | Toggle mute (board) |
| C | Continue saved game (title screen) |
| Enter / Space | Launch encounter (campaign map) |
| Esc | Back / cancel (campaign map) |
| ↺ Reset (HUD) | Clear save and return to title |

---

## Primary Playtest Path

1. **Fresh load** → title screen shows only "⚔ New Game" (no save)
2. **New Game** → Campaign Map — 3 encounter nodes visible
3. **Tutorial Skirmish** → board loads 3-vs-3 with encounter badge "🛡 Tutorial Skirmish"
4. **Play 2–3 turns** — move Light pieces toward Dark; save auto-writes
5. **Reload** → title now shows "↩ Continue Game"
6. **Continue Game** → board restores exactly (same pieces, turn, log)
7. **Trigger Game Over** → confirm modal shows "↺ New Game" + "← Return to Title"
8. **Return to Title** → title screen, no stale save shown
9. **New Game → Standard Battle** → full 14-piece board, encounter badge "⚔ Standard Battle"
10. **Mute test** → press M to mute; press M again to unmute
11. **Reset test** → click "↺ Reset" in HUD → confirm dialog → full reset

---

## QA URL Reference

| URL | Expected behavior |
|---|---|
| `/` | Title screen (no save = New Game only) |
| `/?setup=adjacent` | Board directly — Knight vs Sorceress at centre |
| `/?setup=dark-attacker` | Board directly — Dark moves first |
| `/?setup=gameover` | Board in light-wins game-over state |
| `/?setup=dark-wins` | Board in dark-wins proof state |
| `/?mode=combat` | Standalone combat bridge |
| `/?arena=1` | Board with arena routing active for combat |

> All `?setup=` and `?mode=` params bypass the title screen and campaign map entirely.

---

## Known Limitations

| # | Area | Limitation |
|---|---|---|
| L-01 | Campaign | No progression, unlocks, or rewards between encounters |
| L-02 | Arena | Hard AI (minimax) deferred — Easy and Normal only |
| L-03 | Arena | `?arena=1` URL param required for arena routing; Arena Test encounter cannot set this automatically |
| L-04 | Save | Single save slot only; no import/export |
| L-05 | Save | Save not migrated on `saveVersion` change — old save silently discarded |
| L-06 | Board | Coord debug labels (row,col) visible on each square — no hide toggle |
| L-07 | Audio | Browser autoplay policy may delay music start until first user interaction |
| L-08 | Difficulty | Difficulty selector affects arena AI only; board AI is not difficulty-scaled |

---

## Recommended Next Milestones

| Priority | Milestone | Description |
|---|---|---|
| High | 3.4 — Hard AI | Minimax / alpha-beta for Dark board AI |
| Medium | 3.5 — Campaign Progression v1 | Win/loss tracking, encounter unlock sequence |
| Medium | 3.6 — Arena Test auto-routing | Arena Test encounter auto-enables arena combat without `?arena=1` |
| Low | 3.7 — Save export | Download/upload save JSON |
| Low | 3.8 — Coord label toggle | Hide/show debug coord labels from HUD |

---

*Archon v3.3 · Headless Studios · 2026*
