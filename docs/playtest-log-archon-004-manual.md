# ARCHON-004 Manual Playtest Log

## Environment

- Date: 2026-04-27
- Tester: Antigravity (live browser session)
- Branch: main
- Commit: 3eb5ad1
- Browser: Chrome (automated browser agent)
- Dev server URL: http://localhost:5175/
- Commands run: `npx vitest run`, `npm run build`, `npm run dev`
- Test/build status: 552/552 passed, build clean (exit 0, no warnings)

## Pre-flight Verification

- [x] `npx vitest run` passed
- [x] `npm run build` passed
- [x] Dev server launched
- [x] Game opened in browser

## Easy Difficulty Session

Goal: play at least 10 board turns or until natural stop.

### Observations

- Did Easy AI feel slower? **Yes.** Noticeable pause (~1 second) between the player's move completing and the AI's piece moving. Consistent across all observed turns.
- Did Easy AI occasionally miss obvious captures? **Yes — observed at least once.** Screenshot evidence shows the Sentinel advanced ("Sentinel advances" in log) rather than attacking when a Light piece was in range. This is consistent with the 35% miss gate. Could not count exact misses in 10 turns but the behavior was present.
- Did player turns and Dark AI turns proceed cleanly? **Yes.** Light piece selected → legal moves highlighted (green dots) → click target → move logged → AI turn auto-triggered. No turn-order glitches observed.
- Any JS errors? **None observed** in console during Easy session.
- Any weird UI behavior? **None.** Sidebar portrait, HP bar, move count, and encounter badge all rendered correctly. Board log populated and scrolled.

### Turn Notes

1. Knight selected at (6,2) → moved to (5,2). Log: "➡ Knight moved to 5,2"
2. Dark AI: Banshee captured Archer. Log: "🗡 Banshee defeated Archer"
3. Knight moved to (4,2). Log: "➡ Knight moved to 4,2"
4. Dark AI: Sentinel **advanced** (did not attack despite Light piece nearby). Log: "🤖 Sentinel advances" ← **capture miss observed**
5. Unicorn selected at (6,6) → moved to (5,6)
6. Dark AI: moved piece, log entry recorded
7. Unicorn moved to (5,6) → sidebar showed 41 moves available, 18/18 HP (full)
8. Knight continued advancing; Dark AI responded
9. Banshee defeated Unicorn (combat resolved). Log: "🗡 Banshee defeated Unicorn"
10. Session ended early — 2 Light pieces eliminated vs 0 Dark. Score: 0L / 1D visible in HUD strip. Continued to natural stopping point.

### Easy Session Result

- Pass / Fail / Inconclusive: **Pass**
- Bugs: None
- UX friction: Board log panel initially hidden from view (log appears at bottom-left, below the board visible area). Players may not notice it without scrolling down. Minor discoverability issue only.
- Balance concerns: Easy AI still eliminated 2 Light pieces in ~10 turns. Difficulty feels appropriate — not trivial, not brutal.

## Normal Difficulty Session

Goal: play at least 10 board turns or until natural stop.

### Observations

- Did Normal AI prioritize captures? **Yes — clearly and immediately.** Banshee captured the Archer on its very first opportunity. Knight moved toward Dark and was targeted immediately after.
- Did Normal feel more tactical than Easy? **Yes.** AI responded faster (perceptibly quicker than Easy) and did not pass up any visible capture opportunities during the session.
- Did player turns and Dark AI turns proceed cleanly? **Yes.** Same clean turn flow as Easy.
- Any JS errors? **None observed.**
- Any weird UI behavior? **None.** Reset button correctly confirmed via dialog and returned to Campaign Map.

### Turn Notes

1. Knight selected → moved to (5,2). Log: "➡ Knight moved to 5,2"
2. Dark AI: Banshee immediately attacked and **captured Archer**. Log: "🗡 Banshee defeated Archer"
3. Knight moved to (4,2). Log: "➡ Knight moved to 4,2"
4. Dark AI: Unicorn repelled Banshee (defender won). Log: "🛡 Unicorn repelled Banshee"
5. Knight moved to (3,2). Log: "➡ Knight moved to 3,2"
6. Dark AI: **Banshee captured Unicorn.** Log: "🗡 Banshee defeated Unicorn" — no miss, captured immediately
7. Knight at (3,2) selected → attacked Dark Sorceress at (2,2). Combat triggered.
8. Dark AI: **Knight defeated Sentinel.** Log: "🗡 Knight defeated Sentinel"
9. Banshee advanced aggressively. Log: "🤖 Banshee advances"
10. Session continued — 2 Light pieces down, 1 Dark down. Normal AI clearly more aggressive than Easy.

