# Archon Game — Permanent Operating Rules

## Agent Mode Policy

| Task Type | Mode |
|---|---|
| New screens, game systems, data pipelines, multi-file changes, QA | **Planning Mode** |
| Single-file patches, balance tweaks, copy edits | **Fast Mode** |

**Planning Mode workflow:** Research → Implementation Plan artifact → User approval → Execute → Walkthrough artifact.  
**Fast Mode:** Execute immediately, no plan required.

## Artifact Requirement

Every agent task **must** leave a terminal artifact before yielding control.  
Acceptable artifact types:
- `walkthrough.md` — summary of changes and verification  
- `task.md` — live TODO list during execution  
- `implementation_plan.md` — design document awaiting user approval  
- `qa_report.md` — QA findings  

No artifact = task not complete.

## Browser Subagent Usage

- Use `browser_subagent` for all Scene Lab reviews and UI validation.  
- Always specify `RecordingName` so proof is captured as a `.webp` video.  
- Embed screenshots or recording paths in the walkthrough artifact.  
- Do **not** accept verbal descriptions of UI state as evidence.

## Knowledge & Memory

- All approved style decisions (color palette, typography, faction names, animation timing) **must** be stored as Knowledge Items or committed to `.agents/rules/style/`.  
- Naming conventions for assets, screens, and game objects belong in `.agents/rules/naming.md`.  
- Read existing KIs before starting any research on a topic they cover.

## QA Agent Rules

- QA always runs in **Planning Mode**.  
- Must produce `qa_report.md` listing test scope, pass/fail per scenario, and open defects.  
- Must use the browser subagent to capture visual proof of any UI assertions.

## General Hygiene

- Prefer `multi_replace_file_content` for non-contiguous edits.  
- Never auto-run destructive commands.  
- Static JSON + Zod validation is the established data pipeline pattern — do not bypass it.
