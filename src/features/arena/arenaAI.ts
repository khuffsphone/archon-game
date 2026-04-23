/**
 * arenaAI.ts — Archon 2.0 Enemy AI
 *
 * 3-state FSM for the AI-controlled enemy piece.
 * Called once per frame from the game loop with deltaTime (ms).
 *
 * States:
 *   APPROACH  — move toward player; switch to ATTACK when in range
 *   ATTACK    — trigger attack; switch back to APPROACH after cooldown
 *               switch to RETREAT if HP drops below threshold
 *   RETREAT   — back away; after RETREAT_DURATION switch to APPROACH
 *
 * Ranged units (casters) maintain safe distance and never close to melee.
 */
import type { ArenaEntity } from './entities';
import { distanceBetween, directionTo } from './arenaPhysics';
import {
  AI_RETREAT_HP_RATIO,
  AI_RETREAT_DURATION_MS,
  AI_REACTION_VARIANCE,
  AI_Y_WANDER_AMP,
  AI_Y_WANDER_FREQ,
  ARENA_BOUNDS,
  JUMP_IMPULSE,
} from './arenaConfig';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AIState = 'approach' | 'attack' | 'retreat';

export interface AIController {
  state: AIState;
  retreatTimer: number;    // ms remaining in RETREAT
  reactionDelay: number;   // ms of reaction lag (randomised per session)
  reactionTimer: number;   // countdown before this AI action fires
  wanderPhase: number;     // elapsed ms, feeds sin() for Y-axis wandering
  jumpCooldown: number;    // ms until AI can jump again
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createAIController(entity: ArenaEntity): AIController {
  const variance = entity.attackCooldown * AI_REACTION_VARIANCE;
  const reactionDelay = entity.attackCooldown / 2 + (Math.random() * 2 - 1) * variance;
  return {
    state: 'approach',
    retreatTimer: 0,
    reactionDelay,
    reactionTimer: 0,
    wanderPhase: 0,
    jumpCooldown: 0,
  };
}

// ─── Tick ─────────────────────────────────────────────────────────────────────

/**
 * Update AI controller + enemy entity for one frame.
 * Mutates `enemy` velocity/facing in place.
 * Returns true if the AI wants to attack this frame.
 */
export function tickAI(
  ai: AIController,
  enemy: ArenaEntity,
  player: ArenaEntity,
  dt: number,
): boolean {
  ai.wanderPhase += dt;
  if (ai.jumpCooldown > 0) ai.jumpCooldown -= dt;

  const hpRatio = enemy.hp / enemy.maxHp;
  const dist    = distanceBetween(enemy, player);

  // Casters prefer to stay at range; melee units close in
  const preferredDist = enemy.isRanged ? enemy.attackRange * 0.75 : 0;
  const engageRange   = enemy.attackRange * (enemy.isRanged ? 1.0 : 1.15);

  // ─── State transitions ──────────────────────────────────────────────────────

  if (hpRatio < AI_RETREAT_HP_RATIO && ai.state !== 'retreat') {
    ai.state = 'retreat';
    ai.retreatTimer = AI_RETREAT_DURATION_MS;
  }

  if (
    ai.state === 'approach' &&
    dist < engageRange &&
    enemy.attackTimer <= 0
  ) {
    ai.state = 'attack';
    ai.reactionTimer = ai.reactionDelay;
  }

  if (ai.state === 'retreat') {
    ai.retreatTimer -= dt;
    if (ai.retreatTimer <= 0) ai.state = 'approach';
  }

  // Once cooldown ticks, leave attack state back to approach
  if (ai.state === 'attack' && enemy.attackTimer > 0) {
    ai.state = 'approach';
  }

  // ─── Movement per state ─────────────────────────────────────────────────────

  const speed = enemy.moveSpeed;
  enemy.vx = 0;

  if (ai.state === 'approach') {
    const dir = directionTo(enemy, player);
    enemy.facing = dir;

    if (enemy.isRanged && dist < preferredDist) {
      // Caster: back away if player is too close
      enemy.vx = dir === 'right' ? -speed * 0.9 : speed * 0.9;
    } else if (!enemy.isRanged || dist > preferredDist + 20) {
      enemy.vx = dir === 'right' ? speed : -speed;
    }

    // Y-axis wandering — prevents pure horizontal deadlock
    const wander = Math.sin(ai.wanderPhase * AI_Y_WANDER_FREQ * Math.PI * 2) * AI_Y_WANDER_AMP;
    const targetY = ARENA_BOUNDS.floor + wander;
    const dy = targetY - enemy.y;
    enemy.vy = enemy.onFloor ? enemy.vy : dy * 0.8; // only wander when not mid-air

    // Occasional jump (melee AI jumps to reach height-varied player)
    if (!enemy.isRanged && enemy.onFloor && ai.jumpCooldown <= 0 && Math.random() < 0.001 * dt) {
      enemy.vy = JUMP_IMPULSE;
      ai.jumpCooldown = 2500;
    }
  }

  if (ai.state === 'retreat') {
    const dir = directionTo(player, enemy); // reversed — flee direction
    enemy.facing = directionTo(enemy, player); // still face player
    enemy.vx = dir === 'right' ? speed * 1.1 : -speed * 1.1;
  }

  if (ai.state === 'attack') {
    enemy.vx = 0;
    enemy.facing = directionTo(enemy, player);

    ai.reactionTimer -= dt;
    if (ai.reactionTimer <= 0 && enemy.attackTimer <= 0) {
      ai.reactionTimer = ai.reactionDelay;
      return true; // fire attack
    }
  }

  return false;
}
