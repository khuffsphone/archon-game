/**
 * boardState.ts  —  Lane 3 owner
 * Board state engine: initialization, move logic, turn management.
 * Uses types from the frozen board-combat-contract.ts.
 */
import type {
  BoardState, BoardSquare, BoardCoord, BoardPiece,
  Faction, SquareLuminance, PieceRole,
} from '../../lib/board-combat-contract';
import type { CombatPackManifest } from '../../lib/types';

// ─── Alpha Roster ─────────────────────────────────────────────────────────────
// 2-per-side for the alpha build.

export interface RosterEntry {
  pieceId: string;
  name: string;
  faction: Faction;
  role: PieceRole;
  startCoord: BoardCoord;
  hp: number;
  assetIds: { token: string; portrait: string; defeated: string };
}

export const ALPHA_ROSTER: RosterEntry[] = [
  {
    pieceId: 'light-knight',
    name: 'Knight',
    faction: 'light',
    role: 'warrior',
    startCoord: { row: 7, col: 2 },
    hp: 20,
    assetIds: {
      token: 'unit-light-knight-token',
      portrait: 'unit-light-knight-portrait',
      defeated: 'unit-light-knight-defeated',
    },
  },
  {
    pieceId: 'light-herald',
    name: 'Herald',
    faction: 'light',
    role: 'herald',
    startCoord: { row: 7, col: 4 },
    hp: 14,
    assetIds: {
      // fallback to knight portrait if herald asset not available
      token: 'unit-light-knight-token',
      portrait: 'unit-light-knight-portrait',
      defeated: 'unit-light-knight-defeated',
    },
  },
  {
    pieceId: 'dark-sorceress',
    name: 'Sorceress',
    faction: 'dark',
    role: 'caster',
    startCoord: { row: 1, col: 6 },
    hp: 16,
    assetIds: {
      token: 'unit-dark-sorceress-token',
      portrait: 'unit-dark-sorceress-portrait',
      defeated: 'unit-dark-sorceress-defeated',
    },
  },
  {
    pieceId: 'dark-sentinel',
    name: 'Sentinel',
    faction: 'dark',
    role: 'sentinel',
    startCoord: { row: 1, col: 4 },
    hp: 18,
    assetIds: {
      // fallback to sorceress assets if sentinel not available
      token: 'unit-dark-sorceress-token',
      portrait: 'unit-dark-sorceress-portrait',
      defeated: 'unit-dark-sorceress-defeated',
    },
  },
];

// ─── Board Size ────────────────────────────────────────────────────────────────
export const BOARD_SIZE = 9;

// ─── Initialization ───────────────────────────────────────────────────────────

function makeEmptySquares(): BoardSquare[][] {
  return Array.from({ length: BOARD_SIZE }, (_, row) =>
    Array.from({ length: BOARD_SIZE }, (_, col) => ({
      coord: { row, col },
      luminance: getLuminanceForCoord({ row, col }),
      pieceId: null,
    }))
  );
}

/** Starting luminance: light controls bottom half, dark top half, middle contested */
function getLuminanceForCoord(coord: BoardCoord): SquareLuminance {
  if (coord.row <= 2) return 'dark';
  if (coord.row >= 6) return 'light';
  return 'neutral';
}

export function makeInitialBoardState(): BoardState {
  const squares = makeEmptySquares();
  const pieces: Record<string, BoardPiece> = {};

  for (const entry of ALPHA_ROSTER) {
    const piece: BoardPiece = {
      pieceId: entry.pieceId,
      name: entry.name,
      faction: entry.faction,
      role: entry.role,
      coord: entry.startCoord,
      hp: entry.hp,
      maxHp: entry.hp,
      isDead: false,
      assetIds: entry.assetIds,
    };
    pieces[entry.pieceId] = piece;
    squares[entry.startCoord.row][entry.startCoord.col].pieceId = entry.pieceId;
  }

  return {
    phase: 'active',
    turnFaction: 'light',
    turnNumber: 1,
    squares,
    pieces,
    selectedPieceId: null,
    legalMoves: [],
  };
}

