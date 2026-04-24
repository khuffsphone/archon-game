/**
 * campaignMap.test.ts — Archon 3.0
 *
 * Tests for the Campaign Map v1 encounter configuration.
 * UI-layer tests (CampaignMap.tsx rendering) require a DOM environment
 * not available in the node test runner — configuration / data tests live here.
 *
 * Covers:
 *  - ENCOUNTERS has the expected 3 nodes
 *  - Each encounter has required fields (id, title, icon, difficultyLabel, themeClass, boardSetup)
 *  - EncounterType values are correct
 *  - getEncounter returns correct node by id
 *  - getEncounter returns undefined for unknown id
 *  - Tutorial Skirmish: boardSetup = 'skirmish', preferArena = false
 *  - Standard Battle:   boardSetup = 'initial',  preferArena = false
 *  - Arena Test:        boardSetup = 'initial',  preferArena = true
 *  - All encounter ids are unique
 *  - All themeClass values are one of the allowed values
 *  - boardSetup field values are 'initial' or 'skirmish'
 *  - No encounter is missing icon, title, or subtitle
 */
import { describe, it, expect } from 'vitest';
import {
  ENCOUNTERS,
  getEncounter,
  type EncounterNode,
  type EncounterType,
} from './campaignConfig';

// ─── Encounter list shape ─────────────────────────────────────────────────────

describe('3.0 — ENCOUNTERS list', () => {
  it('has exactly 3 encounter nodes', () => {
    expect(ENCOUNTERS).toHaveLength(3);
  });

  it('contains skirmish, standard, and arena-test nodes', () => {
    const ids = ENCOUNTERS.map(e => e.id);
    expect(ids).toContain('skirmish');
    expect(ids).toContain('standard');
    expect(ids).toContain('arena-test');
  });

  it('all ids are unique', () => {
    const ids = ENCOUNTERS.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every encounter has a non-empty title', () => {
    for (const enc of ENCOUNTERS) {
      expect(enc.title.length).toBeGreaterThan(0);
    }
  });

  it('every encounter has a non-empty subtitle', () => {
    for (const enc of ENCOUNTERS) {
      expect(enc.subtitle.length).toBeGreaterThan(0);
    }
  });

  it('every encounter has a non-empty icon', () => {
    for (const enc of ENCOUNTERS) {
      expect(enc.icon.length).toBeGreaterThan(0);
    }
  });

  it('every encounter has a non-empty difficultyLabel', () => {
    for (const enc of ENCOUNTERS) {
      expect(enc.difficultyLabel.length).toBeGreaterThan(0);
    }
  });
});

// ─── Field validation ─────────────────────────────────────────────────────────

describe('3.0 — encounter field constraints', () => {
  const VALID_THEME_CLASSES: EncounterNode['themeClass'][] = ['skirmish', 'standard', 'arena-test'];
  const VALID_BOARD_SETUPS:  EncounterNode['boardSetup'][] = ['initial', 'skirmish'];

  it('every encounter has a valid themeClass', () => {
    for (const enc of ENCOUNTERS) {
      expect(VALID_THEME_CLASSES).toContain(enc.themeClass);
    }
  });

  it('every encounter has a valid boardSetup', () => {
    for (const enc of ENCOUNTERS) {
      expect(VALID_BOARD_SETUPS).toContain(enc.boardSetup);
    }
  });

  it('every encounter has preferArena as a boolean', () => {
    for (const enc of ENCOUNTERS) {
      expect(typeof enc.preferArena).toBe('boolean');
    }
  });

  it('themeClass matches id for each encounter', () => {
    for (const enc of ENCOUNTERS) {
      expect(enc.themeClass).toBe(enc.id);
    }
  });
});

// ─── Individual encounter specifications ─────────────────────────────────────

describe('3.0 — Tutorial Skirmish encounter', () => {
  const enc = ENCOUNTERS.find(e => e.id === 'skirmish')!;

  it('exists', () => { expect(enc).toBeDefined(); });
  it('has boardSetup = skirmish', () => { expect(enc.boardSetup).toBe('skirmish'); });
  it('has preferArena = false',   () => { expect(enc.preferArena).toBe(false); });
  it('has themeClass = skirmish', () => { expect(enc.themeClass).toBe('skirmish'); });
  it('title contains "Skirmish" or "Tutorial"', () => {
    expect(enc.title.match(/skirmish|tutorial/i)).not.toBeNull();
  });
});

