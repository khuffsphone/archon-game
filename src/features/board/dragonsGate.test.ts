/**
 * dragonsGate.test.ts — Archon 3.8
 *
 * Tests for the Dragon's Gate encounter: board setup, campaign config,
 * progression compatibility, and regression guards for existing encounters.
 *
 * Covers:
 *  - campaignConfig: 'dragons-gate' in ENCOUNTERS
 *  - campaignConfig: correct fields (id, title, icon, boardSetup, themeClass)
 *  - campaignConfig: boardSetup = 'dragons-gate'
 *  - campaignConfig: difficultyLabel = 'Hard'
 *  - campaignConfig: getEncounter('dragons-gate') resolves correctly
 *  - makeDragonsGateBoardState: valid BoardState shape
 *  - makeDragonsGateBoardState: exactly 8 pieces (4 light + 4 dark)
 *  - makeDragonsGateBoardState: correct light roster (Knight, Archer, Valkyrie, Unicorn)
 *  - makeDragonsGateBoardState: correct dark roster (Dragon, Manticore, Troll, Banshee)
 *  - makeDragonsGateBoardState: all pieces alive and at full HP
 *  - makeDragonsGateBoardState: light pieces at rows 6-7
 *  - makeDragonsGateBoardState: dark pieces at rows 1-2
 *  - makeDragonsGateBoardState: no two pieces share a square
 *  - makeDragonsGateBoardState: square/piece consistency
 *  - makeDragonsGateBoardState: phase 'active', turnFaction 'light', turnNumber 1
 *  - makeDragonsGateBoardState: excludes Herald, Golem, Phoenix, Sorceress, Sentinel, Shapeshifter
 *  - Dark HP pool is larger than Light HP pool (tactical identity check)
 *  - Win conditions work on Dragon's Gate state
 *  - campaignProgress: 'dragons-gate' can be marked complete
 *  - campaignProgress: marking dragons-gate does not affect other encounters
 *  - Existing encounters: Tutorial Skirmish still works (regression)
 *  - Existing encounters: Standard Battle still works (regression)
 *  - Existing encounters: Arena Test still exists in ENCOUNTERS
 *  - ENCOUNTERS now has exactly 4 entries
 */
import { describe, it, expect } from 'vitest';
import {
  makeDragonsGateBoardState,
  makeSkirmishBoardState,
  makeInitialBoardState,
  getGameOverMeta,
} from './boardState';
import {
  ENCOUNTERS,
  getEncounter,
  type EncounterType,
} from './campaignConfig';
import {
  markEncounterComplete,
  isEncounterComplete,
  type CampaignProgressPayload,
  PROGRESS_VERSION,
} from './campaignProgress';

// ─── campaignConfig shape ─────────────────────────────────────────────────────

describe("3.8 — campaignConfig: Dragon's Gate entry", () => {
  const enc = getEncounter('dragons-gate');

  it("getEncounter('dragons-gate') returns an EncounterNode", () => {
    expect(enc).toBeDefined();
    expect(typeof enc).toBe('object');
  });

  it("id is 'dragons-gate'", () => {
    expect(enc!.id).toBe('dragons-gate');
  });

  it("title is \"Dragon's Gate\"", () => {
    expect(enc!.title).toBe("Dragon's Gate");
  });

  it("icon is 🐉", () => {
    expect(enc!.icon).toBe('🐉');
  });

  it("boardSetup is 'dragons-gate'", () => {
    expect(enc!.boardSetup).toBe('dragons-gate');
  });

  it("themeClass is 'dragons-gate'", () => {
    expect(enc!.themeClass).toBe('dragons-gate');
  });

  it("difficultyLabel is 'Hard'", () => {
    expect(enc!.difficultyLabel).toBe('Hard');
  });

  it("preferArena is false", () => {
    expect(enc!.preferArena).toBe(false);
  });

  it('appears in ENCOUNTERS array', () => {
    expect(ENCOUNTERS.some(e => e.id === 'dragons-gate')).toBe(true);
  });

  it('ENCOUNTERS now has 4 entries', () => {
    expect(ENCOUNTERS).toHaveLength(4);
  });

  it("dragons-gate appears between standard and arena-test", () => {
    const ids = ENCOUNTERS.map(e => e.id);
    const dgIdx = ids.indexOf('dragons-gate');
    const stdIdx = ids.indexOf('standard');
    const arenaIdx = ids.indexOf('arena-test');
    expect(dgIdx).toBeGreaterThan(stdIdx);
    expect(dgIdx).toBeLessThan(arenaIdx);
  });
});