/**
 * makeAdjacentContestSetup
 * Deterministic contest test setup for Milestone C QA.
 * Places Knight (light) at (4,3) and Sorceress (dark) at (4,5) — 2 squares apart.
 * Knight's legal range = 2, so (4,5) is a legal attack target.
 * Triggering it proves the board→combat→board round-trip.
 *
 * Activate via URL: ?setup=adjacent
 */
export function makeAdjacentContestSetup(): BoardState {
  const squares = makeEmptySquares();
  const pieces: Record<string, BoardPiece> = {};

  // Only place the two contest participants
  const contestRoster: Array<{ entry: (typeof ALPHA_ROSTER)[0]; coord: BoardCoord }> = [
    { entry: ALPHA_ROSTER[0], coord: { row: 4, col: 3 } }, // Knight (light)
    { entry: ALPHA_ROSTER[2], coord: { row: 4, col: 5 } }, // Sorceress (dark)
  ];

  for (const { entry, coord } of contestRoster) {
    const piece: BoardPiece = {
      pieceId: entry.pieceId,
      name: entry.name,
      faction: entry.faction,
      role: entry.role,
      coord,
      hp: entry.hp,
      maxHp: entry.hp,
      isDead: false,
      assetIds: entry.assetIds,
    };
    pieces[entry.pieceId] = piece;
    squares[coord.row][coord.col].pieceId = entry.pieceId;
    // Mark squares around each piece
    squares[coord.row][coord.col].luminance = entry.faction;
  }

  // Mark contested zone between them
  squares[4][4].luminance = 'contested';

  return {
    phase: 'active',
    turnFaction: 'light',
    turnNumber: 1,
    squares,
    pieces,
    selectedPieceId: null,
    legalMoves: [],
  };
}



/**
 * makeDarkAttackerContestSetup
 * Deterministic dark-attacker test setup for 0.3 Milestone A QA.
 * Places Sorceress (dark) at (4,5) and Herald (light) at (4,3) — 2 squares apart.
 * Sorceress range = 2, so (4,3) is a legal attack target.
 * turnFaction = 'dark' so the dark player moves first.
 * Triggering it proves the dark→combat→board round-trip.
 *
 * Activate via URL: ?setup=dark-attacker
 */
export function makeDarkAttackerContestSetup(): BoardState {
  const squares = makeEmptySquares();
  const pieces: Record<string, BoardPiece> = {};

  // Sorceress (dark) at (4,5), Herald (light) at (4,3)
  const contestRoster: Array<{ entry: (typeof ALPHA_ROSTER)[0]; coord: BoardCoord }> = [
    { entry: ALPHA_ROSTER[2], coord: { row: 4, col: 5 } }, // Sorceress (dark)
    { entry: ALPHA_ROSTER[1], coord: { row: 4, col: 3 } }, // Herald (light)
  ];

  for (const { entry, coord } of contestRoster) {
    const piece: BoardPiece = {
      pieceId: entry.pieceId,
      name: entry.name,
      faction: entry.faction,
      role: entry.role,
      coord,
      hp: entry.hp,
      maxHp: entry.hp,
      isDead: false,
      assetIds: entry.assetIds,
    };
    pieces[entry.pieceId] = piece;
    squares[coord.row][coord.col].pieceId = entry.pieceId;
    squares[coord.row][coord.col].luminance = entry.faction;
  }

  // Mark contested zone between them
  squares[4][4].luminance = 'contested';

  return {
    phase: 'active',
    turnFaction: 'dark',   // dark moves first
    turnNumber: 1,
    squares,
    pieces,
    selectedPieceId: null,
    legalMoves: [],
  };
}

/**
 * makeGameOverSetup
 * Deterministic game-over proof setup for 0.3 Milestone C QA.
 * One piece per side — Knight (light) at (4,3), Sorceress (dark) at (4,5).
 * turnFaction = 'light'. When Knight wins:
 *   - Sorceress eliminated
 *   - No dark pieces alive → applyCombatResult sets phase = 'gameover'
 *   - BoardScene renders '☀ Light Wins!' banner
 *
 * Activate via URL: ?setup=gameover
 */