describe('3.0 — Standard Battle encounter', () => {
  const enc = ENCOUNTERS.find(e => e.id === 'standard')!;

  it('exists', () => { expect(enc).toBeDefined(); });
  it('has boardSetup = initial', () => { expect(enc.boardSetup).toBe('initial'); });
  it('has preferArena = false',  () => { expect(enc.preferArena).toBe(false); });
  it('has themeClass = standard', () => { expect(enc.themeClass).toBe('standard'); });
  it('title contains "Battle" or "Standard"', () => {
    expect(enc.title.match(/battle|standard/i)).not.toBeNull();
  });
});

describe('3.0 — Arena Test encounter', () => {
  const enc = ENCOUNTERS.find(e => e.id === 'arena-test')!;

  it('exists', () => { expect(enc).toBeDefined(); });
  it('has boardSetup = initial', () => { expect(enc.boardSetup).toBe('initial'); });
  it('has preferArena = true',   () => { expect(enc.preferArena).toBe(true); });
  it('has themeClass = arena-test', () => { expect(enc.themeClass).toBe('arena-test'); });
  it('title contains "Arena"', () => {
    expect(enc.title.match(/arena/i)).not.toBeNull();
  });
});

// ─── getEncounter ─────────────────────────────────────────────────────────────

describe('3.0 — getEncounter()', () => {
  it('returns the skirmish encounter for id "skirmish"', () => {
    const enc = getEncounter('skirmish');
    expect(enc).toBeDefined();
    expect(enc!.id).toBe('skirmish');
  });

  it('returns the standard encounter for id "standard"', () => {
    const enc = getEncounter('standard');
    expect(enc).toBeDefined();
    expect(enc!.id).toBe('standard');
  });

  it('returns the arena-test encounter for id "arena-test"', () => {
    const enc = getEncounter('arena-test');
    expect(enc).toBeDefined();
    expect(enc!.id).toBe('arena-test');
  });

  it('returns the correct title for "standard"', () => {
    expect(getEncounter('standard')!.title).toMatch(/standard/i);
  });

  it('returns a stable reference — same object as ENCOUNTERS array', () => {
    const direct = ENCOUNTERS.find(e => e.id === 'skirmish');
    const via    = getEncounter('skirmish');
    expect(via).toBe(direct);
  });
});

// ─── Campaign flow integrity (data level) ────────────────────────────────────

describe('3.0 — campaign flow data integrity', () => {
  it('every encounter that is not preferArena has boardSetup = initial or skirmish', () => {
    for (const enc of ENCOUNTERS.filter(e => !e.preferArena)) {
      expect(['initial', 'skirmish']).toContain(enc.boardSetup);
    }
  });

  it('the one preferArena encounter uses boardSetup = initial', () => {
    const arenaEncs = ENCOUNTERS.filter(e => e.preferArena);
    expect(arenaEncs.length).toBeGreaterThanOrEqual(1);
    for (const enc of arenaEncs) {
      expect(enc.boardSetup).toBe('initial');
    }
  });

  it('ENCOUNTERS is ordered: skirmish first, standard second, arena-test third', () => {
    expect(ENCOUNTERS[0].id).toBe('skirmish');
    expect(ENCOUNTERS[1].id).toBe('standard');
    expect(ENCOUNTERS[2].id).toBe('arena-test');
  });
});
// ─── 3.1-rc: RC polish regression tests ─────────────────────────────────────

describe('3.1-rc — encounter copy quality', () => {
  it('no encounter subtitle contains internal URL params (?arena=1 etc.)', () => {
    for (const enc of ENCOUNTERS) {
      expect(enc.subtitle).not.toMatch(/\?arena|=1/);
    }
  });

  it('Arena Test subtitle is player-facing copy (not a dev note)', () => {
    const enc = getEncounter('arena-test')!;
    expect(enc.subtitle).not.toContain('?arena=1');
    expect(enc.subtitle.length).toBeGreaterThan(10);
  });

  it('no encounter subtitle is empty', () => {
    for (const enc of ENCOUNTERS) {
      expect(enc.subtitle.trim().length).toBeGreaterThan(0);
    }
  });

  it('all encounter titles are player-readable (no internal slashes or params)', () => {
    for (const enc of ENCOUNTERS) {
      expect(enc.title).not.toMatch(/[/?=]/);
    }
  });
});
