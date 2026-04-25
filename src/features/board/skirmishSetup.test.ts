/**
 * skirmishSetup.test.ts — Archon 3.2
 *
 * Tests for the Tutorial Skirmish reduced-roster board setup.
 *
 * Covers:
 *  - makeSkirmishBoardState returns a valid BoardState
 *  - Skirmish roster: exactly 3 light + 3 dark pieces
 *  - Correct light piece ids (knight, archer, unicorn)
 *  - Correct dark piece ids (sentinel, banshee, troll)
 *  - All pieces are alive and at full HP
 *  - Light pieces start at row 6
 *  - Dark pieces start at row 2
 *  - Each piece occupies a unique square
 *  - No square has more than one piece
 *  - Phase is 'active', turnFaction is 'light', turnNumber is 1
 *  - makeInitialBoardState still returns 7 + 7 = 14 pieces (Standard Battle unaffected)
 *  - QA setup functions (makeAdjacentContestSetup etc.) still work
 *  - Win conditions still work with skirmish state
 *  - campaignConfig skirmish encounter uses boardSetup = 'skirmish'
 *  - campaignConfig standard encounter uses boardSetup = 'initial'
 *  - boardSetup values are not both 'skirmish' (regression guard)
 */
import { describe, it, expect } from 'vitest';
import {
  makeSkirmishBoardState,
  makeInitialBoardState,
  makeAdjacentContestSetup,
  makeGameOverSetup,
  getGameOverMeta,
} from './boardState';
import {
  ENCOUNTERS,
  getEncounter,
} from './campaignConfig';

// ─── makeSkirmishBoardState shape ─────────────────────────────────────────────