export function makeGameOverSetup(): BoardState {
  const squares = makeEmptySquares();
  const pieces: Record<string, BoardPiece> = {};

  // Single piece per side — same positions as adjacent for familiarity
  const roster: Array<{ entry: (typeof ALPHA_ROSTER)[0]; coord: BoardCoord }> = [
    { entry: ALPHA_ROSTER[0], coord: { row: 4, col: 3 } }, // Knight (light) — sole light piece
    { entry: ALPHA_ROSTER[2], coord: { row: 4, col: 5 } }, // Sorceress (dark) — sole dark piece
  ];

  for (const { entry, coord } of roster) {
    const piece: BoardPiece = {
      pieceId: entry.pieceId,
      name: entry.name,
      faction: entry.faction,
      role: entry.role,
      coord,
      hp: entry.hp,
      maxHp: entry.hp,
      isDead: false,
      assetIds: entry.assetIds,
    };
    pieces[entry.pieceId] = piece;
    squares[coord.row][coord.col].pieceId = entry.pieceId;
    squares[coord.row][coord.col].luminance = entry.faction;
  }

  squares[4][4].luminance = 'contested';

  return {
    phase: 'active',
    turnFaction: 'light',
    turnNumber: 1,
    squares,
    pieces,
    selectedPieceId: null,
    legalMoves: [],
  };
}

// ─── Asset Coverage Check ─────────────────────────────────────────────────────

export function checkBoardAssets(pack: CombatPackManifest): {
  covered: string[]; missing: string[];
} {
  const ids = new Set(pack.assets.map(a => a.id));
  const covered: string[] = [];
  const missing: string[] = [];
  for (const entry of ALPHA_ROSTER) {
    for (const assetId of Object.values(entry.assetIds)) {
      if (ids.has(assetId)) covered.push(assetId);
      else missing.push(`${entry.pieceId}: ${assetId}`);
    }
  }
  return { covered, missing };
}

// ─── Selection & Legal Moves ──────────────────────────────────────────────────

export function selectPiece(state: BoardState, pieceId: string): BoardState {
  const piece = state.pieces[pieceId];
  if (!piece || piece.faction !== state.turnFaction || piece.isDead) {
    return { ...state, selectedPieceId: null, legalMoves: [] };
  }
  const legalMoves = computeLegalMoves(state, piece);
  return { ...state, selectedPieceId: pieceId, legalMoves };
}

export function deselectPiece(state: BoardState): BoardState {
  return { ...state, selectedPieceId: null, legalMoves: [] };
}

/** Simple alpha move rules: orthogonal + diagonal, 1–2 squares, no friendly overlap */
function computeLegalMoves(state: BoardState, piece: BoardPiece): BoardCoord[] {
  const moves: BoardCoord[] = [];
  const range = piece.role === 'herald' ? 3 : 2;
  const { row, col } = piece.coord;

  for (let dr = -range; dr <= range; dr++) {
    for (let dc = -range; dc <= range; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) continue;

      const targetPieceId = state.squares[r][c].pieceId;
      if (targetPieceId) {
        const target = state.pieces[targetPieceId];
        // Can't move onto friendly piece
        if (target.faction === piece.faction) continue;
        // Can move onto enemy (triggers contest)
      }
      moves.push({ row: r, col: c });
    }
  }
  return moves;
}

// ─── Move Execution ───────────────────────────────────────────────────────────

export type MoveResult =
  | { type: 'move'; nextState: BoardState }
  | { type: 'contest'; attacker: BoardPiece; defender: BoardPiece; nextState: BoardState };

export function executeMove(state: BoardState, targetCoord: BoardCoord): MoveResult {
  if (!state.selectedPieceId) return { type: 'move', nextState: state };

  const attacker = state.pieces[state.selectedPieceId];
  const targetPieceId = state.squares[targetCoord.row][targetCoord.col].pieceId;

  if (targetPieceId) {
    const defender = state.pieces[targetPieceId];
    if (defender.faction !== attacker.faction) {
      // Contest — suspend board state during combat
      const suspended: BoardState = {
        ...state,
        phase: 'combat',
        selectedPieceId: null,
        legalMoves: [],
      };
      return { type: 'contest', attacker, defender, nextState: suspended };
    }
  }

  // Normal move
  const newSquares = state.squares.map(row => row.map(sq => ({ ...sq })));
  newSquares[attacker.coord.row][attacker.coord.col].pieceId = null;
  newSquares[targetCoord.row][targetCoord.col].pieceId = attacker.pieceId;

  const updatedLuminance = recalcLuminance(newSquares, state.pieces, attacker.pieceId, targetCoord);

  const newPieces = {
    ...state.pieces,
    [attacker.pieceId]: { ...attacker, coord: targetCoord },
  };

  const nextFaction: Faction = state.turnFaction === 'light' ? 'dark' : 'light';
  const nextTurn = nextFaction === 'light' ? state.turnNumber + 1 : state.turnNumber;

  return {
    type: 'move',
    nextState: {
      ...state,
      phase: 'active',
      squares: updatedLuminance,
      pieces: newPieces,
      selectedPieceId: null,
      legalMoves: [],
      turnFaction: nextFaction,
      turnNumber: nextTurn,
    },
  };
}

