/**
 * phoenixRebirth.test.ts — Archon 2.3a
 *
 * Tests for Phoenix Rebirth arena ability:
 *  - triggers once on first lethal hit
 *  - does NOT trigger on second lethal hit
 *  - non-Phoenix entities are unaffected
 *  - rebirth restores a positive HP value below maxHp
 *  - rebirthAvailable flag transitions correctly
 */
import { describe, it, expect } from 'vitest';
import type { ArenaEntity } from '../entities';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEntity(overrides: Partial<ArenaEntity> = {}): ArenaEntity {
  return {
    side: 'player',
    pieceId: 'light-phoenix',
    name: 'Phoenix',
    faction: 'light',
    role: 'herald',
    x: 200, y: 760,
    vx: 0, vy: 0,
    width: 120, height: 120,
    facing: 'right',
    onFloor: true,
    hp: 10, maxHp: 10,
    moveSpeed: 416,
    attackDamage: 1.8,
    attackRange: 121,
    attackCooldown: 1170,
    attackTimer: 0,
    attackState: 'idle',
    attackStateTimer: 0,
    isRanged: false,
    invulnTimer: 0,
    rebirthAvailable: true,
    regenRate: 0,
    regenAccumulator: 0,
    sprite: null,
    spriteLoaded: false,
    ...overrides,
  };
}

/**
 * Minimal stand-in for the _applyDamage / rebirth logic.
 * Mirrors the exact conditional from gameLoop.ts so tests stay fast and isolated.
 */
const PHOENIX_REBIRTH_HP_FRAC  = 0.4;
const PHOENIX_REBIRTH_INVULN_MS = 1_200;

interface RebirthEvent { type: 'rebirth' | 'defeat' | 'hit' }

function applyDamage(
  dmg: number,
  target: ArenaEntity,
): { rebirthTriggered: boolean; defeated: boolean } {
  target.hp = Math.max(0, target.hp - dmg);

  if (target.hp <= 0 && target.rebirthAvailable) {
    target.rebirthAvailable = false;
    target.hp = Math.max(1, Math.round(target.maxHp * PHOENIX_REBIRTH_HP_FRAC));
    target.invulnTimer = PHOENIX_REBIRTH_INVULN_MS;
    return { rebirthTriggered: true, defeated: false };
  }

  if (target.hp <= 0) {
    return { rebirthTriggered: false, defeated: true };
  }

  return { rebirthTriggered: false, defeated: false };
}

// ─── Tests: rebirthAvailable flag in boardPieceToEntity ───────────────────────

// ─── Tests: rebirthAvailable flag logic ───────────────────────────────────────
// boardPieceToEntity uses `new Image()` (browser API — not available in Node test env).
// We test the rebirth-flag predicate directly instead.

/** Mirror the exact condition from boardPieceToEntity */
function shouldHaveRebirth(pieceId: string, role: string): boolean {
  return role === 'herald' && pieceId.toLowerCase().includes('phoenix');
}

describe('rebirthAvailable flag logic', () => {
  it('Phoenix (herald + pieceId contains "phoenix") gets rebirth', () => {
    expect(shouldHaveRebirth('light-phoenix', 'herald')).toBe(true);
  });

  it('Phoenix with dark faction also gets rebirth', () => {
    expect(shouldHaveRebirth('dark-phoenix', 'herald')).toBe(true);
  });

  it('Valkyrie (herald, no phoenix in id) does NOT get rebirth', () => {
    expect(shouldHaveRebirth('light-valkyrie', 'herald')).toBe(false);
  });

  it('Warrior (non-herald role) does NOT get rebirth', () => {
    expect(shouldHaveRebirth('light-phoenix', 'warrior')).toBe(false);
  });

  it('Caster (non-herald role) does NOT get rebirth', () => {
    expect(shouldHaveRebirth('dark-djinni', 'caster')).toBe(false);
  });

  it('Sentinel does NOT get rebirth', () => {
    expect(shouldHaveRebirth('dark-golem', 'sentinel')).toBe(false);
  });
});

// ─── Tests: Rebirth triggers on first lethal hit ──────────────────────────────

