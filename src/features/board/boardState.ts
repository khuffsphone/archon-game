/**
 * boardState.ts  —  Lane 3 owner
 * Board state engine: initialization, move logic, turn management.
 * Uses types from the frozen board-combat-contract.ts.
 */
import type {
  BoardState, BoardSquare, BoardCoord, BoardPiece,
  Faction, SquareLuminance, PieceRole, CombatResultPayload,
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
  // ── Light faction (7 pieces, bottom of board) ────────────────────────────
  {
    pieceId: 'light-knight',
    name: 'Knight',
    faction: 'light',
    role: 'warrior',
    startCoord: { row: 7, col: 2 },
    hp: 20,
    assetIds: {
      token:    'unit-light-knight-token',
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
      token:    'unit-light-knight-token',
      portrait: 'unit-light-knight-portrait',
      defeated: 'unit-light-knight-defeated',
    },
  },
  {
    pieceId: 'light-archer',
    name: 'Archer',
    faction: 'light',
    role: 'warrior',
    startCoord: { row: 7, col: 6 },
    hp: 16,
    assetIds: {
      token:    'unit-light-archer-token',
      portrait: 'unit-light-archer-portrait',
      defeated: 'unit-light-archer-defeated',
    },
  },
  {
    pieceId: 'light-golem',
    name: 'Golem',
    faction: 'light',
    role: 'sentinel',
    startCoord: { row: 8, col: 1 },
    hp: 24,
    assetIds: {
      token:    'unit-light-golem-token',
      portrait: 'unit-light-golem-portrait',
      defeated: 'unit-light-golem-defeated',
    },
  },
  {
    pieceId: 'light-phoenix',
    name: 'Phoenix',
    faction: 'light',
    role: 'caster',
    startCoord: { row: 8, col: 3 },
    hp: 18,
    assetIds: {
      token:    'unit-light-phoenix-token',
      portrait: 'unit-light-phoenix-portrait',
      defeated: 'unit-light-phoenix-defeated',
    },
  },
  {
    pieceId: 'light-unicorn',
    name: 'Unicorn',
    faction: 'light',
    role: 'warrior',
    startCoord: { row: 8, col: 5 },
    hp: 18,
    assetIds: {
      token:    'unit-light-unicorn-token',
      portrait: 'unit-light-unicorn-portrait',
      defeated: 'unit-light-unicorn-defeated',
    },
  },
  {
    pieceId: 'light-valkyrie',
    name: 'Valkyrie',
    faction: 'light',
    role: 'sentinel',
    startCoord: { row: 8, col: 7 },
    hp: 22,
    assetIds: {
      token:    'unit-light-valkyrie-token',
      portrait: 'unit-light-valkyrie-portrait',
      defeated: 'unit-light-valkyrie-defeated',
    },
  },
  // ── Dark faction (7 pieces, top of board) ─────────────────────────────────
  {
    pieceId: 'dark-sorceress',
    name: 'Sorceress',
    faction: 'dark',
    role: 'caster',
    startCoord: { row: 1, col: 4 },
    hp: 16,
    assetIds: {
      token:    'unit-dark-sorceress-token',
      portrait: 'unit-dark-sorceress-portrait',
      defeated: 'unit-dark-sorceress-defeated',
    },
  },
  {
    pieceId: 'dark-sentinel',
    name: 'Sentinel',
    faction: 'dark',
    role: 'sentinel',
    startCoord: { row: 0, col: 4 },
    hp: 18,
    assetIds: {
      token:    'unit-dark-sorceress-token',
      portrait: 'unit-dark-sorceress-portrait',
      defeated: 'unit-dark-sorceress-defeated',
    },
  },
  {
    pieceId: 'dark-banshee',
    name: 'Banshee',
    faction: 'dark',
    role: 'caster',
    startCoord: { row: 0, col: 2 },
    hp: 14,
    assetIds: {
      token:    'unit-dark-banshee-token',
      portrait: 'unit-dark-banshee-portrait',
      defeated: 'unit-dark-banshee-defeated',
    },
  },
  {
    pieceId: 'dark-dragon',
    name: 'Dragon',
    faction: 'dark',
    role: 'warrior',
    startCoord: { row: 0, col: 6 },
    hp: 26,
    assetIds: {
      token:    'unit-dark-dragon-token',
      portrait: 'unit-dark-dragon-portrait',
      defeated: 'unit-dark-dragon-defeated',
    },
  },
  {
    pieceId: 'dark-manticore',
    name: 'Manticore',
    faction: 'dark',
    role: 'warrior',
    startCoord: { row: 1, col: 2 },
    hp: 20,
    assetIds: {
      token:    'unit-dark-manticore-token',
      portrait: 'unit-dark-manticore-portrait',
      defeated: 'unit-dark-manticore-defeated',
    },
  },
  {
    pieceId: 'dark-troll',
    name: 'Troll',
    faction: 'dark',
    role: 'sentinel',
    startCoord: { row: 1, col: 6 },
    hp: 22,
    assetIds: {
      token:    'unit-dark-troll-token',
      portrait: 'unit-dark-troll-portrait',
      defeated: 'unit-dark-troll-defeated',
    },
  },
  {
    pieceId: 'dark-shapeshifter',
    name: 'Shapeshifter',
    faction: 'dark',
    role: 'herald',
    startCoord: { row: 0, col: 8 },
    hp: 12,
    assetIds: {
      token:    'unit-dark-shapeshifter-token',
      portrait: 'unit-dark-shapeshifter-portrait',
      defeated: 'unit-dark-shapeshifter-defeated',
    },
  },
];


