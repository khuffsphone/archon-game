/**
 * arenaRenderer.ts — Archon 2.0 Canvas Renderer
 *
 * All canvas draw calls live here — completely separated from game logic.
 * Called once per rAF tick by the game loop.
 */
import type { ArenaEntity, HitEffect, Projectile } from './entities';
import { BANSHEE_WAIL_RADIUS } from './entities';
import { CANVAS_W, CANVAS_H, ARENA_BOUNDS, ENTITY_W, ENTITY_H, HIT_FX_MS, DEATH_FX_MS } from './arenaConfig';

// Ability-specific effect durations (match values in gameLoop.ts / entities.ts)
const REBIRTH_FX_MS = 900;
const REGEN_FX_MS   = 600;
const WAIL_FX_MS    = 800;
// HIT_FX_MS and DEATH_FX_MS are imported from arenaConfig above.

// ─── Preloaded arena backgrounds ─────────────────────────────────────────────

const bgCache = new Map<string, HTMLImageElement>();

function getBg(url: string): HTMLImageElement | null {
  if (bgCache.has(url)) return bgCache.get(url)!;
  const img = new Image();
  img.src = url;
  bgCache.set(url, img);
  return img.complete ? img : null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

// ─── Draw calls ──────────────────────────────────────────────────────────────

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  arenaUrl: string,
  faction: 'light' | 'dark',
): void {
  const bg = getBg(arenaUrl);
  if (bg && bg.complete && bg.naturalWidth > 0) {
    ctx.drawImage(bg, 0, 0, CANVAS_W, CANVAS_H);
  } else {
    // Fallback gradient while image loads
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    if (faction === 'light') {
      grad.addColorStop(0, '#1a2a4a');
      grad.addColorStop(1, '#0d1520');
    } else {
      grad.addColorStop(0, '#1a0a2a');
      grad.addColorStop(1, '#0d0510');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  // Dark vignette overlay for readability
  const vignette = ctx.createRadialGradient(
    CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.2,
    CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.85,
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

export function drawFloor(ctx: CanvasRenderingContext2D): void {
  // Glowing floor line
  ctx.save();
  ctx.shadowBlur = 24;
  ctx.shadowColor = 'rgba(200,180,100,0.5)';
  ctx.strokeStyle = 'rgba(220,200,120,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ARENA_BOUNDS.left, ARENA_BOUNDS.floor);
  ctx.lineTo(ARENA_BOUNDS.right, ARENA_BOUNDS.floor);
  ctx.stroke();
  ctx.restore();
}

export function drawEntity(
  ctx: CanvasRenderingContext2D,
  e: ArenaEntity,
  isAttacking: boolean,
): void {
  ctx.save();

  const left = e.x - ENTITY_W / 2;
  const top  = e.y - ENTITY_H;

  // Flip sprite based on facing
  if (e.facing === 'left') {
    ctx.translate(e.x, 0);
    ctx.scale(-1, 1);
    ctx.translate(-e.x, 0);
  }

  // Glow ring under entity
  const glowColor = e.faction === 'light'
    ? 'hsl(210, 80%, 60%)'
    : 'hsl(280, 65%, 55%)';
  ctx.shadowBlur   = isAttacking ? 48 : 28;
  ctx.shadowColor  = glowColor;

  // Draw sprite or fallback circle
  if (e.sprite && e.spriteLoaded && e.sprite.complete && e.sprite.naturalWidth > 0) {
    ctx.globalAlpha = e.invulnTimer > 0
      ? 0.5 + 0.5 * Math.sin(e.invulnTimer * 0.05) // flicker
      : 1.0;
    ctx.drawImage(e.sprite, left, top, ENTITY_W, ENTITY_H);
  } else {
    // Placeholder circle while sprite loads
    ctx.fillStyle = e.faction === 'light' ? 'hsl(210,70%,60%)' : 'hsl(280,60%,55%)';
    ctx.beginPath();
    ctx.arc(e.x, e.y - ENTITY_H / 2, ENTITY_H / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // Attack flash overlay
  if (isAttacking) {
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = e.faction === 'light' ? '#88ccff' : '#cc88ff';
    ctx.fillRect(left - 8, top - 8, ENTITY_W + 16, ENTITY_H + 16);
    ctx.restore();
  }

  // Name label
  ctx.save();
  ctx.font = 'bold 18px "Cinzel", serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.shadowBlur = 6;
  ctx.shadowColor = '#000';
  ctx.fillText(e.name, e.x, e.y - ENTITY_H - 12);
  ctx.restore();
}

export function drawHitEffects(
  ctx: CanvasRenderingContext2D,
  effects: HitEffect[],
): void {
  for (const fx of effects) {
    ctx.save();

    if (fx.type === 'rebirth') {
      // Expanding golden ring + phoenix emoji
      const progress = 1 - fx.timeRemaining / REBIRTH_FX_MS; // 0→1 as effect plays
      const radius   = 30 + progress * 140;
      const alpha    = Math.max(0, 1 - progress * 1.1);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#ffdd44';
      ctx.shadowBlur  = 40;
      ctx.shadowColor = '#ffaa00';
      ctx.lineWidth   = 6 * (1 - progress);
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Second inner ring
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth   = 3 * (1 - progress);
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, radius * 0.55, 0, Math.PI * 2);
      ctx.stroke();

      // Phoenix emoji
      const emojiAlpha = progress < 0.6 ? 1 : Math.max(0, 1 - (progress - 0.6) / 0.4);
      ctx.globalAlpha  = emojiAlpha;
      ctx.font         = 'bold 56px sans-serif';
      ctx.textAlign    = 'center';
      ctx.shadowBlur   = 30;
      ctx.shadowColor  = '#ffaa00';
      ctx.fillText('🔥', fx.x, fx.y - 20 - progress * 30);
    } else if (fx.type === 'regen') {
      // Floating green "+1" that rises and fades
      const progress = 1 - fx.timeRemaining / REGEN_FX_MS;
      const alpha    = Math.max(0, 1 - progress * 1.2);
      const yOffset  = progress * 40;
      ctx.globalAlpha = alpha;
      ctx.font        = 'bold 22px sans-serif';
      ctx.textAlign   = 'center';
      ctx.fillStyle   = '#44ff88';
      ctx.shadowBlur  = 14;
      ctx.shadowColor = '#00cc44';
      ctx.fillText('+1', fx.x, fx.y - yOffset);
    } else if (fx.type === 'wail') {
      // Purple/white expanding dual ring
      const progress = 1 - fx.timeRemaining / WAIL_FX_MS; // 0→1
      const outerR   = BANSHEE_WAIL_RADIUS * progress;    // expands to full wail radius
      const innerR   = outerR * 0.5;
      const alpha    = Math.max(0, 1 - progress * 1.15);

      ctx.globalAlpha = alpha;
      // Outer ring — purple
      ctx.strokeStyle = '#cc44ff';
      ctx.shadowBlur  = 36;
      ctx.shadowColor = '#9900cc';
      ctx.lineWidth   = 4 * (1 - progress * 0.8);
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, Math.max(1, outerR), 0, Math.PI * 2);
      ctx.stroke();
      // Inner ring — white
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth   = 2 * (1 - progress * 0.8);
      ctx.shadowBlur  = 16;
      ctx.shadowColor = '#cc88ff';
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, Math.max(1, innerR), 0, Math.PI * 2);
      ctx.stroke();
      // Ghost emoji floats up
      const emojiAlpha = progress < 0.4 ? 1 : Math.max(0, 1 - (progress - 0.4) / 0.6);
      ctx.globalAlpha = emojiAlpha;
      ctx.font        = 'bold 40px sans-serif';
      ctx.textAlign   = 'center';
      ctx.shadowBlur  = 20;
      ctx.shadowColor = '#9900cc';
      ctx.fillText('👻', fx.x, fx.y - 10 - progress * 30);
    } else if (fx.type === 'hit') {
      // Hit spark: rises upward, fades out over HIT_FX_MS
      const progress = 1 - fx.timeRemaining / HIT_FX_MS; // 0→1
      const alpha    = Math.max(0, 1 - progress * 1.1);
      const yRise    = progress * 50;
      ctx.globalAlpha = alpha;
      ctx.font        = 'bold 30px sans-serif';
      ctx.textAlign   = 'center';
      ctx.fillStyle   = fx.faction === 'light' ? '#ffdd44' : '#dd44ff';
      ctx.shadowBlur  = 18;
      ctx.shadowColor = fx.faction === 'light' ? '#ff8800' : '#8800ff';
      ctx.fillText('⚡', fx.x, fx.y - yRise);
    } else if (fx.type === 'death') {
      // Death: big skull, rises and fades over DEATH_FX_MS
      const progress = 1 - fx.timeRemaining / DEATH_FX_MS;
      const alpha    = Math.max(0, 1 - progress * 1.05);
      const yRise    = progress * 90;
      ctx.globalAlpha = alpha;
      ctx.font        = 'bold 52px sans-serif';
      ctx.textAlign   = 'center';
      ctx.shadowBlur  = 24;
      ctx.shadowColor = fx.faction === 'light' ? '#ff8800' : '#8800ff';
      ctx.fillText('💀', fx.x, fx.y - yRise);
    } else {
      // Unknown effect type — minimal fallback
      ctx.globalAlpha = Math.max(0, fx.timeRemaining / 200);
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('?', fx.x, fx.y);
    }

    ctx.restore();
  }
}

export function drawCountdown(
  ctx: CanvasRenderingContext2D,
  sec: number,
): void {
  ctx.save();
  ctx.font = 'bold 200px "Cinzel", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,220,80,0.9)';
  ctx.shadowBlur = 80;
  ctx.shadowColor = 'rgba(255,180,0,0.8)';
  ctx.fillText(sec > 0 ? String(sec) : 'FIGHT!', CANVAS_W / 2, CANVAS_H / 2);
  ctx.restore();
}

export function drawProjectiles(
  ctx: CanvasRenderingContext2D,
  projectiles: Projectile[],
): void {
  for (const proj of projectiles) {
    const alpha = Math.min(1, proj.timeRemaining / 300);
    ctx.save();
    ctx.globalAlpha = alpha;

    const color = proj.faction === 'light'
      ? 'hsl(200, 90%, 70%)'
      : 'hsl(280, 80%, 70%)';
    const glowColor = proj.faction === 'light'
      ? 'hsl(200, 90%, 55%)'
      : 'hsl(280, 80%, 55%)';

    // Glow trail
    ctx.shadowBlur = 28;
    ctx.shadowColor = glowColor;

    // Core bolt
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(proj.x, proj.y, proj.width / 2, proj.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bright center
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(proj.x, proj.y, proj.width / 5, proj.height / 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export function clearCanvas(ctx: CanvasRenderingContext2D): void {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
}
