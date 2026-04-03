# Archon MCP Phase 2 — Optional Design

> **Status: OPTIONAL — Not required for current workflow.**
> GitHub + Antigravity is the primary and sufficient bridge.
> This document defines what a Remote MCP service could add later.

---

## Problem Statement

GitHub gives ChatGPT read access to code, docs, and committed manifests.
But some useful Archon project state is **not in git**:

- The live Workshop asset manifest (1,028+ generated images, regenerated on server start)
- Approved/pending/rejected VFX status per asset ID
- Export records (which combat packs have been exported, when, to which build)
- QA artifacts (browser recordings, screenshot evidence for release gates)
- Dedup guard status (last run output)
- Release metadata (what is truly shipped vs. what is pending)

A Remote MCP server could expose these as structured, queryable resources
so ChatGPT can make grounded decisions without needing Antigravity to paste
raw JSON into the conversation.

---

## What MCP Is Not (Constraints)

- **NOT a local MCP server** — ChatGPT cannot connect to `localhost`.
- **NOT the primary bridge** — GitHub remains the primary read channel.
- **NOT in scope for Part 2** — No infrastructure or credentials are available yet.
- **NOT a write channel from ChatGPT** — ChatGPT remains read-only.

---

## Proposed MCP Resources

A future remote MCP service (e.g., hosted on Railway, Fly.io, or a VPS) would expose:

### Resource: `archon://manifest/status`
```json
{
  "schema_version": "1.0",
  "total_assets": 235,
  "vfx_approved": 10,
  "vfx_pending": 0,
  "dedup_clean": true,
  "last_rehydrate": "2026-04-02T21:00:00Z"
}
```

### Resource: `archon://export/latest`
```json
{
  "export_id": "combat-pack-2026-04-02",
  "asset_count": 27,
  "exported_at": "2026-04-02T20:45:00Z",
  "copied_to_game": true,
  "verified": true
}
```

### Resource: `archon://qa/gate`
```json
{
  "tag": "board-combat-alpha-0.2",
  "smoke_tests": "59/59",
  "typescript": "0 errors",
  "browser_qa": "PASS",
  "milestone_c_proven": true,
  "state_persistence_proven": true
}
```

### Resource: `archon://assets/{id}/status`
Returns approved/pending/rejected status per VFX asset ID.

---

## Implementation Requirements (for Phase 2)

| Requirement | Status |
|---|---|
| Workshop backend exposes a read-only HTTP API | Partially done (Workshop server has `/api/health`, `/api/manifest`) |
| That API is publicly accessible (or tunneled) | ❌ Not done — localhost only |
| MCP server wraps the Workshop API | ❌ Not done |
| ChatGPT connects to remote MCP endpoint | ❌ Not done |
| Auth/security layer | ❌ Not designed |

---

## Recommended Implementation Path (when ready)

1. **Expose Workshop API publicly** — use Cloudflare Tunnel, ngrok, or deploy Workshop to a VPS.
2. **Add a read-only MCP shim** — a lightweight Node.js/Express server that wraps Workshop API endpoints as MCP resources.
3. **Secure with a bearer token** — pass the token as `MCP_API_KEY` in the remote URL.
4. **Register with ChatGPT** — add the remote MCP endpoint in ChatGPT settings.

---

## Not In Scope for MCP

- ChatGPT writing commits or files
- MCP replacing the GitHub read access
- Local file system access via MCP from ChatGPT

---

## Decision: When to Implement

Implement Phase 2 MCP only when:
- Part 2 board-combat alpha is in a beta/playtest state
- The Workshop needs to serve asset status to multiple agents concurrently
- The GitHub read channel is no longer sufficient for QA grounding

Until then: **GitHub + Antigravity is the correct and sufficient bridge.**
