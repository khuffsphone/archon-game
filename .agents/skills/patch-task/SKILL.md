---
name: patch-task
description: >
  Specialist instructions for small, localized game patches — balance constants,
  single-file bug fixes, asset path corrections. Fast Mode only. Produces a
  walkthrough artifact.
---

# Patch Task Skill (Archon Game)

## When to Use

- Change is confined to **one file**.
- No new game systems or cross-cutting concerns involved.
- Scope is clear and unambiguous (e.g., adjust a stat, fix a typo, correct an import).

## Step-by-Step

### 1. Confirm small scope

If research reveals the change crosses component boundaries or requires a data
model decision, **stop and switch to Planning Mode**.

### 2. Make the edit

- `replace_file_content` — single contiguous block.
- `multi_replace_file_content` — multiple non-adjacent lines in the same file.
- Do not overwrite the entire file.

### 3. Verify

- Run lint / type-check.
- Confirm static JSON still passes Zod validation if a data file was touched.
- Use Scene Lab Review skill if the patch is visible in-game.

### 4. Leave a walkthrough artifact

```markdown
# Patch Walkthrough — <description>
**Date**: <ISO date>
**Mode**: Fast
**Workspace**: archon-game

## What Changed
- File: `<path>`
- Lines: <range>
- Reason: <one sentence>

## Verification
- [ ] Lint / type-check pass
- [ ] Zod validation OK (if data file)
- [ ] Visual proof: <recording path or "N/A">
```

## Rules

- Fast Mode only. Escalate if scope grows.
- The walkthrough artifact is non-negotiable — even for one-liners.
- Balance changes must note the old value and new value in the walkthrough.
