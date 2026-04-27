/**
 * boardSave.ts — Archon 2.7 Save / Resume v1
 *
 * Lightweight localStorage persistence for the Archon board state.
 *
 * Design decisions:
 *  - Single save slot — keyed by SAVE_KEY.
 *  - Versioned payload (saveVersion: 1) so future schema changes can migrate or reject.
 *  - Minimal shape validation before restore — rejects obviously corrupt data.
 *  - If reload happens during arena combat (phase === 'combat'), phase is safe-reset
 *    to 'active' so the board returns to its last clean state.
 *  - Does not persist selectedPieceId or legalMoves (ephemeral UI state).
 *  - boardLog is persisted up to MAX_SAVED_LOG lines for context continuity.
 */
import type { BoardState } from '../../lib/board-combat-contract';

// ─── Constants ────────────────────────────────────────────────────────────────

export const SAVE_KEY     = 'archon:save:v1';
export const SAVE_VERSION = 1;
export const MAX_SAVED_LOG = 20;

// ─── Save payload shape ───────────────────────────────────────────────────────

export interface ArchonSavePayload {
  saveVersion:  number;
  savedAt:      number;   // Date.now()
  boardState:   BoardState;
  boardLog:     string[];
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Persist the current board state and log to localStorage.
 * Safe-resets phase: 'combat' → 'active' so a reload during arena combat
 * returns to the last clean board state rather than a frozen combat screen.
 * No-ops if localStorage is unavailable (private browsing etc.).
 */
export function saveGame(state: BoardState, log: string[]): void {
  try {
    // Normalize combat phase — prevent reload into frozen combat state
    const safeState: BoardState = state.phase === 'combat'
      ? { ...state, phase: 'active', selectedPieceId: null, legalMoves: [] }
      : { ...state, selectedPieceId: null, legalMoves: [] }; // strip ephemeral UI

    const payload: ArchonSavePayload = {
      saveVersion: SAVE_VERSION,
      savedAt:     Date.now(),
      boardState:  safeState,
      boardLog:    log.slice(-MAX_SAVED_LOG),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Load and validate the saved game.
 * Returns null if no save exists, or the save is invalid / corrupt.
 */
export function loadGame(): ArchonSavePayload | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    return validateSave(data);
  } catch {
    return null; // JSON parse error or localStorage unavailable
  }
}

/**
 * Returns true if a valid save slot exists.
 * Cheap: calls loadGame but discards the payload.
 */
export function hasSavedGame(): boolean {
  return loadGame() !== null;
}

// ─── Clear ────────────────────────────────────────────────────────────────────

/** Delete the save slot. */
export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch { /* unavailable */ }
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Minimal structural validation before accepting a save.
 * Returns the payload if valid, null otherwise.
 * We check only the fields we actually use — unknown extra fields are ignored.
 */
export function validateSave(raw: unknown): ArchonSavePayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;

  // Version check
  if (p.saveVersion !== SAVE_VERSION) return null;

  // savedAt must be a number
  if (typeof p.savedAt !== 'number') return null;

  // boardState must be an object with required fields
  const bs = p.boardState;
  if (!bs || typeof bs !== 'object') return null;
  const b = bs as Record<string, unknown>;

  if (typeof b.phase !== 'string')              return null;
  if (typeof b.turnFaction !== 'string')        return null;
  if (typeof b.turnNumber !== 'number')         return null;
  if (!Array.isArray(b.squares))               return null;
  if (typeof b.pieces !== 'object' || b.pieces === null) return null;

  // squares must be a 2D array with at least 1 row
  if ((b.squares as unknown[]).length === 0)   return null;

  // boardLog must be an array of strings
  if (!Array.isArray(p.boardLog)) return null;

  return p as unknown as ArchonSavePayload;
}
