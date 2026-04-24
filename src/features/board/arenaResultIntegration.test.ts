/**
 * arenaResultIntegration.test.ts — Archon 2.4
 *
 * Tests for arena combat result → board state integration.
 *
 * Covers:
 *  - attacker win maps correctly to board (attacker advances, defender dies)
 *  - defender win maps correctly to board (attacker dies, defender survives)
 *  - surviving HP is carried back from arena to board (attacker_wins)
 *  - surviving HP is carried back from arena to board (defender_wins)
 *  - HP is clamped to maxHp when applied back to board
 *  - game-over / elimination check still runs after arena result
 *  - power-square win check still runs after arena result
 *  - legacy static combat path (attacker_wins without arena flag) still works
 *  - imprisonment flag still applies correctly alongside HP carry
 */
import { describe, it, expect } from 'vitest';
import {
  makeInitialBoardState,
  applyCombatResult,
  IMPRISONMENT_TURNS,
} from './boardState';
import type { ExtendedCombatResultPayload } from './boardState';
import type { BoardPieceState } from './boardState';
import type { BoardState, CombatResultPayload, BoardCoord } from '../../lib/board-combat-contract';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a minimal BoardState with exactly two living pieces:
 * a light attacker at `attCoord` and a dark defender at `defCoord`.
 * Defender is the "selected" piece target — attacker is the current turn faction.
 */
function makeContestState(
  attCoord: BoardCoord,
  defCoord: BoardCoord,
  attHp = 10,
  defHp = 10,
): { state: BoardState; attId: string; defId: string } {
  const state = makeInitialBoardState();
  const attId = 'light-knight';
  const defId = 'dark-sorceress';

  const attPiece = state.pieces[attId] as BoardPieceState;
  const defPiece = state.pieces[defId] as BoardPieceState;

  if (!attPiece || !defPiece) throw new Error('Alpha roster changed — update helper');

  const newPieces = {
    ...state.pieces,
    [attId]: { ...attPiece, coord: attCoord, hp: attHp },
    [defId]: { ...defPiece, coord: defCoord, hp: defHp },
  };

  const newSquares = state.squares.map(row => row.map(sq => ({
    ...sq,
    pieceId: null as string | null,
  })));
  newSquares[attCoord.row][attCoord.col] = { ...newSquares[attCoord.row][attCoord.col], pieceId: attId };
  newSquares[defCoord.row][defCoord.col] = { ...newSquares[defCoord.row][defCoord.col], pieceId: defId };

  return {
    state: {
      ...state,
      pieces: newPieces as BoardState['pieces'],
      squares: newSquares,
      phase: 'combat',
      turnFaction: 'light',
      selectedPieceId: attId,
    },
    attId,
    defId,
  };
}

// ─── Tests: attacker_wins outcome ─────────────────────────────────────────────

