---
name: combat-slice-qa
description: >
  Browser-based QA validation skill for the Archon combat slice.
  Run this skill after each significant change to archon-game.
  Owner: QA / Release agent. Requires browser subagent.
---

# Combat Slice QA

## Scope
Validates the Knight vs Sorceress combat slice at `http://localhost:5173`.
Produces visual proof (screen capture) and a pass/fail report.

## Prerequisites
- `archon-game` running: `npm run dev` in `c:\Dev\archon-game`
- Combat pack assets in `archon-game/public/assets/` (Knight + Sorceress + arena + audio)
- Browser subagent available

## QA Checklist

### 1. Load test
- [ ] Navigate to `http://localhost:5173`
- [ ] **Intro screen** appears: Cinzel title, "Begin Battle" button visible
- [ ] No JS console errors
- [ ] Arena background visible (not plain black)

### 2. Start battle
- [ ] Click **Begin Battle** (`#btn-start-battle`)
- [ ] Turn banner appears showing "☀ Light" turn 1
- [ ] Knight token visible on left (`#img-token-knight`)
- [ ] Sorceress token visible on right (`#img-token-sorceress`)
- [ ] Both HP bars at 100%

### 3. Attack flow
- [ ] Click **Knight Attacks** (`#btn-attack`)
- [ ] Sorceress card gets `hit-anim` class (shake animation plays)
- [ ] Sorceress HP bar decreases and color transitions (green → yellow → red)
- [ ] Log entry appears: "Knight attacks Sorceress for X damage."
- [ ] Turn banner flips to "🌑 Dark" turn

### 4. Death sequence
- [ ] Continue clicking Attack until one unit reaches 0 HP
- [ ] Defeated unit shows defeated image (`#img-defeated-<id>`)
- [ ] "☠ Defeated" stamp visible
- [ ] Victory banner appears with correct faction name
- [ ] Rematch button present (`#btn-rematch`)

### 5. Rematch
- [ ] Click Rematch
- [ ] State resets to intro (or back to fresh battle)
- [ ] HP bars both at 100%

### 6. Audio (if enabled)
- [ ] Click 🔊 audio toggle (`#btn-audio-toggle`)
- [ ] Click attack — sfx-melee-hit plays
- [ ] Music starts on battle begin (or user gesture)

## Proof Requirement
Browser subagent must:
1. Capture a screenshot of the intro screen
2. Capture a screenshot mid-battle (after 3+ attacks, HP bars damaged)
3. Capture a screenshot of the victory banner
4. Save recording as `artifacts/combat_slice_qa_<date>.webp`

## Pass Criteria
- All 5 checklist sections pass
- No JS errors in console
- Victory banner visible after death
- Rematch resets state correctly

## Artifact
Leave `artifacts/qa_report.md` with:
- Date
- Pass / Fail per checklist section
- Console errors (if any)
- Embedded screenshots
- Rollback note: what broke (if failed) and which commit to revert to