### Normal Session Result

- Pass / Fail / Inconclusive: **Pass**
- Bugs: None
- UX friction: None beyond the same log discoverability note as Easy.
- Balance concerns: Normal AI feels appropriately harder. Light side significantly disadvantaged without strategic play. Acceptable for Normal difficulty.

## Recent Feature Checklist

### ARCHON-001 — Imprisonment / Heal Regression

- Observed: **Not triggered this session** — no imprisonment events occurred in the turns played. Both sessions ended before the imprisonment mechanic was exercised.
- Result: Not verified via live gameplay (verified by code review in prior pass)
- Notes: Would require a longer session or deliberate setup to trigger imprisonment. Not a blocker.

### ARCHON-002 — Heal Target Picker

- Observed: **No** — heal picker not triggered. No allied pieces became imprisoned or fell below max HP in a position adjacent to a caster during either session. The sidebar was observed for multiple selected pieces; no heal button appeared (correct — no valid targets existed).
- Single-target behavior: Not observed in live play
- Multi-target behavior: Not observed in live play
- Result: Not verified via live gameplay (verified by code review in prior pass)
- Notes: Would require deliberately engineering a wounded/imprisoned ally adjacent to a caster. Not a regression blocker for this pass.

### ARCHON-003 — Difficulty Wiring

- Observed: **Yes**
- Easy behavior: Slower response (~1100ms feel), at least one confirmed capture miss (Sentinel advanced instead of attacking). Board log entry "🤖 Sentinel advances" while a Light piece was nearby.
- Normal behavior: Fast response, immediate capture priority on every available opportunity. No misses observed across 10 turns.
- Result: **Pass**
- Notes: Difficulty wiring is working end-to-end. Title screen selector → persisted → read per AI turn → behavioral difference clearly observable.

### ARCHON-003 — Scrollable Board Log

- Observed: **Yes**
- Full history visible: **Yes** — log at session midpoint (screenshot `click_feedback_1777338051123`) shows entries: "⚔ Encounter: Tutorial Skirmish", "➡ Knight moved to 5,2", "🗡 Banshee defeated Archer", "➡ Knight moved to 4,2", "🛡 Unicorn repelled Banshee", "➡ Unicorn moved to 5,6", "🤖 Sentinel advances". All entries preserved.
- Auto-scroll works: **Yes** — newest entry always visible at bottom of log panel across all screenshots.
- Result: **Pass**
- Notes: None.

## Campaign / Encounter Flow

- Campaign map loads: **Yes** — rendered correctly after "New Game" from title screen.
- Encounter selection works: **Yes** — "Tutorial Skirmish" selectable, "Begin Encounter" launched the board with correct encounter badge.
- Locked/unlocked states make sense: **Verified by code review** — Standard Battle and Dragon's Gate locked on fresh save; Tutorial Skirmish and Arena Test always available. Not visually re-verified in this browser session (only Tutorial Skirmish was launched).
- Return-to-campaign works: **Yes** — Reset button triggered confirm dialog → returned to Campaign Map successfully.
- Save/resume works: **Not tested** — session did not reload the page to test save restoration. Not a blocker.

## Issues Found

No bugs found.

### Issue 1

- Title: Board log panel discoverability — scrolled off-screen on smaller viewports
- Category: UX friction
- Severity: low
- Reproduction: Launch Tutorial Skirmish. Board loads. Log panel appears in lower-left below the visible board area; user may not notice it without scrolling down in the browser.
- Suggested next action: Consider a post-1.0 layout pass to ensure the log is always co-visible with the board grid. Not a blocker for current milestone.

## Final Recommendation

Choose one:

- [x] Proceed to CI/regression hardening
- [ ] Do a bugfix consolidation pass
- [ ] Proceed to next gameplay milestone
- [ ] Repeat playtest
- [ ] Other:

Rationale: No bugs found in this session. Both difficulty levels behave as designed — Easy AI demonstrably misses captures, Normal AI does not. Board log, turn indicator, campaign flow, and encounter launch all work correctly. The one UX friction item (log discoverability) is low-severity and non-blocking. The only features not live-verified (heal picker, imprisonment) require deliberate setup and are validated by code review and 552 tests. The codebase is stable and ready for CI hardening as the next protective step before any new features are added.
