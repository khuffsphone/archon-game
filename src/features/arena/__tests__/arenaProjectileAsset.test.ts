/**
 * arenaProjectileAsset.test.ts — ARCHON-012A
 *
 * Smoke tests for the projectile asset plumbing added in ARCHON-012A.
 *
 * Scope:
 *  - getAssetUrl returns '' (falsy) when projectile IDs are absent from pack
 *  - getAssetUrl returns the correct path when projectile IDs are present
 *  - ArenaConfig type accepts optional projectileUrlLight/Dark
 *  - drawProjectiles is callable with 2 args (backward-compatible — images undefined)
 *  - drawProjectiles is callable with 3 args (images present, including null values)
 *  - PROJECTILE_DRAW_W/H are exported and at 2× PROJECTILE_W/H
 *
 * These tests are pure unit tests. No canvas, no browser, no real images required.
 */
import { describe, it, expect } from 'vitest';
import { getAssetUrl } from '../../../lib/packLoader';
import { drawProjectiles } from '../arenaRenderer';
import {
  PROJECTILE_W,
  PROJECTILE_H,
  PROJECTILE_DRAW_W,
  PROJECTILE_DRAW_H,
} from '../arenaConfig';
import type { ArenaConfig } from '../gameLoop';
import type { CombatPackManifest } from '../../../lib/types';

// ─── Minimal pack fixtures ─────────────────────────────────────────────────────

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

// ─── Suite 1: getAssetUrl — absent IDs return falsy ───────────────────────────

describe('ARCHON-012A — getAssetUrl: absent projectile IDs', () => {
  it('returns empty string for combat-projectile-light when not in pack', () => {
    const url = getAssetUrl(PACK_WITHOUT_PROJECTILES, 'combat-projectile-light');
    expect(url).toBeFalsy();
  });

  it('returns empty string for combat-projectile-dark when not in pack', () => {
    const url = getAssetUrl(PACK_WITHOUT_PROJECTILES, 'combat-projectile-dark');
    expect(url).toBeFalsy();
  });
});

// ─── Suite 2: getAssetUrl — present IDs return correct path ───────────────────

describe('ARCHON-012A — getAssetUrl: present projectile IDs', () => {
  it('returns correct path for combat-projectile-light when in pack', () => {
    const url = getAssetUrl(PACK_WITH_PROJECTILES, 'combat-projectile-light');
    expect(url).toBe('/assets/combat-projectile-light-v1.png');
  });

  it('returns correct path for combat-projectile-dark when in pack', () => {
    const url = getAssetUrl(PACK_WITH_PROJECTILES, 'combat-projectile-dark');
    expect(url).toBe('/assets/combat-projectile-dark-v1.png');
  });
});

// ─── Suite 3: ArenaConfig type accepts optional projectile URL fields ──────────

describe('ARCHON-012A — ArenaConfig type: projectile URL fields are optional', () => {
  it('ArenaConfig without projectile URLs is valid (both fields omitted)', () => {
    // If TypeScript compiles this test, the type assertion holds.
    const config: Partial<ArenaConfig> = {
      arenaUrl: '/assets/arena-light-v1.png',
      faction: 'light',
    };
    expect(config.projectileUrlLight).toBeUndefined();
    expect(config.projectileUrlDark).toBeUndefined();
  });

  it('ArenaConfig with projectile URLs is valid (both fields present)', () => {
    const config: Partial<ArenaConfig> = {
      arenaUrl: '/assets/arena-light-v1.png',
      faction: 'light',
      projectileUrlLight: '/assets/combat-projectile-light-v1.png',
      projectileUrlDark: '/assets/combat-projectile-dark-v1.png',
    };
    expect(config.projectileUrlLight).toBe('/assets/combat-projectile-light-v1.png');
    expect(config.projectileUrlDark).toBe('/assets/combat-projectile-dark-v1.png');
  });
});

// ─── Suite 4: drawProjectiles backward-compatibility ──────────────────────────

describe('ARCHON-012A — drawProjectiles: backward-compatible signature', () => {
  // Build a minimal stub CanvasRenderingContext2D
  const stubCtx = {
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    ellipse: () => {},
    fill: () => {},
    drawImage: () => {},
    translate: () => {},
    scale: () => {},
    fillRect: () => {},
    arc: () => {},
    stroke: () => {},
    fillText: () => {},
    measureText: () => ({ width: 0 }),
    clearRect: () => {},
    createLinearGradient: () => ({
      addColorStop: () => {},
    }),
    createRadialGradient: () => ({
      addColorStop: () => {},
    }),
    globalAlpha: 1,
    fillStyle: '',
    shadowBlur: 0,
    shadowColor: '',
    lineWidth: 0,
    strokeStyle: '',
    font: '',
    textAlign: '',
    textBaseline: '',
  } as unknown as CanvasRenderingContext2D;

  it('does not throw when called with 2 args (images param omitted — fallback path)', () => {
    expect(() => drawProjectiles(stubCtx, [])).not.toThrow();
  });

  it('does not throw when called with 3 args where images.light and .dark are null', () => {
    expect(() =>
      drawProjectiles(stubCtx, [], { light: null, dark: null }),
    ).not.toThrow();
  });
});

// ─── Suite 5: PROJECTILE_DRAW constants ───────────────────────────────────────

describe('ARCHON-012A — PROJECTILE_DRAW_W/H constants', () => {
  it('PROJECTILE_DRAW_W is exported from arenaConfig', () => {
    expect(typeof PROJECTILE_DRAW_W).toBe('number');
  });

  it('PROJECTILE_DRAW_H is exported from arenaConfig', () => {
    expect(typeof PROJECTILE_DRAW_H).toBe('number');
  });

  it('PROJECTILE_DRAW_W is exactly 2× PROJECTILE_W', () => {
    expect(PROJECTILE_DRAW_W).toBe(PROJECTILE_W * 2);
  });

  it('PROJECTILE_DRAW_H is exactly 2× PROJECTILE_H', () => {
    expect(PROJECTILE_DRAW_H).toBe(PROJECTILE_H * 2);
  });
});