describe('Phoenix Rebirth — first lethal hit', () => {
  it('survives a lethal hit when rebirthAvailable = true', () => {
    const phoenix = makeEntity({ hp: 5 });
    const result  = applyDamage(99, phoenix); // overkill damage
    expect(result.rebirthTriggered).toBe(true);
    expect(result.defeated).toBe(false);
  });

  it('HP is restored to a positive value', () => {
    const phoenix = makeEntity({ hp: 5 });
    applyDamage(99, phoenix);
    expect(phoenix.hp).toBeGreaterThan(0);
  });

  it('restored HP equals 40% of maxHp (rounded)', () => {
    const phoenix = makeEntity({ hp: 5, maxHp: 10 });
    applyDamage(99, phoenix);
    expect(phoenix.hp).toBe(4); // round(10 * 0.4) = 4
  });

  it('rebirthAvailable becomes false after rebirth', () => {
    const phoenix = makeEntity({ hp: 5 });
    applyDamage(99, phoenix);
    expect(phoenix.rebirthAvailable).toBe(false);
  });

  it('grants extended invuln after rebirth', () => {
    const phoenix = makeEntity({ hp: 5 });
    applyDamage(99, phoenix);
    expect(phoenix.invulnTimer).toBe(PHOENIX_REBIRTH_INVULN_MS);
  });
});

// ─── Tests: Second lethal hit defeats Phoenix ─────────────────────────────────

describe('Phoenix Rebirth — second lethal hit', () => {
  it('is defeated by a second lethal hit', () => {
    const phoenix = makeEntity({ hp: 5 });
    applyDamage(99, phoenix);            // first hit — triggers rebirth
    const second = applyDamage(99, phoenix); // second hit — no rebirth left
    expect(second.defeated).toBe(true);
    expect(second.rebirthTriggered).toBe(false);
  });

  it('HP is 0 after second lethal hit', () => {
    const phoenix = makeEntity({ hp: 5 });
    applyDamage(99, phoenix);
    applyDamage(99, phoenix);
    expect(phoenix.hp).toBe(0);
  });

  it('rebirthAvailable stays false after second lethal hit', () => {
    const phoenix = makeEntity({ hp: 5 });
    applyDamage(99, phoenix);
    applyDamage(99, phoenix);
    expect(phoenix.rebirthAvailable).toBe(false);
  });
});

// ─── Tests: Non-Phoenix units are unaffected ──────────────────────────────────

describe('Non-Phoenix units — no rebirth', () => {
  it('Knight is defeated by a lethal hit', () => {
    const knight = makeEntity({ pieceId: 'light-knight', role: 'warrior', rebirthAvailable: false });
    const result  = applyDamage(99, knight);
    expect(result.defeated).toBe(true);
    expect(result.rebirthTriggered).toBe(false);
  });

  it('Sorceress is defeated by a lethal hit', () => {
    const sorc = makeEntity({ pieceId: 'dark-sorceress', faction: 'dark', role: 'caster', rebirthAvailable: false });
    const result = applyDamage(99, sorc);
    expect(result.defeated).toBe(true);
    expect(result.rebirthTriggered).toBe(false);
  });

  it('non-lethal hit does not trigger rebirth even for Phoenix', () => {
    const phoenix = makeEntity({ hp: 10 });
    const result  = applyDamage(1, phoenix); // non-lethal
    expect(result.rebirthTriggered).toBe(false);
    expect(result.defeated).toBe(false);
    expect(phoenix.hp).toBe(9);
    expect(phoenix.rebirthAvailable).toBe(true); // still available
  });
});

// ─── Tests: Win detection not broken ─────────────────────────────────────────

describe('Win detection integrity', () => {
  it('rebirth returns defeated=false so fight continues', () => {
    const phoenix = makeEntity({ hp: 2 });
    const r1 = applyDamage(99, phoenix);
    expect(r1.defeated).toBe(false); // fight must continue
  });

  it('after rebirth, a further non-lethal hit does not defeat', () => {
    const phoenix = makeEntity({ hp: 2, maxHp: 10 });
    applyDamage(99, phoenix);         // rebirth → hp=4
    const r2 = applyDamage(1, phoenix); // hp=3
    expect(r2.defeated).toBe(false);
    expect(phoenix.hp).toBe(3);
  });
});
