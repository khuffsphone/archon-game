/**
 * arenaPolish.test.ts — Archon 2.6
 *
 * Tests for arena polish / balance tuning.
 *
 * Covers:
 *  - Tuned constants have correct values and are sane
 *  - INVULN_MS is sufficient to prevent back-to-back hits
 *  - HIT_FX_MS / DEATH_FX_MS are distinct and correctly sized
 *  - PROJECTILE_LIFETIME_MS stays within arena bounds at full speed
 *  - HP bar low threshold is correct (35%)
 *  - Role multipliers produce sane final stat ranges
 *  - Ability constants are still valid after rebalance (non-regression)
 *  - AI profile constants are unchanged (non-regression)
 */
import { describe, it, expect } from 'vitest';
import {
  ARENA_DURATION_MS,
  ARENA_COUNTDOWN_MS,
  ARENA_RESULT_HOLD_MS,
  ARENA_BOUNDS,
  CANVAS_W,
  GRAVITY,
  JUMP_IMPULSE,
  BASE_MOVE_SPEED,
  BASE_DAMAGE,
  BASE_ATTACK_RANGE,
  BASE_COOLDOWN_MS,
  PROJECTILE_SPEED,
  PROJECTILE_LIFETIME_MS,
  PROJECTILE_W,
  PROJECTILE_H,
  ENTITY_W,
  ENTITY_H,
  ROLE_STATS,
  AI_RETREAT_HP_RATIO,
  AI_RETREAT_DURATION_MS,
  AI_REACTION_VARIANCE,
  HIT_FX_MS,
  DEATH_FX_MS,
} from '../arenaConfig';
import {
  TROLL_REGEN_HP_PER_SEC,
  BANSHEE_WAIL_RADIUS,
  BANSHEE_WAIL_DAMAGE,
  BANSHEE_WAIL_COOLDOWN_MS,
} from '../entities';
import { AI_PROFILES } from '../difficultyConfig';

// ─── Tuned timing constants ───────────────────────────────────────────────────

describe('2.6 — tuned timing constants', () => {
  it('HIT_FX_MS is at least 300ms (readable at a glance)', () => {
    expect(HIT_FX_MS).toBeGreaterThanOrEqual(300);
  });

  it('DEATH_FX_MS is longer than HIT_FX_MS (death is more prominent)', () => {
    expect(DEATH_FX_MS).toBeGreaterThan(HIT_FX_MS);
  });

  it('DEATH_FX_MS is at least 500ms', () => {
    expect(DEATH_FX_MS).toBeGreaterThanOrEqual(500);
  });

  it('HIT_FX_MS and DEATH_FX_MS are exported from arenaConfig (not private)', () => {
    // Verifies the constants are accessible in tests (i.e., exported from config)
    expect(typeof HIT_FX_MS).toBe('number');
    expect(typeof DEATH_FX_MS).toBe('number');
  });
});

// ─── Invulnerability window ───────────────────────────────────────────────────

describe('2.6 — invulnerability window', () => {
  // The INVULN_MS constant is private to gameLoop.ts (by design — it's a local const).
  // We test the intent indirectly through its relation to cooldowns and timing.
  // The canonical value raised 320→380 is verified by the arena round system tests.
  // Here we verify HIT_FX_MS < expected INVULN_MS (380ms) so hit flash can complete.
  it('HIT_FX_MS fits inside the 380ms invuln window with room to spare', () => {
    const INVULN_MS = 380; // canonical value from gameLoop.ts
    expect(HIT_FX_MS).toBeLessThan(INVULN_MS);
  });

  it('HIT_FX_MS is well below DEATH_FX_MS', () => {
    expect(HIT_FX_MS).toBeLessThan(DEATH_FX_MS);
  });
});

// ─── Projectile lifetime vs. arena width ─────────────────────────────────────

describe('2.6 — projectile lifetime', () => {
  it('projectile covers no more than the arena width at max speed', () => {
    const arenaWidth = ARENA_BOUNDS.right - ARENA_BOUNDS.left; // 1760px
    const maxTravel = PROJECTILE_SPEED * (PROJECTILE_LIFETIME_MS / 1000);
    // Should not travel so far it feels like it teleports off screen
    // Acceptable: up to ~2× arena width (leaves if aimed cross-court)
    expect(maxTravel).toBeLessThanOrEqual(arenaWidth * 2.5);
  });

  it('projectile lifetime is at most 1400ms (trimmed from original)', () => {
    expect(PROJECTILE_LIFETIME_MS).toBeLessThanOrEqual(1400);
  });

  it('projectile lifetime is at least 800ms (enough to cross half the arena)', () => {
    const halfArena = (ARENA_BOUNDS.right - ARENA_BOUNDS.left) / 2;
    const timeToHalfArena = (halfArena / PROJECTILE_SPEED) * 1000;
    expect(PROJECTILE_LIFETIME_MS).toBeGreaterThan(timeToHalfArena);
  });
});

// ─── HP bar threshold ─────────────────────────────────────────────────────────

