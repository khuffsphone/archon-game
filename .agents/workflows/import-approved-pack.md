Import an approved Workshop export pack into the Archon game workspace.

Rules:
- read only the exported manifest
- load only approved versions
- ignore Workshop preview state
- fail clearly on missing required approved ids

Return:
- importer entry point
- manifest fields consumed
- approved asset ids loaded
- blockers caused by export mismatches
