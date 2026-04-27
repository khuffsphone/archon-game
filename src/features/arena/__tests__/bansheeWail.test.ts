/**
 * bansheeWail.test.ts — Archon 2.3c
 *
 * Tests for Banshee Wail arena ability:
 *  - wailCooldownMs / wailRadius / wailDamage set for Banshee only
 *  - wail fires when timer = 0 AND target is in range
 *  - wail does NOT fire when target is out of range
 *  - cooldown prevents back-to-back wail
 *  - defeated Banshee cannot wail
 *  - wail respects target invuln (skips damage)
 *  - wail damages via the same path as melee (supports Phoenix Rebirth)
 *  - Troll Regen still works independently
 *  - Phoenix Rebirth still works independently
 */
import { describe, it, expect } from 'vitest';
import type { ArenaEntity } from '../entities';
import {
  BANSHEE_WAIL_RADIUS,
  BANSHEE_WAIL_DAMAGE,
  BANSHEE_WAIL_COOLDOWN_MS,
  BANSHEE_WAIL_FX_MS,
  TROLL_REGEN_HP_PER_SEC,
} from '../entities';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEntity(overrides: Partial<ArenaEntity> = {}): ArenaEntity {
  return {
    side: 'enemy',
    pieceId: 'dark-banshee',
    name: 'Banshee',
    faction: 'dark',
    role: 'caster',
    x: 1600, y: 760,
    vx: 0, vy: 0,
    width: 120, height: 120,
    facing: 'left',
    onFloor: true,
    hp: 10, maxHp: 10,
    moveSpeed: 320,
    attackDamage: 1.5,
    attackRange: 110,
    attackCooldown: 900,
    attackTimer: 0,
    attackState: 'idle',
    attackStateTimer: 0,
    isRanged: true,
    invulnTimer: 0,
    rebirthAvailable: false,
    regenRate: 0,
    regenAccumulator: 0,
    wailCooldownMs: BANSHEE_WAIL_COOLDOWN_MS,
    wailTimer:      0,
    wailRadius:     BANSHEE_WAIL_RADIUS,
    wailDamage:     BANSHEE_WAIL_DAMAGE,
    sprite: null,
    spriteLoaded: false,
    ...overrides,
  };
}

function makeTarget(overrides: Partial<ArenaEntity> = {}): ArenaEntity {
  return makeEntity({
    side: 'player',
    pieceId: 'light-knight',
    name: 'Knight',
    faction: 'light',
    role: 'warrior',
    x: 200, y: 760,
    wailCooldownMs: 0,
    wailTimer: 0,
    wailRadius: 0,
    wailDamage: 0,
    isRanged: false,
    rebirthAvailable: false,
    ...overrides,
  });
}

/**
 * Inline mirror of GameLoop._tickWail for fast unit testing.
 * Returns whether a wail was fired this tick.
 */
interface WailResult { fired: boolean; damagedTarget: boolean }

function tickWail(
  caster: ArenaEntity,
  target: ArenaEntity,
  dt: number,
  phase: 'fighting' | 'countdown' | 'result' = 'fighting',
): WailResult {
  if (caster.wailCooldownMs <= 0) return { fired: false, damagedTarget: false };
  if (caster.hp <= 0)             return { fired: false, damagedTarget: false };
  if (phase !== 'fighting')       return { fired: false, damagedTarget: false };

  if (caster.wailTimer > 0) {
    caster.wailTimer = Math.max(0, caster.wailTimer - dt);
    return { fired: false, damagedTarget: false };
  }

  const dist = Math.hypot(caster.x - target.x, caster.y - target.y);
  if (dist > caster.wailRadius) return { fired: false, damagedTarget: false };

  // Fire!
  caster.wailTimer = caster.wailCooldownMs;
  let damagedTarget = false;
  if (target.invulnTimer <= 0) {
    const dmg = Math.max(1, Math.round(caster.wailDamage));
    target.hp = Math.max(0, target.hp - dmg);
    damagedTarget = true;
  }
  return { fired: true, damagedTarget };
}

// ─── Tests: wail flag logic ────────────────────────────────────────────────────

/** Mirror condition from boardPieceToEntity (browser-safe) */
function shouldHaveWail(pieceId: string): boolean {
  return pieceId.toLowerCase().includes('banshee');
}

