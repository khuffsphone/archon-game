/**
 * arenaRenderer.ts — Archon 2.0 Canvas Renderer
 *
 * All canvas draw calls live here — completely separated from game logic.
 * Called once per rAF tick by the game loop.
 */
import type { ArenaEntity, HitEffect, Projectile } from './entities';
import { CANVAS_W, CANVAS_H, ARENA_BOUNDS, ENTITY_W, ENTITY_H } from './arenaConfig';

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
    const alpha = Math.min(1, fx.timeRemaining / 120);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${fx.type === 'death' ? 44 : 28}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = fx.faction === 'light' ? '#ffdd44' : '#dd44ff';
    ctx.shadowBlur = 16;
    ctx.shadowColor = fx.faction === 'light' ? '#ff8800' : '#8800ff';
    ctx.fillText(fx.type === 'death' ? '💀' : '⚡', fx.x, fx.y - (120 - fx.timeRemaining) * 0.6);
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