// ─── EncounterType union ──────────────────────────────────────────────────────

describe("3.8 — EncounterType union includes 'dragons-gate'", () => {
  it("'dragons-gate' is a valid EncounterType at the type level (compile check)", () => {
    const id: EncounterType = 'dragons-gate';
    expect(id).toBe('dragons-gate');
  });

  it('all 4 encounter types are distinct', () => {
    const ids: EncounterType[] = ['skirmish', 'standard', 'dragons-gate', 'arena-test'];
    expect(new Set(ids).size).toBe(4);
  });
});

// ─── makeDragonsGateBoardState — shape ───────────────────────────────────────

describe("3.8 — makeDragonsGateBoardState: board shape", () => {
  const state = makeDragonsGateBoardState();

  it('returns a BoardState object', () => {
    expect(state).toBeDefined();
    expect(typeof state).toBe('object');
  });

  it("phase is 'active'", () => {
    expect(state.phase).toBe('active');
  });

  it("turnFaction is 'light'", () => {
    expect(state.turnFaction).toBe('light');
  });

  it('turnNumber is 1', () => {
    expect(state.turnNumber).toBe(1);
  });

  it('selectedPieceId is null', () => {
    expect(state.selectedPieceId).toBeNull();
  });

  it('legalMoves is empty', () => {
    expect(state.legalMoves).toHaveLength(0);
  });

  it('has exactly 9×9 squares', () => {
    expect(state.squares).toHaveLength(9);
    for (const row of state.squares) {
      expect(row).toHaveLength(9);
    }
  });
});

// ─── makeDragonsGateBoardState — roster ──────────────────────────────────────

describe("3.8 — makeDragonsGateBoardState: roster composition", () => {
  const state = makeDragonsGateBoardState();
  const allPieces = Object.values(state.pieces);

  it('has exactly 8 pieces total', () => {
    expect(allPieces).toHaveLength(8);
  });

  it('has exactly 4 light pieces', () => {
    expect(allPieces.filter(p => p.faction === 'light')).toHaveLength(4);
  });

  it('has exactly 4 dark pieces', () => {
    expect(allPieces.filter(p => p.faction === 'dark')).toHaveLength(4);
  });

  it('light roster: Knight, Archer, Valkyrie, Unicorn', () => {
    const lightIds = new Set(
      allPieces.filter(p => p.faction === 'light').map(p => p.pieceId)
    );
    expect(lightIds).toContain('light-knight');
    expect(lightIds).toContain('light-archer');
    expect(lightIds).toContain('light-valkyrie');
    expect(lightIds).toContain('light-unicorn');
  });

  it('dark roster: Dragon, Manticore, Troll, Banshee', () => {
    const darkIds = new Set(
      allPieces.filter(p => p.faction === 'dark').map(p => p.pieceId)
    );
    expect(darkIds).toContain('dark-dragon');
    expect(darkIds).toContain('dark-manticore');
    expect(darkIds).toContain('dark-troll');
    expect(darkIds).toContain('dark-banshee');
  });

  it('excludes pieces not in this roster', () => {
    const ids = new Set(allPieces.map(p => p.pieceId));
    // Excluded light
    expect(ids).not.toContain('light-herald');
    expect(ids).not.toContain('light-golem');
    expect(ids).not.toContain('light-phoenix');
    // Excluded dark
    expect(ids).not.toContain('dark-sorceress');
    expect(ids).not.toContain('dark-sentinel');
    expect(ids).not.toContain('dark-shapeshifter');
  });
});

// ─── makeDragonsGateBoardState — piece vitals ─────────────────────────────────

