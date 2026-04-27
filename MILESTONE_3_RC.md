# Archon — Milestone 3.7 Release

> **Status: Released — Ready for Playtest**
> Build date: 2026-04-25 · Version: **v3.7**
> Tests: **438 / 438** · TSC: **0 errors**

---

## How to Run

### Option A — Desktop Launcher (recommended)
1. Double-click **`▶ Play Archon.bat`** on the Desktop (`C:\Users\KHuff\Desktop\Archon Game\`)
2. A console window opens and starts a local HTTP server on **http://127.0.0.1:5175**
3. Your browser opens automatically after a 2-second delay
4. Keep the console window open while you play

### Option B — Dev Server (live reload)
```
cd C:\Dev\archon-game
npm run dev
```
Opens at **http://localhost:5173**. Use this for active development.

### Updating the Desktop Launcher After a Code Change
```powershell
cd C:\Dev\archon-game
npm run build
Copy-Item dist\index.html "C:\Users\KHuff\Desktop\Archon Game\index.html" -Force
Get-ChildItem "C:\Users\KHuff\Desktop\Archon Game\assets" -Filter "index-*" | Remove-Item -Force
Get-ChildItem dist\assets | Copy-Item -Destination "C:\Users\KHuff\Desktop\Archon Game\assets\" -Force
```

---

## Shipped Features by Milestone

### 1.x — Board Engine
| Feature | Summary |
|---|---|
| 9×9 Board | Full grid, piece tokens, legal-move highlight, attack indicators |
| 7-vs-7 Roster | Knight, Herald, Archer, Golem, Phoenix, Troll, Banshee per faction |
| Move Profiles | Per-piece rules: warrior slide, caster jump, sentinel hold, herald warp |
| AI (Dark) | CPU-controlled Dark — advances, seeks power squares, initiates combat |
| Power Squares | 5 marked squares; +2 HP/turn; capture all 5 for instant win |
| Imprisonment Loop | Herald imprisons enemies; allies cure with Heal action |
| Game Over | Elimination or power-square control; overlay modal |
| Event Log | Live board log |
| Audio | Battle music, SFX, mute toggle |

### 2.x — Arena Combat
| Feature | Summary |
|---|---|
| 2D Arena | Side-scrolling arena — gravity, jumping, platforms |
| Melee + Ranged | Per-unit attack profiles; projectiles |
| Difficulty | Easy / Normal on title screen |
| Phoenix Rebirth | Survives first lethal hit once per fight |
| Troll Regen | Passive HP regen during combat |
| Banshee Wail | Radial AoE on cooldown; purple VFX ring |
| Arena → Board | Results carry back to board |
| Round System | 3-2-1-FIGHT countdown, result pause |

### 2.7 — Save / Resume
| Feature | Summary |
|---|---|
| Auto-save | `localStorage` after every board change |
| Continue Game | Visible on title when save exists |
| Reset | HUD "↺ Reset" with confirm |

### 3.0 — Campaign Map
| Feature | Summary |
|---|---|
| Campaign Map | Encounter selection between title and board |
| 3 Encounters | Tutorial Skirmish · Standard Battle · Arena Test |
| Encounter badge | HUD badge shows active encounter |

### 3.1 — RC Polish
Controls section on title screen, GameOverModal "Return to Title", M key mute, copy/UX fixes.

### 3.2 — Tutorial Skirmish v1
Light: Knight/Archer/Unicorn · Dark: Sentinel/Banshee/Troll · Row 6 vs row 2 · ~4-turn engagement.

### 3.3 — Release Packaging v1
Desktop launcher updated. Version footer introduced.

### 3.5 — Campaign Progression v1
| Feature | Summary |
|---|---|
| Encounter completion | Light win with active encounter marks it complete |
| localStorage persistence | Stored at `archon:progress:v1` (separate from board save) |
| Campaign Map badges | ✓ Completed green badge on finished encounter nodes |
| Clear Progress | Subtle link removes all completion state with confirmation |
| No lock gates | All encounters remain replayable regardless of completion |

### 3.6 — Encounter Completion Feedback v1
| Feature | Summary |
|---|---|
| Encounter Complete banner | Green pill with ✓ and encounter name inside Game Over modal |
| Return to Campaign | Primary action (auto-focused, green) routes back to Campaign Map |
| Double-fire guard | `useRef` ensures `onEncounterComplete` fires exactly once per game-over |
| Existing actions preserved | New Game (secondary) · Return to Title (tertiary) unchanged |
| Dark win unaffected | No banner or Return to Campaign shown on Dark win |

### 3.7 — Release Refresh v1
Desktop launcher updated to v3.7 build. Documentation updated through 3.6/3.7.

---

## Test Summary (438 / 438 ✅)

| Suite | Tests |
|---|---|
| boardState.test.ts | 57 |
| boardSave.test.ts | 40 |
| campaignMap.test.ts | 38 |
| skirmishSetup.test.ts | 38 |
| campaignProgress.test.ts | 35 |
| gameOverModal.test.ts | 26 |
| arenaRoundSystem.test.ts | 44 |
| arenaPolish.test.ts | 41 |
| bansheeWail.test.ts | 30 |
| arenaResultIntegration.test.ts | 20 |
| trollRegen.test.ts | 22 |
| phoenixRebirth.test.ts | 19 |
| difficultyConfig.test.ts | 19 |
| arenaAI.test.ts | 9 |
| **Total** | **438** |

---

## Controls

| Input | Action |
|---|---|
| Click piece | Select / deselect |
| Click square | Move or attack |
| Heal button (sidebar) | Cure or heal adjacent ally |
| M | Toggle mute (board) |
| C | Continue saved game (title) |
| Enter / Space | Launch encounter (campaign map) |
| Esc | Back (campaign map) |
| ↺ Reset (HUD) | Clear save, return to campaign |

---

## Primary Playtest Path

1. **Fresh load** → title screen shows "⚔ New Game" only (no save)
2. **New Game** → Campaign Map — 3 encounter nodes visible
3. **Tutorial Skirmish** → board loads 3-vs-3, encounter badge "🛡 Tutorial Skirmish"
4. **Win the skirmish** (defeat all Dark pieces) → Game Over modal shows:
   - "✦ Light Victorious"
   - "✓ Encounter Complete — Tutorial Skirmish" green banner
   - "↩ Return to Campaign" primary action
5. **Return to Campaign** → Campaign Map shows "✓ Completed" badge on Tutorial Skirmish
6. **Standard Battle** → full 14-piece board, encounter badge "⚔ Standard Battle"
7. **Reload** → "↩ Continue Game" appears on title
8. **Continue Game** → board restores exactly
9. **Game Over** → confirm "↺ New Game" + "← Return to Title" still work
10. **Press M** to mute; M again to unmute
11. **↺ Reset** (HUD) → confirm dialog → full reset to campaign

---

## QA URL Reference

| URL | Expected behavior |
|---|---|
| `/` | Title screen |
| `/?setup=adjacent` | Board — Knight vs Sorceress at centre |
| `/?setup=dark-attacker` | Board — Dark moves first |
| `/?setup=gameover` | Board — light-wins game-over state |
| `/?setup=dark-wins` | Board — dark-wins state |
| `/?mode=combat` | Standalone combat bridge |
| `/?arena=1` | Board with arena routing active for combat |

> All `?setup=` and `?mode=` params bypass title screen and campaign map entirely.

---

## Known Limitations

| # | Limitation |
|---|---|
| L-01 | No campaign progression, unlocks, or rewards |
| L-02 | Hard AI (minimax) deferred — Easy and Normal only |
| L-03 | `?arena=1` URL param required for arena routing; Arena Test can't auto-set it |
| L-04 | Single save slot only |
| L-05 | Save not migrated on schema change — old save silently discarded |
| L-06 | Coord debug labels visible on board squares |
| L-07 | Browser autoplay may delay music start until first click |
| L-08 | Difficulty selector affects arena AI only (board AI unaffected) |

---

## Recommended Next Milestones

| Priority | Milestone |
|---|---|
| High | 3.8 — Hard AI (minimax/alpha-beta board AI) |
| Medium | 3.9 — Arena Test auto-routing (no `?arena=1` needed) |
| Medium | 4.0 — Campaign Progression v2 (win/loss tracking, encounter sequence) |
| Low | 4.1 — Save export/import |
| Low | 4.2 — Coord label toggle |

---

*Archon v3.7 · Headless Studios · 2026*
