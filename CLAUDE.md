# CLAUDE.md — Archon (Chess + Archon-style Arena Combat)

## Project Identity

A grid-based tactics game in the spirit of Archon (Free Fall Associates, 1983).
A 9×9 board with named fantasy pieces and chess-like move profiles; when a piece
moves onto a contested square, the game drops into a **real-time side-scrolling
arena duel** to resolve the fight. Board control is fought over via **luminance
squares** and **power squares** rather than chess checkmate.

**Elevator pitch:** Chess-like maneuvering on a board + real-time Archon-style
duels when pieces clash.

> **Pitch note:** Earlier drafts of this doc described "terrain that matters"
> (forest/water/mountain/etc.) as the core hook. That system was never built and
> has now been **formally rejected** (Creative Director, 2026-05-21). The board
> mechanic is canonically **luminance + power squares** — see Pillar 2 below. The
> elevator pitch no longer references terrain.

**Target outcome:** Publishable Steam title, solo developer with AI augmentation.

**Working title:** Archon (placeholder — `productName` in package.json / Electron build)

---

## Status at Handoff

- **Version:** v3.7 — **Released, Ready for Playtest** (see `MILESTONE_3_RC.md`).
- **Tests:** 438 / 438 passing · `tsc --noEmit`: 0 errors.
- **Platform:** Browser is the primary target (Vite + React). An Electron
  wrapper exists for a desktop launcher build but is secondary.
- **Next work: v4 scope, now unblocked.** The terrain question (formerly the
  one open pillar) was **resolved 2026-05-21** in favor of luminance + power
  squares (Pillar 2 — decided). All five pillars are now locked. The next
  milestone is to define **v4 scope** from the repo's recommended-next list
  (Hard/minimax board AI, arena auto-routing to retire the `?arena=1` flag,
  campaign progression v2), pending:
  1. an **asset inventory** (what approved exports exist vs. what v4 needs), and
  2. a **v4 planning pass** to pick and sequence the milestone.
- Bug fixes, refactors, tests, and polish within shipped systems are fine to
  proceed on at any time.

---

## Design Pillars

**All five pillars are now locked.** Four were decided implicitly by the shipped
code; the fifth (terrain) was resolved by explicit Creative Director decision on
2026-05-21. Each is documented below as a locked decision with the rationale
visible in the codebase.

### 1. Combat style — **DECIDED: turn-based board + real-time arena duel**
Board maneuvering is turn-based; when pieces contest a square the game launches
a real-time side-scrolling arena fight.
*Evidence:* `src/features/arena/arenaConfig.ts` defines gravity (2200 px/s²),
jump impulse, melee hitboxes/cooldowns, projectile speed/lifetime, a 30 s combat
timer, and a 3-2-1-FIGHT countdown. `arenaAI.ts`, `arenaPhysics.ts`, and
`gameLoop.ts` implement live simulation, not turn resolution. This is the
opposite of the original doc's "lean: turn-based" — the code chose
Archon-classic arcade combat.

### 2. Board mechanic — **DECIDED: luminance + power squares (terrain rejected)**
The canonical board mechanic is `SquareLuminance`
(`light | dark | neutral | contested`) plus **5 power squares** (+2 HP/turn;
capturing all 5 is an instant win). No terrain system (forest/water/mountain/
wasteland/sacred/corrupted) exists, and none is planned.
*Decision:* Creative Director, **2026-05-21** — **Path A: embrace luminance +
power squares as the canonical board mechanic.**
*Rationale:* A month of playtesting validated that luminance advantage + the
5-power-square capture-or-eliminate objective already produces the tactical
depth originally attributed to "terrain that matters." Layering a terrain
system on top would (a) introduce a third interacting board variable and risk
cognitive overload, and (b) require modifying the **frozen**
`board-combat-contract.ts`. The net cost outweighs the net unlock.
*Evidence:* `src/lib/board-combat-contract.ts` (`SquareLuminance`,
`BoardSquare`), `src/features/board/boardState.ts`.
*Rejected direction (documented, not forbidden forever):* A designed terrain
system — terrain types that modify movement/combat — was considered and
**declined for v4**. It is not in scope. Revisiting it post-launch would require
a fresh Creative Director decision and a contract-change blocker artifact.