// ─── Board Size ───────────────────────────────────────────────────────────────
export const BOARD_SIZE = 9;

// ─── Board-layer Piece Extension (0.7) ───────────────────────────────────────────────
/**
 * Local extension to BoardPiece — NOT in board-combat-contract.ts (frozen).
 * Board-layer only. Widens BoardPiece without modifying the contract.
 */
export interface BoardPieceExtension {
  /** 0.7: piece cannot move while imprisoned. Selectable but 0 legal moves. */
  imprisoned?: boolean;
  /** 0.8: turns remaining before imprisonment clears. Counts down on the owning faction's turn. */
  imprisonedTurnsRemaining?: number;
}

// ─── Board-layer Game-Over Extension (1.1) ───────────────────────────────────
/**
 * Local board-layer extension that rides alongside BoardState.
 * NOT part of the frozen contract — computed in applyCombatResult and carried
 * via a module-level map keyed on the state reference, OR injected as a
 * plain optional field on the state object.
 *
 * Strategy: we store it on a parallel object so we never widen BoardState
 * (which is frozen). BoardScene reads it from the same closure.
 */
export type GameOverReason =
  | 'all_enemies_eliminated'
  | 'faction_annihilated'
  | 'power_squares_controlled';

/**
 * Lightweight wrapper that pairs a BoardState with board-layer-only metadata.
 * BoardScene uses this instead of raw BoardState.
 */
export interface BoardStateWithMeta {
  boardState: import('../../lib/board-combat-contract').BoardState;
  gameOverReason?: GameOverReason;
  winnerFaction?: import('../../lib/board-combat-contract').Faction;
}

// ─── 1.7: Power Square Victory Condition ─────────────────────────────────────

/**
 * Returns the faction that controls a given power square (living piece on it),
 * or null if the square is unoccupied or the occupying piece is dead.
 */
export function getPowerSquareController(
  coord: BoardCoord,
  squares: import('../../lib/board-combat-contract').BoardState['squares'],
  pieces: import('../../lib/board-combat-contract').BoardState['pieces'],
): Faction | null {
  const sq = squares[coord.row]?.[coord.col];
  if (!sq || !sq.pieceId) return null;
  const piece = pieces[sq.pieceId];
  if (!piece || piece.isDead) return null;
  return piece.faction;
}

/**
 * Returns a map of { coord => controller } for all 5 power squares.
 * Controller is the faction with a living piece on the square, or null.
 */
export function getPowerSquareControlMap(
  squares: import('../../lib/board-combat-contract').BoardState['squares'],
  pieces: import('../../lib/board-combat-contract').BoardState['pieces'],
): Array<{ coord: BoardCoord; controller: Faction | null }> {
  return POWER_SQUARES.map(coord => ({
    coord,
    controller: getPowerSquareController(coord, squares, pieces),
  }));
}

/**
 * Returns the winning faction if it controls ALL 5 power squares with living pieces.
 * Returns null otherwise.
 *
 * 1.7: First power-square victory condition check.
 */
export function checkPowerSquareWin(
  squares: import('../../lib/board-combat-contract').BoardState['squares'],
  pieces: import('../../lib/board-combat-contract').BoardState['pieces'],
): Faction | null {
  const controllers = POWER_SQUARES.map(coord =>
    getPowerSquareController(coord, squares, pieces),
  );
  const first = controllers[0];
  if (!first) return null; // at least one uncontrolled
  const allSame = controllers.every(c => c === first);
  return allSame ? first : null;
}

/**
 * Compute winner faction and reason from a gameover-phase BoardState.
 * 1.7: Checks power-square control first, then faction annihilation.
 * Returns undefined if the game is not over.
 */
export function getGameOverMeta(
  pieces: import('../../lib/board-combat-contract').BoardState['pieces'],
  squares?: import('../../lib/board-combat-contract').BoardState['squares'],
): { winnerFaction: import('../../lib/board-combat-contract').Faction; reason: GameOverReason } | undefined {
  // 1.7: Power-square win (check first — takes priority over annihilation)
  if (squares) {
    const psWinner = checkPowerSquareWin(squares, pieces);
    if (psWinner) return { winnerFaction: psWinner, reason: 'power_squares_controlled' };
  }
  const lightAlive = Object.values(pieces).some(p => p.faction === 'light' && !p.isDead);
  const darkAlive  = Object.values(pieces).some(p => p.faction === 'dark'  && !p.isDead);
  if (!lightAlive) return { winnerFaction: 'dark',  reason: 'faction_annihilated' };
  if (!darkAlive)  return { winnerFaction: 'light', reason: 'faction_annihilated' };
  return undefined;
}

