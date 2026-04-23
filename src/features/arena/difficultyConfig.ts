/**
 * difficultyConfig.ts — Archon 2.2 Difficulty System
 *
 * Defines the Difficulty type, AIProfile interface, and the profiles for
 * Easy and Normal modes. Hard is explicitly deferred.
 *
 * Persistence: sessionStorage — survives page refreshes within a session,
 * resets when the browser tab is closed.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type Difficulty = 'easy' | 'normal';

/**
 * AIProfile — tuning knobs passed to tickAI each frame.
 * Normal preserves exact 2.1 behaviour. Easy relaxes every parameter.
 */
export interface AIProfile {
  /** Multiplier applied to the entity's moveSpeed (1.0 = unchanged) */
  speedMult: number;

  /** Multiplier applied to attackRange when deciding to engage (1.0 = unchanged) */
  rangeMult: number;

  /** HP fraction below which AI retreats (higher = retreats more often) */
  retreatHpRatio: number;

  /** Duration (ms) the AI spends in RETREAT state */
  retreatDurationMs: number;

  /**
   * Probability per attack opportunity that Easy AI skips the attack.
   * 0 = always attacks (Normal). 0.45 = skips ~45% of opportunities (Easy).
   */
  attackSkipChance: number;

  /** Whether the AI uses Y-axis wandering during approach (false = predictable) */
  useYWander: boolean;

  /** Whether the AI will jump occasionally to follow the player */
  useJump: boolean;

  /**
   * Multiplier applied to the reaction delay (base is half the cooldown).
   * 1.0 = Normal speed. 2.8 = much slower reaction (Easy).
   */
  reactionDelayMult: number;

  /** Label shown in the arena HUD badge */
  label: string;

  /** CSS class suffix for the HUD badge colour (.arena-difficulty--easy / --normal) */
  badgeClass: 'easy' | 'normal';
}

// ─── Profiles ─────────────────────────────────────────────────────────────────

export const AI_PROFILES: Record<Difficulty, AIProfile> = {
  normal: {
    speedMult:         1.00,
    rangeMult:         1.00,
    retreatHpRatio:    0.28,
    retreatDurationMs: 1_800,
    attackSkipChance:  0,
    useYWander:        true,
    useJump:           true,
    reactionDelayMult: 1.0,
    label:             'Normal',
    badgeClass:        'normal',
  },
  easy: {
    speedMult:         0.62,
    rangeMult:         0.70,
    retreatHpRatio:    0.52,
    retreatDurationMs: 2_600,
    attackSkipChance:  0.45,
    useYWander:        false,
    useJump:           false,
    reactionDelayMult: 2.8,
    label:             'Easy',
    badgeClass:        'easy',
  },
};

// ─── Persistence (sessionStorage) ─────────────────────────────────────────────

const STORAGE_KEY = 'archon:difficulty';

/** Save the chosen difficulty for this browser session. */
export function persistDifficulty(d: Difficulty): void {
  try { sessionStorage.setItem(STORAGE_KEY, d); } catch { /* private/incognito */ }
}

/** Read the stored difficulty, defaulting to 'normal'. */
export function getDifficulty(): Difficulty {
  try {
    const v = sessionStorage.getItem(STORAGE_KEY);
    if (v === 'easy' || v === 'normal') return v;
  } catch { /* ignore */ }
  return 'normal';
}

/** Return the AIProfile for the currently stored difficulty. */
export function getActiveProfile(): AIProfile {
  return AI_PROFILES[getDifficulty()];
}
