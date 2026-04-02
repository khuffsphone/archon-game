---
name: scene-lab-review
description: >
  Use this skill whenever you need to visually inspect, validate, or capture
  proof of UI behavior in Scene Lab or any browser-based preview for Archon Game.
  Mandatory for any QA task involving a visual component.
---

# Scene Lab Review Skill

## When to Use

- Any game screen or interaction change that requires visual proof.
- QA validation pass before marking a feature complete.
- Verifying animation, layout, color, or faction art shipped correctly.

## Step-by-Step

### 1. Launch the browser subagent

```
browser_subagent(
  TaskName    = "Scene Lab Review — <feature>",
  TaskSummary = "Visual proof of <what changed> in Archon Game.",
  RecordingName = "archon_game_<feature>_review",
  Task = """
    1. Open <URL / Expo dev server / Scene Lab URL>.
    2. Navigate to <screen / scene>.
    3. Exercise the interaction or state being validated.
    4. Capture a screenshot of the final state.
    5. Return: screenshot path, console errors, pass/fail per criterion.
  """
)
```

### 2. Collect results

- Absolute path to `.webp` recording.
- Console errors (none is acceptable; list if present).
- Pass/fail verdict per acceptance criterion.

### 3. Produce the QA artifact

Write `qa_report.md`:

```markdown
# QA Report — <Feature>
**Date**: <ISO date>
**Workspace**: archon-game

## Scope
<What was tested>

## Evidence
![Recording](<absolute .webp path>)

## Results
| Criterion | Result | Notes |
|---|---|---|
| <criterion> | PASS / FAIL | |

## Open Defects
- <defect or "None">
```

## Rules

- `RecordingName` is mandatory — no exceptions.
- If `open_browser_url` fails, surface the error immediately and ask the user.
- Embed recording in the artifact. Do not claim a UI is correct without visual evidence.
- Faction art, palette, and naming must conform to the style KI before marking PASS.