/** 0.8: Number of owning-faction turns before imprisonment auto-clears. */
export const IMPRISONMENT_TURNS = 2;

/** 0.10: HP restored per Heal Ally action, capped at target.maxHp. */
export const HEAL_AMOUNT = 3;

/** Convenience alias for board pieces that carry the local 0.7 extension. */
export type BoardPieceState = BoardPiece & BoardPieceExtension;

/**
 * Extended combat result payload — local to board layer only.
 * Carries imprisonment flags that the frozen CombatResultPayload cannot hold.
 * Safe: ExtendedCombatResultPayload extends CombatResultPayload (additive only).
 */
export interface ExtendedCombatResultPayload extends CombatResultPayload {
  survivingAttackerImprisoned?: boolean;
  survivingDefenderImprisoned?: boolean;
}

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

// ─── 1.4: Power Square System ────────────────────────────────────────────────

/**
 * The 5 canonical Archon power squares — 4 corners + center.
 * Any piece standing on one of these gets POWER_REGEN HP at the end of their faction's turn.
 * Board-layer only; never touches the frozen contract.
 */
export const POWER_SQUARES: ReadonlyArray<BoardCoord> = [
  { row: 0, col: 0 }, // dark corner — top-left
  { row: 0, col: 8 }, // dark corner — top-right
  { row: 4, col: 4 }, // contested center
  { row: 8, col: 0 }, // light corner — bottom-left
  { row: 8, col: 8 }, // light corner — bottom-right
] as const;

/** HP regenerated each turn for a piece standing on a power square (capped at maxHp). */
export const POWER_REGEN = 2;

/** Returns true if `coord` is one of the 5 power squares. */
export function isPowerSquare(coord: BoardCoord): boolean {
  return POWER_SQUARES.some(ps => ps.row === coord.row && ps.col === coord.col);
}

/**
 * Apply power-square regeneration to all living pieces of `faction` that are
 * currently occupying a power square. HP is increased by POWER_REGEN, capped at maxHp.
 * Call this at end-of-turn (after tickImprisonmentCounters).
 */