describe('3.2 — makeSkirmishBoardState', () => {
  const state = makeSkirmishBoardState();

  it('returns a BoardState object', () => {
    expect(state).toBeDefined();
    expect(typeof state).toBe('object');
  });

  it('phase is "active"', () => {
    expect(state.phase).toBe('active');
  });

  it('turnFaction is "light"', () => {
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

// ─── Skirmish roster composition ──────────────────────────────────────────────

describe('3.2 — skirmish roster: 3-vs-3', () => {
  const state = makeSkirmishBoardState();
  const allPieces = Object.values(state.pieces);

  it('has exactly 6 pieces total', () => {
    expect(allPieces).toHaveLength(6);
  });

  it('has exactly 3 light pieces', () => {
    expect(allPieces.filter(p => p.faction === 'light')).toHaveLength(3);
  });

  it('has exactly 3 dark pieces', () => {
    expect(allPieces.filter(p => p.faction === 'dark')).toHaveLength(3);
  });

  it('light roster: Knight, Archer, Unicorn', () => {
    const lightIds = new Set(
      allPieces.filter(p => p.faction === 'light').map(p => p.pieceId)
    );
    expect(lightIds).toContain('light-knight');
    expect(lightIds).toContain('light-archer');
    expect(lightIds).toContain('light-unicorn');
  });

  it('dark roster: Sentinel, Banshee, Troll', () => {
    const darkIds = new Set(
      allPieces.filter(p => p.faction === 'dark').map(p => p.pieceId)
    );
    expect(darkIds).toContain('dark-sentinel');
    expect(darkIds).toContain('dark-banshee');
    expect(darkIds).toContain('dark-troll');
  });

  it('does NOT include 7-vs-7 pieces (e.g. dark-sorceress, dark-dragon)', () => {
    const ids = new Set(allPieces.map(p => p.pieceId));
    expect(ids).not.toContain('dark-sorceress');
    expect(ids).not.toContain('dark-dragon');
    expect(ids).not.toContain('dark-manticore');
    expect(ids).not.toContain('dark-shapeshifter');
    expect(ids).not.toContain('light-herald');
    expect(ids).not.toContain('light-golem');
    expect(ids).not.toContain('light-phoenix');
    expect(ids).not.toContain('light-valkyrie');
  });
});

// ─── Piece health / alive state ───────────────────────────────────────────────

describe('3.2 — skirmish piece vitals', () => {
  const state = makeSkirmishBoardState();
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
});

// ─── Piece start positions ─────────────────────────────────────────────────────

describe('3.2 — skirmish start positions', () => {
  const state = makeSkirmishBoardState();
  const allPieces = Object.values(state.pieces);

  it('all light pieces start at row 6', () => {
    const lightPieces = allPieces.filter(p => p.faction === 'light');
    for (const p of lightPieces) {
      expect(p.coord.row).toBe(6);
    }
  });

  it('all dark pieces start at row 2', () => {
    const darkPieces = allPieces.filter(p => p.faction === 'dark');
    for (const p of darkPieces) {
      expect(p.coord.row).toBe(2);
    }
  });

  it('all pieces occupy columns 2, 4, or 6', () => {
    for (const p of allPieces) {
      expect([2, 4, 6]).toContain(p.coord.col);
    }
  });

  it('no two pieces share the same square', () => {
    const coords = allPieces.map(p => `${p.coord.row},${p.coord.col}`);
    expect(new Set(coords).size).toBe(coords.length);
  });
});

// ─── Square–piece consistency ──────────────────────────────────────────────────

describe('3.2 — skirmish square consistency', () => {
  const state = makeSkirmishBoardState();

  it('each piece has its pieceId in the correct square', () => {
    for (const piece of Object.values(state.pieces)) {
      const sq = state.squares[piece.coord.row][piece.coord.col];
      expect(sq.pieceId).toBe(piece.pieceId);
    }
  });

  it('exactly 6 squares have a non-null pieceId', () => {
    let count = 0;
    for (const row of state.squares) {
      for (const sq of row) {
        if (sq.pieceId !== null) count++;
      }
    }
    expect(count).toBe(6);
  });
});

// ─── Standard Battle still returns 14 pieces ──────────────────────────────────

describe('3.2 — makeInitialBoardState still returns 7-vs-7', () => {
  const state = makeInitialBoardState();
  const allPieces = Object.values(state.pieces);

  it('has exactly 14 pieces', () => {
    expect(allPieces).toHaveLength(14);
  });

  it('has 7 light and 7 dark pieces', () => {
    expect(allPieces.filter(p => p.faction === 'light')).toHaveLength(7);
    expect(allPieces.filter(p => p.faction === 'dark')).toHaveLength(7);
  });

  it('contains dark-sorceress (skirmish excludes it)', () => {
    const ids = new Set(allPieces.map(p => p.pieceId));
    expect(ids).toContain('dark-sorceress');
  });

  it('contains light-herald (skirmish excludes it)', () => {
    const ids = new Set(allPieces.map(p => p.pieceId));
    expect(ids).toContain('light-herald');
  });
});

// ─── QA setup functions still work ────────────────────────────────────────────

describe('3.2 — QA ?setup= routes still work', () => {
  it('makeAdjacentContestSetup returns 2 pieces', () => {
    const state = makeAdjacentContestSetup();
    expect(Object.values(state.pieces)).toHaveLength(2);
  });

  it('makeGameOverSetup returns 2 pieces', () => {
    const state = makeGameOverSetup();
    expect(Object.values(state.pieces)).toHaveLength(2);
  });

  it('makeAdjacentContestSetup is not affected by skirmish function', () => {
    const adj  = makeAdjacentContestSetup();
    const skir = makeSkirmishBoardState();
    // They are distinct states
    expect(Object.keys(adj.pieces)).not.toEqual(Object.keys(skir.pieces));
  });
});

// ─── Win condition works on skirmish state ────────────────────────────────────

describe('3.2 — win conditions work on skirmish state', () => {
  it('getGameOverMeta returns undefined for fresh skirmish state (game not over)', () => {
    const state = makeSkirmishBoardState();
    expect(getGameOverMeta(state.pieces, state.squares)).toBeUndefined();
  });

  it('getGameOverMeta detects faction_annihilated when all dark pieces are dead', () => {
    const state = makeSkirmishBoardState();
    // Kill all dark pieces
    const pieces = { ...state.pieces };
    for (const [id, p] of Object.entries(pieces)) {
      if (p.faction === 'dark') {
        pieces[id] = { ...p, isDead: true };
      }
    }
    const meta = getGameOverMeta(pieces, state.squares);
    expect(meta).toBeDefined();
    expect(meta!.winnerFaction).toBe('light');
    expect(meta!.reason).toBe('faction_annihilated');
  });

  it('getGameOverMeta detects faction_annihilated when all light pieces are dead', () => {
    const state = makeSkirmishBoardState();
    const pieces = { ...state.pieces };
    for (const [id, p] of Object.entries(pieces)) {
      if (p.faction === 'light') {
        pieces[id] = { ...p, isDead: true };
      }
    }
    const meta = getGameOverMeta(pieces, state.squares);
    expect(meta).toBeDefined();
    expect(meta!.winnerFaction).toBe('dark');
    expect(meta!.reason).toBe('faction_annihilated');
  });
});

// ─── Campaign config correctness ──────────────────────────────────────────────

describe('3.2 — campaignConfig boardSetup values', () => {
  it('skirmish encounter has boardSetup = "skirmish"', () => {
    const enc = getEncounter('skirmish')!;
    expect(enc.boardSetup).toBe('skirmish');
  });

  it('standard encounter has boardSetup = "initial"', () => {
    const enc = getEncounter('standard')!;
    expect(enc.boardSetup).toBe('initial');
  });

  it('arena-test encounter has boardSetup = "initial"', () => {
    const enc = getEncounter('arena-test')!;
    expect(enc.boardSetup).toBe('initial');
  });

  it('exactly one encounter uses boardSetup = "skirmish"', () => {
    const skirmishCount = ENCOUNTERS.filter(e => e.boardSetup === 'skirmish').length;
    expect(skirmishCount).toBe(1);
  });

  it('at least two encounters use boardSetup = "initial"', () => {
    const initialCount = ENCOUNTERS.filter(e => e.boardSetup === 'initial').length;
    expect(initialCount).toBeGreaterThanOrEqual(2);
  });

  it('skirmish and standard are different boardSetup values (regression guard)', () => {
    const skirmish = getEncounter('skirmish')!;
    const standard = getEncounter('standard')!;
    expect(skirmish.boardSetup).not.toBe(standard.boardSetup);
  });
});
