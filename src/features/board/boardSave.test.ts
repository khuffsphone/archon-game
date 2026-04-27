/**
 * boardSave.test.ts — Archon 2.7
 *
 * Tests for the boardSave localStorage persistence module.
 *
 * Covers:
 *  - validateSave rejects missing / corrupt / wrong-version payloads
 *  - validateSave accepts a valid payload
 *  - saveGame / loadGame round-trip
 *  - saveGame normalises phase: 'combat' → 'active'
 *  - saveGame strips selectedPieceId and legalMoves (ephemeral UI state)
 *  - saveGame trims boardLog to MAX_SAVED_LOG entries
 *  - hasSavedGame returns true after save, false after clear
 *  - clearSave removes the key
 *  - loadGame returns null when key is absent
 *  - loadGame returns null when JSON is corrupt
 *  - loadGame returns null when saveVersion mismatches
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  SAVE_KEY, SAVE_VERSION, MAX_SAVED_LOG,
  saveGame, loadGame, hasSavedGame, clearSave, validateSave,
  type ArchonSavePayload,
} from './boardSave';
import type { BoardState } from '../../lib/board-combat-contract';
import { makeInitialBoardState } from './boardState';

// ─── Manual localStorage mock ─────────────────────────────────────────────────
// vitest default environment is node (jsdom not installed in this project).
// We provide a minimal Map-backed localStorage shim on globalThis.

const store = new Map<string, string>();

const localStorageMock = {
  getItem:    (k: string) => store.get(k) ?? null,
  setItem:    (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
  clear:      () => { store.clear(); },
};

// Install mock before any module code runs
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

beforeEach(() => {
  store.clear();
});

afterEach(() => {
  store.clear();
  vi.restoreAllMocks();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSavePayload(overrides: Partial<ArchonSavePayload> = {}): ArchonSavePayload {
  return {
    saveVersion: SAVE_VERSION,
    savedAt:     Date.now(),
    boardState:  makeInitialBoardState(),
    boardLog:    ['➡ Knight moved to 5,2', '⚔ Knight challenges Sorceress'],
    ...overrides,
  };
}

function storeRaw(data: unknown): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

// ─── validateSave ─────────────────────────────────────────────────────────────

describe('2.7 — validateSave', () => {
  it('returns null for null', () => {
    expect(validateSave(null)).toBeNull();
  });

  it('returns null for a string', () => {
    expect(validateSave('bad')).toBeNull();
  });

  it('returns null for an empty object', () => {
    expect(validateSave({})).toBeNull();
  });

  it('returns null when saveVersion is wrong', () => {
    const p = makeSavePayload({ saveVersion: 99 });
    expect(validateSave(p)).toBeNull();
  });

  it('returns null when saveVersion is missing', () => {
    const { saveVersion: _v, ...p } = makeSavePayload();
    expect(validateSave(p)).toBeNull();
  });

  it('returns null when savedAt is missing', () => {
    const p = { ...makeSavePayload(), savedAt: 'not-a-number' };
    expect(validateSave(p)).toBeNull();
  });

  it('returns null when boardState is missing', () => {
    const { boardState: _bs, ...p } = makeSavePayload();
    expect(validateSave(p)).toBeNull();
  });

  it('returns null when boardState.phase is missing', () => {
    const p = makeSavePayload();
    // @ts-expect-error intentional corrupt
    delete (p.boardState as Record<string, unknown>).phase;
    expect(validateSave(p)).toBeNull();
  });

  it('returns null when boardState.squares is not an array', () => {
    const p = makeSavePayload();
    // @ts-expect-error intentional corrupt
    (p.boardState as Record<string, unknown>).squares = null;
    expect(validateSave(p)).toBeNull();
  });

  it('returns null when boardState.squares is empty', () => {
    const p = makeSavePayload();
    // @ts-expect-error intentional empty array
    (p.boardState as Record<string, unknown>).squares = [];
    expect(validateSave(p)).toBeNull();
  });

  it('returns null when boardState.pieces is null', () => {
    const p = makeSavePayload();
    // @ts-expect-error intentional null
    (p.boardState as Record<string, unknown>).pieces = null;
    expect(validateSave(p)).toBeNull();
  });

  it('returns null when boardLog is not an array', () => {
    const p = { ...makeSavePayload(), boardLog: 'not-an-array' as unknown as string[] };
    expect(validateSave(p)).toBeNull();
  });

  it('accepts a fully valid payload', () => {
    const p = makeSavePayload();
    expect(validateSave(p)).not.toBeNull();
  });

  it('accepted payload has correct saveVersion', () => {
    const p = makeSavePayload();
    const result = validateSave(p);
    expect(result?.saveVersion).toBe(SAVE_VERSION);
  });
});

// ─── saveGame / loadGame round-trip ──────────────────────────────────────────

describe('2.7 — saveGame / loadGame round-trip', () => {
  it('loadGame returns null when no save exists', () => {
    expect(loadGame()).toBeNull();
  });

  it('round-trip: save then load returns correct boardState', () => {
    const initial = makeInitialBoardState();
    saveGame(initial, []);
    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded!.boardState.turnFaction).toBe(initial.turnFaction);
    expect(loaded!.boardState.turnNumber).toBe(initial.turnNumber);
    expect(loaded!.boardState.phase).toBe('active');
  });

  it('round-trip: save then load returns correct boardLog', () => {
    const log = ['move 1', 'attack 2', 'heal 3'];
    saveGame(makeInitialBoardState(), log);
    const loaded = loadGame();
    expect(loaded!.boardLog).toEqual(log);
  });

  it('loaded saveVersion matches SAVE_VERSION', () => {
    saveGame(makeInitialBoardState(), []);
    expect(loadGame()!.saveVersion).toBe(SAVE_VERSION);
  });

  it('savedAt is a recent timestamp', () => {
    const before = Date.now();
    saveGame(makeInitialBoardState(), []);
    const after = Date.now();
    const ts = loadGame()!.savedAt;
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});

// ─── Phase normalization ──────────────────────────────────────────────────────

describe('2.7 — saveGame phase normalization', () => {
  it("saves phase: 'combat' as phase: 'active' (arena reload safety)", () => {
    const state: BoardState = { ...makeInitialBoardState(), phase: 'combat' };
    saveGame(state, []);
    expect(loadGame()!.boardState.phase).toBe('active');
  });

  it("preserves phase: 'active' unchanged", () => {
    const state: BoardState = { ...makeInitialBoardState(), phase: 'active' };
    saveGame(state, []);
    expect(loadGame()!.boardState.phase).toBe('active');
  });

  it("preserves phase: 'gameover' unchanged", () => {
    const state: BoardState = { ...makeInitialBoardState(), phase: 'gameover' };
    saveGame(state, []);
    expect(loadGame()!.boardState.phase).toBe('gameover');
  });
});

// ─── Ephemeral UI state stripping ─────────────────────────────────────────────

describe('2.7 — saveGame strips ephemeral UI state', () => {
  it('saved state has selectedPieceId = null', () => {
    const state: BoardState = { ...makeInitialBoardState(), selectedPieceId: 'light-knight' };
    saveGame(state, []);
    expect(loadGame()!.boardState.selectedPieceId).toBeNull();
  });

  it('saved state has legalMoves = []', () => {
    const state: BoardState = {
      ...makeInitialBoardState(),
      legalMoves: [{ row: 1, col: 2 }, { row: 3, col: 4 }],
    };
    saveGame(state, []);
    expect(loadGame()!.boardState.legalMoves).toEqual([]);
  });
});

// ─── Board log trimming ───────────────────────────────────────────────────────

describe('2.7 — saveGame trims boardLog to MAX_SAVED_LOG', () => {
  it('saves only the last MAX_SAVED_LOG entries when log is longer', () => {
    const longLog = Array.from({ length: MAX_SAVED_LOG + 10 }, (_, i) => `entry ${i}`);
    saveGame(makeInitialBoardState(), longLog);
    const saved = loadGame()!.boardLog;
    expect(saved.length).toBe(MAX_SAVED_LOG);
    // Should be the LAST entries
    expect(saved[0]).toBe(`entry ${10}`);
    expect(saved[MAX_SAVED_LOG - 1]).toBe(`entry ${MAX_SAVED_LOG + 9}`);
  });

  it('saves a short log without truncation', () => {
    const shortLog = ['a', 'b', 'c'];
    saveGame(makeInitialBoardState(), shortLog);
    expect(loadGame()!.boardLog).toEqual(shortLog);
  });

  it('saves an empty log', () => {
    saveGame(makeInitialBoardState(), []);
    expect(loadGame()!.boardLog).toEqual([]);
  });
});

// ─── hasSavedGame ─────────────────────────────────────────────────────────────

describe('2.7 — hasSavedGame', () => {
  it('returns false when no save exists', () => {
    expect(hasSavedGame()).toBe(false);
  });

  it('returns true after saveGame is called', () => {
    saveGame(makeInitialBoardState(), []);
    expect(hasSavedGame()).toBe(true);
  });

  it('returns false after clearSave is called', () => {
    saveGame(makeInitialBoardState(), []);
    clearSave();
    expect(hasSavedGame()).toBe(false);
  });
});

// ─── clearSave ────────────────────────────────────────────────────────────────

describe('2.7 — clearSave', () => {
  it('removes the save key from localStorage', () => {
    saveGame(makeInitialBoardState(), []);
    expect(localStorage.getItem(SAVE_KEY)).not.toBeNull();
    clearSave();
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
  });

  it('does not throw when called with no save', () => {
    expect(() => clearSave()).not.toThrow();
  });
});

// ─── Corrupt data safety ──────────────────────────────────────────────────────

describe('2.7 — loadGame corrupt data safety', () => {
  it('returns null for invalid JSON', () => {
    localStorage.setItem(SAVE_KEY, '{not valid json');
    expect(loadGame()).toBeNull();
  });

  it('returns null for valid JSON that fails schema check', () => {
    storeRaw({ something: 'unexpected' });
    expect(loadGame()).toBeNull();
  });

  it('returns null for wrong saveVersion', () => {
    storeRaw({ ...makeSavePayload(), saveVersion: 0 });
    expect(loadGame()).toBeNull();
  });

  it('returns null for null stored value', () => {
    // localStorage.getItem returns null when key absent
    expect(loadGame()).toBeNull();
  });

  it('does not throw on any of the above', () => {
    const cases = ['{bad json', '{}', 'null', '"string"', '42'];
    for (const c of cases) {
      localStorage.setItem(SAVE_KEY, c);
      expect(() => loadGame()).not.toThrow();
    }
  });
});

// ─── SAVE_KEY and SAVE_VERSION constants ──────────────────────────────────────

describe('2.7 — constants', () => {
  it('SAVE_KEY is a non-empty string', () => {
    expect(typeof SAVE_KEY).toBe('string');
    expect(SAVE_KEY.length).toBeGreaterThan(0);
  });

  it('SAVE_VERSION is 1', () => {
    expect(SAVE_VERSION).toBe(1);
  });

  it('MAX_SAVED_LOG is a positive integer', () => {
    expect(typeof MAX_SAVED_LOG).toBe('number');
    expect(MAX_SAVED_LOG).toBeGreaterThan(0);
    expect(Number.isInteger(MAX_SAVED_LOG)).toBe(true);
  });
});
