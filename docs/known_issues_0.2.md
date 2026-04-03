# Known Issues — board-combat-alpha-0.2

**Milestone:** `board-combat-alpha-0.2`  
**Date:** 2026-04-02

---

## Open Issues

### KI-001: Dark faction round-trip not yet proven
- **Severity:** Low (does not block current milestone)
- **Description:** The `?setup=adjacent` test only proves Light as attacker. Dark attacking Light has not been tested end-to-end.
- **Impact:** Asymmetric confidence in round-trip correctness
- **Target:** 0.3

### KI-002: Multi-turn game flow untested
- **Severity:** Low
- **Description:** Only single-contest scenarios have been QA'd. Multi-turn flows (piece moves without contest, then contest) have not been browser-proven.
- **Target:** 0.3

### KI-003: Game-over state not QA'd
- **Severity:** Low
- **Description:** The code path for eliminating a player's last piece exists but has not been exercised in QA.
- **Target:** 0.3

### KI-004: Workshop board-state preview not implemented
- **Severity:** Low (blocked Part 2 Workshop lane, not game)
- **Description:** Lane 2 (Workshop board-state preview) was deferred from 0.2. Scene Lab does not yet show board piece slots or missing slot warnings.
- **Target:** 0.3 Workshop lane

### KI-005: gitpush/ temp directory in C:\Dev
- **Severity:** Cosmetic
- **Description:** `C:\Dev\gitpush/` contains the `isomorphic-git` npm install used for push operations. Not committed to any repo, but should be cleaned up.
- **Target:** Cleanup task

### KI-006: Branch-first workflow not yet enforced
- **Severity:** Process
- **Description:** All 0.2 work landed directly on `main` before the branch+PR workflow was established. The retroactive branches/PR were created after the fact for auditability. Starting from 0.3, all milestone work must start on a feature branch.
- **Status:** Process established for 0.3 onward

---

## Resolved in 0.2

- ✅ Board state reset on mode switch — fixed by lifting `boardState` to `App.tsx`
- ✅ `node_modules` tracked in git — cleaned from index via isomorphic-git
- ✅ VFX anchor targeting wrong side — fixed in v1.1.1 (prior milestone)
- ✅ Manifest duplicate entries — dedup guard added to Workshop server (prior milestone)