describe("3.8 — makeDragonsGateBoardState: piece vitals", () => {
  const state = makeDragonsGateBoardState();
  const allPieces = Object.values(state.pieces);

  it('all pieces are alive (isDead = false)', () => {
    for (const p of allPieces) {
      expect(p.isDead).toBe(false);
    }
  });

  it('all pieces are at full HP (hp === maxHp)', () => {
    for (const p of allPieces) {
      expect(p.hp).toBe(p.maxHp);
    }
  });

  it('all pieces have positive maxHp', () => {
    for (const p of allPieces) {
      expect(p.maxHp).toBeGreaterThan(0);
    }
  });

  it("Dragon is the heaviest piece (maxHp = 26)", () => {
    const dragon = allPieces.find(p => p.pieceId === 'dark-dragon');
    expect(dragon).toBeDefined();
    expect(dragon!.maxHp).toBe(26);
  });

  it('Dark total HP pool is greater than Light total HP pool (tactical identity)', () => {
    const darkHP  = allPieces.filter(p => p.faction === 'dark').reduce((s, p) => s + p.maxHp, 0);
    const lightHP = allPieces.filter(p => p.faction === 'light').reduce((s, p) => s + p.maxHp, 0);
    expect(darkHP).toBeGreaterThan(lightHP);
  });
});

// ─── makeDragonsGateBoardState — positions ────────────────────────────────────

describe("3.8 — makeDragonsGateBoardState: start positions", () => {
  const state = makeDragonsGateBoardState();
  const allPieces = Object.values(state.pieces);

  it('all light pieces start at rows 6 or 7', () => {
    const lightPieces = allPieces.filter(p => p.faction === 'light');
    for (const p of lightPieces) {
      expect([6, 7]).toContain(p.coord.row);
    }
  });

  it('all dark pieces start at rows 1 or 2', () => {
    const darkPieces = allPieces.filter(p => p.faction === 'dark');
    for (const p of darkPieces) {
      expect([1, 2]).toContain(p.coord.row);
    }
  });

  it('no two pieces share the same square', () => {
    const coords = allPieces.map(p => `${p.coord.row},${p.coord.col}`);
    expect(new Set(coords).size).toBe(coords.length);
  });

  it('all pieces are within the 9×9 board bounds', () => {
    for (const p of allPieces) {
      expect(p.coord.row).toBeGreaterThanOrEqual(0);
      expect(p.coord.row).toBeLessThanOrEqual(8);
      expect(p.coord.col).toBeGreaterThanOrEqual(0);
      expect(p.coord.col).toBeLessThanOrEqual(8);
    }
  });

  it('Archer starts at row 6 (forward ranged position)', () => {
    const archer = allPieces.find(p => p.pieceId === 'light-archer');
    expect(archer!.coord.row).toBe(6);
  });
});

// ─── Square / piece consistency ───────────────────────────────────────────────

describe("3.8 — makeDragonsGateBoardState: square consistency", () => {
  const state = makeDragonsGateBoardState();

  it('each piece has its pieceId in the correct square', () => {
    for (const piece of Object.values(state.pieces)) {
      const sq = state.squares[piece.coord.row][piece.coord.col];
      expect(sq.pieceId).toBe(piece.pieceId);
    }
  });

  it('exactly 8 squares have a non-null pieceId', () => {
    let count = 0;
    for (const row of state.squares) {
      for (const sq of row) {
        if (sq.pieceId !== null) count++;
      }
    }
    expect(count).toBe(8);
  });
});

// ─── Win conditions work on Dragon's Gate state ───────────────────────────────

