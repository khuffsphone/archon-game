/**
 * arenaAI.test.ts — Archon 2.2
 *
 * Tests for AI behaviour differences between Easy and Normal profiles.
 * Uses a minimal fake entity and controller — no canvas, no DOM.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { AI_PROFILES } from '../difficultyConfig';
import { createAIController, tickAI } from '../arenaAI';
import type { ArenaEntity } from '../entities';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEntity(overrides: Partial<ArenaEntity> = {}): ArenaEntity {
  return {
    side: 'enemy',
    pieceId: 'test-1',
    name: 'TestUnit',
    faction: 'dark',
    role: 'warrior',
    x: 1600,
    y: 760,
    vx: 0,
    vy: 0,
    width: 120,
    height: 120,
    facing: 'left',
    onFloor: true,
    hp: 10,
    maxHp: 10,
    moveSpeed: 320,
    attackDamage: 2,
    attackRange: 110,
    attackCooldown: 900,
    attackTimer: 0,
    attackState: 'idle',
    attackStateTimer: 0,
    isRanged: false,
    invulnTimer: 0,
    rebirthAvailable: false,
    regenRate: 0,
    regenAccumulator: 0,
    wailCooldownMs: 0,
    wailTimer: 0,
    wailRadius: 0,
    wailDamage: 0,
    sprite: null,
    spriteLoaded: false,
    ...overrides,
  };
}

function makePlayer(): ArenaEntity {
  return makeEntity({ side: 'player', faction: 'light', x: 200, pieceId: 'player-1' });
}

// ─── createAIController ───────────────────────────────────────────────────────

describe('createAIController', () => {
  it('starts in approach state', () => {
    const e = makeEntity();
    const ai = createAIController(e, AI_PROFILES.normal);
    expect(ai.state).toBe('approach');
  });

  it('Easy reactionDelay is longer than Normal (on average)', () => {
    // Fix Math.random to 0.5 for determinism
    const origRandom = Math.random;
    Math.random = () => 0.5;

    const e = makeEntity();
    const normalAI = createAIController(e, AI_PROFILES.normal);
    const easyAI   = createAIController(e, AI_PROFILES.easy);

    Math.random = origRandom;

    expect(easyAI.reactionDelay).toBeGreaterThan(normalAI.reactionDelay);
  });
});

// ─── tickAI — movement speed ──────────────────────────────────────────────────

describe('tickAI — movement speed', () => {
  it('Easy AI moves slower than Normal AI during approach', () => {
    const player = makePlayer();
    const dt = 16;

    const easyEnemy   = makeEntity({ x: 1600 });
    const normalEnemy = makeEntity({ x: 1600 });

    const easyAI   = createAIController(easyEnemy,   AI_PROFILES.easy);
    const normalAI = createAIController(normalEnemy, AI_PROFILES.normal);

    // Both start in approach; player is far left
    tickAI(easyAI,   easyEnemy,   player, dt, AI_PROFILES.easy);
    tickAI(normalAI, normalEnemy, player, dt, AI_PROFILES.normal);

    // Speed is encoded in vx — Easy should have lower absolute vx
    expect(Math.abs(easyEnemy.vx)).toBeLessThan(Math.abs(normalEnemy.vx));
  });
});

// ─── tickAI — retreat threshold ───────────────────────────────────────────────

describe('tickAI — retreat threshold', () => {
  it('Easy AI retreats at higher HP fraction than Normal', () => {
    const player = makePlayer();
    const dt = 16;

    // HP at 40% — Normal should NOT retreat, Easy SHOULD
    const easyEnemy   = makeEntity({ hp: 4, maxHp: 10, x: 200 }); // adjacent
    const normalEnemy = makeEntity({ hp: 4, maxHp: 10, x: 200 });

    const easyAI   = createAIController(easyEnemy,   AI_PROFILES.easy);
    const normalAI = createAIController(normalEnemy, AI_PROFILES.normal);

    tickAI(easyAI,   easyEnemy,   player, dt, AI_PROFILES.easy);
    tickAI(normalAI, normalEnemy, player, dt, AI_PROFILES.normal);

    // 40% HP: easy.retreatHpRatio = 0.52 → should retreat
    //         normal.retreatHpRatio = 0.28 → should NOT retreat
    expect(easyAI.state).toBe('retreat');
    expect(normalAI.state).not.toBe('retreat');
  });
});

// ─── tickAI — attack skip chance ──────────────────────────────────────────────

describe('tickAI — attack skip chance', () => {
  it('Normal never skips (attackSkipChance = 0)', () => {
    expect(AI_PROFILES.normal.attackSkipChance).toBe(0);
  });

  it('Easy has a meaningful skip chance (>0)', () => {
    expect(AI_PROFILES.easy.attackSkipChance).toBeGreaterThan(0);
    expect(AI_PROFILES.easy.attackSkipChance).toBeLessThan(1);
  });

  it('Easy AI skips attack when Math.random returns below skip chance', () => {
    const origRandom = Math.random;
    // Force random to 0 (always below any skip chance)
    Math.random = () => 0;

    const player = makePlayer();
    // Put enemy right on top of player so it enters attack state
    const enemy = makeEntity({ x: player.x + 50, attackTimer: 0 });
    const ai = createAIController(enemy, AI_PROFILES.easy);
    ai.state = 'attack';
    ai.reactionTimer = 0; // reaction already done

    const wantsAttack = tickAI(ai, enemy, player, 16, AI_PROFILES.easy);
    Math.random = origRandom;

    expect(wantsAttack).toBe(false); // skipped
  });
});

// ─── tickAI — Y-wander disabled on Easy ──────────────────────────────────────

describe('tickAI — Y-wander', () => {
  it('Easy profile has useYWander = false', () => {
    expect(AI_PROFILES.easy.useYWander).toBe(false);
  });

  it('Normal profile has useYWander = true', () => {
    expect(AI_PROFILES.normal.useYWander).toBe(true);
  });
});
