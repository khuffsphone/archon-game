# Workshop Export Consumer

Use this skill for importing approved exported assets from Archon Workshop into the game runtime.

## Required behavior
- read the exported manifest
- load only approved versions
- ignore candidates unless explicitly asked for compare/debug tools
- fail clearly when required approved ids are missing
- keep the importer isolated from Workshop internals

## Output contract
Return:
- import path used
- manifest fields consumed
- assumptions made
- blockers caused by export mismatches
