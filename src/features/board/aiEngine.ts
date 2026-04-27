/**
 * aiEngine.ts — Archon AI v1
 *
 * Simple deterministic CPU for the Dark faction.
 * Reuses the existing legal-move generation from boardState (computeLegalMoves
 * is exposed via selectPiece). Does NOT implement minimax, deep search,
 * or difficulty tiers — pure greedy heuristic only.
 *
 * Move-selection priority:
 *   1. Capture  — any move that lands on an enemy piece (triggers contest)
 *   2. Approach — move toward the nearest enemy piece (Chebyshev distance)
 *   3. Power    — move toward the nearest power square
 *   4. Random   — any remaining legal move
 *
 * Usage:
 *   const aiAction = chooseAiMove(boardState, 'dark');
 *   if (aiAction) executeMove(boardState, aiAction.targetCoord); // already knows pieceId
 */

import type { BoardState, BoardCoord } from '../../lib/board-combat-contract';
import { selectPiece, BOARD_SIZE, POWER_SQUARES } from './boardState';
import type { BoardPieceState } from './boardState';

/** The result of AI move selection — identifies the piece and target. */
export interface AiAction {
  pieceId: string;
  targetCoord: BoardCoord;
  reason: 'capture' | 'approach' | 'power' | 'random';
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Chebyshev (chessboard) distance between two coordinates. */
function chebyshev(a: BoardCoord, b: BoardCoord): number {
  return Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col));
}

/** Returns all living enemy pieces for the given faction. */
function enemyPieces(state: BoardState, faction: string): BoardPieceState[] {
  return Object.values(state.pieces).filter(
    p => p.faction !== faction && !p.isDead,
  ) as BoardPieceState[];
}

/** Returns all living friendly pieces for the given faction. */
function friendlyPieces(state: BoardState, faction: string): BoardPieceState[] {
  return Object.values(state.pieces).filter(
    p => p.faction === faction && !p.isDead && !(p as BoardPieceState).imprisoned,
  ) as BoardPieceState[];
}

// ─── Candidate builder ────────────────────────────────────────────────────────

interface Candidate {
  pieceId: string;
  targetCoord: BoardCoord;
  score: number;
  reason: AiAction['reason'];
}

/**
 * Build a scored candidate list for every legal move of every friendly piece.
 *
 * Scoring:
 *   +1000  if the target square contains an enemy (capture / contest)
 *   +10    for each step closer to the nearest enemy (approach bonus)
 *   +5     if the target coord is a power square
 *   +rand  small random tiebreaker (0–9)
 */
function buildCandidates(state: BoardState, faction: string): Candidate[] {
  const candidates: Candidate[] = [];
  const enemies = enemyPieces(state, faction);
  const friendly = friendlyPieces(state, faction);

  for (const piece of friendly) {
    // Inject a temporary turnFaction so selectPiece can select this piece
    const tempState: BoardState = { ...state, turnFaction: faction as 'light' | 'dark', selectedPieceId: null, legalMoves: [] };
    const selected = selectPiece(tempState, piece.pieceId);

    if (selected.legalMoves.length === 0) continue;

    for (const move of selected.legalMoves) {
      let score = 0;
      let reason: AiAction['reason'] = 'random';

      // 1. Capture bonus
      const targetPieceId = state.squares[move.row][move.col].pieceId;
      if (targetPieceId) {
        const target = state.pieces[targetPieceId];
        if (target && target.faction !== faction && !target.isDead) {
          score += 1000;
          reason = 'capture';
        }
      }

      // 2. Approach bonus — reward reducing Chebyshev distance to nearest enemy
      if (enemies.length > 0) {
        const currentMinDist = Math.min(...enemies.map(e => chebyshev(piece.coord, e.coord)));
        const newMinDist = Math.min(...enemies.map(e => chebyshev(move, e.coord)));
        const improvement = currentMinDist - newMinDist;
        if (improvement > 0 && reason !== 'capture') reason = 'approach';
        score += improvement * 10;
      }

      // 3. Power square bonus
      const isPower = POWER_SQUARES.some(ps => ps.row === move.row && ps.col === move.col);
      if (isPower) {
        score += 5;
        if (reason === 'random') reason = 'power';
      }

      // 4. Small random tiebreaker
      score += Math.floor(Math.random() * 10);

      candidates.push({ pieceId: piece.pieceId, targetCoord: move, score, reason });
    }
  }

  return candidates;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Choose the best legal AI move for `faction`.
 * Returns null if no legal moves exist (all pieces imprisoned or board is over).
 */
export function chooseAiMove(state: BoardState, faction: 'light' | 'dark'): AiAction | null {
  if (state.phase !== 'active') return null;
  if (state.turnFaction !== faction) return null;

  const candidates = buildCandidates(state, faction);
  if (candidates.length === 0) return null;

  // Pick highest-scoring candidate
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];

  return {
    pieceId: best.pieceId,
    targetCoord: best.targetCoord,
    reason: best.reason,
  };
}

/**
 * Describe an AI action for the board event log.
 * e.g. "🤖 Dragon advances" / "🤖 Banshee captures Knight"
 */
export function describeAiAction(action: AiAction, state: BoardState): string {
  const piece = state.pieces[action.pieceId];
  const targetPieceId = state.squares[action.targetCoord.row][action.targetCoord.col].pieceId;
  const targetPiece = targetPieceId ? state.pieces[targetPieceId] : null;

  if (action.reason === 'capture' && targetPiece) {
    return `🤖 ${piece?.name ?? action.pieceId} attacks ${targetPiece.name}`;
  }
  if (action.reason === 'approach') {
    return `🤖 ${piece?.name ?? action.pieceId} advances`;
  }
  if (action.reason === 'power') {
    return `🤖 ${piece?.name ?? action.pieceId} claims a power square`;
  }
  return `🤖 ${piece?.name ?? action.pieceId} moves`;
}
