/**
 * difficultyConfig.test.ts — Archon 2.2
 *
 * Tests for: profile definitions, sessionStorage persistence, getActiveProfile().
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AI_PROFILES,
  getDifficulty,
  persistDifficulty,
  getActiveProfile,
} from '../difficultyConfig';

// ─── Mock sessionStorage ──────────────────────────────────────────────────────

const store: Record<string, string> = {};

const sessionStorageMock = {
  getItem:    (k: string) => store[k] ?? null,
  setItem:    (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear:      () => { Object.keys(store).forEach(k => delete store[k]); },
};

beforeEach(() => {
  sessionStorageMock.clear();
  vi.stubGlobal('sessionStorage', sessionStorageMock);
});

// ─── Profile definitions ──────────────────────────────────────────────────────

describe('AI_PROFILES', () => {
  it('has a normal profile', () => {
    expect(AI_PROFILES.normal).toBeDefined();
    expect(AI_PROFILES.normal.label).toBe('Normal');
  });

  it('has an easy profile', () => {
    expect(AI_PROFILES.easy).toBeDefined();
    expect(AI_PROFILES.easy.label).toBe('Easy');
  });

  it('Normal has lower reactionDelayMult than Easy', () => {
    expect(AI_PROFILES.normal.reactionDelayMult).toBeLessThan(AI_PROFILES.easy.reactionDelayMult);
  });

  it('Normal has higher speedMult than Easy', () => {
    expect(AI_PROFILES.normal.speedMult).toBeGreaterThan(AI_PROFILES.easy.speedMult);
  });

  it('Normal has higher rangeMult than Easy', () => {
    expect(AI_PROFILES.normal.rangeMult).toBeGreaterThan(AI_PROFILES.easy.rangeMult);
  });

  it('Easy has lower retreatHpRatio than Easy', () => {
    // Easy retreats at higher HP fraction
    expect(AI_PROFILES.easy.retreatHpRatio).toBeGreaterThan(AI_PROFILES.normal.retreatHpRatio);
  });

  it('Easy has a non-zero attackSkipChance', () => {
    expect(AI_PROFILES.easy.attackSkipChance).toBeGreaterThan(0);
  });

  it('Normal attackSkipChance is 0', () => {
    expect(AI_PROFILES.normal.attackSkipChance).toBe(0);
  });

  it('Normal enables Y-wander and jump', () => {
    expect(AI_PROFILES.normal.useYWander).toBe(true);
    expect(AI_PROFILES.normal.useJump).toBe(true);
  });

  it('Easy disables Y-wander and jump', () => {
    expect(AI_PROFILES.easy.useYWander).toBe(false);
    expect(AI_PROFILES.easy.useJump).toBe(false);
  });

  it('Easy retreatDurationMs is longer than Normal', () => {
    expect(AI_PROFILES.easy.retreatDurationMs).toBeGreaterThan(AI_PROFILES.normal.retreatDurationMs);
  });

  it('badgeClass matches difficulty key', () => {
    expect(AI_PROFILES.easy.badgeClass).toBe('easy');
    expect(AI_PROFILES.normal.badgeClass).toBe('normal');
  });
});

// ─── Persistence ──────────────────────────────────────────────────────────────

describe('persistDifficulty / getDifficulty', () => {
  it('defaults to normal when nothing is stored', () => {
    expect(getDifficulty()).toBe('normal');
  });

  it('persists easy and reads it back', () => {
    persistDifficulty('easy');
    expect(getDifficulty()).toBe('easy');
  });

  it('persists normal and reads it back', () => {
    persistDifficulty('normal');
    expect(getDifficulty()).toBe('normal');
  });

  it('overwrites a previous value', () => {
    persistDifficulty('easy');
    persistDifficulty('normal');
    expect(getDifficulty()).toBe('normal');
  });
});

// ─── getActiveProfile ─────────────────────────────────────────────────────────

describe('getActiveProfile', () => {
  it('returns Normal profile when nothing stored', () => {
    expect(getActiveProfile()).toEqual(AI_PROFILES.normal);
  });

  it('returns Easy profile after persisting easy', () => {
    persistDifficulty('easy');
    expect(getActiveProfile()).toEqual(AI_PROFILES.easy);
  });

  it('returns Normal profile after persisting normal', () => {
    persistDifficulty('normal');
    expect(getActiveProfile()).toEqual(AI_PROFILES.normal);
  });
});
