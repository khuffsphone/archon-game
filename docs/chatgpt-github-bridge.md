# ChatGPT GitHub Bridge — Archon Project

## Purpose

This document defines how ChatGPT accesses the Archon project for code analysis,
planning, and architectural review.

---

## Primary Access Path: GitHub (read-oriented)

**ChatGPT connects to Archon through the GitHub integration.**

- Install the GitHub app in your ChatGPT workspace.
- Connect it to the relevant Archon repos.
- ChatGPT can then read, cite, and analyze source files and docs directly.

This is the **primary and stable bridge**. No local folder access. No MCP required.

---

## Repository Structure

The Archon project uses **three standalone git repositories** (not a monorepo with submodules):

| Repo | Purpose | GitHub |
|---|---|---|
| `archon-game` | Vite + React game client — board, combat slice, bridge | Push to: `github.com/YOU/archon-game` |
| `archon-workshop` | Asset factory — Workshop UI, Gemini generation, Scene Lab, export | Push to: `github.com/YOU/archon-workshop` |
| `archon-ops` (root `C:\Dev`) | Shared CLI ops scripts — smoke tests, import, export pipeline | Push to: `github.com/YOU/archon-ops` (optional, can be private) |

### Why three repos instead of one monorepo?

`archon-game` already carries 5 commits and 4 annotated release tags
(`combat-slice-v1.1`, `combat-slice-v1.1.1`, `board-combat-alpha-0.1`, `board-combat-alpha-0.2`)
with meaningful project history. Merging it into a root monorepo via `git subtree`
would add complexity and risk that history being re-weighted. The sibling layout
provides the same access pattern for both ChatGPT and human developers.

---

## What ChatGPT Can Do via GitHub

| Action | Supported |
|---|---|
| Read source files (`src/`, `server.ts`, `*.tsx`) | ✅ Yes |
| Read docs (`docs/`, `AGENTS.md`, `README.md`) | ✅ Yes |
| Read `.agents/rules`, `.agents/skills`, `.agents/workflows` | ✅ Yes |
| Read manifests and contracts committed to git | ✅ Yes |
| Analyze architecture, suggest changes, write reviews | ✅ Yes |
| Push commits or write files directly | ❌ No — GitHub access via ChatGPT is read-only |

---

## What Antigravity Does (Write-Capable Local System)

Antigravity (this system) is the **write-capable execution layer**:

- Edits source files
- Runs TypeScript checks and smoke tests
- Commits and tags releases
- Runs dev servers, browser QA, and screenshot capture
- Manages the Workshop backend and asset generation pipeline

**Workflow pattern:**
```
ChatGPT (reads GitHub, plans, advises)
  ↓  instructions
Antigravity (executes, writes, commits, pushes)
  ↓  updates GitHub
ChatGPT (sees updated state on next read)
```

---

## What ChatGPT Should NOT Assume

- ❌ ChatGPT cannot access `C:\Dev` directly as a local folder.
- ❌ ChatGPT cannot push to GitHub or commit changes.
- ❌ ChatGPT cannot use MCP to access local project state (see optional MCP Phase 2).
- ❌ Do not share `.env` files or API keys through GitHub — they are gitignored.

---

## Key Files for Orientation (point ChatGPT at these)

| File | Content |
|---|---|
| `archon-game/README.md` | Quick start, stack, tags |
| `archon-game/src/lib/board-combat-contract.ts` | **FROZEN** interface contract between board and combat |
| `archon-game/src/features/board/boardState.ts` | Board engine + ALPHA_ROSTER |
| `archon-game/src/features/combat/CombatScene.tsx` | Combat baseline (v1.1.1) |
| `archon-game/src/features/combat/CombatBridge.tsx` | Board→combat bridge adapter |
| `archon-game/src/App.tsx` | Mode routing (board/combat) |
| `archon-workshop/server.ts` | Workshop backend (asset import, manifest, export) |
| `archon-game/.agents/rules/` | Agent operating rules |
| `archon-game/.agents/skills/` | Agent skill definitions |

---

## Current Stable Tags (in archon-game)

```
combat-slice-v1.1         — Part 1 VFX pass complete
combat-slice-v1.1.1       — Part 1 stabilization gate
board-combat-alpha-0.1    — Part 2 board shell + combat bridge
board-combat-alpha-0.2    — Part 2 state persistence + round-trip proven ← CURRENT
```

---

## Optional Phase 2: Remote MCP

A future Remote MCP service could expose non-repo project state to ChatGPT:
- approved asset inventory and dedup status
- export records and manifest health
- QA artifacts and release metadata

See `docs/mcp-phase2-design.md` for the optional design.

**This is NOT required for the current workflow.** GitHub + Antigravity is the stable bridge.