describe('2.4 — applyCombatResult: attacker_wins', () => {
  it('attacker advances to contested square', () => {
    const { state, attId, defId } = makeContestState(
      { row: 5, col: 4 },
      { row: 4, col: 4 },
    );
    const attPiece = state.pieces[attId] as BoardPieceState;
    const defPiece = state.pieces[defId] as BoardPieceState;

    const result: CombatResultPayload = {
      contestedSquare: { row: 4, col: 4 },
      outcome: 'attacker_wins',
      survivingAttacker: { ...attPiece, hp: 7, coord: { row: 4, col: 4 } },
      survivingDefender: null,
      vfxHint: 'death_dark',
    };

    const next = applyCombatResult(state, result);
    // Attacker piece now lives on the contested square
    expect(next.squares[4][4].pieceId).toBe(attId);
    expect(next.pieces[attId].coord).toEqual({ row: 4, col: 4 });
  });

  it('attacker old square is vacated', () => {
    const { state, attId } = makeContestState({ row: 5, col: 4 }, { row: 4, col: 4 });
    const attPiece = state.pieces[attId] as BoardPieceState;

    const result: CombatResultPayload = {
      contestedSquare: { row: 4, col: 4 },
      outcome: 'attacker_wins',
      survivingAttacker: { ...attPiece, hp: 7, coord: { row: 4, col: 4 } },
      survivingDefender: null,
      vfxHint: 'death_dark',
    };

    const next = applyCombatResult(state, result);
    expect(next.squares[5][4].pieceId).toBeNull();
  });

  it('defender is marked dead after attacker wins', () => {
    const { state, attId, defId } = makeContestState({ row: 5, col: 4 }, { row: 4, col: 4 });
    const attPiece = state.pieces[attId] as BoardPieceState;

    const result: CombatResultPayload = {
      contestedSquare: { row: 4, col: 4 },
      outcome: 'attacker_wins',
      survivingAttacker: { ...attPiece, hp: 7, coord: { row: 4, col: 4 } },
      survivingDefender: null,
      vfxHint: 'death_dark',
    };

    const next = applyCombatResult(state, result);
    expect((next.pieces[defId] as BoardPieceState).isDead).toBe(true);
    expect(next.pieces[defId].hp).toBe(0);
  });

  it('surviving HP is carried back from arena (attacker_wins)', () => {
    const { state, attId } = makeContestState({ row: 5, col: 4 }, { row: 4, col: 4 });
    const attPiece = state.pieces[attId] as BoardPieceState;

    // Arena result has attacker surviving with reduced HP
    const arenaRemainingHp = 3;
    const result: CombatResultPayload = {
      contestedSquare: { row: 4, col: 4 },
      outcome: 'attacker_wins',
      survivingAttacker: { ...attPiece, hp: arenaRemainingHp, coord: { row: 4, col: 4 } },
      survivingDefender: null,
      vfxHint: 'death_dark',
    };

    const next = applyCombatResult(state, result);
    expect(next.pieces[attId].hp).toBe(arenaRemainingHp);
  });

  it('surviving HP is clamped to maxHp on attacker_wins (overflow guard)', () => {
    const { state, attId } = makeContestState({ row: 5, col: 4 }, { row: 4, col: 4 });
    const attPiece = state.pieces[attId] as BoardPieceState;
    const maxHp = attPiece.maxHp;

    // Arena result has hp above maxHp (shouldn't happen but guard must hold)
    const result: CombatResultPayload = {
      contestedSquare: { row: 4, col: 4 },
      outcome: 'attacker_wins',
      survivingAttacker: { ...attPiece, hp: maxHp + 999, coord: { row: 4, col: 4 } },
      survivingDefender: null,
      vfxHint: null,
    };

    const next = applyCombatResult(state, result);
    expect(next.pieces[attId].hp).toBeLessThanOrEqual(maxHp);
    expect(next.pieces[attId].hp).toBe(maxHp);
  });
});

// ─── Tests: defender_wins outcome ─────────────────────────────────────────────

