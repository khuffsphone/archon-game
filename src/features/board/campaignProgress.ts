/**
 * campaignProgress.ts — Archon 3.5 Campaign Progression v1
 *
 * Lightweight localStorage persistence for campaign encounter completion.
 *
 * Design decisions:
 *  - Separate key from board save (archon:progress:v1).
 *  - Shape: { progressVersion: 1, completedIds: string[] }
 *  - Completed = Light wins a board game with that encounter active.
 *  - No unlock gates — all encounters remain replayable.
 *  - Corrupt / stale data is silently discarded and replaced with empty state.
 *  - clearProgress() wipes only the progression key, not the board save.
 */

import type { EncounterType } from './campaignConfig';

// ─── Constants ────────────────────────────────────────────────────────────────

export const PROGRESS_KEY     = 'archon:progress:v1';
export const PROGRESS_VERSION = 1;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CampaignProgressPayload {
  progressVersion: number;
  completedIds:    EncounterType[];
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const EMPTY_PROGRESS: CampaignProgressPayload = {
  progressVersion: PROGRESS_VERSION,
  completedIds:    [],
};

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Load campaign progress from localStorage.
 * Returns an empty (all-incomplete) payload if missing, invalid, or corrupt.
 * Never throws.
 */
export function loadProgress(): CampaignProgressPayload {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return { ...EMPTY_PROGRESS };
    const parsed = JSON.parse(raw) as unknown;
    return validateProgress(parsed) ?? { ...EMPTY_PROGRESS };
  } catch {
    return { ...EMPTY_PROGRESS };
  }
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Persist the current progress payload to localStorage.
 * No-ops if localStorage is unavailable.
 */
export function saveProgress(payload: CampaignProgressPayload): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(payload));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

// ─── Mutators ─────────────────────────────────────────────────────────────────

/**
 * Mark an encounter as completed. Deduplicates — calling multiple times is safe.
 * Returns the updated payload (does NOT auto-save — caller decides).
 */
export function markEncounterComplete(
  current: CampaignProgressPayload,
  id: EncounterType,
): CampaignProgressPayload {
  if (current.completedIds.includes(id)) return current; // already done, no mutation
  return {
    ...current,
    completedIds: [...current.completedIds, id],
  };
}

/**
 * Returns true if the given encounter id is in the completed list.
 */
export function isEncounterComplete(
  progress: CampaignProgressPayload,
  id: EncounterType,
): boolean {
  return progress.completedIds.includes(id);
}

// ─── Clear ────────────────────────────────────────────────────────────────────

/**
 * Wipe campaign progression data.
 * Does NOT affect the board save (archon:save:v1).
 */
export function clearProgress(): void {
  try {
    localStorage.removeItem(PROGRESS_KEY);
  } catch { /* unavailable */ }
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Structural validation for a raw localStorage payload.
 * Returns the payload if valid, null otherwise.
 * Unknown extra fields are ignored (forward-compatible).
 */
export function validateProgress(raw: unknown): CampaignProgressPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;

  if (p.progressVersion !== PROGRESS_VERSION) return null;
  if (!Array.isArray(p.completedIds)) return null;
  // All entries must be strings (we don't gate on valid EncounterType values — future-proof)
  if (!p.completedIds.every((id: unknown) => typeof id === 'string')) return null;

  return {
    progressVersion: PROGRESS_VERSION,
    completedIds:    p.completedIds as EncounterType[],
  };
}
