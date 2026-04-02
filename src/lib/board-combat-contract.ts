/**
 * board-combat-contract.ts
 * 
 * FROZEN INTERFACE CONTRACT — Part 2 / board-combat-alpha-0.1
 * 
 * This file defines the shared data types for communication between:
 *   - The Board layer  (Lane 3 owner: archon-game/src/features/board/**)
 *   - The Combat layer (Lane 4 owner: archon-game/src/features/combat/**)
 * 
 * RULES:
 * - Neither lane may change this file without creating a blocker artifact
 *   and getting an explicit manager sign-off.
 * - The board layer READS from this contract to build the launch payload.
 * - The combat layer READS from this contract to accept the payload and
 *   write the result.
 * - No other file in archon-game should import intermediate types
 *   from either lane directly — only through this contract.
 * 
 * FROZEN: 2026-04-02 (combat-slice-v1.1.1 baseline)
 */

// ─── Board Coordinates ────────────────────────────────────────────────────────

/** A position on the 9×9 board, 0-indexed from top-left */
export interface BoardCoord {
  row: number;   // 0–8
  col: number;   // 0–8
}

// ─── Piece Identity ───────────────────────────────────────────────────────────

export type Faction = 'light' | 'dark';

export type PieceRole = 'warrior' | 'caster' | 'sentinel' | 'herald';

export interface PieceIdentity {
  /** Unique piece ID within the current game session */
  pieceId: string;
  /** Display name, e.g. "Knight" */
  name: string;
  faction: Faction;
  role: PieceRole;
  /** Asset IDs in the combat-pack manifest for this piece */
  assetIds: {
    token: string;
    portrait: string;
    defeated: string;
  };
}

// ─── Board Piece State ────────────────────────────────────────────────────────

export interface BoardPiece extends PieceIdentity {
  coord: BoardCoord;
  hp: number;
  maxHp: number;
  isDead: boolean;
}

// ─── Board Square ─────────────────────────────────────────────────────────────

/** Luminance state of a board square */
export type SquareLuminance = 'light' | 'dark' | 'neutral' | 'contested';

export interface BoardSquare {
  coord: BoardCoord;
  luminance: SquareLuminance;
  pieceId: string | null;
}

// ─── Board State ──────────────────────────────────────────────────────────────

export type BoardPhase = 'setup' | 'active' | 'combat' | 'resolution' | 'gameover';

export interface BoardState {
  phase: BoardPhase;
  turnFaction: Faction;
  turnNumber: number;
  squares: BoardSquare[][];   // [row][col], 9×9
  pieces: Record<string, BoardPiece>;  // pieceId → piece
  selectedPieceId: string | null;
  legalMoves: BoardCoord[];
}

// ─── Combat Launch Payload ────────────────────────────────────────────────────
// Built by the Board layer, consumed by the Combat layer.

export interface CombatLaunchPayload {
  /** Where on the board the combat occurs */
  contestedSquare: BoardCoord;
  /** The attacking piece (who chose to move into a contested square) */
  attacker: BoardPiece;
  /** The defending piece (who already occupied the square) */
  defender: BoardPiece;
  /** The pack manifest, passed through for asset loading */
  pack: import('./types').CombatPackManifest;
}

// ─── Combat Result Payload ────────────────────────────────────────────────────
// Produced by the Combat layer, returned to the Board layer.

export type CombatOutcome = 'attacker_wins' | 'defender_wins' | 'draw';

export interface CombatResultPayload {
  contestedSquare: BoardCoord;
  outcome: CombatOutcome;
  /** Surviving piece state after combat (null if eliminated) */
  survivingAttacker: BoardPiece | null;
  survivingDefender: BoardPiece | null;
  /** VFX context for board-level aftermath rendering */
  vfxHint: 'death_light' | 'death_dark' | 'hit_light' | 'hit_dark' | null;
}

// ─── Combat Bridge Callbacks ──────────────────────────────────────────────────
// The Board layer provides these callbacks when launching combat.
// The Combat layer calls onResult() when the combat sequence is complete.

export interface CombatBridgeCallbacks {
  onResult: (result: CombatResultPayload) => void;
  onCancel: () => void;
}