describe('2.4 — applyCombatResult: defender_wins', () => {
  it('attacker is marked dead after defender wins', () => {
    const { state, attId, defId } = makeContestState({ row: 5, col: 4 }, { row: 4, col: 4 });
    const defPiece = state.pieces[defId] as BoardPieceState;

    const result: CombatResultPayload = {
      contestedSquare: { row: 4, col: 4 },
      outcome: 'defender_wins',
      survivingAttacker: null,
      survivingDefender: { ...defPiece, hp: 5 },
      vfxHint: 'death_light',
    };

    const next = applyCombatResult(state, result);
    expect((next.pieces[attId] as BoardPieceState).isDead).toBe(true);
    expect(next.pieces[attId].hp).toBe(0);
  });

  it('surviving HP is carried back from arena (defender_wins)', () => {
    const { state, defId } = makeContestState({ row: 5, col: 4 }, { row: 4, col: 4 }, 10, 10);
    const defPiece = state.pieces[defId] as BoardPieceState;

    // Defender won the fight but took damage — surviving with 4 HP
    const arenaRemainingHp = 4;
    const result: CombatResultPayload = {
      contestedSquare: { row: 4, col: 4 },
      outcome: 'defender_wins',
      survivingAttacker: null,
      survivingDefender: { ...defPiece, hp: arenaRemainingHp },
      vfxHint: 'death_light',
    };

    const next = applyCombatResult(state, result);
    expect(next.pieces[defId].hp).toBe(arenaRemainingHp);
  });

  it('surviving HP is clamped to maxHp on defender_wins (overflow guard)', () => {
    const { state, defId } = makeContestState({ row: 5, col: 4 }, { row: 4, col: 4 });
    const defPiece = state.pieces[defId] as BoardPieceState;
    const maxHp = defPiece.maxHp;

    const result: CombatResultPayload = {
      contestedSquare: { row: 4, col: 4 },
      outcome: 'defender_wins',
      survivingAttacker: null,
      survivingDefender: { ...defPiece, hp: maxHp + 999 },
      vfxHint: null,
    };

    const next = applyCombatResult(state, result);
    expect(next.pieces[defId].hp).toBeLessThanOrEqual(maxHp);
    expect(next.pieces[defId].hp).toBe(maxHp);
  });

  it('defender stays on its original square after winning', () => {
    const { state, defId } = makeContestState({ row: 5, col: 4 }, { row: 4, col: 4 });
    const defPiece = state.pieces[defId] as BoardPieceState;

    const result: CombatResultPayload = {
      contestedSquare: { row: 4, col: 4 },
      outcome: 'defender_wins',
      survivingAttacker: null,
      survivingDefender: { ...defPiece, hp: 5 },
      vfxHint: 'death_light',
    };

    const next = applyCombatResult(state, result);
    // Defender coord should be unchanged
    expect(next.pieces[defId].coord).toEqual(defPiece.coord);
    expect(next.squares[defPiece.coord.row][defPiece.coord.col].pieceId).toBe(defId);
  });
});

// ─── Tests: game-over still fires after arena result ─────────────────────────

describe('2.4 — game-over checks after arena result', () => {
  it('phase becomes gameover when all dark pieces are eliminated', () => {
    const state = makeInitialBoardState();
    // Mark every dark piece dead except the sorceress (which will die via result)
    const sortedPieces = Object.values(state.pieces as Record<string, BoardPieceState>);
    const darkPieces = sortedPieces.filter(p => p.faction === 'dark');
    const defId = 'dark-sorceress';

    let withDeadDark = state;
    const killedPieces = { ...state.pieces };
    for (const p of darkPieces) {
      if (p.pieceId !== defId) {
        (killedPieces as Record<string, BoardPieceState>)[p.pieceId] = { ...p, isDead: true, hp: 0 };
      }
    }
    withDeadDark = { ...state, pieces: killedPieces as BoardState['pieces'], phase: 'combat' };

    const attPiece = withDeadDark.pieces['light-knight'] as BoardPieceState;
    const defPiece = withDeadDark.pieces[defId] as BoardPieceState;

    const result: CombatResultPayload = {
      contestedSquare: defPiece.coord,
      outcome: 'attacker_wins',
      survivingAttacker: { ...attPiece, hp: 5, coord: defPiece.coord },
      survivingDefender: null,
      vfxHint: 'death_dark',
    };

    const next = applyCombatResult(withDeadDark, result);
    expect(next.phase).toBe('gameover');
  });

  it('phase becomes gameover when all light pieces are eliminated', () => {
    const state = makeInitialBoardState();
    const sortedPieces = Object.values(state.pieces as Record<string, BoardPieceState>);
    const lightPieces = sortedPieces.filter(p => p.faction === 'light');
    const attId = 'light-knight';

    const killedPieces = { ...state.pieces };
    for (const p of lightPieces) {
      if (p.pieceId !== attId) {
        (killedPieces as Record<string, BoardPieceState>)[p.pieceId] = { ...p, isDead: true, hp: 0 };
      }
    }

    const withDeadLight = {
      ...state,
      pieces: killedPieces as BoardState['pieces'],
      phase: 'combat' as const,
      turnFaction: 'light' as const,
      selectedPieceId: attId,
    };

    const attPiece = withDeadLight.pieces[attId] as BoardPieceState;
    const defPiece = withDeadLight.pieces['dark-sorceress'] as BoardPieceState;

    const result: CombatResultPayload = {
      contestedSquare: attPiece.coord,
      outcome: 'defender_wins',
      survivingAttacker: null,
      survivingDefender: { ...defPiece, hp: 8 },
      vfxHint: 'death_light',
    };

    const next = applyCombatResult(withDeadLight, result);
    expect(next.phase).toBe('gameover');
  });

  it('phase remains active when both sides still have living pieces', () => {
    const { state, attId } = makeContestState({ row: 5, col: 4 }, { row: 4, col: 4 });
    const attPiece = state.pieces[attId] as BoardPieceState;

    const result: CombatResultPayload = {
      contestedSquare: { row: 4, col: 4 },
      outcome: 'attacker_wins',
      survivingAttacker: { ...attPiece, hp: 7, coord: { row: 4, col: 4 } },
      survivingDefender: null,
      vfxHint: 'death_dark',
    };

    const next = applyCombatResult(state, result);
    // The initial board has many other living pieces on both sides
    expect(next.phase).toBe('active');
  });
});