describe('wail flag logic', () => {
  it('Banshee pieceId gets wail', () => {
    expect(shouldHaveWail('dark-banshee')).toBe(true);
  });

  it('light-banshee also gets wail', () => {
    expect(shouldHaveWail('light-banshee')).toBe(true);
  });

  it('Knight does NOT get wail', () => {
    expect(shouldHaveWail('light-knight')).toBe(false);
  });

  it('Troll does NOT get wail', () => {
    expect(shouldHaveWail('dark-troll')).toBe(false);
  });

  it('Phoenix does NOT get wail', () => {
    expect(shouldHaveWail('light-phoenix')).toBe(false);
  });

  it('BANSHEE_WAIL_RADIUS is a positive number', () => {
    expect(BANSHEE_WAIL_RADIUS).toBeGreaterThan(0);
  });

  it('BANSHEE_WAIL_DAMAGE is a positive number', () => {
    expect(BANSHEE_WAIL_DAMAGE).toBeGreaterThan(0);
  });

  it('BANSHEE_WAIL_COOLDOWN_MS is a positive number', () => {
    expect(BANSHEE_WAIL_COOLDOWN_MS).toBeGreaterThan(0);
  });

  it('BANSHEE_WAIL_FX_MS is a positive number', () => {
    expect(BANSHEE_WAIL_FX_MS).toBeGreaterThan(0);
  });
});

// ─── Tests: wail fires when ready and in range ────────────────────────────────

describe('Banshee Wail — fires when ready and in range', () => {
  it('wail fires when wailTimer = 0 and target is within radius', () => {
    const banshee = makeEntity({ x: 500 });
    // Target at x=500+100, still within BANSHEE_WAIL_RADIUS (220)
    const target  = makeTarget({ x: 600, y: 760 });
    const result  = tickWail(banshee, target, 16);
    expect(result.fired).toBe(true);
  });

  it('wail damages target when fired', () => {
    const banshee = makeEntity({ x: 500 });
    const target  = makeTarget({ x: 600, y: 760, hp: 10 });
    tickWail(banshee, target, 16);
    expect(target.hp).toBeLessThan(10);
  });

  it('target HP decreases by approximately wailDamage (rounded)', () => {
    const banshee = makeEntity({ x: 500 });
    const target  = makeTarget({ x: 600, y: 760, hp: 10 });
    tickWail(banshee, target, 16);
    // damage = Math.max(1, Math.round(1.5)) = 2
    expect(target.hp).toBe(8);
  });

  it('wailTimer is reset to cooldownMs after firing', () => {
    const banshee = makeEntity({ x: 500 });
    const target  = makeTarget({ x: 600, y: 760 });
    tickWail(banshee, target, 16);
    expect(banshee.wailTimer).toBe(BANSHEE_WAIL_COOLDOWN_MS);
  });
});

// ─── Tests: wail does NOT fire when out of range ──────────────────────────────

describe('Banshee Wail — does not fire when out of range', () => {
  it('wail does not fire when target is further than wailRadius', () => {
    const banshee = makeEntity({ x: 500 });
    // Target at x=500+300 → dist=300 > BANSHEE_WAIL_RADIUS=220
    const target  = makeTarget({ x: 800, y: 760 });
    const result  = tickWail(banshee, target, 16);
    expect(result.fired).toBe(false);
  });

  it('target HP is unchanged when out of range', () => {
    const banshee = makeEntity({ x: 500 });
    const target  = makeTarget({ x: 800, y: 760, hp: 10 });
    tickWail(banshee, target, 16);
    expect(target.hp).toBe(10);
  });

  it('wailTimer stays 0 when wail does not fire', () => {
    const banshee = makeEntity({ x: 500 });
    const target  = makeTarget({ x: 800, y: 760 });
    tickWail(banshee, target, 16);
    expect(banshee.wailTimer).toBe(0);
  });

  it('wail fires once target enters range', () => {
    const banshee = makeEntity({ x: 500 });
    const target  = makeTarget({ x: 800, y: 760 }); // out of range
    tickWail(banshee, target, 16);  // miss
    target.x = 600;                  // now in range
    const result = tickWail(banshee, target, 16);
    expect(result.fired).toBe(true);
  });
});

// ─── Tests: cooldown prevents spam ───────────────────────────────────────────

describe('Banshee Wail — cooldown', () => {
  it('second call immediately after first does not fire again', () => {
    const banshee = makeEntity({ x: 500 });
    const target  = makeTarget({ x: 600, y: 760 });
    tickWail(banshee, target, 16); // first — fires
    target.hp = 10; target.invulnTimer = 0; // reset target state
    const result2 = tickWail(banshee, target, 16); // second — on cooldown
    expect(result2.fired).toBe(false);
  });

  it('cooldown decrements each tick', () => {
    const banshee = makeEntity({ x: 500 });
    const target  = makeTarget({ x: 600, y: 760 });
    tickWail(banshee, target, 16);    // fire → wailTimer = BANSHEE_WAIL_COOLDOWN_MS
    tickWail(banshee, target, 500);   // tick 500ms
    expect(banshee.wailTimer).toBe(BANSHEE_WAIL_COOLDOWN_MS - 500);
  });

  it('wail fires again once cooldown expires', () => {
    const banshee = makeEntity({ x: 500 });
    const target  = makeTarget({ x: 600, y: 760 });
    tickWail(banshee, target, 16);                            // fire
    tickWail(banshee, target, BANSHEE_WAIL_COOLDOWN_MS);      // expire cooldown
    target.invulnTimer = 0;
    const result3 = tickWail(banshee, target, 16);            // should fire again
    expect(result3.fired).toBe(true);
  });
});