export function applyPowerSquareRegen(
  pieces: Record<string, BoardPieceState>,
  faction: Faction,
): Record<string, BoardPieceState> {
  let changed = false;
  const result: Record<string, BoardPieceState> = {};
  for (const [id, piece] of Object.entries(pieces)) {
    if (piece.faction === faction && !piece.isDead && isPowerSquare(piece.coord)) {
      const newHp = Math.min(piece.hp + POWER_REGEN, piece.maxHp);
      if (newHp !== piece.hp) {
        changed = true;
        result[id] = { ...piece, hp: newHp };
        continue;
      }
    }
    result[id] = piece;
  }
  return changed ? result : pieces;
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
 * makeSkirmishBoardState — 3.2 Tutorial Skirmish setup
 *
 * A reduced 3-vs-3 board designed for a fast, readable intro encounter.
 *
 * Roster:
 *   Light:  Knight (warrior), Archer (ranged), Unicorn (fast)
 *   Dark:   Sentinel (tank), Banshee (ranged/AoE), Troll (regen tank)
 *
 * Layout:
 *   Light pieces start at row 6, spread across cols 2/4/6.
 *   Dark  pieces start at row 2, spread across cols 2/4/6.
 *   ~4-row gap → pieces can engage within 2–3 turns.
 *   Center power square (4,4) is immediately contested.
 *
 * All pieces are drawn from ALPHA_ROSTER — no new assets required.
 *
 * Activate via CampaignMap → Tutorial Skirmish.
 */
export function makeSkirmishBoardState(): BoardState {
  const squares = makeEmptySquares();
  const pieces: Record<string, BoardPiece> = {};

  // ── Skirmish roster with custom start coordinates ──────────────────────────
  const skirmishRoster: Array<{ entry: RosterEntry; coord: BoardCoord }> = [
    // Light — row 6
    { entry: ALPHA_ROSTER.find(e => e.pieceId === 'light-knight')!,  coord: { row: 6, col: 2 } },
    { entry: ALPHA_ROSTER.find(e => e.pieceId === 'light-archer')!,  coord: { row: 6, col: 4 } },
    { entry: ALPHA_ROSTER.find(e => e.pieceId === 'light-unicorn')!, coord: { row: 6, col: 6 } },
    // Dark — row 2
    { entry: ALPHA_ROSTER.find(e => e.pieceId === 'dark-sentinel')!, coord: { row: 2, col: 2 } },
    { entry: ALPHA_ROSTER.find(e => e.pieceId === 'dark-banshee')!,  coord: { row: 2, col: 4 } },
    { entry: ALPHA_ROSTER.find(e => e.pieceId === 'dark-troll')!,    coord: { row: 2, col: 6 } },
  ];

  for (const { entry, coord } of skirmishRoster) {
    const piece: BoardPiece = {
      pieceId: entry.pieceId,
      name:    entry.name,
      faction: entry.faction,
      role:    entry.role,
      coord,
      hp:      entry.hp,
      maxHp:   entry.hp,
      isDead:  false,
      assetIds: entry.assetIds,
    };
    pieces[entry.pieceId] = piece;
    squares[coord.row][coord.col].pieceId = entry.pieceId;
  }

  return {
    phase:           'active',
    turnFaction:     'light',
    turnNumber:      1,
    squares,
    pieces,
    selectedPieceId: null,
    legalMoves:      [],
  };
}

/**
 * makeDragonsGateBoardState — 3.8 Dragon's Gate encounter
 *
 * A 4-vs-4 mid-game encounter where Dark fields its heaviest monsters.
 * Light responds with mobility and ranged pressure.
 *
 * Roster:
 *   Light:  Knight (warrior), Archer (ranged), Valkyrie (sentinel), Unicorn (fast)
 *   Dark:   Dragon (heavy warrior), Manticore (warrior), Troll (regen tank), Banshee (caster)
 *
 * Tactical identity:
 *   - Dark side has the highest total HP pool (Dragon 26, Troll 22, Manticore 20, Banshee 14 = 82)
 *   - Light must use speed and range — straight brawls will favour Dark
 *   - Power squares at (4,4) and (4,2)/(4,6) are mid-board — contested from turn 1
 *   - Dark anchors wide at row 1 (Dragon/Manticore spread); Banshee + Troll form a wall at row 2
 *   - Light spread at rows 6-7 gives room to pick a flank or push centre
 *
 * Layout:
 *   Light: Knight (7,2), Unicorn (7,6), Valkyrie (7,4), Archer (6,4)
 *   Dark:  Dragon (1,2), Manticore (1,6), Troll (2,4), Banshee (2,2)
 *
 * All pieces are drawn from ALPHA_ROSTER — no new assets required.
 *
 * Activate via CampaignMap → Dragon's Gate.
 */
export function makeDragonsGateBoardState(): BoardState {
  const squares = makeEmptySquares();
  const pieces: Record<string, BoardPiece> = {};

  const gateRoster: Array<{ entry: RosterEntry; coord: BoardCoord }> = [
    // ── Light faction — spread across rows 6–7 ─────────────────────────────
    { entry: ALPHA_ROSTER.find(e => e.pieceId === 'light-knight')!,   coord: { row: 7, col: 2 } },
    { entry: ALPHA_ROSTER.find(e => e.pieceId === 'light-valkyrie')!, coord: { row: 7, col: 4 } },
    { entry: ALPHA_ROSTER.find(e => e.pieceId === 'light-unicorn')!,  coord: { row: 7, col: 6 } },
    { entry: ALPHA_ROSTER.find(e => e.pieceId === 'light-archer')!,   coord: { row: 6, col: 4 } },
    // ── Dark faction — anchored at rows 1–2 ────────────────────────────────
    { entry: ALPHA_ROSTER.find(e => e.pieceId === 'dark-dragon')!,    coord: { row: 1, col: 2 } },
    { entry: ALPHA_ROSTER.find(e => e.pieceId === 'dark-troll')!,     coord: { row: 2, col: 4 } },
    { entry: ALPHA_ROSTER.find(e => e.pieceId === 'dark-manticore')!, coord: { row: 1, col: 6 } },
    { entry: ALPHA_ROSTER.find(e => e.pieceId === 'dark-banshee')!,   coord: { row: 2, col: 2 } },
  ];

  for (const { entry, coord } of gateRoster) {
    const piece: BoardPiece = {
      pieceId:  entry.pieceId,
      name:     entry.name,
      faction:  entry.faction,
      role:     entry.role,
      coord,
      hp:       entry.hp,
      maxHp:    entry.hp,
      isDead:   false,
      assetIds: entry.assetIds,
    };
    pieces[entry.pieceId] = piece;
    squares[coord.row][coord.col].pieceId = entry.pieceId;
  }

  return {
    phase:           'active',
    turnFaction:     'light',
    turnNumber:      1,
    squares,
    pieces,
    selectedPieceId: null,
    legalMoves:      [],
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

/**
 * makeDarkWinsSetup
 * Deterministic dark-wins proof setup for 0.4 KI-001 + KI-002.
 *
 * KI-001: Dark faction winning a combat (not yet proven in 0.3)
 * KI-002: Dark-wins gameover — "🌑 Dark Wins!" banner
 *
 * Setup:
 *   - Sorceress (dark)  at (4,5) — HP: 16 (full health)
 *   - Knight    (light) at (4,3) — HP: 1  (dies on first hit)
 *   - turnFaction = 'dark' → Sorceress attacks first
 *
 * Expected flow:
 *   1. Player clicks Sorceress → selects her, legal moves shown
 *   2. Player clicks Knight at (4,3) → contest detected → CombatBridge launches
 *   3. Combat: Sorceress attacks Knight (HP=1) → Knight dies round 1
 *   4. Outcome: attacker_wins → board receives CombatResultPayload
 *   5. applyCombatResult: Knight marked dead, Sorceress advances to (4,3)
 *   6. Win check: no light pieces alive → phase = 'gameover'
 *   7. BoardScene renders "🌑 Dark Wins!" gameover banner
 *
 * Activate via URL: ?setup=dark-wins
 */
export function makeDarkWinsSetup(): BoardState {
  const squares = makeEmptySquares();
  const pieces: Record<string, BoardPiece> = {};

  // Sorceress (dark) at (4,5), Knight (light) at (4,3) with HP=1 (dies on first hit)
  const darkSorceress = ALPHA_ROSTER[2]; // dark-sorceress
  const lightKnight   = ALPHA_ROSTER[0]; // light-knight

  const roster: Array<{ entry: (typeof ALPHA_ROSTER)[0]; coord: BoardCoord; hpOverride?: number }> = [
    { entry: darkSorceress, coord: { row: 4, col: 5 } },           // full HP=16
    { entry: lightKnight,   coord: { row: 4, col: 3 }, hpOverride: 1 }, // HP=1 → dies on first hit
  ];

  for (const { entry, coord, hpOverride } of roster) {
    const hp = hpOverride ?? entry.hp;
    const piece: BoardPiece = {
      pieceId: entry.pieceId,
      name: entry.name,
      faction: entry.faction,
      role: entry.role,
      coord,
      hp,
      maxHp: entry.hp, // maxHp always reflects roster value
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
    turnFaction: 'dark',   // dark moves first — Sorceress is the attacker
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

// ─── 1.3: Per-Piece Movement Profiles ───────────────────────────────────────

/**
 * Movement profile type for each piece.
 * chebyshev-N  : up to N steps in any of 8 directions (king-style, square)
 * orthogonal-slide : unlimited steps along 4 cardinal axes (rook-like)
 * diagonal-slide   : unlimited steps along 4 diagonal axes (bishop-like)
 * queen-slide      : unlimited steps along all 8 axes (queen-like)
 */
export type MoveProfileType =
  | 'chebyshev-1'
  | 'chebyshev-2'
  | 'chebyshev-3'
  | 'chebyshev-4'
  | 'orthogonal-slide'
  | 'diagonal-slide'
  | 'queen-slide';

/**
 * Canonical movement profile table — keyed on pieceId.
 * Falls back to 'chebyshev-2' for any unknown piece.
 *
 * Profile rationale:
 *   Golem / Troll   → chebyshev-1 : slow tanks
 *   Knight / Valkyrie / Sentinel → chebyshev-2 : standard ground
 *   Herald / Unicorn / Manticore → chebyshev-3 : fast ground
 *   Dragon           → chebyshev-4 : long-range flier
 *   Archer / Banshee → orthogonal-slide : ranged line-of-sight (4 axes)
 *   Sorceress        → diagonal-slide   : mystic diagonal
 *   Phoenix / Shapeshifter → queen-slide : any direction, unlimited
 */
export const PIECE_MOVE_PROFILES: Record<string, MoveProfileType> = {
  // ── Light ──────────────────────────────────────────────────────────────────
  'light-knight':   'chebyshev-2',
  'light-herald':   'chebyshev-3',
  'light-archer':   'orthogonal-slide',
  'light-golem':    'chebyshev-1',
  'light-phoenix':  'queen-slide',
  'light-unicorn':  'chebyshev-3',
  'light-valkyrie': 'chebyshev-2',
  // ── Dark ───────────────────────────────────────────────────────────────────
  'dark-sorceress':    'diagonal-slide',
  'dark-sentinel':     'chebyshev-2',
  'dark-banshee':      'orthogonal-slide',
  'dark-dragon':       'chebyshev-4',
  'dark-manticore':    'chebyshev-3',
  'dark-troll':        'chebyshev-1',
  'dark-shapeshifter': 'queen-slide',
};

/** Returns the display label shown in the sidebar for a piece's move style */
export function getMoveProfileLabel(pieceId: string): string {
  const p = PIECE_MOVE_PROFILES[pieceId] ?? 'chebyshev-2';
  const labels: Record<MoveProfileType, string> = {
    'chebyshev-1':      '1-step',
    'chebyshev-2':      '2-step',
    'chebyshev-3':      '3-step',
    'chebyshev-4':      '4-step',
    'orthogonal-slide': 'Line (↑↓←→)',
    'diagonal-slide':   'Line (✕)',
    'queen-slide':      'Any direction',
  };
  return labels[p];
}

// Slide direction tables (reused in generator)
const ORTHO_DIRS: ReadonlyArray<readonly [number, number]> = [[0,1],[0,-1],[1,0],[-1,0]];
const DIAG_DIRS:  ReadonlyArray<readonly [number, number]> = [[1,1],[1,-1],[-1,1],[-1,-1]];
const QUEEN_DIRS: ReadonlyArray<readonly [number, number]> = [
  [0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1],
];

/** Chebyshev (square) move generator — up to `range` steps in any direction */
function chebyshevMoves(
  state: BoardState,
  piece: BoardPieceState,
  range: number,
): BoardCoord[] {
  const { row, col } = piece.coord;
  const moves: BoardCoord[] = [];
  for (let dr = -range; dr <= range; dr++) {
    for (let dc = -range; dc <= range; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) continue;
      const tId = state.squares[r][c].pieceId;
      if (tId && state.pieces[tId].faction === piece.faction) continue;
      moves.push({ row: r, col: c });
    }
  }
  return moves;
}

/** Slide move generator — unlimited distance along given direction vectors */
function slideMoves(
  state: BoardState,
  piece: BoardPieceState,
  dirs: ReadonlyArray<readonly [number, number]>,
): BoardCoord[] {
  const { row, col } = piece.coord;
  const moves: BoardCoord[] = [];
  for (const [dr, dc] of dirs) {
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
      const tId = state.squares[r][c].pieceId;
      if (tId) {
        // Can attack enemy; blocked by any piece
        if (state.pieces[tId].faction !== piece.faction) moves.push({ row: r, col: c });
        break;
      }
      moves.push({ row: r, col: c });
      r += dr;
      c += dc;
    }
  }
  return moves;
}

/** 1.3: Dispatch movement generation by profile */
function computeLegalMoves(state: BoardState, piece: BoardPieceState): BoardCoord[] {
  // 0.7: imprisoned pieces have zero legal moves (still selectable, sidebar explains)
  if (piece.imprisoned) return [];

  const profile: MoveProfileType = PIECE_MOVE_PROFILES[piece.pieceId] ?? 'chebyshev-2';

  switch (profile) {
    case 'chebyshev-1':      return chebyshevMoves(state, piece, 1);
    case 'chebyshev-2':      return chebyshevMoves(state, piece, 2);
    case 'chebyshev-3':      return chebyshevMoves(state, piece, 3);
    case 'chebyshev-4':      return chebyshevMoves(state, piece, 4);
    case 'orthogonal-slide': return slideMoves(state, piece, ORTHO_DIRS);
    case 'diagonal-slide':   return slideMoves(state, piece, DIAG_DIRS);
    case 'queen-slide':      return slideMoves(state, piece, QUEEN_DIRS);
  }
}


// ─── Move Execution ───────────────────────────────────────────────────────────

export type MoveResult =
  | { type: 'move'; nextState: BoardState }
  | { type: 'contest'; attacker: BoardPiece; defender: BoardPiece; nextState: BoardState };

export function executeMove(state: BoardState, targetCoord: BoardCoord): MoveResult {
  if (!state.selectedPieceId) return { type: 'move', nextState: state };

  const attacker = state.pieces[state.selectedPieceId] as BoardPieceState;

  // 1.3: Execution-time guard — reject moves that are not in the computed legal set.
  // This prevents any UI or automation path from bypassing movement rules.
  const legal = computeLegalMoves(state, attacker);
  const isLegal = legal.some(m => m.row === targetCoord.row && m.col === targetCoord.col);
  if (!isLegal) return { type: 'move', nextState: state }; // silently reject illegal target

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

  const piecesAfterMove: Record<string, BoardPieceState> = {
    ...(state.pieces as Record<string, BoardPieceState>),
    [attacker.pieceId]: { ...(attacker as BoardPieceState), coord: targetCoord },
  };

  const nextFaction: Faction = state.turnFaction === 'light' ? 'dark' : 'light';
  const nextTurn = nextFaction === 'light' ? state.turnNumber + 1 : state.turnNumber;

  // 0.8: tick imprisonment counters for the faction that just moved
  const tickedPieces = tickImprisonmentCounters(piecesAfterMove, state.turnFaction);

  // 1.4: apply power-square HP regen for pieces of the faction that just moved
  const newPieces = applyPowerSquareRegen(tickedPieces, state.turnFaction);

  // 1.7: Power-square victory — check after every move
  const psWinner = checkPowerSquareWin(updatedLuminance, newPieces);
  const movePhase = psWinner ? 'gameover' : 'active';

  return {
    type: 'move',
    nextState: {
      ...state,
      phase: movePhase,
      squares: updatedLuminance,
      pieces: newPieces,
      selectedPieceId: null,
      legalMoves: [],
      turnFaction: nextFaction,
      turnNumber: nextTurn,
    },
  };
}

/**
 * 0.8: Decrement imprisonment counters for all imprisoned pieces belonging to
 * `justMovedFaction`. Clears imprisonment when the counter reaches zero.
 */
function tickImprisonmentCounters(
  pieces: Record<string, BoardPieceState>,
  justMovedFaction: Faction,
): Record<string, BoardPieceState> {
  let changed = false;
  const result: Record<string, BoardPieceState> = {};
  for (const [id, piece] of Object.entries(pieces)) {
    if (piece.imprisoned && piece.faction === justMovedFaction) {
      const current = piece.imprisonedTurnsRemaining ?? IMPRISONMENT_TURNS;
      const remaining = current - 1;
      changed = true;
      if (remaining <= 0) {
        // Imprisonment cleared
        result[id] = { ...piece, imprisoned: false, imprisonedTurnsRemaining: undefined };
      } else {
        result[id] = { ...piece, imprisonedTurnsRemaining: remaining };
      }
    } else {
      result[id] = piece;
    }
  }
  return changed ? result : pieces;
}

function recalcLuminance(
  squares: BoardSquare[][],
  pieces: Record<string, BoardPiece>,
  movedPieceId: string,
  newCoord: BoardCoord,
): BoardSquare[][] {
  /**
   * 1.5 FIX: Reset every square's luminance to its *initial* baseline before
   * reapplying faction influence. Without this reset, squares influenced by
   * dead pieces keep their old luminance indefinitely (stale state).
   *
   * We preserve pieceId values from the input squares (already updated by the
   * caller — e.g. attacker advanced, dead piece's square cleared).
   */
  const result: BoardSquare[][] = squares.map((row, r) =>
    row.map((sq, c) => ({
      ...sq,
      // Reset to initial luminance — wipes stale influence from dead/moved pieces
      luminance: getLuminanceForCoord({ row: r, col: c }),
    }))
  );

  for (const piece of Object.values(pieces)) {
    if (piece.isDead) continue;
    // Use newCoord for the piece that just moved; skip sentinel coord (row < 0)
    const coord = piece.pieceId === movedPieceId ? newCoord : piece.coord;
    if (coord.row < 0) continue;

    // Mark the piece's own square and 8 adjacent squares as faction-influenced
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


export function applyCombatResult(
  state: BoardState,
  result: CombatResultPayload,
): BoardState {
  // result may be an ExtendedCombatResultPayload (local superset) — read extension fields safely
  const ext = result as ExtendedCombatResultPayload;

  let newPieces = { ...state.pieces } as Record<string, BoardPieceState>;
  const newSquares = state.squares.map(row => row.map(sq => ({ ...sq })));
  const { row, col } = result.contestedSquare;

  // 0.8: tick imprisonment counters for the attacker faction BEFORE applying new flags.
  // This ensures combat turns count toward the countdown, and newly-imprisoned pieces
  // start at IMPRISONMENT_TURNS (not IMPRISONMENT_TURNS - 1).
  newPieces = tickImprisonmentCounters(newPieces, state.turnFaction);

  if (result.outcome === 'attacker_wins') {
    // Defender eliminated — move attacker to contested square
    if (result.survivingDefender === null && result.survivingAttacker !== null) {
      const att = result.survivingAttacker;
      const oldCoord = newPieces[att.pieceId]?.coord;
      if (oldCoord) newSquares[oldCoord.row][oldCoord.col].pieceId = null;
      newSquares[row][col].pieceId = att.pieceId;
      // Apply imprisoned flag only to surviving attacker if marked.
      // Clamp hp to maxHp: arena regen could in theory push hp above maxHp
      // if the result isn't already clamped; this is the authoritative cap.
      newPieces[att.pieceId] = {
        ...att,
        hp: Math.min(att.hp, att.maxHp),
        coord: { row, col },
        ...(ext.survivingAttackerImprisoned
          ? { imprisoned: true, imprisonedTurnsRemaining: IMPRISONMENT_TURNS }
          : {}),
      };
    }
    if (result.survivingDefender === null) {
      // Mark defender dead — no imprisoned applied (unit is gone)
      const deadDefId = Object.keys(newPieces).find(id => {
        const p = newPieces[id];
        return p.coord.row === row && p.coord.col === col && p.faction !== result.survivingAttacker?.faction;
      });
      if (deadDefId) newPieces[deadDefId] = { ...newPieces[deadDefId], isDead: true, hp: 0 };
    }
  } else if (result.outcome === 'defender_wins') {
    // Attacker repelled — mark attacker dead
    if (result.survivingAttacker === null) {
      const deadAttId = state.selectedPieceId ?? Object.keys(newPieces).find(id => {
        const p = newPieces[id];
        return p.faction === state.turnFaction && !p.isDead;
      });
      if (deadAttId) newPieces[deadAttId] = { ...newPieces[deadAttId], isDead: true, hp: 0 };
    }
    // Surviving defender: carry HP back from arena result, then apply imprisoned if marked.
    // The defender's hp in result.survivingDefender reflects post-arena HP (e.g. after Troll Regen).
    if (result.survivingDefender !== null) {
      const def = result.survivingDefender;
      const existing = newPieces[def.pieceId];
      newPieces[def.pieceId] = {
        ...existing,
        hp: Math.min(def.hp, existing?.maxHp ?? def.maxHp),
        ...(ext.survivingDefenderImprisoned
          ? { imprisoned: true, imprisonedTurnsRemaining: IMPRISONMENT_TURNS }
          : {}),
      };
    }
  }


  const nextFaction: Faction = state.turnFaction === 'light' ? 'dark' : 'light';
  const nextTurn = nextFaction === 'light' ? state.turnNumber + 1 : state.turnNumber;

  // Check win condition — must recalc squares first to get correct pieceId placement
  const finalSquares = recalcLuminance(newSquares, newPieces, '', { row: -1, col: -1 });

  // 1.7: Power-square victory — wins if one faction holds all 5 simultaneously
  const psWinner = checkPowerSquareWin(finalSquares, newPieces);
  const lightAlive = Object.values(newPieces).some(p => p.faction === 'light' && !p.isDead);
  const darkAlive  = Object.values(newPieces).some(p => p.faction === 'dark'  && !p.isDead);
  const phase = (psWinner || !lightAlive || !darkAlive) ? 'gameover' : 'active';

  return {
    ...state,
    phase,
    squares: finalSquares,
    pieces: newPieces,
    selectedPieceId: null,
    legalMoves: [],
    turnFaction: nextFaction,
    turnNumber: nextTurn,
  };
}

// ─── 0.9: Heal Mechanic ────────────────────────────────────────────────────────

/**
 * Returns the pieceIds of all imprisoned allies adjacent (1 square, 8-directional)
 * to `casterPieceId` that belong to the same faction.
 * Returns [] if the caster is not found or has no adjacent imprisoned allies.
 */
/**
 * 0.9: Returns the pieceIds of imprisoned allies adjacent (1 square, 8-directional)
 * to `casterPieceId` that belong to the same faction.
 * Kept for internal use — prefer getAdjacentHealTargets() in 0.10+ callers.
 */
export function getAdjacentImprisonedAllies(
  state: BoardState,
  casterPieceId: string,
): string[] {
  const caster = state.pieces[casterPieceId] as BoardPieceState | undefined;
  if (!caster) return [];

  const { row, col } = caster.coord;
  const adjacent: string[] = [];

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) continue;
      const neighborId = state.squares[r][c].pieceId;
      if (!neighborId) continue;
      const neighbor = state.pieces[neighborId] as BoardPieceState;
      if (neighbor.faction === caster.faction && neighbor.imprisoned && !neighbor.isDead) {
        adjacent.push(neighborId);
      }
    }
  }
  return adjacent;
}

/**
 * 0.10: Returns pieceIds of adjacent allies that are valid Heal targets:
 * imprisoned OR below maxHp (or both). Same faction, not dead, within 1 square.
 * Superset of getAdjacentImprisonedAllies.
 */
export function getAdjacentHealTargets(
  state: BoardState,
  casterPieceId: string,
): string[] {
  const caster = state.pieces[casterPieceId] as BoardPieceState | undefined;
  if (!caster) return [];

  const { row, col } = caster.coord;
  const targets: string[] = [];

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) continue;
      const neighborId = state.squares[r][c].pieceId;
      if (!neighborId) continue;
      const neighbor = state.pieces[neighborId] as BoardPieceState;
      const needsHeal = neighbor.imprisoned || neighbor.hp < neighbor.maxHp;
      if (neighbor.faction === caster.faction && needsHeal && !neighbor.isDead) {
        targets.push(neighborId);
      }
    }
  }
  return targets;
}