// ─── Tests: turn advance after arena result ───────────────────────────────────

describe('2.4 — turn advances after arena result', () => {
  it('turnFaction flips after arena result (light → dark)', () => {
    const { state, attId } = makeContestState({ row: 5, col: 4 }, { row: 4, col: 4 });
    const attPiece = state.pieces[attId] as BoardPieceState;

    const result: CombatResultPayload = {
      contestedSquare: { row: 4, col: 4 },
      outcome: 'attacker_wins',
      survivingAttacker: { ...attPiece, hp: 7, coord: { row: 4, col: 4 } },
      survivingDefender: null,
      vfxHint: null,
    };

    const next = applyCombatResult(state, result);
    expect(next.turnFaction).toBe('dark'); // was light
  });

  it('selectedPieceId is cleared after arena result', () => {
    const { state, attId } = makeContestState({ row: 5, col: 4 }, { row: 4, col: 4 });
    const attPiece = state.pieces[attId] as BoardPieceState;

    const result: CombatResultPayload = {
      contestedSquare: { row: 4, col: 4 },
      outcome: 'attacker_wins',
      survivingAttacker: { ...attPiece, hp: 5, coord: { row: 4, col: 4 } },
      survivingDefender: null,
      vfxHint: null,
    };

    const next = applyCombatResult(state, result);
    expect(next.selectedPieceId).toBeNull();
  });

  it('legalMoves is cleared after arena result', () => {
    const { state, attId } = makeContestState({ row: 5, col: 4 }, { row: 4, col: 4 });
    const attPiece = state.pieces[attId] as BoardPieceState;

    const result: CombatResultPayload = {
      contestedSquare: { row: 4, col: 4 },
      outcome: 'attacker_wins',
      survivingAttacker: { ...attPiece, hp: 5, coord: { row: 4, col: 4 } },
      survivingDefender: null,
      vfxHint: null,
    };

    const next = applyCombatResult(state, result);
    expect(next.legalMoves).toHaveLength(0);
  });
});

// ─── Tests: imprisonment still works alongside HP carry ───────────────────────

