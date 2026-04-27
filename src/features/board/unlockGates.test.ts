/**
 * unlockGates.test.ts — Archon 3.9
 *
 * Tests for the campaign unlock gate system.
 *
 * Covers:
 *  - UNLOCK_PREREQUISITES shape
 *  - isEncounterUnlocked: Tutorial Skirmish always unlocked
 *  - isEncounterUnlocked: Standard Battle locked by default
 *  - isEncounterUnlocked: Standard Battle unlocks after Tutorial Skirmish completed
 *  - isEncounterUnlocked: Dragon's Gate locked by default
 *  - isEncounterUnlocked: Dragon's Gate still locked after only Tutorial Skirmish
 *  - isEncounterUnlocked: Dragon's Gate unlocks after Standard Battle completed
 *  - isEncounterUnlocked: Arena Test always unlocked
 *  - isEncounterUnlocked: completed encounters remain accessible (replayable)
 *  - isEncounterUnlocked: clearing progress re-locks gated encounters
 *  - isEncounterUnlocked: all encounters unlocked when full chain completed
 *  - isEncounterUnlocked: does not mutate progress payload
 *  - UNLOCK_PREREQUISITES: skirmish has no prerequisite
 *  - UNLOCK_PREREQUISITES: arena-test has no prerequisite
 *  - UNLOCK_PREREQUISITES: standard prerequisite is 'skirmish'
 *  - UNLOCK_PREREQUISITES: dragons-gate prerequisite is 'standard'
 *  - Unlock state is derived — completedIds payload has no lock fields
 *  - markEncounterComplete + isEncounterUnlocked compose correctly
 */
import { describe, it, expect } from 'vitest';
import {
  isEncounterUnlocked,
  isEncounterComplete,
  markEncounterComplete,
  UNLOCK_PREREQUISITES,
  PROGRESS_VERSION,
  type CampaignProgressPayload,
} from './campaignProgress';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const empty: CampaignProgressPayload = {
  progressVersion: PROGRESS_VERSION,
  completedIds:    [],
};

function withCompleted(...ids: string[]): CampaignProgressPayload {
  return { progressVersion: PROGRESS_VERSION, completedIds: ids as any };
}

// ─── UNLOCK_PREREQUISITES shape ───────────────────────────────────────────────

describe('3.9 — UNLOCK_PREREQUISITES', () => {
  it("'skirmish' has no prerequisite (always unlocked)", () => {
    expect(UNLOCK_PREREQUISITES['skirmish']).toBeUndefined();
  });

  it("'arena-test' has no prerequisite (always unlocked)", () => {
    expect(UNLOCK_PREREQUISITES['arena-test']).toBeUndefined();
  });

  it("'standard' prerequisite is 'skirmish'", () => {
    expect(UNLOCK_PREREQUISITES['standard']).toBe('skirmish');
  });

  it("'dragons-gate' prerequisite is 'standard'", () => {
    expect(UNLOCK_PREREQUISITES['dragons-gate']).toBe('standard');
  });

  it('has exactly 2 gated encounters', () => {
    expect(Object.keys(UNLOCK_PREREQUISITES)).toHaveLength(2);
  });
});

// ─── Tutorial Skirmish — always unlocked ──────────────────────────────────────

describe("3.9 — isEncounterUnlocked: Tutorial Skirmish", () => {
  it('is unlocked on empty progress', () => {
    expect(isEncounterUnlocked(empty, 'skirmish')).toBe(true);
  });

  it('remains unlocked after completing other encounters', () => {
    const p = withCompleted('standard', 'dragons-gate');
    expect(isEncounterUnlocked(p, 'skirmish')).toBe(true);
  });

  it('remains unlocked after clearing progress', () => {
    // cleared = empty progress
    expect(isEncounterUnlocked(empty, 'skirmish')).toBe(true);
  });
});

// ─── Standard Battle — requires skirmish ──────────────────────────────────────

describe("3.9 — isEncounterUnlocked: Standard Battle", () => {
  it('is LOCKED on empty progress', () => {
    expect(isEncounterUnlocked(empty, 'standard')).toBe(false);
  });

  it('is LOCKED when dragons-gate is completed but not skirmish', () => {
    const p = withCompleted('dragons-gate');
    expect(isEncounterUnlocked(p, 'standard')).toBe(false);
  });

  it('UNLOCKS after Tutorial Skirmish is completed', () => {
    const p = withCompleted('skirmish');
    expect(isEncounterUnlocked(p, 'standard')).toBe(true);
  });

  it('remains unlocked when skirmish is in completedIds regardless of order', () => {
    const p = withCompleted('arena-test', 'skirmish');
    expect(isEncounterUnlocked(p, 'standard')).toBe(true);
  });

  it('remains accessible (replayable) once unlocked', () => {
    // "completed" does not mean "locked" — it's still launchable
    const p = withCompleted('skirmish', 'standard');
    expect(isEncounterUnlocked(p, 'standard')).toBe(true);
    expect(isEncounterComplete(p, 'standard')).toBe(true);
  });
});

// ─── Dragon's Gate — requires standard ───────────────────────────────────────