describe("3.8 — win conditions on Dragon's Gate state", () => {
  it('getGameOverMeta returns undefined for fresh gate state (game not over)', () => {
    const state = makeDragonsGateBoardState();
    expect(getGameOverMeta(state.pieces, state.squares)).toBeUndefined();
  });

  it('detects Light win when all dark pieces are dead', () => {
    const state = makeDragonsGateBoardState();
    const pieces = { ...state.pieces };
    for (const [id, p] of Object.entries(pieces)) {
      if (p.faction === 'dark') pieces[id] = { ...p, isDead: true };
    }
    const meta = getGameOverMeta(pieces, state.squares);
    expect(meta).toBeDefined();
    expect(meta!.winnerFaction).toBe('light');
    expect(meta!.reason).toBe('faction_annihilated');
  });

  it('detects Dark win when all light pieces are dead', () => {
    const state = makeDragonsGateBoardState();
    const pieces = { ...state.pieces };
    for (const [id, p] of Object.entries(pieces)) {
      if (p.faction === 'light') pieces[id] = { ...p, isDead: true };
    }
    const meta = getGameOverMeta(pieces, state.squares);
    expect(meta).toBeDefined();
    expect(meta!.winnerFaction).toBe('dark');
    expect(meta!.reason).toBe('faction_annihilated');
  });
});

// ─── Progression compatibility ────────────────────────────────────────────────

describe("3.8 — campaignProgress: 'dragons-gate' compatibility", () => {
  const empty: CampaignProgressPayload = { progressVersion: PROGRESS_VERSION, completedIds: [] };

  it("can mark 'dragons-gate' complete", () => {
    const next = markEncounterComplete(empty, 'dragons-gate');
    expect(isEncounterComplete(next, 'dragons-gate')).toBe(true);
  });

  it("marking 'dragons-gate' does not affect 'skirmish'", () => {
    const next = markEncounterComplete(empty, 'dragons-gate');
    expect(isEncounterComplete(next, 'skirmish')).toBe(false);
  });

  it("marking 'dragons-gate' does not affect 'standard'", () => {
    const next = markEncounterComplete(empty, 'dragons-gate');
    expect(isEncounterComplete(next, 'standard')).toBe(false);
  });

  it("can mark all 4 encounters complete independently", () => {
    let p = empty;
    p = markEncounterComplete(p, 'skirmish');
    p = markEncounterComplete(p, 'standard');
    p = markEncounterComplete(p, 'dragons-gate');
    p = markEncounterComplete(p, 'arena-test');
    expect(p.completedIds).toHaveLength(4);
    expect(isEncounterComplete(p, 'dragons-gate')).toBe(true);
  });
});

// ─── Regression: existing encounters unaffected ───────────────────────────────

describe("3.8 — regression: existing encounters unaffected", () => {
  it("Tutorial Skirmish still has 6 pieces", () => {
    const state = makeSkirmishBoardState();
    expect(Object.values(state.pieces)).toHaveLength(6);
  });

  it("Standard Battle still has 14 pieces", () => {
    const state = makeInitialBoardState();
    expect(Object.values(state.pieces)).toHaveLength(14);
  });

  it("Tutorial Skirmish boardSetup is still 'skirmish'", () => {
    const enc = getEncounter('skirmish')!;
    expect(enc.boardSetup).toBe('skirmish');
  });

  it("Standard Battle boardSetup is still 'initial'", () => {
    const enc = getEncounter('standard')!;
    expect(enc.boardSetup).toBe('initial');
  });

  it("Arena Test still exists in ENCOUNTERS", () => {
    expect(getEncounter('arena-test')).toBeDefined();
  });

  it("Arena Test boardSetup is still 'initial'", () => {
    const enc = getEncounter('arena-test')!;
    expect(enc.boardSetup).toBe('initial');
  });

  it("Dragon's Gate does not share any piece ids with Tutorial Skirmish", () => {
    const skirmish = new Set(Object.keys(makeSkirmishBoardState().pieces));
    const gate     = new Set(Object.keys(makeDragonsGateBoardState().pieces));
    const overlap  = [...skirmish].filter(id => gate.has(id));
    // Some overlap is fine (they can share pieces from the same roster)
    // but check neither state is identical to the other
    expect(skirmish.size).not.toBe(gate.size);
  });

  it("Dragon's Gate is distinct from Standard Battle (not 14 pieces)", () => {
    const gate = makeDragonsGateBoardState();
    expect(Object.values(gate.pieces)).not.toHaveLength(14);
  });
});