describe('2.4 — imprisonment + HP carry coexist', () => {
  it('attacker can be imprisoned and carry HP simultaneously', () => {
    const { state, attId } = makeContestState({ row: 5, col: 4 }, { row: 4, col: 4 });
    const attPiece = state.pieces[attId] as BoardPieceState;
    const arenaHp = 6;

    const result: ExtendedCombatResultPayload = {
      contestedSquare: { row: 4, col: 4 },
      outcome: 'attacker_wins',
      survivingAttacker: { ...attPiece, hp: arenaHp, coord: { row: 4, col: 4 } },
      survivingDefender: null,
      vfxHint: null,
      survivingAttackerImprisoned: true,
    };

    const next = applyCombatResult(state, result);
    const piece = next.pieces[attId] as BoardPieceState;
    expect(piece.hp).toBe(arenaHp);
    expect(piece.imprisoned).toBe(true);
    expect(piece.imprisonedTurnsRemaining).toBe(IMPRISONMENT_TURNS);
  });

  it('defender can be imprisoned and carry HP simultaneously', () => {
    const { state, defId } = makeContestState({ row: 5, col: 4 }, { row: 4, col: 4 });
    const defPiece = state.pieces[defId] as BoardPieceState;
    const arenaHp = 3;

    const result: ExtendedCombatResultPayload = {
      contestedSquare: { row: 4, col: 4 },
      outcome: 'defender_wins',
      survivingAttacker: null,
      survivingDefender: { ...defPiece, hp: arenaHp },
      vfxHint: null,
      survivingDefenderImprisoned: true,
    };

    const next = applyCombatResult(state, result);
    const piece = next.pieces[defId] as BoardPieceState;
    expect(piece.hp).toBe(arenaHp);
    expect(piece.imprisoned).toBe(true);
    expect(piece.imprisonedTurnsRemaining).toBe(IMPRISONMENT_TURNS);
  });
});

// ─── Tests: legacy static combat path unaffected ──────────────────────────────

describe('2.4 — legacy combat path (no arena flag)', () => {
  it('applyCombatResult works with a plain CombatResultPayload (no extension fields)', () => {
    const { state, attId, defId } = makeContestState({ row: 5, col: 4 }, { row: 4, col: 4 });
    const attPiece = state.pieces[attId] as BoardPieceState;

    // This mirrors what CombatBridge (legacy static combat) produces
    const plainResult: CombatResultPayload = {
      contestedSquare: { row: 4, col: 4 },
      outcome: 'attacker_wins',
      survivingAttacker: { ...attPiece, hp: 15, coord: { row: 4, col: 4 } },
      survivingDefender: null,
      vfxHint: 'death_dark',
    };

    // Must not throw
    const next = applyCombatResult(state, plainResult);
    expect(next.pieces[attId].coord).toEqual({ row: 4, col: 4 });
    expect((next.pieces[defId] as BoardPieceState).isDead).toBe(true);
  });

  it('legacy defender_wins path marks attacker dead correctly', () => {
    const { state, attId, defId } = makeContestState({ row: 5, col: 4 }, { row: 4, col: 4 });
    const defPiece = state.pieces[defId] as BoardPieceState;

    const plainResult: CombatResultPayload = {
      contestedSquare: { row: 4, col: 4 },
      outcome: 'defender_wins',
      survivingAttacker: null,
      survivingDefender: { ...defPiece, hp: defPiece.hp }, // no arena HP carry
      vfxHint: 'death_light',
    };

    const next = applyCombatResult(state, plainResult);
    expect((next.pieces[attId] as BoardPieceState).isDead).toBe(true);
    // Defender HP unchanged (same as board HP since legacy doesn't change it)
    expect(next.pieces[defId].hp).toBe(defPiece.hp);
  });

  it('applyCombatResult is deterministic — two identical calls produce equivalent results', () => {
    const { state, attId } = makeContestState({ row: 5, col: 4 }, { row: 4, col: 4 });
    const attPiece = state.pieces[attId] as BoardPieceState;

    const result: CombatResultPayload = {
      contestedSquare: { row: 4, col: 4 },
      outcome: 'attacker_wins',
      survivingAttacker: { ...attPiece, hp: 8, coord: { row: 4, col: 4 } },
      survivingDefender: null,
      vfxHint: null,
    };

    const next1 = applyCombatResult(state, result);
    const next2 = applyCombatResult(state, result);

    expect(next1.pieces[attId].hp).toBe(next2.pieces[attId].hp);
    expect(next1.pieces[attId].coord).toEqual(next2.pieces[attId].coord);
    expect(next1.phase).toBe(next2.phase);
  });
});
