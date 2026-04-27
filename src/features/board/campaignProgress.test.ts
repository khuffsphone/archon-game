/**
 * campaignProgress.test.ts — Archon 3.5
 *
 * Tests for the campaign progression persistence module.
 *
 * Covers:
 *  - loadProgress returns empty payload when no save exists
 *  - markEncounterComplete adds id to completedIds
 *  - markEncounterComplete is idempotent (duplicate calls safe)
 *  - markEncounterComplete does not mutate the original payload
 *  - isEncounterComplete returns correct values
 *  - saveProgress + loadProgress round-trip
 *  - clearProgress wipes the progression key
 *  - validateProgress: valid payload accepted
 *  - validateProgress: wrong version rejected
 *  - validateProgress: missing completedIds rejected
 *  - validateProgress: non-array completedIds rejected
 *  - validateProgress: completedIds with non-string entries rejected
 *  - validateProgress: null rejected
 *  - validateProgress: non-object rejected
 *  - loadProgress falls back to empty when localStorage is corrupt
 *  - Completed encounters remain replayable (not locked out by data shape)
 *  - All 3 encounter types can be individually marked complete
 *  - Progress is independent of board save key
 *  - PROGRESS_KEY is not the same as SAVE_KEY
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadProgress,
  saveProgress,
  markEncounterComplete,
  isEncounterComplete,
  clearProgress,
  validateProgress,
  PROGRESS_KEY,
  PROGRESS_VERSION,
  type CampaignProgressPayload,
} from './campaignProgress';
import { SAVE_KEY } from './boardSave';

// ─── localStorage stub ───────────────────────────────────────────────────────
// vitest runs in node; use a simple in-memory Map to stand in for localStorage.
const store: Map<string, string> = new Map();

beforeEach(() => {
  store.clear();
  // Patch global localStorage
  (globalThis as any).localStorage = {
    getItem:    (k: string) => store.get(k) ?? null,
    setItem:    (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear:      () => { store.clear(); },
  };
});

// ─── loadProgress ─────────────────────────────────────────────────────────────

describe('3.5 — loadProgress()', () => {
  it('returns empty payload when nothing is stored', () => {
    const p = loadProgress();
    expect(p.progressVersion).toBe(PROGRESS_VERSION);
    expect(p.completedIds).toEqual([]);
  });

  it('returns empty payload when stored data is corrupt JSON', () => {
    store.set(PROGRESS_KEY, '{invalid json');
    const p = loadProgress();
    expect(p.completedIds).toEqual([]);
  });

  it('returns empty payload when stored data has wrong version', () => {
    store.set(PROGRESS_KEY, JSON.stringify({ progressVersion: 999, completedIds: [] }));
    const p = loadProgress();
    expect(p.completedIds).toEqual([]);
  });

  it('returns stored completedIds when data is valid', () => {
    const payload: CampaignProgressPayload = {
      progressVersion: PROGRESS_VERSION,
      completedIds:    ['skirmish'],
    };
    store.set(PROGRESS_KEY, JSON.stringify(payload));
    const p = loadProgress();
    expect(p.completedIds).toContain('skirmish');
  });

  it('does not crash when localStorage is unavailable', () => {
    (globalThis as any).localStorage = undefined;
    expect(() => loadProgress()).not.toThrow();
  });
});

// ─── markEncounterComplete ────────────────────────────────────────────────────

describe('3.5 — markEncounterComplete()', () => {
  const empty: CampaignProgressPayload = { progressVersion: PROGRESS_VERSION, completedIds: [] };

  it('adds the encounter id to completedIds', () => {
    const next = markEncounterComplete(empty, 'skirmish');
    expect(next.completedIds).toContain('skirmish');
  });

  it('does not mutate the original payload', () => {
    const original = { progressVersion: PROGRESS_VERSION, completedIds: [] };
    markEncounterComplete(original, 'skirmish');
    expect(original.completedIds).toHaveLength(0);
  });

  it('is idempotent — marking the same encounter twice does not duplicate', () => {
    const once  = markEncounterComplete(empty, 'skirmish');
    const twice = markEncounterComplete(once,  'skirmish');
    expect(twice.completedIds.filter(id => id === 'skirmish')).toHaveLength(1);
  });

  it('returns the same object reference when already complete (no-op optimization)', () => {
    const once = markEncounterComplete(empty, 'skirmish');
    const ref  = markEncounterComplete(once,  'skirmish');
    expect(ref).toBe(once); // exact same object — no mutation
  });

  it('can mark all 4 encounter types independently', () => {
    let p = empty;
    p = markEncounterComplete(p, 'skirmish');
    p = markEncounterComplete(p, 'standard');
    p = markEncounterComplete(p, 'dragons-gate');
    p = markEncounterComplete(p, 'arena-test');
    expect(p.completedIds).toContain('skirmish');
    expect(p.completedIds).toContain('standard');
    expect(p.completedIds).toContain('dragons-gate');
    expect(p.completedIds).toContain('arena-test');
    expect(p.completedIds).toHaveLength(4);
  });

  it('preserves existing completedIds when adding a new one', () => {
    const withOne  = markEncounterComplete(empty, 'skirmish');
    const withTwo  = markEncounterComplete(withOne, 'standard');
    expect(withTwo.completedIds).toContain('skirmish');
    expect(withTwo.completedIds).toContain('standard');
  });
});

// ─── isEncounterComplete ──────────────────────────────────────────────────────

describe('3.5 — isEncounterComplete()', () => {
  const empty: CampaignProgressPayload = { progressVersion: PROGRESS_VERSION, completedIds: [] };

  it('returns false for an incomplete encounter', () => {
    expect(isEncounterComplete(empty, 'skirmish')).toBe(false);
  });

  it('returns true for a completed encounter', () => {
    const p = markEncounterComplete(empty, 'skirmish');
    expect(isEncounterComplete(p, 'skirmish')).toBe(true);
  });

  it('returns false for a different encounter than the one completed', () => {
    const p = markEncounterComplete(empty, 'skirmish');
    expect(isEncounterComplete(p, 'standard')).toBe(false);
    expect(isEncounterComplete(p, 'arena-test')).toBe(false);
  });
});

// ─── saveProgress + loadProgress round-trip ───────────────────────────────────

describe('3.5 — saveProgress() + loadProgress() round-trip', () => {
  it('persists and restores completedIds', () => {
    const payload: CampaignProgressPayload = {
      progressVersion: PROGRESS_VERSION,
      completedIds:    ['skirmish', 'standard'],
    };
    saveProgress(payload);
    const loaded = loadProgress();
    expect(loaded.completedIds).toContain('skirmish');
    expect(loaded.completedIds).toContain('standard');
    expect(loaded.progressVersion).toBe(PROGRESS_VERSION);
  });

  it('silently no-ops when localStorage is unavailable', () => {
    (globalThis as any).localStorage = undefined;
    expect(() => saveProgress({
      progressVersion: PROGRESS_VERSION, completedIds: ['skirmish'],
    })).not.toThrow();
  });
});

// ─── clearProgress ────────────────────────────────────────────────────────────

describe('3.5 — clearProgress()', () => {
  it('wipes the progress key', () => {
    saveProgress({ progressVersion: PROGRESS_VERSION, completedIds: ['skirmish'] });
    clearProgress();
    const p = loadProgress();
    expect(p.completedIds).toEqual([]);
  });

  it('does not affect other localStorage keys', () => {
    store.set(SAVE_KEY, '{"board":"data"}');
    saveProgress({ progressVersion: PROGRESS_VERSION, completedIds: ['skirmish'] });
    clearProgress();
    expect(store.get(SAVE_KEY)).toBe('{"board":"data"}');
  });

  it('does not throw when nothing is stored', () => {
    expect(() => clearProgress()).not.toThrow();
  });
});

// ─── validateProgress ─────────────────────────────────────────────────────────

describe('3.5 — validateProgress()', () => {
  const valid = { progressVersion: PROGRESS_VERSION, completedIds: ['skirmish'] };

  it('accepts a valid payload', () => {
    expect(validateProgress(valid)).not.toBeNull();
  });

  it('returns the parsed completedIds array', () => {
    const result = validateProgress(valid);
    expect(result!.completedIds).toContain('skirmish');
  });

  it('accepts an empty completedIds array', () => {
    expect(validateProgress({ progressVersion: PROGRESS_VERSION, completedIds: [] })).not.toBeNull();
  });

  it('rejects null', () => {
    expect(validateProgress(null)).toBeNull();
  });

  it('rejects a string', () => {
    expect(validateProgress('hello')).toBeNull();
  });

  it('rejects a number', () => {
    expect(validateProgress(42)).toBeNull();
  });

  it('rejects wrong progressVersion', () => {
    expect(validateProgress({ progressVersion: 999, completedIds: [] })).toBeNull();
  });

  it('rejects missing completedIds', () => {
    expect(validateProgress({ progressVersion: PROGRESS_VERSION })).toBeNull();
  });

  it('rejects non-array completedIds', () => {
    expect(validateProgress({ progressVersion: PROGRESS_VERSION, completedIds: 'skirmish' })).toBeNull();
  });

  it('rejects completedIds with non-string entries', () => {
    expect(validateProgress({ progressVersion: PROGRESS_VERSION, completedIds: [1, 2, 3] })).toBeNull();
  });

  it('accepts extra unknown fields (forward-compatible)', () => {
    const withExtra = { ...valid, futureField: 'x' };
    expect(validateProgress(withExtra)).not.toBeNull();
  });
});

// ─── Storage isolation ────────────────────────────────────────────────────────

describe('3.5 — storage isolation', () => {
  it('PROGRESS_KEY is different from SAVE_KEY', () => {
    expect(PROGRESS_KEY).not.toBe(SAVE_KEY);
  });

  it('clearProgress does not remove the board save key', () => {
    store.set(SAVE_KEY, 'board-save-data');
    clearProgress();
    expect(store.get(SAVE_KEY)).toBe('board-save-data');
  });

  it('saveProgress does not overwrite the board save key', () => {
    store.set(SAVE_KEY, 'board-save-data');
    saveProgress({ progressVersion: PROGRESS_VERSION, completedIds: ['skirmish'] });
    expect(store.get(SAVE_KEY)).toBe('board-save-data');
  });
});

// ─── Replay allowed (data shape does not lock encounters) ─────────────────────

describe('3.5 — completed encounters remain replayable', () => {
  it('completion payload contains only ids, no lock flags', () => {
    const empty: CampaignProgressPayload = { progressVersion: PROGRESS_VERSION, completedIds: [] };
    const p = markEncounterComplete(empty, 'skirmish');
    // No 'locked', 'disabled', or 'unlockGate' field
    const keys = Object.keys(p);
    expect(keys).not.toContain('locked');
    expect(keys).not.toContain('lockedIds');
    expect(keys).not.toContain('disabled');
  });

  it('marking all encounters complete does not hide them', () => {
    let p: CampaignProgressPayload = { progressVersion: PROGRESS_VERSION, completedIds: [] };
    p = markEncounterComplete(p, 'skirmish');
    p = markEncounterComplete(p, 'standard');
    p = markEncounterComplete(p, 'dragons-gate');
    p = markEncounterComplete(p, 'arena-test');
    // All 4 are still accessible by checking completedIds
    expect(p.completedIds).toHaveLength(4);
    // A caller may still launch any encounter — the data model has no gate
    expect(p.completedIds.includes('skirmish')).toBe(true);
  });
});
