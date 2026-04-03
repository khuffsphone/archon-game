# Archon — Repository Structure

## Layout

```
C:\Dev\
├── archon-game/          ← standalone git repo (archon-game)
├── archon-workshop/      ← standalone git repo (archon-workshop)
├── smoke-tests.mjs       ┐
├── clean-manifest-duplicates.mjs  │
├── phase0-checkpoint.mjs │
├── copy-combat-assets.mjs│  ← archon-ops repo (root C:\Dev)
├── export-combat-pack.mjs│
├── ... (more ops scripts)┘
├── README.md
└── .gitignore
```

## Three-Repo Decision

The project uses **three standalone git repositories**:

| Repo | Root | Branch | Tags |
|---|---|---|---|
| `archon-game` | `C:\Dev\archon-game` | `master` | combat-slice-v1.1, combat-slice-v1.1.1, board-combat-alpha-0.1, board-combat-alpha-0.2 |
| `archon-workshop` | `C:\Dev\archon-workshop` | `master` | — |
| `archon-ops` | `C:\Dev` | `master` | — |

### Why not a monorepo?

`archon-game` was initialized first and carries the full project history across
5 commits and 4 annotated release tags. Absorbing it into a root-level monorepo
would require `git subtree` operations that add complexity and risk rewriting
meaningful tag/commit history. The sibling layout gives equivalent access
for agents, GitHub, and ChatGPT while preserving history cleanly.

A monorepo migration via `git subtree add` remains an option if desired — see
Phase 3 planning. It is not done automatically to avoid accidental history loss.

## What Is In Git (per repo)

### archon-game
```
src/                     ← all React/TS source
  App.tsx                ← mode routing (board/combat)
  features/board/        ← BoardScene, boardState
  features/combat/       ← CombatScene, CombatBridge, useCombat
  lib/                   ← board-combat-contract (FROZEN), packLoader, types
public/assets/           ← 27 approved runtime assets (PNG/WAV/MP3, ~9 MB)
.agents/rules/           ← operating rules
.agents/skills/          ← skill definitions
.agents/workflows/       ← workflow docs
docs/                    ← chatgpt-github-bridge.md, mcp-phase2-design.md, slice-contract.md
AGENTS.md, README.md, package.json, tsconfig.json, vite.config.ts
```

### archon-workshop
```
src/                     ← Workshop UI (React)
  App.tsx
  features/              ← ExportPanel, GenerationPanel, SceneLabPanel, VFXWorkflowPanel
  lib/                   ← assetManifest, gemini, promptTemplates, versionGuard
server.ts                ← Workshop backend (Express)
.agents/                 ← Workshop-specific rules, skills, workflows
docs/                    ← kickoff prompts, knowledge items, task groups
.env.example             ← GEMINI_API_KEY reference
AGENTS.md, INSTALL.md, package.json, tsconfig.json, vite.config.ts
```

### archon-ops (C:\Dev root)
```
smoke-tests.mjs                 ← 59-test regression suite
clean-manifest-duplicates.mjs   ← dedup fix (run once)
phase0-checkpoint.mjs           ← Phase 0 gate verification
copy-combat-assets.mjs          ← Workshop → game asset copy
export-combat-pack.mjs          ← Workshop pack export trigger
import-related scripts...
README.md
.gitignore                      ← excludes archon-game/, archon-workshop/, estate_sale_flip_simulator/
```

## What Is Excluded from Git (all repos)

| Pattern | Reason |
|---|---|
| `node_modules/` | npm install |
| `public/generated/` | 1,028 files, 142 MB — AI-generated assets, not committed |
| `public/exports/` | ZIP export archives — transient |
| `dist/` | Build output |
| `.env` | Contains GEMINI_API_KEY |
| `*.log` | Server logs |
| `.idea/` | JetBrains IDE |
| `trash/` | Scratch files |

## GitHub Repos to Create

| Local | GitHub (suggested name) |
|---|---|
| `C:\Dev\archon-game` | `github.com/YOU/archon-game` |
| `C:\Dev\archon-workshop` | `github.com/YOU/archon-workshop` |
| `C:\Dev` | `github.com/YOU/archon-ops` (optional, can be private) |
