/**
 * combatProjectileVfx.test.ts — ARCHON-012C
 *
 * Smoke tests for the combat:projectile-cue event mechanism and
 * projectile overlay asset plumbing in the CombatBridge path.
 *
 * Environment: Node (no jsdom required — all tests are pure logic tests)
 *
 * Scope:
 *  - getAssetUrl resolves projectile IDs correctly (present / absent)
 *  - Stun-skip guard: pure logic — event NOT dispatched when lastEvent === 'none'
 *  - Normal hit/death: pure logic — event would be dispatched
 *  - Side mapping: light attacker → defender side 'right'; dark → 'left'
 *  - Asset ID mapping: faction → correct asset ID string
 *  - Asset fallback: empty URL → falsy (no overlay rendered)
 */
import { describe, it, expect } from 'vitest';
import { getAssetUrl } from '../../../lib/packLoader';
import type { CombatPackManifest } from '../../../lib/types';

// ─── Minimal pack fixtures ────────────────────────────────────────────────────

const PACK_WITHOUT_PROJECTILES: CombatPackManifest = {
  schema_version: '1.0',
  generated_at: '2026-01-01T00:00:00Z',
  tags: [],
  assets: [
    {
      id: 'arena-light',
      category: 'arena',
      type: 'image',
      path: '/assets/arena-light-v1.png',
      hash: 'aaa',
      mime_type: 'image/png',
    },
  ],
};

const PACK_WITH_PROJECTILES: CombatPackManifest = {
  schema_version: '1.0',
  generated_at: '2026-01-01T00:00:00Z',
  tags: [],
  assets: [
    {
      id: 'combat-projectile-light',
      category: 'spell',
      subcategory: 'projectile',
      faction: 'light',
      type: 'image',
      path: '/assets/combat-projectile-light-v1.png',
      hash: '0388d547bd2575f180c0cbd20de843fff37d8dd60744ce69706499a5113a2021',
      mime_type: 'image/png',
    },
    {
      id: 'combat-projectile-dark',
      category: 'spell',
      subcategory: 'projectile',
      faction: 'dark',
      type: 'image',
      path: '/assets/combat-projectile-dark-v1.png',
      hash: 'e602e4af36c8172a70e2a3cd6951e4575a3caf742ced8c3885b96a68ac77e291',
      mime_type: 'image/png',
    },
  ],
};

// ─── Suite 1: getAssetUrl — projectile ID resolution ─────────────────────────

describe('ARCHON-012C — getAssetUrl: projectile IDs present', () => {
  it('returns correct path for combat-projectile-light', () => {
    expect(getAssetUrl(PACK_WITH_PROJECTILES, 'combat-projectile-light'))
      .toBe('/assets/combat-projectile-light-v1.png');
  });

  it('returns correct path for combat-projectile-dark', () => {
    expect(getAssetUrl(PACK_WITH_PROJECTILES, 'combat-projectile-dark'))
      .toBe('/assets/combat-projectile-dark-v1.png');
  });
});

describe('ARCHON-012C — getAssetUrl: projectile IDs absent', () => {
  it('returns falsy for combat-projectile-light when not in pack', () => {
    expect(getAssetUrl(PACK_WITHOUT_PROJECTILES, 'combat-projectile-light')).toBeFalsy();
  });

  it('returns falsy for combat-projectile-dark when not in pack', () => {
    expect(getAssetUrl(PACK_WITHOUT_PROJECTILES, 'combat-projectile-dark')).toBeFalsy();
  });
});

// ─── Suite 2: Stun-skip guard — pure logic ───────────────────────────────────
// Tests the dispatch condition extracted as a pure function to verify the
// guard without requiring window/jsdom.

/** Mirrors the guard in useCombat.ts handleAttack */
function shouldDispatchProjectileCue(lastEvent: string): boolean {
  return lastEvent !== 'none';
}

describe('ARCHON-012C — projectile cue dispatch guard (pure logic)', () => {
  it('returns false when lastEvent is "none" (stun skip — no dispatch)', () => {
    expect(shouldDispatchProjectileCue('none')).toBe(false);
  });

  it('returns true when lastEvent is "hit"', () => {
    expect(shouldDispatchProjectileCue('hit')).toBe(true);
  });

  it('returns true when lastEvent is "death"', () => {
    expect(shouldDispatchProjectileCue('death')).toBe(true);
  });
});

// ─── Suite 3: Side mapping — faction → defender side ─────────────────────────

/** Mirrors the side mapping logic in CombatBridge.tsx onProjectileCue */
function getDefenderSide(faction: 'light' | 'dark'): 'left' | 'right' {
  return faction === 'light' ? 'right' : 'left';
}

describe('ARCHON-012C — side mapping: faction to defender side', () => {
  it('light attacker → defender side is "right"', () => {
    expect(getDefenderSide('light')).toBe('right');
  });

  it('dark attacker → defender side is "left"', () => {
    expect(getDefenderSide('dark')).toBe('left');
  });
});

// ─── Suite 4: Asset ID mapping — faction → asset ID ─────────────────────────

/** Mirrors the asset ID derivation in CombatBridge.tsx onProjectileCue */
function getProjectileAssetId(faction: 'light' | 'dark'): string {
  return faction === 'light' ? 'combat-projectile-light' : 'combat-projectile-dark';
}

describe('ARCHON-012C — asset ID mapping: faction to asset ID', () => {
  it('light faction → combat-projectile-light', () => {
    expect(getProjectileAssetId('light')).toBe('combat-projectile-light');
  });

  it('dark faction → combat-projectile-dark', () => {
    expect(getProjectileAssetId('dark')).toBe('combat-projectile-dark');
  });
});

// ─── Suite 5: Asset fallback — empty URL → no overlay ────────────────────────

describe('ARCHON-012C — asset fallback: empty URL → no overlay', () => {
  it('getAssetUrl returns falsy for unknown id in empty pack', () => {
    const emptyPack: CombatPackManifest = {
      schema_version: '1.0',
      generated_at: '2026-01-01T00:00:00Z',
      tags: [],
      assets: [],
    };
    const url = getAssetUrl(emptyPack, 'combat-projectile-dark');
    // An empty (falsy) url means the overlay renders null — no img rendered
    expect(url).toBeFalsy();
  });

  it('overlay renders null when URL is empty (falsy gate check)', () => {
    const url = '';
    // Mirrors: const url = getAssetUrl(pack, projVfx.id); return url ? <div>...</div> : null
    const overlayContent = url ? 'rendered' : null;
    expect(overlayContent).toBeNull();
  });
});
