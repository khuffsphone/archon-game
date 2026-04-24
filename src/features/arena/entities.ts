/**
 * entities.ts — Archon 2.0 Arena Entities
 *
 * Defines the ArenaEntity runtime type and the board→arena stat translator.
 * Each ArenaEntity corresponds to one BoardPiece brought into the live fight.
 */
import type { BoardPiece } from '../../lib/board-combat-contract';
import {
  BASE_MOVE_SPEED, BASE_DAMAGE, BASE_ATTACK_RANGE, BASE_COOLDOWN_MS,
  ENTITY_W, ENTITY_H, ROLE_STATS, ARENA_BOUNDS, CANVAS_W,
} from './arenaConfig';

// ─── Ability constants ────────────────────────────────────────────────────────

/** Troll passive regen rate in HP per second */
export const TROLL_REGEN_HP_PER_SEC = 1.0;

/** Banshee Wail: range in px, damage per wail, cooldown in ms */
export const BANSHEE_WAIL_RADIUS      = 220;
export const BANSHEE_WAIL_DAMAGE      = 1.5;
export const BANSHEE_WAIL_COOLDOWN_MS = 4_500;
/** Effect duration for the wail expanding ring */
export const BANSHEE_WAIL_FX_MS       = 800;

// ─── Types ────────────────────────────────────────────────────────────────────

export type ArenaSide = 'player' | 'enemy';

export type AttackState = 'idle' | 'windup' | 'active' | 'recovery';

export interface HitEffect {
  x: number;
  y: number;
  faction: 'light' | 'dark';
  timeRemaining: number; // ms
  type: 'hit' | 'death' | 'rebirth' | 'regen' | 'wail';
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  faction: 'light' | 'dark';
  damage: number;
  ownerSide: ArenaSide;
  timeRemaining: number; // ms before despawn
  width: number;
  height: number;
}

export interface ArenaEntity {
  // Identity
  side: ArenaSide;
  pieceId: string;
  name: string;
  faction: 'light' | 'dark';
  role: string;

  // Position & movement
  x: number;         // center-x
  y: number;         // bottom-y (feet on floor)
  vx: number;
  vy: number;
  width: number;
  height: number;
  facing: 'left' | 'right';
  onFloor: boolean;   // true when standing on the ground

  // Combat stats
  hp: number;
  maxHp: number;
  moveSpeed: number;       // px/s — derived from role
  attackDamage: number;
  attackRange: number;     // px horizontal reach from center
  attackCooldown: number;  // ms between attacks
  attackTimer: number;     // ms remaining until next attack allowed
  attackState: AttackState;
  attackStateTimer: number; // ms in current attack phase
  isRanged: boolean;       // true for caster role — fires projectiles

  // Timing
  invulnTimer: number;     // ms of hit invulnerability

  // Ability: Phoenix Rebirth
  rebirthAvailable: boolean;  // true for Phoenix, false for all others

  // Ability: Troll Regen
  regenRate: number;        // HP/s to regenerate (0 for non-Troll)
  regenAccumulator: number; // fractional HP accumulation between ticks

  // Ability: Banshee Wail
  wailCooldownMs: number;  // max cooldown in ms (0 = not a Banshee)
  wailTimer: number;       // ms remaining until next wail (0 = ready)
  wailRadius: number;      // distance threshold for wail to hit (px)
  wailDamage: number;      // damage per wail trigger

  // Visual
  sprite: HTMLImageElement | null;
  spriteLoaded: boolean;
}

// ─── HUD Snapshot (read by React each frame) ─────────────────────────────────

export interface HudSnapshot {
  playerHp: number;
  playerMaxHp: number;
  playerName: string;
  enemyHp: number;
  enemyMaxHp: number;
  enemyName: string;
  timeRemainingMs: number;
  phase: 'countdown' | 'fighting' | 'result';
  countdownSec: number;
  /** Human-readable countdown label: '3' | '2' | '1' | 'FIGHT!' | '' */
  countdownLabel: string;
  winner: 'player' | 'enemy' | 'timeout' | null;
  difficulty: import('./difficultyConfig').Difficulty;
  /** Rebirth badge for the player's piece. 'none' = unit cannot rebirth. */
  playerRebirthStatus: 'ready' | 'used' | 'none';
  enemyRebirthStatus:  'ready' | 'used' | 'none';
  /** True when the unit is a Troll with regen active and hp > 0 */
  playerRegenActive: boolean;
  enemyRegenActive:  boolean;
  /** Wail status for Banshee. 'none' = not a Banshee. */
  playerWailStatus: 'ready' | 'cooldown' | 'none';
  enemyWailStatus:  'ready' | 'cooldown' | 'none';
}

// ─── Stat Mapper ─────────────────────────────────────────────────────────────

/**
 * Translates a BoardPiece into an ArenaEntity with derived combat stats.
 * HP is carried over directly from the board — pieces enter battle wounded
 * if they have taken damage previously (future feature; currently always full).
 */
export function boardPieceToEntity(
  piece: BoardPiece,
  side: ArenaSide,
  spriteUrl: string,
): ArenaEntity {
  const role = piece.role as keyof typeof ROLE_STATS;
  const mults = ROLE_STATS[role] ?? ROLE_STATS.warrior;

  const moveSpeed     = BASE_MOVE_SPEED   * mults.speedMult;
  const attackDamage  = BASE_DAMAGE       * mults.damageMult;
  const attackRange   = BASE_ATTACK_RANGE * mults.rangeMult;
  const attackCooldown = BASE_COOLDOWN_MS * mults.cooldownMult;

  // Starting X: player spawns left, enemy spawns right
  const startX = side === 'player'
    ? ARENA_BOUNDS.left + 160
    : CANVAS_W - ARENA_BOUNDS.left - 160;
  const startY = ARENA_BOUNDS.floor;

  // Preload sprite
  const sprite = new Image();
  let spriteLoaded = false;
  sprite.onload = () => { spriteLoaded = true; };
  sprite.src = spriteUrl;

  return {
    side,
    pieceId: piece.pieceId,
    name: piece.name,
    faction: piece.faction,
    role: piece.role,

    x: startX,
    y: startY,
    vx: 0,
    vy: 0,
    width: ENTITY_W,
    height: ENTITY_H,
    facing: side === 'player' ? 'right' : 'left',
    onFloor: true,

    hp: piece.hp,
    maxHp: piece.maxHp,
    moveSpeed,
    attackDamage: Math.round(attackDamage * 10) / 10,
    attackRange,
    attackCooldown: Math.round(attackCooldown),
    attackTimer: 0,
    attackState: 'idle',
    attackStateTimer: 0,
    isRanged: piece.role === 'caster',
    invulnTimer: 0,

    // Phoenix Rebirth — only the phoenix gets this
    rebirthAvailable: piece.role === 'herald' && piece.pieceId.toLowerCase().includes('phoenix'),

    // Troll Regen — only the troll gets this
    regenRate:        piece.pieceId.toLowerCase().includes('troll') ? TROLL_REGEN_HP_PER_SEC : 0,
    regenAccumulator: 0,

    // Banshee Wail — only the banshee gets this
    wailCooldownMs: piece.pieceId.toLowerCase().includes('banshee') ? BANSHEE_WAIL_COOLDOWN_MS : 0,
    wailTimer:      0, // starts ready
    wailRadius:     piece.pieceId.toLowerCase().includes('banshee') ? BANSHEE_WAIL_RADIUS : 0,
    wailDamage:     piece.pieceId.toLowerCase().includes('banshee') ? BANSHEE_WAIL_DAMAGE : 0,

    sprite,
    spriteLoaded,
  };
}