/**
 * 0.9: Board-level Heal action.
 * Clears the `imprisoned` and `imprisonedTurnsRemaining` flags from `targetPieceId`.
 * Advances the turn to the opposing faction (same as a normal move).
 * Does NOT restore HP. Does NOT require combat.
 *
 * Turn-counter consistency (0.8 rule): healAlly counts as a real board turn.
 * tickImprisonmentCounters fires for the acting faction BEFORE the cure is applied,
 * so all OTHER imprisoned allies of the acting faction progress by 1 turn.
 * The tick on the chosen target (if it would run) is immediately overwritten by
 * the unconditional cure — the healed piece is always freed regardless of counter.
 *
 * Preconditions (caller must verify):
 *   - state.phase === 'active'
 *   - caster belongs to state.turnFaction
 *   - target is an imprisoned ally adjacent to caster
 */
export function healAlly(
  state: BoardState,
  _casterPieceId: string,
  targetPieceId: string,
): BoardState {
  // Step 1: Tick all faction imprisonment counters (consistent with 0.8 turn rule).
  // This advances OTHER imprisoned allies' countdowns by 1, same as any other turn.
  const tickedPieces = tickImprisonmentCounters(
    state.pieces as Record<string, BoardPieceState>,
    state.turnFaction,
  );

  // Step 2: Unconditionally clear the chosen target — overrides the tick result.
  // 0.10: also restore HP by HEAL_AMOUNT, capped at maxHp.
  const tickedTarget = tickedPieces[targetPieceId] as BoardPieceState;
  const newPieces: Record<string, BoardPieceState> = {
    ...tickedPieces,
    [targetPieceId]: {
      ...tickedTarget,
      imprisoned: false,
      imprisonedTurnsRemaining: undefined,
      hp: Math.min(tickedTarget.hp + HEAL_AMOUNT, tickedTarget.maxHp),
    },
  };

  const nextFaction: Faction = state.turnFaction === 'light' ? 'dark' : 'light';
  const nextTurn = nextFaction === 'light' ? state.turnNumber + 1 : state.turnNumber;

  return {
    ...state,
    phase: 'active',
    pieces: newPieces,
    selectedPieceId: null,
    legalMoves: [],
    turnFaction: nextFaction,
    turnNumber: nextTurn,
  };
}