function recalcLuminance(
  squares: BoardSquare[][],
  pieces: Record<string, BoardPiece>,
  movedPieceId: string,
  newCoord: BoardCoord,
): BoardSquare[][] {
  // After a move, mark squares adjacent to pieces as influenced by faction
  const result = squares.map(row => row.map(sq => ({ ...sq })));

  for (const piece of Object.values(pieces)) {
    const coord = piece.pieceId === movedPieceId ? newCoord : piece.coord;
    if (piece.isDead) continue;
    // Mark the piece's own square and adjacent squares as faction-influenced
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = coord.row + dr;
        const c = coord.col + dc;
        if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) continue;
        const sq = result[r][c];
        if (sq.luminance === 'neutral') {
          sq.luminance = piece.faction;
        } else if (sq.luminance !== piece.faction && sq.luminance !== 'contested') {
          sq.luminance = 'contested';
        }
      }
    }
  }
  return result;
}

// ─── Combat Result Application ─────────────────────────────────────────────────

import type { CombatResultPayload } from '../../lib/board-combat-contract';

export function applyCombatResult(
  state: BoardState,
  result: CombatResultPayload,
): BoardState {
  let newPieces = { ...state.pieces };
  const newSquares = state.squares.map(row => row.map(sq => ({ ...sq })));
  const { row, col } = result.contestedSquare;

  if (result.outcome === 'attacker_wins') {
    // Defender eliminated — move attacker to contested square
    if (result.survivingDefender === null && result.survivingAttacker !== null) {
      const att = result.survivingAttacker;
      const oldCoord = newPieces[att.pieceId]?.coord;
      if (oldCoord) newSquares[oldCoord.row][oldCoord.col].pieceId = null;
      newSquares[row][col].pieceId = att.pieceId;
      newPieces[att.pieceId] = { ...att, coord: { row, col } };
    }
    if (result.survivingDefender === null) {
      // Mark defender dead
      const deadDefId = Object.keys(newPieces).find(id => {
        const p = newPieces[id];
        return p.coord.row === row && p.coord.col === col && p.faction !== result.survivingAttacker?.faction;
      });
      if (deadDefId) newPieces[deadDefId] = { ...newPieces[deadDefId], isDead: true, hp: 0 };
    }
  } else if (result.outcome === 'defender_wins') {
    // Attacker repelled — attacker stays put (doesn't advance)
    if (result.survivingAttacker === null) {
      const deadAttId = state.selectedPieceId ?? Object.keys(newPieces).find(id => {
        const p = newPieces[id];
        return p.faction === state.turnFaction && !p.isDead;
      });
      if (deadAttId) newPieces[deadAttId] = { ...newPieces[deadAttId], isDead: true, hp: 0 };
    }
  }

  const nextFaction: Faction = state.turnFaction === 'light' ? 'dark' : 'light';
  const nextTurn = nextFaction === 'light' ? state.turnNumber + 1 : state.turnNumber;

  // Check win condition
  const lightAlive = Object.values(newPieces).some(p => p.faction === 'light' && !p.isDead);
  const darkAlive  = Object.values(newPieces).some(p => p.faction === 'dark'  && !p.isDead);
  const phase = (!lightAlive || !darkAlive) ? 'gameover' : 'active';

  return {
    ...state,
    phase,
    squares: recalcLuminance(newSquares, newPieces, '', { row: -1, col: -1 }),
    pieces: newPieces,
    selectedPieceId: null,
    legalMoves: [],
    turnFaction: nextFaction,
    turnNumber: nextTurn,
  };
}
