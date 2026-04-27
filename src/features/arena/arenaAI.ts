/**
 * arenaAI.ts — Archon 2.2 Enemy AI
 *
 * 3-state FSM for the AI-controlled enemy piece.
 * Accepts an AIProfile so difficulty can be swapped at runtime.
 *
 * States:
 *   APPROACH  — move toward player; switch to ATTACK when in range
 *   ATTACK    — trigger attack (may skip on Easy); back to APPROACH after cooldown
 *               or RETREAT if HP drops below profile threshold
 *   RETREAT   — back away; after profile duration → APPROACH
 */
import type { ArenaEntity } from './entities';
import type { AIProfile } from './difficultyConfig';
import { distanceBetween, directionTo } from './arenaPhysics';
import {
  AI_REACTION_VARIANCE,
  AI_Y_WANDER_AMP,
  AI_Y_WANDER_FREQ,
  ARENA_BOUNDS,
  JUMP_IMPULSE,
} from './arenaConfig';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AIState = 'approach' | 'attack' | 'retreat';

export interface AIController {
  state:         AIState;
  retreatTimer:  number;   // ms remaining in RETREAT
  reactionDelay: number;   // ms of reaction lag (randomised per session, scaled by profile)
  reactionTimer: number;   // countdown before attack fires
  wanderPhase:   number;   // elapsed ms — feeds sin() for Y-axis wandering
  jumpCooldown:  number;   // ms until AI can jump again
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/** Create a fresh AI controller. Call once when the arena starts. */
export function createAIController(entity: ArenaEntity, profile: AIProfile): AIController {
  const baseDelay = entity.attackCooldown / 2;
  const variance  = baseDelay * AI_REACTION_VARIANCE;
  const rawDelay  = baseDelay + (Math.random() * 2 - 1) * variance;
  return {
    state:         'approach',
    retreatTimer:  0,
    reactionDelay: rawDelay * profile.reactionDelayMult,
    reactionTimer: 0,
    wanderPhase:   0,
    jumpCooldown:  0,
  };
}

// ─── Tick ─────────────────────────────────────────────────────────────────────

/**
 * Update the AI controller + enemy entity for one frame.
 * Mutates `enemy` velocity/facing in place.
 * Returns true if the AI wants to fire an attack this frame.
 */
export function tickAI(
  ai:      AIController,
  enemy:   ArenaEntity,
  player:  ArenaEntity,
  dt:      number,
  profile: AIProfile,
): boolean {
  ai.wanderPhase += dt;
  if (ai.jumpCooldown > 0) ai.jumpCooldown -= dt;

  const hpRatio   = enemy.hp / enemy.maxHp;
  const dist      = distanceBetween(enemy, player);
  const speed     = enemy.moveSpeed * profile.speedMult;
  const engageRange = enemy.attackRange * profile.rangeMult * (enemy.isRanged ? 1.0 : 1.15);
  const preferredDist = enemy.isRanged ? engageRange * 0.75 : 0;

  // ─── State transitions ──────────────────────────────────────────────────────

  // HP threshold → retreat
  if (hpRatio < profile.retreatHpRatio && ai.state !== 'retreat') {
    ai.state = 'retreat';
    ai.retreatTimer = profile.retreatDurationMs;
  }

  // In range + cooldown ready → attack
  if (ai.state === 'approach' && dist < engageRange && enemy.attackTimer <= 0) {
    ai.state = 'attack';
    ai.reactionTimer = ai.reactionDelay;
  }

  // Retreat timer counts down
  if (ai.state === 'retreat') {
    ai.retreatTimer -= dt;
    if (ai.retreatTimer <= 0) ai.state = 'approach';
  }

  // After attacking, entity attackTimer is set — switch back to approach
  if (ai.state === 'attack' && enemy.attackTimer > 0) {
    ai.state = 'approach';
  }

  // ─── Movement per state ─────────────────────────────────────────────────────

  enemy.vx = 0;

  if (ai.state === 'approach') {
    const dir = directionTo(enemy, player);
    enemy.facing = dir;

    if (enemy.isRanged && dist < preferredDist) {
      // Caster: back away if too close
      enemy.vx = dir === 'right' ? -speed * 0.9 : speed * 0.9;
    } else if (!enemy.isRanged || dist > preferredDist + 20) {
      enemy.vx = dir === 'right' ? speed : -speed;
    }

    // Y-axis wandering (Normal only)
    if (profile.useYWander) {
      const wander  = Math.sin(ai.wanderPhase * AI_Y_WANDER_FREQ * Math.PI * 2) * AI_Y_WANDER_AMP;
      const targetY = ARENA_BOUNDS.floor + wander;
      if (!enemy.onFloor) {
        enemy.vy = (targetY - enemy.y) * 0.8;
      }
    }

    // Occasional jump (Normal only)
    if (profile.useJump && enemy.onFloor && ai.jumpCooldown <= 0 && Math.random() < 0.001 * dt) {
      enemy.vy = JUMP_IMPULSE;
      ai.jumpCooldown = 2_500;
    }
  }

  if (ai.state === 'retreat') {
    const dir = directionTo(player, enemy); // flee direction
    enemy.facing = directionTo(enemy, player);
    enemy.vx = dir === 'right' ? speed * 1.1 : -speed * 1.1;
  }

  if (ai.state === 'attack') {
    enemy.vx = 0;
    enemy.facing = directionTo(enemy, player);

    ai.reactionTimer -= dt;
    if (ai.reactionTimer <= 0 && enemy.attackTimer <= 0) {
      ai.reactionTimer = ai.reactionDelay;
      // Easy: randomly skip attack opportunities
      if (profile.attackSkipChance > 0 && Math.random() < profile.attackSkipChance) {
        return false;
      }
      return true; // fire attack
    }
  }

  return false;
}
