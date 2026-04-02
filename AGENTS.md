# AGENTS.md — Archon Game

This workspace consumes approved exported assets from Archon Workshop.

Read in this order:
1. `.agents/rules/*`
2. relevant `.agents/skills/*/SKILL.md`
3. `docs/slice-contract.md`
4. `docs/kickoff-prompts/05-game-slice.md`

Primary Part 1 goal:
Build one web-based Archon combat slice that loads only approved exported assets.

Constraints:
- browser target only for Part 1
- Vite + React
- CSS-first styling
- do not depend on transient Workshop preview state
- fail clearly when required approved exports are missing

When a task completes, leave:
- changed files
- importer/runtime contract used
- asset ids consumed
- proof of approved export usage
- blockers back to Workshop if any