describe("3.9 — isEncounterUnlocked: Dragon's Gate", () => {
  it('is LOCKED on empty progress', () => {
    expect(isEncounterUnlocked(empty, 'dragons-gate')).toBe(false);
  });

  it('is LOCKED when only skirmish is completed (chain not met)', () => {
    const p = withCompleted('skirmish');
    expect(isEncounterUnlocked(p, 'dragons-gate')).toBe(false);
  });

  it('UNLOCKS after Standard Battle is completed', () => {
    const p = withCompleted('skirmish', 'standard');
    expect(isEncounterUnlocked(p, 'dragons-gate')).toBe(true);
  });

  it('UNLOCKS even if only standard is in completedIds (direct)', () => {
    // prerequisite check is one level — only checks direct parent
    const p = withCompleted('standard');
    expect(isEncounterUnlocked(p, 'dragons-gate')).toBe(true);
  });

  it('remains accessible (replayable) once unlocked', () => {
    const p = withCompleted('skirmish', 'standard', 'dragons-gate');
    expect(isEncounterUnlocked(p, 'dragons-gate')).toBe(true);
    expect(isEncounterComplete(p, 'dragons-gate')).toBe(true);
  });

  it('re-locks when progress is cleared (empty completedIds)', () => {
    expect(isEncounterUnlocked(empty, 'dragons-gate')).toBe(false);
  });
});

// ─── Arena Test — always unlocked ─────────────────────────────────────────────

describe("3.9 — isEncounterUnlocked: Arena Test", () => {
  it('is unlocked on empty progress', () => {
    expect(isEncounterUnlocked(empty, 'arena-test')).toBe(true);
  });

  it('remains unlocked at every stage of the chain', () => {
    const stages = [
      empty,
      withCompleted('skirmish'),
      withCompleted('skirmish', 'standard'),
      withCompleted('skirmish', 'standard', 'dragons-gate'),
    ];
    for (const p of stages) {
      expect(isEncounterUnlocked(p, 'arena-test')).toBe(true);
    }
  });
});

// ─── Full chain progression ────────────────────────────────────────────────────

describe('3.9 — full unlock chain', () => {
  it('only skirmish and arena-test unlocked at start', () => {
    expect(isEncounterUnlocked(empty, 'skirmish')).toBe(true);
    expect(isEncounterUnlocked(empty, 'standard')).toBe(false);
    expect(isEncounterUnlocked(empty, 'dragons-gate')).toBe(false);
    expect(isEncounterUnlocked(empty, 'arena-test')).toBe(true);
  });

  it('completing skirmish unlocks standard, dragons-gate still locked', () => {
    const p = withCompleted('skirmish');
    expect(isEncounterUnlocked(p, 'standard')).toBe(true);
    expect(isEncounterUnlocked(p, 'dragons-gate')).toBe(false);
  });

  it('completing standard unlocks dragons-gate', () => {
    const p = withCompleted('skirmish', 'standard');
    expect(isEncounterUnlocked(p, 'dragons-gate')).toBe(true);
  });

  it('all encounters unlocked once full chain is complete', () => {
    const p = withCompleted('skirmish', 'standard', 'dragons-gate');
    expect(isEncounterUnlocked(p, 'skirmish')).toBe(true);
    expect(isEncounterUnlocked(p, 'standard')).toBe(true);
    expect(isEncounterUnlocked(p, 'dragons-gate')).toBe(true);
    expect(isEncounterUnlocked(p, 'arena-test')).toBe(true);
  });

  it('clear progress re-locks standard and dragons-gate', () => {
    // Simulate clearProgress() → empty progress returned by loadProgress()
    const afterClear = { progressVersion: PROGRESS_VERSION, completedIds: [] };
    expect(isEncounterUnlocked(afterClear, 'standard')).toBe(false);
    expect(isEncounterUnlocked(afterClear, 'dragons-gate')).toBe(false);
    expect(isEncounterUnlocked(afterClear, 'skirmish')).toBe(true);
    expect(isEncounterUnlocked(afterClear, 'arena-test')).toBe(true);
  });
});

// ─── Compose with markEncounterComplete ───────────────────────────────────────

describe('3.9 — markEncounterComplete + isEncounterUnlocked composition', () => {
  it('marking skirmish complete unlocks standard via chain', () => {
    const p = markEncounterComplete(empty, 'skirmish');
    expect(isEncounterUnlocked(p, 'standard')).toBe(true);
  });

  it('marking standard complete unlocks dragons-gate via chain', () => {
    let p = markEncounterComplete(empty, 'skirmish');
    p = markEncounterComplete(p, 'standard');
    expect(isEncounterUnlocked(p, 'dragons-gate')).toBe(true);
  });

  it('isEncounterUnlocked does not mutate the progress payload', () => {
    const p = { ...empty };
    const before = JSON.stringify(p);
    isEncounterUnlocked(p, 'standard');
    expect(JSON.stringify(p)).toBe(before);
  });
});

// ─── Unlock state is derived — payload has no lock fields ─────────────────────

describe('3.9 — unlock state is derived, not persisted', () => {
  it('completedIds payload has no lock-related keys', () => {
    const p = markEncounterComplete(empty, 'skirmish');
    const keys = Object.keys(p);
    expect(keys).not.toContain('locked');
    expect(keys).not.toContain('lockedIds');
    expect(keys).not.toContain('unlockedIds');
    expect(keys).not.toContain('unlockedByDefault');
  });

  it('payload only has progressVersion and completedIds', () => {
    const keys = Object.keys(empty).sort();
    expect(keys).toEqual(['completedIds', 'progressVersion']);
  });

  it('isEncounterUnlocked is a pure function of (progress, id)', () => {
    const p = withCompleted('skirmish');
    // Calling twice returns the same result
    expect(isEncounterUnlocked(p, 'standard')).toBe(true);
    expect(isEncounterUnlocked(p, 'standard')).toBe(true);
  });
});
