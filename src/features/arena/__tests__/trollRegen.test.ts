/**
 * trollRegen.test.ts — Archon 2.3b
 *
 * Tests for Troll passive HP regeneration:
 *  - regenRate set correctly for Troll vs non-Troll
 *  - HP increases over time
 *  - HP caps at maxHp
 *  - defeated Troll does not regen
 *  - non-Troll units do not regen
 *  - Phoenix Rebirth still works alongside regen
 *  - regenAccumulator sub-HP tracking is correct
 *  - regen stops when already at full HP
 */
import { describe, it, expect } from 'vitest';
import type { ArenaEntity } from '../entities';
import { TROLL_REGEN_HP_PER_SEC } from '../entities';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEntity(overrides: Partial<ArenaEntity> = {}): ArenaEntity {
  return {
    side: 'enemy',
    pieceId: 'dark-troll',
    name: 'Troll',
    faction: 'dark',
    role: 'warrior',
    x: 1600, y: 760,
    vx: 0, vy: 0,
    width: 120, height: 120,
    facing: 'left',
    onFloor: true,
    hp: 10, maxHp: 10,
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
    regenRate: TROLL_REGEN_HP_PER_SEC,
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

/**
 * Inline mirror of GameLoop._tickRegen for isolated unit testing.
 * Returns true if HP was actually increased this tick.
 */
function tickRegen(entity: ArenaEntity, dt: number): boolean {
  if (entity.regenRate <= 0) return false;
  if (entity.hp <= 0)        return false;
  if (entity.hp >= entity.maxHp) return false;

  entity.regenAccumulator += entity.regenRate * (dt / 1000);

  if (entity.regenAccumulator >= 1) {
    const healed = Math.floor(entity.regenAccumulator);
    entity.regenAccumulator -= healed;
    entity.hp = Math.min(entity.maxHp, entity.hp + healed);
    return true;
  }
  return false;
}

// ─── Tests: regenRate flag logic ──────────────────────────────────────────────

/** Mirror condition from boardPieceToEntity (browser-safe) */
function shouldHaveRegen(pieceId: string): boolean {
  return pieceId.toLowerCase().includes('troll');
}

describe('regenRate flag logic', () => {
  it('Troll pieceId gets regen', () => {
    expect(shouldHaveRegen('dark-troll')).toBe(true);
  });

  it('Light Troll pieceId also gets regen', () => {
    expect(shouldHaveRegen('light-troll')).toBe(true);
  });

  it('Knight does NOT get regen', () => {
    expect(shouldHaveRegen('light-knight')).toBe(false);
  });

  it('Sorceress does NOT get regen', () => {
    expect(shouldHaveRegen('dark-sorceress')).toBe(false);
  });

  it('Phoenix does NOT get regen', () => {
    expect(shouldHaveRegen('light-phoenix')).toBe(false);
  });

  it('TROLL_REGEN_HP_PER_SEC is a positive number', () => {
    expect(TROLL_REGEN_HP_PER_SEC).toBeGreaterThan(0);
  });
});

// ─── Tests: HP increases over time ────────────────────────────────────────────

describe('Troll Regen — HP increases over time', () => {
  it('HP increases after enough dt to accumulate 1 HP', () => {
    const troll = makeEntity({ hp: 5, maxHp: 10 });
    // 1000ms at 1 HP/s = exactly 1 HP
    tickRegen(troll, 1000);
    expect(troll.hp).toBe(6);
  });

  it('accumulates fractional HP correctly across ticks', () => {
    const troll = makeEntity({ hp: 5, maxHp: 10 });
    // 4 × 250ms = 1 HP total
    tickRegen(troll, 250);
    tickRegen(troll, 250);
    tickRegen(troll, 250);
    expect(troll.hp).toBe(5); // not yet healed
    tickRegen(troll, 250);
    expect(troll.hp).toBe(6);
  });

  it('accumulator carries remainder over', () => {
    const troll = makeEntity({ hp: 5, maxHp: 10 });
    // 1500ms → 1.5 accumulated → heals 1, leaves 0.5
    tickRegen(troll, 1500);
    expect(troll.hp).toBe(6);
    expect(troll.regenAccumulator).toBeCloseTo(0.5, 3);
  });

  it('heals by floor of accumulator when > 1', () => {
    const troll = makeEntity({ hp: 3, maxHp: 10 });
    // 2500ms at 1 HP/s = 2.5 → heals 2, leaves 0.5
    tickRegen(troll, 2500);
    expect(troll.hp).toBe(5);
  });
});

// ─── Tests: Regen caps at maxHp ───────────────────────────────────────────────

describe('Troll Regen — caps at maxHp', () => {
  it('HP never exceeds maxHp', () => {
    const troll = makeEntity({ hp: 9, maxHp: 10 });
    // 5000ms would be +5 HP without cap
    tickRegen(troll, 5000);
    expect(troll.hp).toBeLessThanOrEqual(troll.maxHp);
    expect(troll.hp).toBe(10);
  });

  it('returns false when already at full HP', () => {
    const troll = makeEntity({ hp: 10, maxHp: 10 });
    const healed = tickRegen(troll, 1000);
    expect(healed).toBe(false);
    expect(troll.hp).toBe(10);
  });

  it('accumulator does not increase when already full', () => {
    const troll = makeEntity({ hp: 10, maxHp: 10 });
    tickRegen(troll, 1000);
    expect(troll.regenAccumulator).toBe(0);
  });
});

// ─── Tests: Non-Troll units do not regen ─────────────────────────────────────

describe('Non-Troll units — no regen', () => {
  it('Knight does not regen (regenRate = 0)', () => {
    const knight = makeEntity({ pieceId: 'light-knight', regenRate: 0, hp: 5 });
    const healed = tickRegen(knight, 1000);
    expect(healed).toBe(false);
    expect(knight.hp).toBe(5);
  });

  it('Sorceress does not regen (regenRate = 0)', () => {
    const sorc = makeEntity({ pieceId: 'dark-sorceress', regenRate: 0, hp: 5, role: 'caster' });
    tickRegen(sorc, 5000);
    expect(sorc.hp).toBe(5);
  });

  it('Phoenix does not regen (regenRate = 0)', () => {
    const phoenix = makeEntity({ pieceId: 'light-phoenix', regenRate: 0, hp: 5, rebirthAvailable: true });
    tickRegen(phoenix, 2000);
    expect(phoenix.hp).toBe(5);
  });
});

// ─── Tests: Defeated Troll does not regen ────────────────────────────────────

describe('Troll Regen — stops when defeated', () => {
  it('does not regen when hp = 0', () => {
    const troll = makeEntity({ hp: 0 });
    const healed = tickRegen(troll, 1000);
    expect(healed).toBe(false);
    expect(troll.hp).toBe(0);
  });

  it('accumulator does not increase when hp = 0', () => {
    const troll = makeEntity({ hp: 0 });
    tickRegen(troll, 5000);
    expect(troll.regenAccumulator).toBe(0);
  });
});

// ─── Tests: Win detection not broken ─────────────────────────────────────────

describe('Troll Regen — win detection intact', () => {
  it('regen does not bring hp above 0 when hp = 0 (defeated)', () => {
    const troll = makeEntity({ hp: 0 });
    tickRegen(troll, 10_000);
    expect(troll.hp).toBe(0); // defeat is permanent
  });

  it('regen during fight does not prevent the fight from ending when troll hits 0', () => {
    const troll = makeEntity({ hp: 1, maxHp: 10 });
    // Simulate lethal hit
    troll.hp = 0;
    // Regen does not fire
    const healed = tickRegen(troll, 1000);
    expect(healed).toBe(false);
    expect(troll.hp).toBe(0);
  });
});

// ─── Tests: Phoenix Rebirth still works with regen present ───────────────────

const PHOENIX_REBIRTH_HP_FRAC  = 0.4;
const PHOENIX_REBIRTH_INVULN_MS = 1_200;

function applyDamageWithRebirth(dmg: number, target: ArenaEntity) {
  target.hp = Math.max(0, target.hp - dmg);
  if (target.hp <= 0 && target.rebirthAvailable) {
    target.rebirthAvailable = false;
    target.hp = Math.max(1, Math.round(target.maxHp * PHOENIX_REBIRTH_HP_FRAC));
    target.invulnTimer = PHOENIX_REBIRTH_INVULN_MS;
    return { rebirthTriggered: true };
  }
  return { rebirthTriggered: false };
}

describe('Phoenix Rebirth — still works when regen also present', () => {
  it('Phoenix rebirth fires correctly when entity also has regenRate = 0', () => {
    const phoenix = makeEntity({
      pieceId: 'light-phoenix',
      role: 'herald',
      faction: 'light',
      rebirthAvailable: true,
      regenRate: 0, // Phoenix has no regen
      hp: 5,
      maxHp: 10,
    });
    const result = applyDamageWithRebirth(99, phoenix);
    expect(result.rebirthTriggered).toBe(true);
    expect(phoenix.hp).toBe(4); // 40% of 10
  });

  it('Troll regen does not affect Phoenix Rebirth logic', () => {
    const troll = makeEntity({ hp: 5, maxHp: 10, rebirthAvailable: false });
    // Troll takes damage that would be lethal
    troll.hp = Math.max(0, troll.hp - 99);
    // No rebirth
    const result = applyDamageWithRebirth(0, troll);
    expect(result.rebirthTriggered).toBe(false);
    expect(troll.hp).toBe(0);
  });
});