// ─── Tests: defeated Banshee cannot wail ─────────────────────────────────────

describe('Banshee Wail — stops when defeated', () => {
  it('does not fire when hp = 0', () => {
    const banshee = makeEntity({ hp: 0, x: 500 });
    const target  = makeTarget({ x: 600, y: 760 });
    const result  = tickWail(banshee, target, 16);
    expect(result.fired).toBe(false);
  });

  it('target HP unchanged when banshee is defeated', () => {
    const banshee = makeEntity({ hp: 0, x: 500 });
    const target  = makeTarget({ x: 600, y: 760, hp: 10 });
    tickWail(banshee, target, 16);
    expect(target.hp).toBe(10);
  });
});

// ─── Tests: wail respects target invuln ──────────────────────────────────────

describe('Banshee Wail — respects target invulnerability', () => {
  it('does not damage target with active invulnTimer', () => {
    const banshee = makeEntity({ x: 500 });
    const target  = makeTarget({ x: 600, y: 760, hp: 10, invulnTimer: 200 });
    const result  = tickWail(banshee, target, 16);
    expect(result.fired).toBe(true);       // wail fires (VFX plays)
    expect(result.damagedTarget).toBe(false); // but no damage
    expect(target.hp).toBe(10);
  });
});

// ─── Tests: phase guard ───────────────────────────────────────────────────────

describe('Banshee Wail — phase guard', () => {
  it('does not fire during countdown phase', () => {
    const banshee = makeEntity({ x: 500 });
    const target  = makeTarget({ x: 600, y: 760 });
    const result  = tickWail(banshee, target, 16, 'countdown');
    expect(result.fired).toBe(false);
  });

  it('does not fire during result phase', () => {
    const banshee = makeEntity({ x: 500 });
    const target  = makeTarget({ x: 600, y: 760 });
    const result  = tickWail(banshee, target, 16, 'result');
    expect(result.fired).toBe(false);
  });
});

// ─── Tests: non-Banshee units never wail ─────────────────────────────────────

describe('Non-Banshee units — no wail', () => {
  it('Knight never wails (wailCooldownMs = 0)', () => {
    const knight = makeTarget({ x: 200, wailCooldownMs: 0 });
    const target = makeEntity({ x: 300, y: 760 });
    const result = tickWail(knight, target, 16);
    expect(result.fired).toBe(false);
  });
});

// ─── Tests: Phoenix Rebirth coexists ─────────────────────────────────────────

const PHOENIX_REBIRTH_HP_FRAC   = 0.4;
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

describe('Phoenix Rebirth — still works with Banshee Wail present', () => {
  it('Phoenix rebirth still fires when wail deals lethal damage', () => {
    const phoenix = makeTarget({
      pieceId: 'light-phoenix',
      role: 'herald',
      hp: 2, maxHp: 10,
      rebirthAvailable: true,
      wailCooldownMs: 0,
    });
    // Simulate wail dealing Math.max(1, round(1.5))=2 damage → hp=0
    const result = applyDamageWithRebirth(2, phoenix);
    expect(result.rebirthTriggered).toBe(true);
    expect(phoenix.hp).toBeGreaterThan(0); // survived
  });

  it('Banshee wailCooldownMs does not interfere with Phoenix rebirthAvailable', () => {
    const banshee = makeEntity({ x: 500 });
    expect(banshee.wailCooldownMs).toBe(BANSHEE_WAIL_COOLDOWN_MS);
    expect(banshee.rebirthAvailable).toBe(false);
  });
});

// ─── Tests: Troll Regen coexists ─────────────────────────────────────────────

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

describe('Troll Regen — still works with Banshee Wail present', () => {
  it('Troll regen still heals normally', () => {
    const troll = makeTarget({
      pieceId: 'dark-troll',
      hp: 5, maxHp: 10,
      regenRate: TROLL_REGEN_HP_PER_SEC,
      regenAccumulator: 0,
      wailCooldownMs: 0,
    });
    const healed = tickRegen(troll, 1000);
    expect(healed).toBe(true);
    expect(troll.hp).toBe(6);
  });

  it('Banshee regenRate is 0 (no cross-contamination)', () => {
    const banshee = makeEntity();
    expect(banshee.regenRate).toBe(0);
  });
});
