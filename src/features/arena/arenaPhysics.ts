/**
 * arenaPhysics.ts — Archon 2.0 Physics Helpers
 *
 * AABB movement + gravity + collision for the arena mini-game.
 */
import type { ArenaEntity, Projectile } from './entities';
import { ARENA_BOUNDS, GRAVITY } from './arenaConfig';

// ─── Movement + Gravity ───────────────────────────────────────────────────────

/**
 * Apply velocity + gravity to entity position, clamp to arena bounds.
 * `dt` is milliseconds since the last frame.
 */
export function moveEntity(e: ArenaEntity, dt: number): void {
  const dtSec = dt / 1000;
  const bounds = ARENA_BOUNDS;

  // Apply gravity — accumulates each frame
  e.vy += GRAVITY * dtSec;

  e.x += e.vx * dtSec;
  e.y += e.vy * dtSec;

  // Floor clamp — entity.y = bottom of sprite (feet on floor)
  if (e.y >= bounds.floor) {
    e.y = bounds.floor;
    e.vy = 0;
    e.onFloor = true;
  } else {
    e.onFloor = false;
  }

  // Ceiling clamp
  if (e.y - e.height < bounds.ceiling) {
    e.y = bounds.ceiling + e.height;
    e.vy = Math.max(0, e.vy);
  }

  // Horizontal wall clamp
  const halfW = e.width / 2;
  if (e.x - halfW < bounds.left)  e.x = bounds.left  + halfW;
  if (e.x + halfW > bounds.right) e.x = bounds.right - halfW;
}

// ─── Projectile movement ──────────────────────────────────────────────────────

/** Move a projectile by its velocity. Returns false if it has left the arena. */
export function moveProjectile(p: Projectile, dt: number): boolean {
  const dtSec = dt / 1000;
  p.x += p.vx * dtSec;
  p.y += p.vy * dtSec;
  p.timeRemaining -= dt;
  // Out of bounds?
  return (
    p.timeRemaining > 0 &&
    p.x > ARENA_BOUNDS.left - 100 &&
    p.x < ARENA_BOUNDS.right + 100
  );
}

// ─── Melee Hit Detection ──────────────────────────────────────────────────────

export function checkMeleeHit(attacker: ArenaEntity, target: ArenaEntity): boolean {
  const attackerLeft = attacker.facing === 'right'
    ? attacker.x
    : attacker.x - attacker.attackRange;
  const attackerRight = attacker.facing === 'right'
    ? attacker.x + attacker.attackRange
    : attacker.x;

  const attackerTop    = attacker.y - attacker.height - 80;
  const attackerBottom = attacker.y + 80;

  const targetLeft   = target.x - target.width / 2;
  const targetRight  = target.x + target.width / 2;
  const targetTop    = target.y - target.height;
  const targetBottom = target.y;

  return attackerLeft < targetRight && attackerRight > targetLeft &&
         attackerTop  < targetBottom && attackerBottom > targetTop;
}

// ─── Projectile Hit Detection ─────────────────────────────────────────────────

export function checkProjectileHit(proj: Projectile, target: ArenaEntity): boolean {
  const pLeft   = proj.x - proj.width / 2;
  const pRight  = proj.x + proj.width / 2;
  const pTop    = proj.y - proj.height / 2;
  const pBottom = proj.y + proj.height / 2;

  const tLeft   = target.x - target.width / 2;
  const tRight  = target.x + target.width / 2;
  const tTop    = target.y - target.height;
  const tBottom = target.y;

  return pLeft < tRight && pRight > tLeft &&
         pTop  < tBottom && pBottom > tTop;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function distanceBetween(a: ArenaEntity, b: ArenaEntity): number {
  return Math.abs(a.x - b.x);
}

export function directionTo(from: ArenaEntity, to: ArenaEntity): 'left' | 'right' {
  return to.x > from.x ? 'right' : 'left';
}
