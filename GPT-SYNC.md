# Archon Project — GPT Sync Document
**Last Updated:** 2026-04-23 | Milestone 2.2  
**Completion:** ~72% of full roadmap  
**Next Objective:** Milestone 2.3 — Piece-Specific Abilities (Phoenix rebirth, Troll regen)

---

## Standing Sync Workflow
- **`GPT-SYNC.md`** is the canonical cross-system sync artifact. It lives in repo root and is committed after every milestone.
- After each milestone Antigravity outputs a `CHATGPT SYNC BLOCK` (≤15 lines) for manual paste into ChatGPT.
- No browser automation into ChatGPT. No multi-system orchestration unless explicitly instructed.

---

## How to use this file
Paste into ChatGPT → Headless Studios at the start of any new session to restore full project context instantly.

---

## Project Overview
**Archon** — A browser-based 2-player strategy game (Light vs AI-controlled Dark) built in React + TypeScript + Vite. Faithful recreation of the classic Archon board game with a 2.0 interactive combat arena.

**Repo:** `C:\Dev\archon-game`  
**Desktop playtester:** `C:\Users\KHuff\Desktop\Archon Game\▶ Play Archon.bat`  
**Dev URL:** `http://127.0.0.1:5174`  
**Arena test URL:** `http://127.0.0.1:5174/?arena=1&setup=adjacent`

---

## Completed Milestones

### ✅ 1.0 — Board Engine + Imprison/Heal Loop
- 9×9 board, 14 pieces per faction, full movement profiles
- Imprisonment mechanic, heal spell, turn log, cure flash VFX
- `boardState.ts` fully tested

### ✅ 1.1–1.5 — Combat Bridge + Full Roster
- `CombatBridge` + `CombatScene` — static turn-based combat
- All 14 unit types (Knight, Archer, Djinni, Golem, Phoenix, Unicorn, Valkyrie / Sorceress, Banshee, Basilisk, Dragon, Goblin, Manticore, Shapeshifter, Troll)
- Unit token, portrait, defeated assets for all 14 pieces
- Power square regen (+2HP/turn for pieces on power squares)

### ✅ 1.6 — Dark AI (CPU Opponent)
**FILE:** `src/features/board/aiEngine.ts`
- Deterministic greedy AI for Dark faction
- 4-priority heuristic: Capture > Approach Power Square > Approach Enemy > Random
- 750ms thinking delay, input block during AI turn
- Pulsing "🤖 Dark is thinking…" HUD indicator

### ✅ 1.7 — Power Square Victory Condition
**FILE:** `src/features/board/boardState.ts`
- `getPowerSquareController()`, `getPowerSquareControlMap()`, `checkPowerSquareWin()`
- `getGameOverMeta()` checks PS win before annihilation
- `executeMove` + `applyCombatResult` both check PS win → trigger gameover
- HUD: 5 ⚡ pips (blue=light, purple=dark, dim=empty)
- Win banner: "Light ⚡ Controls All 5!"
- **57 unit tests, 57 passing** (11 new 1.7 tests)

### ✅ 1.8 — Sound & VFX System
**FILE:** `src/features/board/audioEngine.ts` (NEW)
- Web Audio API engine: lazy AudioContext, buffer cache, fire-and-forget
- 13 assets wired: move-light/dark, combat, hit, hit-heavy, death-light/dark, victory, defeat, turn-light/dark, magic, music-battle-loop
- Music loop fades in on game start, fades out on game over
- Voice lines on turn changes
- `playSound()`, `playMusic()`, `stopMusic()`, `toggleMute()`, `preloadSounds()`
- 🔊/🔇 mute button in HUD, persisted to localStorage

### ✅ 1.9 — Title Screen
**FILE:** `src/features/board/TitleScreen.tsx` (NEW)
- Animated ARCHON logo: shimmer-sweep gold→blue→purple gradient (Cinzel 900 font)
- Faction crests: ☀ Light (blue glow) + 🌑 Dark (purple glow), breathing float animation
- Animated plasma orb background (blurred radial gradients, 14s drift cycle)
- ⚔ New Game CTA with pulsing golden border, auto-focus
- Keyboard shortcut: Enter or Space → starts game
- 600ms fade-out transition into board
- Rules grid: 5 cards (Move, Combat, Power Squares, Dark AI, Victory)
- `?setup=` QA params bypass title screen