### 3. Roster identity — **DECIDED: named characters, 7 per faction**
Seven named pieces per side (Knight, Herald, Archer, Golem, Phoenix, Troll,
Banshee) mapped onto **4 combat roles** (`warrior | caster | sentinel | herald`)
that drive arena stat multipliers.
*Evidence:* `PieceRole` in `board-combat-contract.ts`; roster in
`boardState.ts`; `ROLE_STATS` in `arenaConfig.ts`; piece-specific behaviors in
`phoenixRebirth`, `trollRegen`, `bansheeWail` tests. (Original doc said "six
archetypes"; reality is 7 named pieces over 4 roles.)

### 4. Win condition — **DECIDED: elimination OR power-square control**
No chess checkmate. A faction wins by eliminating the enemy or by controlling
all 5 power squares.
*Evidence:* game-over handling in `boardState.ts` /
`gameOverModal.test.ts`; power-square logic referenced in `MILESTONE_3_RC.md`.
(Original doc's "hybrid checkmate" was not implemented.)

### 5. Aesthetic identity — **DECIDED: painted 2D via approved asset pipeline**
Art is consumed as approved, hashed exports from a separate **Archon Workshop**
repo through a frozen pack manifest. The game only loads approved asset ids and
fails loudly when a required id is missing.
*Evidence:* `src/combat-pack-manifest.json`, `src/lib/packLoader.ts`,
`src/lib/types.ts` (`CombatPackManifest`), `public/assets/*` (27 approved
PNG/WAV assets), `AGENTS.md`, `docs/slice-contract.md`. The exact visual style
isn't verifiable from code, but provenance tracking is real.

---

## Working Agreement

You (Claude Code) operate as lead programmer and design consultant on a
solo-developer project. The human is Creative Director, holds final approval on
design decisions and shipped assets, and is the only authority on whether
something is "fun."

**Act without asking:**
- Implementation that fits clearly within the locked pillars (1, 3, 4, 5)
- Bug fixes, refactors, performance work, test writing
- Tooling, editor extensions, build pipeline
- Code review and architectural critique
- Drafting design proposals for the human to react to

**Ask first:**
- Reopening any locked pillar — including revisiting the rejected terrain
  direction (Pillar 2), which additionally requires a contract-change blocker
- Any change to combat feel, balance math (`arenaConfig.ts` constants,
  `ROLE_STATS`), or the core game loop
- Any change to the **frozen** `src/lib/board-combat-contract.ts` (requires a
  blocker artifact + explicit sign-off)
- Any new dependency or framework addition
- Anything that increases scope (new feature, mode, system)
- Anything touching shipped art assets or the approved pack manifest

**Communication style:**
- Direct and specific. No filler. No throat-clearing.
- Flag concerns honestly. The four to watch for: combat feel, balance, scope
  creep, art cohesion.
- When proposing changes, give the tradeoff, not just the suggestion.
- When the human is wrong, say so with reasoning. No sycophancy.
- Brevity by default. Length only when the problem warrants it.

---

## Review Priorities

When reviewing existing code (initial pass and ongoing):

1. **Architectural integrity** — Does the piece/role structure support new
   pieces cleanly? Is the arena combat decoupled from board and rendering via
   the frozen contract? Note: `board-combat-contract.ts` is the only sanctioned
   cross-lane dependency — flag any lane importing the other's internals.
2. **State management** — Game state is lifted to `App.tsx` and persisted to
   `localStorage`; rules live in `features/*/`-level modules separate from React
   presentation. Watch for state leaking back into components.
3. **Scope discipline** — What is in the codebase that does not need to be there
   yet? The `experiments/octane-street-racer/` tree and legacy static
   `CombatBridge` are candidates to question.
4. **Combat-feel exposure** — Fastest path to two pieces fighting in isolation:
   `?mode=combat` (standalone bridge) and `?arena=1` (board → arena routing).
   Combat feel remains the highest-risk unknown.
5. **Asset pipeline** — Approved-export discipline, manifest validation, AI
   provenance. Already in place via the Workshop pipeline — keep it intact.

For each finding, report: (a) what was found, (b) why it matters, (c) the
smallest change that would fix it, (d) the cost of not fixing it now.

---

## Honest Risks

- **Combat-feel problem.** Real-time bumping duels can get repetitive. The arena
  is built; the open work is making it *fun* across all 7 pieces. Get it in
  front of human playtesters.
- **AI-art perception.** Steam audiences are hostile to obvious AI assets.
  Defense: distinctive style commitment + human polish passes + transparent
  dev-log communication. The provenance pipeline supports this.
- **Pitch/identity messaging.** The "terrain that matters" hook is gone by
  decision; the pitch is now luminance + power-square control. Marketing copy,
  the Steam page, and dev-log communication must lead with that mechanic, not
  terrain — keep messaging consistent so the identity reads as intentional.
- **Scope creep.** Multiplayer, branching campaign, mod support, custom piece
  editor — none in v1. Ship the core.
- **Balance complexity.** 7 pieces × 4 roles × real-time arena = balance hell.
  Plan an extensive playtest phase. Tuning lives in `arenaConfig.ts`.

---

## Tech Stack

- **Engine/framework:** Vite 6 + React 19 (browser-first). Electron 31 wrapper
  for an optional desktop launcher build (`electron/main.cjs`, `package-electron.mjs`).
- **Language:** TypeScript (~5.8), ESM (`"type": "module"`).
- **Source control:** git (this repo, `archon-game`). Sibling repos
  `archon-workshop` (asset generation) and `archon-ops` (scripts) per
  `docs/repo-structure.md`.
- **Asset pipeline:** Approved hashed exports from Archon Workshop, consumed via
  `src/combat-pack-manifest.json` + `src/lib/packLoader.ts`. Generated assets
  (`public/generated/`, `public/exports/`) are git-excluded.
- **Test framework:** Vitest (`npm test`, `npm run test:run`). 438 tests.
- **Lint/typecheck:** `npm run lint` → `tsc --noEmit`.
- **CI:** GitHub Actions baseline (`ARCHON-005`).

**Conventions:** CSS-first styling. Feature-foldered under `src/features/`
(`board`, `combat`, `arena`). Shared cross-lane types only via
`src/lib/board-combat-contract.ts`. Match existing patterns; do not impose new
conventions without asking. See also `.agents/rules/*` and `AGENTS.md`.

**Run:**
- `npm run dev` → http://localhost:5173
- `npm run build` → `tsc && vite build`
- `npm test` / `npm run test:run`

**QA URLs:** `?mode=combat` (standalone duel), `?arena=1` (board→arena routing),
`?setup=adjacent|dark-attacker|gameover|dark-wins` (board QA fixtures). See
`MILESTONE_3_RC.md` for the full table.

---

## Milestone State

Shipped through v3.7 (see `MILESTONE_3_RC.md` for the detailed feature table):

- [x] Vertical slice: board renders, pieces, combat resolves
- [x] Full named roster (7 per faction) with distinct combat behavior
- [x] Real-time arena combat (gravity, melee, projectiles, AI, round system)
- [x] Board control system (luminance + 5 power squares) — *substitutes for the
      original "terrain" milestones, which were never built*
- [x] Single-player AI opponent (board AI + arena AI; Easy/Normal)
- [x] Campaign meta-layer (campaign map, 3 encounters, progression v1)
- [x] Save / resume (localStorage, single slot)
- [x] Terrain decision — *resolved 2026-05-21: luminance + power squares
      (terrain rejected)*
- [ ] **v4 scope** — *define next; pending asset inventory + v4 planning*
- [ ] Hard AI (minimax/alpha-beta board AI) — recommended 3.8
- [ ] Arena auto-routing (retire `?arena=1` flag) — recommended 3.9
- [ ] Campaign progression v2 (win/loss tracking, encounter sequence)
- [ ] Balance pass against AI and self-play
- [ ] External playtest cohort (10+ humans)
- [ ] Polish pass
- [ ] Marketing materials (Steam page, trailer, press kit)
- [ ] Steam Next Fest demo
- [ ] Launch

[Update checkboxes after each work session.]

---

## Out of Scope for v1

- Online multiplayer or netcode
- Map editor or mod support
- Branching narrative campaign
- Custom piece creation by players
- Live ops or seasonal content
- Console / mobile ports

Reserve for v1.1, sequel, or post-launch only after v1 ships and finds an
audience.

> Note: `experiments/octane-street-racer/` is an unrelated prototype living in
> this repo. It is not part of Archon v1 scope.
