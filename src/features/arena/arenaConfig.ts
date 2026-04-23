/**
 * arenaConfig.ts — Archon 2.0 Arena Constants
 * All tunable gameplay values live here.
 */

/** Total combat duration before timeout (ms) */
export const ARENA_DURATION_MS = 30_000;

/** Countdown before fight begins (ms) */
export const ARENA_COUNTDOWN_MS = 3_000;

/** Arena world bounds in canvas pixels (1920×991 logical resolution) */
export const ARENA_BOUNDS = {
  left:    80,
  right:   1840,
  floor:   760,    // y of the ground (pieces stand on this)
  ceiling: 180,
} as const;

/** Canvas logical size (always rendered at this, CSS scales it) */
export const CANVAS_W = 1920;
export const CANVAS_H = 991;

// ─── Physics ──────────────────────────────────────────────────────────────────

/** Gravity acceleration (px/s²) — pulls entities back to floor */
export const GRAVITY = 2200;

/** Jump vertical impulse (px/s upward) */
export const JUMP_IMPULSE = -820;


/** Pixels per second */
export const BASE_MOVE_SPEED   = 320;

/** HP damage per successful hit */
export const BASE_DAMAGE       = 2;

/** Horizontal reach of melee hitbox (px) */
export const BASE_ATTACK_RANGE = 110;

/** Minimum ms between attacks */
export const BASE_COOLDOWN_MS  = 900;

/** Entity sprite display size in the arena (px) */
export const ENTITY_W = 120;
export const ENTITY_H = 120;

// ─── Projectile ───────────────────────────────────────────────────────────────

/** Caster projectile travel speed (px/s) */
export const PROJECTILE_SPEED = 900;

/** Projectile lifetime in ms before despawn */
export const PROJECTILE_LIFETIME_MS = 1_400;

/** Projectile hitbox size */
export const PROJECTILE_W = 28;
export const PROJECTILE_H = 20;

// ─── Role Multipliers ─────────────────────────────────────────────────────────

export const ROLE_STATS = {
  warrior:  { speedMult: 1.00, damageMult: 1.25, rangeMult: 0.90, cooldownMult: 0.85 },
  caster:   { speedMult: 0.80, damageMult: 1.55, rangeMult: 1.70, cooldownMult: 1.30 },
  sentinel: { speedMult: 0.90, damageMult: 1.10, rangeMult: 1.00, cooldownMult: 1.00 },
  herald:   { speedMult: 1.30, damageMult: 0.90, rangeMult: 1.10, cooldownMult: 0.80 },
} as const;

// ─── AI Tuning ────────────────────────────────────────────────────────────────

/** AI retreats when HP drops below this fraction */
export const AI_RETREAT_HP_RATIO = 0.28;

/** How long AI stays in RETREAT before re-engaging (ms) */
export const AI_RETREAT_DURATION_MS = 1_800;

/** Variance in AI reaction delay (fraction of cooldown, e.g. 0.15 = ±15%) */
export const AI_REACTION_VARIANCE = 0.15;

/** AI Y-axis wandering amplitude (px) — prevents pure horizontal deadlock */
export const AI_Y_WANDER_AMP = 60;
export const AI_Y_WANDER_FREQ = 0.0008; // cycles per ms