### ✅ Asset Pass — All Stubs Replaced
| Asset | Status |
|---|---|
| `arena-light-v1.png` | REGENERATED — "ARCHON" branded, stained-glass cathedral |
| `arena-dark-v1.png` | REGENERATED — "ARCHON" branded, obsidian colosseum |
| `spell-heal-icon-v1.png` | GENERATED — glowing gold-green cross |
| `spell-imprison-icon-v1.png` | GENERATED — purple arcane cage with runes |
| `ui-button-hover-v1.png` | GENERATED — golden magical sigil |
| `sfx-teleport-light-v1.wav` | SYNTHESIZED — rising sweep 600→2400Hz + shimmer |
| `sfx-teleport-dark-v1.wav` | SYNTHESIZED — descending FM sweep 2200→180Hz + rumble |
| `sfx-magic-bolt-v1.wav` | SYNTHESIZED — electric sawtooth + FM zap + crackle |
| `sfx-melee-hit-heavy-v1.wav` | SYNTHESIZED — sub-bass thump + noise body + metallic ring |

**Generator:** `generate-sfx.mjs` — pure Node.js, zero deps, raw PCM WAV writer

### ✅ 2.0 — Interactive 2D Combat Arena
**DIRECTORY:** `src/features/arena/` (7 NEW files)

| File | Purpose |
|---|---|
| `arenaConfig.ts` | All tunable constants (bounds, speeds, role multipliers, AI thresholds) |
| `entities.ts` | `ArenaEntity` type + `boardPieceToEntity()` stat mapper |
| `arenaPhysics.ts` | AABB movement + melee hit detection + wall clamping |
| `arenaAI.ts` | 3-state FSM: APPROACH → ATTACK → RETREAT |
| `arenaRenderer.ts` | Canvas draw calls (bg vignette, sprites, glow, hit FX, countdown) |
| `gameLoop.ts` | rAF 60fps loop, input `Set<string>`, attack state machine, win detection |
| `ArenaScene.tsx` | React shell: `<canvas>` + DOM HUD (HP bars, timer, VS, controls, result) |

**Role-based stat mapping:**
| Role | Speed | Damage | Range | Attack Type |
|---|---|---|---|---|
| warrior | ×1.00 | ×1.25 | ×0.90 | Melee |
| caster | ×0.80 | ×1.55 | ×1.70 | **Ranged projectile** |
| sentinel | ×0.90 | ×1.10 | ×1.00 | Melee |
| herald | ×1.30 | ×0.90 | ×1.10 | Melee |

### ✅ 2.1 — Arena Physics & Ranged Combat Patch
- **Gravity:** Entities now fall with `GRAVITY = 2200 px/s²` — real weight
- **Jump:** `Space` key fires `JUMP_IMPULSE = -820 px/s`; only when `onFloor = true`
- **Controls split:** `← → / A D` = move | `Space` = jump | `Z / X / Enter` = attack
- **`justPressedKeys` Set:** Jump and attack trigger on key-press (not hold) — no autofire
- **Ranged projectiles (casters):** Sorceress/Banshee/Djinni fire glowing energy bolts instead of melee. Bolt travels at 900 px/s, 1.4s lifetime, AABB hit detection
- **AI range-keeping:** Caster AI maintains preferred distance (`attackRange × 0.75`), backs away if player closes in
- **AI jump:** Melee AI occasionally jumps to follow height-varied player
- **Fixed:** Hardcoded `aiSpeed = 280` replaced with `enemy.moveSpeed` (role-derived)
- **`moveSpeed` on entity:** Now stored directly on `ArenaEntity` for use by AI and player input
- **`drawProjectiles()`:** Glowing faction-colored ellipses with bright white center, alpha fade on despawn

**AI FSM:** APPROACH → in-range → ATTACK → cooldown → APPROACH; HP <28% → RETREAT (1.8s)  
**Attack machine:** windup 120ms → active 100ms (hitbox) → recovery 200ms  
**Invulnerability frames:** 350ms after being hit  
**Feature flag:** `?arena=1` activates ArenaScene; without flag, legacy CombatBridge is unchanged

**Integration:**
- `App.tsx`: `USE_ARENA` const reads URL param, routes `onLaunchCombat` accordingly
- `index.css`: Full arena CSS (HP bars with faction glow, low-HP pulse, timer flash, result overlay, fade animations)
- Audio: Arena fires `window CustomEvent('arena:sfx')` → `ArenaScene` calls `playSound()`

