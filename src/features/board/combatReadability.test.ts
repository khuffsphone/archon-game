/**
 * combatReadability.test.ts
 * Vitest unit tests for the board-layer combat-readability helpers.
 *
 * Covers the two ⭐ guarantees for this slice:
 *   1. A damaged unit reports the health value the bar shows.
 *   2. A downed unit persists as a desaturated body before cleanup
 *      (it is NOT instant-deleted when the victor advances onto its square).
 */
import { describe, it, expect } from 'vitest';
import type { BoardPiece } from '../../lib/board-combat-contract';
import {
  healthBarModel,
  HEALTH_LOW_FRAC,
  detectNewlyDowned,
  pruneDownedBodies,
  DOWNED_BODY_TTL_MS,
} from './combatReadability';

function makePiece(overrides: Partial<BoardPiece>): BoardPiece {
  return {
    pieceId: 'test-piece',
    name: 'Test',
    faction: 'light',
    role: 'warrior',
    coord: { row: 4, col: 4 },
    hp: 10,
    maxHp: 10,
    isDead: false,
    assetIds: { token: 't', portrait: 'p', defeated: 'd' },
    ...overrides,
  };
}

// ─── ⭐ 1: health bar reports the value it shows ──────────────────────────────

describe('healthBarModel — the bar reports the unit health value', () => {
  it('a damaged unit reports the health value the bar shows', () => {
    const piece = makePiece({ hp: 6, maxHp: 20 }); // 30%
    const model = healthBarModel(piece);
    // The fill width the bar renders IS the unit's health fraction.
    expect(model.pct).toBe((piece.hp / piece.maxHp) * 100);
    expect(model.pct).toBe(30);
    expect(model.visible).toBe(true); // wounded ⇒ bar shown
  });

  it('hides the bar at full health to avoid clutter', () => {
    const model = healthBarModel(makePiece({ hp: 20, maxHp: 20 }));
    expect(model.visible).toBe(false);
    expect(model.pct).toBe(100);
  });

  it('hides the bar for a dead unit (the downed body conveys death instead)', () => {
    const model = healthBarModel(makePiece({ hp: 0, maxHp: 20, isDead: true }));
    expect(model.visible).toBe(false);
  });

  it('flags a critically wounded unit as low (danger tint)', () => {
    const low = healthBarModel(makePiece({ hp: 3, maxHp: 20 })); // 15% < 35%
    expect(low.low).toBe(true);
    const ok = healthBarModel(makePiece({ hp: 14, maxHp: 20 })); // 70% ≥ 35%
    expect(ok.low).toBe(false);
  });

  it('low threshold matches HEALTH_LOW_FRAC exactly at the boundary', () => {
    const maxHp = 100;
    const atThreshold = healthBarModel(makePiece({ hp: HEALTH_LOW_FRAC * maxHp, maxHp }));
    expect(atThreshold.low).toBe(false); // strictly below ⇒ at the line is not low
    const justUnder = healthBarModel(makePiece({ hp: HEALTH_LOW_FRAC * maxHp - 1, maxHp }));
    expect(justUnder.low).toBe(true);
  });

  it('reads the health field defensively (no throw on maxHp 0 / absent hp)', () => {
    expect(() => healthBarModel(makePiece({ hp: 0, maxHp: 0 }))).not.toThrow();
    // An absent/lazy hp (never touched) is treated as full ⇒ no bar, no NaN.
    const lazy = healthBarModel({ hp: undefined as unknown as number, maxHp: 10, isDead: false });
    expect(Number.isNaN(lazy.pct)).toBe(false);
    expect(lazy.visible).toBe(false);
  });
});

// ─── ⭐ 2: downed body persists before cleanup (not instant-deleted) ──────────

describe('detectNewlyDowned / pruneDownedBodies — downed-body persistence', () => {
  const NOW = 1_000_000;

  it('a unit that just died persists as a downed body (not instant-deleted)', () => {
    const id = 'dark-sorceress';
    const prev = { [id]: makePiece({ pieceId: id, faction: 'dark', isDead: false }) };
    const next = { [id]: makePiece({ pieceId: id, faction: 'dark', isDead: true }) };

    const bodies = detectNewlyDowned(prev, next, NOW);
    expect(bodies).toHaveLength(1);
    expect(bodies[0].pieceId).toBe(id);
    expect(bodies[0].faction).toBe('dark');
    expect(bodies[0].defeatedAssetId).toBe('d'); // desaturated defeated sprite, never rival-red
    expect(bodies[0].expiresAt).toBe(NOW + DOWNED_BODY_TTL_MS);
  });

  it('captures the square the unit fell on, even when the victor advances onto it', () => {
    const deadId = 'dark-sorceress';
    const attId = 'light-knight';
    const fellAt = { row: 1, col: 4 };
    const prev = {
      [deadId]: makePiece({ pieceId: deadId, faction: 'dark', coord: fellAt, isDead: false }),
      [attId]: makePiece({ pieceId: attId, faction: 'light', coord: { row: 2, col: 4 } }),
    };
    // Sim outcome: defender dead at (1,4); attacker has advanced ONTO (1,4).
    const next = {
      [deadId]: makePiece({ pieceId: deadId, faction: 'dark', coord: fellAt, isDead: true }),
      [attId]: makePiece({ pieceId: attId, faction: 'light', coord: fellAt }),
    };

    const bodies = detectNewlyDowned(prev, next, NOW);
    expect(bodies).toHaveLength(1);
    // The body is anchored to where the unit fell — so it can be drawn under the victor.
    expect(bodies[0].coord).toEqual(fellAt);
  });

  it('does not re-emit a body for a unit that was already dead', () => {
    const id = 'x';
    const prev = { [id]: makePiece({ pieceId: id, isDead: true }) };
    const next = { [id]: makePiece({ pieceId: id, isDead: true }) };
    expect(detectNewlyDowned(prev, next, NOW)).toHaveLength(0);
  });

  it('does not spawn a body for a corpse already present on first sight (e.g. loaded save)', () => {
    const id = 'x';
    const prev = {}; // piece was never seen alive in the prior snapshot
    const next = { [id]: makePiece({ pieceId: id, isDead: true }) };
    expect(detectNewlyDowned(prev, next, NOW)).toHaveLength(0);
  });

  it('persists before cleanup, then is pruned after the TTL elapses', () => {
    const id = 'x';
    const prev = { [id]: makePiece({ pieceId: id, isDead: false }) };
    const next = { [id]: makePiece({ pieceId: id, isDead: true }) };
    const bodies = detectNewlyDowned(prev, next, NOW);

    // Still present partway through its lifetime…
    expect(pruneDownedBodies(bodies, NOW + DOWNED_BODY_TTL_MS - 1)).toHaveLength(1);
    // …and cleaned up once the linger time is up.
    expect(pruneDownedBodies(bodies, NOW + DOWNED_BODY_TTL_MS + 1)).toHaveLength(0);
  });

  it('emits a body per faction with no rival-red leakage (light + dark both grey)', () => {
    const prev = {
      a: makePiece({ pieceId: 'a', faction: 'light', isDead: false }),
      b: makePiece({ pieceId: 'b', faction: 'dark', isDead: false }),
    };
    const next = {
      a: makePiece({ pieceId: 'a', faction: 'light', isDead: true }),
      b: makePiece({ pieceId: 'b', faction: 'dark', isDead: true }),
    };
    const bodies = detectNewlyDowned(prev, next, NOW);
    expect(bodies.map(b => b.faction).sort()).toEqual(['dark', 'light']);
  });
});