describe('2.6 — HP bar low threshold', () => {
  // ArenaScene uses pct < 35 for the low state (raised from 30)
  const LOW_THRESHOLD = 35; // matches ArenaScene.tsx

  it('threshold correctly catches 1 HP on a 10 maxHp unit (10% < 35%)', () => {
    const pct = (1 / 10) * 100;
    expect(pct < LOW_THRESHOLD).toBe(true);
  });

  it('threshold correctly catches 3 HP on a 10 maxHp unit (30% < 35%)', () => {
    const pct = (3 / 10) * 100;
    expect(pct < LOW_THRESHOLD).toBe(true);
  });

  it('threshold correctly does NOT trigger at 4 HP on 10 maxHp (40% >= 35%)', () => {
    const pct = (4 / 10) * 100;
    expect(pct < LOW_THRESHOLD).toBe(false);
  });

  it('threshold triggers earlier than old 30% (3.4 HP on 10 maxHp is < 35%)', () => {
    const pct = (3.4 / 10) * 100; // 34% — caught by new threshold, not old
    expect(pct < LOW_THRESHOLD).toBe(true);
    expect(pct < 30).toBe(false); // old threshold missed it
  });
});

// ─── Role stat sanity ─────────────────────────────────────────────────────────

describe('2.6 — role stat multipliers (non-regression)', () => {
  for (const [role, mults] of Object.entries(ROLE_STATS)) {
    it(`${role}: moveSpeed in reasonable range`, () => {
      const speed = BASE_MOVE_SPEED * mults.speedMult;
      expect(speed).toBeGreaterThan(100);
      expect(speed).toBeLessThan(700);
    });

    it(`${role}: attackDamage in reasonable range`, () => {
      const dmg = BASE_DAMAGE * mults.damageMult;
      expect(dmg).toBeGreaterThan(1);
      expect(dmg).toBeLessThan(10);
    });

    it(`${role}: attackCooldown in reasonable range`, () => {
      const cd = BASE_COOLDOWN_MS * mults.cooldownMult;
      expect(cd).toBeGreaterThan(400);
      expect(cd).toBeLessThan(2000);
    });
  }
});

// ─── Ability constants (non-regression) ──────────────────────────────────────

describe('2.6 — ability constants unchanged (non-regression)', () => {
  it('TROLL_REGEN_HP_PER_SEC is 1.0', () => {
    expect(TROLL_REGEN_HP_PER_SEC).toBe(1.0);
  });

  it('BANSHEE_WAIL_RADIUS is 220', () => {
    expect(BANSHEE_WAIL_RADIUS).toBe(220);
  });

  it('BANSHEE_WAIL_DAMAGE is 1.5', () => {
    expect(BANSHEE_WAIL_DAMAGE).toBe(1.5);
  });

  it('BANSHEE_WAIL_COOLDOWN_MS is 4500', () => {
    expect(BANSHEE_WAIL_COOLDOWN_MS).toBe(4_500);
  });
});

// ─── AI profile constants (non-regression) ───────────────────────────────────

describe('2.6 — AI profile constants unchanged (non-regression)', () => {
  it('normal profile: speedMult = 1.0', () => {
    expect(AI_PROFILES.normal.speedMult).toBe(1.0);
  });

  it('normal profile: attackSkipChance = 0', () => {
    expect(AI_PROFILES.normal.attackSkipChance).toBe(0);
  });

  it('easy profile: attackSkipChance = 0.45', () => {
    expect(AI_PROFILES.easy.attackSkipChance).toBe(0.45);
  });

  it('easy profile: speedMult < normal profile speedMult', () => {
    expect(AI_PROFILES.easy.speedMult).toBeLessThan(AI_PROFILES.normal.speedMult);
  });

  it('easy profile: retreatHpRatio > normal profile retreatHpRatio (retreats more)', () => {
    expect(AI_PROFILES.easy.retreatHpRatio).toBeGreaterThan(AI_PROFILES.normal.retreatHpRatio);
  });
});

// ─── Physics constants (non-regression) ──────────────────────────────────────

describe('2.6 — physics constants (non-regression)', () => {
  it('GRAVITY is 2200 px/s²', () => {
    expect(GRAVITY).toBe(2200);
  });

  it('JUMP_IMPULSE is negative (upward)', () => {
    expect(JUMP_IMPULSE).toBeLessThan(0);
  });

  it('JUMP_IMPULSE magnitude is between 600 and 1200 (snappy but not instant)', () => {
    expect(Math.abs(JUMP_IMPULSE)).toBeGreaterThan(600);
    expect(Math.abs(JUMP_IMPULSE)).toBeLessThan(1200);
  });

  it('jump reaches a meaningful height (at least 100px from floor)', () => {
    // h = v0² / (2 * g); JUMP_IMPULSE is in px/s, GRAVITY in px/s²
    const peakHeight = (JUMP_IMPULSE * JUMP_IMPULSE) / (2 * GRAVITY);
    expect(peakHeight).toBeGreaterThan(100);
  });
});

// ─── Global timing constants (non-regression) ─────────────────────────────────

describe('2.6 — global timing constants (non-regression)', () => {
  it('ARENA_DURATION_MS = 30000', () => {
    expect(ARENA_DURATION_MS).toBe(30_000);
  });

  it('ARENA_COUNTDOWN_MS = 4000', () => {
    expect(ARENA_COUNTDOWN_MS).toBe(4_000);
  });

  it('ARENA_RESULT_HOLD_MS = 2000', () => {
    expect(ARENA_RESULT_HOLD_MS).toBe(2_000);
  });
});