### ✅ 2.2 — Difficulty Selector
**FILES:** `src/features/arena/difficultyConfig.ts` (NEW), `TitleScreen.tsx`, `arenaAI.ts`, `gameLoop.ts`, `ArenaScene.tsx`
- `Difficulty` type: `'easy' | 'normal'` (Hard explicitly deferred)
- `AIProfile` interface: speedMult, rangeMult, retreatHpRatio, retreatDurationMs, attackSkipChance, useYWander, useJump, reactionDelayMult
- **Easy profile:** speed ×0.62, range ×0.70, retreat at 52% HP (vs 28%), retreat lasts 2.6s, skips 45% of attacks, no Y-wander, no jump, 2.8× reaction delay
- **Normal profile:** exact 2.1 behaviour unchanged
- `persistDifficulty()` / `getDifficulty()` via `sessionStorage` — survives refresh, clears on tab close
- `getActiveProfile()` returns the live AIProfile — read once at `GameLoop` construction
- `createAIController()` now accepts AIProfile, scales reactionDelay via `reactionDelayMult`
- `tickAI()` now accepts AIProfile as 5th arg — applies all knobs per frame
- **Title Screen selector:** Easy / Normal buttons with `aria-pressed`, active golden border, description sub-label
- **Arena HUD badge:** small pill below VS label — green for EASY, gold for NORMAL
- `HudSnapshot.difficulty` field added — badge reads from live snapshot
- **28 new tests** (19 difficultyConfig + 9 arenaAI): profile definitions, Easy vs Normal comparisons, persistence, reaction delay, speed, retreat threshold, attack skip, Y-wander flags
- **Total: 85/85 tests passing · TSC clean**

---

## Current Test Status
```
85 tests / 85 passing (57 board + 19 difficultyConfig + 9 arenaAI)
tsc --noEmit: 0 errors
```

---

## Architecture Quick Reference
```
src/
  App.tsx                         ← Mode router + combat bridge
  features/
    board/
      BoardScene.tsx              ← 9×9 grid, HUD, AI integration
      boardState.ts               ← Full engine (moves, combat, PS win)
      aiEngine.ts                 ← Dark CPU (greedy heuristic)
      audioEngine.ts              ← Web Audio system
      TitleScreen.tsx             ← Splash / main menu
    arena/
      ArenaScene.tsx              ← React shell + DOM HUD + difficulty badge
      gameLoop.ts                 ← rAF loop (the core engine)
      entities.ts                 ← Stat mapper + HudSnapshot
      arenaAI.ts                  ← Enemy FSM (AIProfile-driven)
      arenaPhysics.ts             ← AABB physics + gravity + projectiles
      arenaRenderer.ts            ← Canvas draw calls
      arenaConfig.ts              ← Tunable constants
      difficultyConfig.ts         ← AIProfile system + sessionStorage persistence
      __tests__/
        difficultyConfig.test.ts  ← Profile + persistence tests
        arenaAI.test.ts           ← Easy vs Normal behaviour tests
    combat/
      CombatBridge.tsx            ← Legacy static combat (preserved)
      CombatScene.tsx             ← Original combat demo tab
  lib/
    board-combat-contract.ts      ← FROZEN type contract between layers
    packLoader.ts                 ← Asset URL resolution
    types.ts                      ← Shared types
```

---

## Next Steps (Pending User Direction)

| Option | Description | Effort |
|---|---|
| A | **Piece Abilities** — Phoenix rebirth, Troll regen, Banshee wail AoE | 2-3 sessions |
| B | **Two-Player Keyboard** — Player 2 = IJKL + L-Shift | 0.5 session |
| C | **Hard AI** — minimax/search look-ahead | 2 sessions |
| D | **Persistent Save** — localStorage game state resume | 1 session |
| E | **Round System** — best-of-3 arena rounds before board result | 1 session |

---

## Key Decisions / Constraints
- Board combat contract (`board-combat-contract.ts`) is **FROZEN** — changes require explicit approval
- Arena is behind `?arena=1` flag — legacy CombatBridge always works without the flag
- No external game engines (no Phaser, no Unity) — pure browser Canvas + rAF
- Sound system uses lazy AudioContext (browser autoplay policy safe)
- All assets self-contained in `public/assets/` — game works offline

---

*This document is auto-maintained by Antigravity. Last sync: 2026-04-23T18:13:00Z*
