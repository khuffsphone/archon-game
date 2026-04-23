/**
 * gameLoop.ts — Archon 2.0 Arena Game Loop
 *
 * Pure TypeScript class. Zero React dependencies.
 * Owns the requestAnimationFrame loop, input state, and all per-frame logic.
 *
 * v2.1 — Jump physics, ranged projectiles, caster AI improvements
 */
import type { ArenaEntity, HitEffect, HudSnapshot, Projectile } from './entities';
import type { AIController } from './arenaAI';
import { createAIController, tickAI } from './arenaAI';
import { moveEntity, moveProjectile, checkMeleeHit, checkProjectileHit, directionTo } from './arenaPhysics';
import {
  clearCanvas, drawBackground, drawFloor, drawEntity,
  drawHitEffects, drawCountdown, drawProjectiles,
} from './arenaRenderer';
import {
  ARENA_DURATION_MS, ARENA_COUNTDOWN_MS,
  CANVAS_W, CANVAS_H,
  PROJECTILE_SPEED, PROJECTILE_LIFETIME_MS, PROJECTILE_W, PROJECTILE_H,
  JUMP_IMPULSE,
} from './arenaConfig';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ArenaResult =
  | { winner: 'player'; remainingHp: number }
  | { winner: 'enemy';  remainingHp: number }
  | { winner: 'timeout-defender' };

export interface ArenaConfig {
  player:     ArenaEntity;
  enemy:      ArenaEntity;
  arenaUrl:   string;
  faction:    'light' | 'dark';
}

// ─── Input sets ───────────────────────────────────────────────────────────────

const MOVE_LEFT  = new Set(['ArrowLeft',  'a', 'A']);
const MOVE_RIGHT = new Set(['ArrowRight', 'd', 'D']);
const JUMP_KEYS  = new Set(['ArrowUp', 'w', 'W', ' ']);
const ATTACK     = new Set(['z', 'Z', 'x', 'X', 'Enter']);

// Attack state durations (ms)
const WINDUP_MS   = 110;
const ACTIVE_MS   = 100;
const RECOVERY_MS = 190;
const INVULN_MS   = 320;

// ─── Game Loop Class ──────────────────────────────────────────────────────────

let _projIdCounter = 0;

export class GameLoop {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: ArenaConfig;

  private rafId: number | null = null;
  private lastTime: number = 0;
  private heldKeys = new Set<string>();
  private justPressedKeys = new Set<string>(); // cleared each frame

  private player: ArenaEntity;
  private enemy:  ArenaEntity;
  private ai: AIController;

  private effects: HitEffect[] = [];
  private projectiles: Projectile[] = [];

  private phase: 'countdown' | 'fighting' | 'result' = 'countdown';
  private countdownMs   = ARENA_COUNTDOWN_MS;
  private timeRemainingMs = ARENA_DURATION_MS;

  private resultCb: ((r: ArenaResult) => void) | null = null;
  private hudCb:    ((snap: HudSnapshot) => void) | null = null;
  private winner: HudSnapshot['winner'] = null;

  constructor(canvas: HTMLCanvasElement, config: ArenaConfig) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d')!;
    this.config  = config;
    this.player  = config.player;
    this.enemy   = config.enemy;
    this.ai      = createAIController(this.enemy);
    canvas.width  = CANVAS_W;
    canvas.height = CANVAS_H;
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  start(): void {
    this._attachInput();
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this._tick);
  }

  stop(): void {
    if (this.rafId !== null) { cancelAnimationFrame(this.rafId); this.rafId = null; }
    this._detachInput();
  }

  onResult(cb: (r: ArenaResult) => void): void { this.resultCb = cb; }
  onHudUpdate(cb: (snap: HudSnapshot) => void): void { this.hudCb = cb; }

  // ─── Input ────────────────────────────────────────────────────────────────

  private _onKeyDown = (e: KeyboardEvent) => {
    if (!this.heldKeys.has(e.key)) this.justPressedKeys.add(e.key);
    this.heldKeys.add(e.key);
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key))
      e.preventDefault();
  };

  private _onKeyUp = (e: KeyboardEvent) => { this.heldKeys.delete(e.key); };

  private _attachInput(): void {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup',   this._onKeyUp);
  }

  private _detachInput(): void {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup',   this._onKeyUp);
  }

  // ─── Main tick ────────────────────────────────────────────────────────────

  private _tick = (now: number): void => {
    const dt = Math.min(now - this.lastTime, 50);
    this.lastTime = now;
    this._update(dt);
    this._render();
    this._emitHud();
    this.justPressedKeys.clear();
    if (this.phase !== 'result') this.rafId = requestAnimationFrame(this._tick);
  };

  // ─── Update ───────────────────────────────────────────────────────────────

  private _update(dt: number): void {
    // Countdown
    if (this.phase === 'countdown') {
      this.countdownMs -= dt;
      if (this.countdownMs <= 0) { this.phase = 'fighting'; this.countdownMs = 0; }
      return;
    }
    if (this.phase === 'result') return;

    // Timer
    this.timeRemainingMs -= dt;
    if (this.timeRemainingMs <= 0) { this.timeRemainingMs = 0; this._endFight('timeout'); return; }

    // Tick cooldowns / invuln
    if (this.player.attackTimer  > 0) this.player.attackTimer  -= dt;
    if (this.enemy.attackTimer   > 0) this.enemy.attackTimer   -= dt;
    if (this.player.invulnTimer  > 0) this.player.invulnTimer  -= dt;
    if (this.enemy.invulnTimer   > 0) this.enemy.invulnTimer   -= dt;

    // Player attack state machine
    this._tickAttackState(this.player, this.enemy, dt);

    // Player input → velocity
    this._processPlayerInput(dt);
    moveEntity(this.player, dt);

    // Enemy AI tick
    const aiWantsAttack = tickAI(this.ai, this.enemy, this.player, dt);
    if (aiWantsAttack && this.enemy.attackState === 'idle' && this.enemy.attackTimer <= 0) {
      this._startAttack(this.enemy);
    }
    this._tickAttackState(this.enemy, this.player, dt);
    moveEntity(this.enemy, dt);

    // Projectiles
    this._tickProjectiles(dt);

    // Hit effects
    for (const fx of this.effects) fx.timeRemaining -= dt;
    this.effects = this.effects.filter(fx => fx.timeRemaining > 0);
  }

  // ─── Player input ─────────────────────────────────────────────────────────

  private _processPlayerInput(dt: number): void {
    void dt;
    const p = this.player;
    const speed = p.moveSpeed;

    p.vx = 0;
    // Don't reset vy — gravity is applied in moveEntity

    if ([...MOVE_LEFT].some(k  => this.heldKeys.has(k)))  { p.vx = -speed; p.facing = 'left';  }
    if ([...MOVE_RIGHT].some(k => this.heldKeys.has(k)))  { p.vx =  speed; p.facing = 'right'; }

    // Jump — only when on floor, triggered on key-press (not hold)
    const jumpPressed = [...JUMP_KEYS].some(k => this.justPressedKeys.has(k));
    if (jumpPressed && p.onFloor) {
      p.vy = JUMP_IMPULSE;
    }

    // Auto-face enemy while attacking
    if (p.attackState !== 'idle') p.facing = directionTo(p, this.enemy);

    // Attack: Z/X/Enter (NOT Space — Space is now jump)
    const wantsAttack = [...ATTACK].some(k => this.justPressedKeys.has(k));
    if (wantsAttack && p.attackState === 'idle' && p.attackTimer <= 0) {
      this._startAttack(p);
    }
  }

  // ─── Attack state machine ─────────────────────────────────────────────────

  private _startAttack(e: ArenaEntity): void {
    e.attackState = 'windup';
    e.attackStateTimer = WINDUP_MS;
  }

  private _tickAttackState(attacker: ArenaEntity, target: ArenaEntity, dt: number): void {
    if (attacker.attackState === 'idle') return;
    attacker.attackStateTimer -= dt;
    if (attacker.attackStateTimer > 0) return;

    switch (attacker.attackState) {
      case 'windup':
        attacker.attackState = 'active';
        attacker.attackStateTimer = ACTIVE_MS;
        this._resolveAttack(attacker, target);
        break;
      case 'active':
        attacker.attackState = 'recovery';
        attacker.attackStateTimer = RECOVERY_MS;
        break;
      case 'recovery':
        attacker.attackState = 'idle';
        attacker.attackTimer = attacker.attackCooldown;
        break;
    }
  }

  private _resolveAttack(attacker: ArenaEntity, target: ArenaEntity): void {
    if (attacker.isRanged) {
      // Fire a projectile instead of instant melee
      this._spawnProjectile(attacker);
    } else {
      // Instant melee check
      if (target.invulnTimer > 0) return;
      if (!checkMeleeHit(attacker, target)) return;
      this._applyDamage(attacker, target);
    }
  }

  // ─── Projectile system ────────────────────────────────────────────────────

  private _spawnProjectile(attacker: ArenaEntity): void {
    const dir = attacker.facing === 'right' ? 1 : -1;
    this.projectiles.push({
      id: _projIdCounter++,
      x: attacker.x + dir * (attacker.width / 2 + 10),
      y: attacker.y - attacker.height * 0.6,
      vx: PROJECTILE_SPEED * dir,
      vy: 0,
      faction: attacker.faction,
      damage: attacker.attackDamage,
      ownerSide: attacker.side,
      timeRemaining: PROJECTILE_LIFETIME_MS,
      width: PROJECTILE_W,
      height: PROJECTILE_H,
    });
    window.dispatchEvent(new CustomEvent('arena:sfx', { detail: { id: 'magic' } }));
  }

  private _tickProjectiles(dt: number): void {
    const surviving: Projectile[] = [];
    for (const proj of this.projectiles) {
      const alive = moveProjectile(proj, dt);
      if (!alive) continue;

      // Check hit against opposite entity
      const target = proj.ownerSide === 'player' ? this.enemy : this.player;
      if (target.invulnTimer <= 0 && checkProjectileHit(proj, target)) {
        this._applyDamage({ ...target, attackDamage: proj.damage, faction: proj.faction } as ArenaEntity, target);
        // Don't keep this projectile
        continue;
      }
      surviving.push(proj);
    }
    this.projectiles = surviving;
  }

  // ─── Damage ───────────────────────────────────────────────────────────────

  private _applyDamage(attacker: { attackDamage: number; faction: 'light' | 'dark' }, target: ArenaEntity): void {
    const dmg = Math.max(1, Math.round(attacker.attackDamage));
    target.hp = Math.max(0, target.hp - dmg);
    target.invulnTimer = INVULN_MS;

    this.effects.push({
      x: target.x,
      y: target.y - target.height * 0.6,
      faction: attacker.faction,
      timeRemaining: 200,
      type: target.hp <= 0 ? 'death' : 'hit',
    });

    window.dispatchEvent(new CustomEvent('arena:sfx', {
      detail: { id: target.hp <= 0
        ? (target.faction === 'dark' ? 'sfx-death-dark' : 'sfx-death-light')
        : 'sfx-melee-hit',
      },
    }));

    if (target.hp <= 0) {
      this._endFight(target.side === 'player' ? 'enemy-wins' : 'player-wins');
    }
  }

  // ─── Win condition ────────────────────────────────────────────────────────

  private _endFight(reason: 'player-wins' | 'enemy-wins' | 'timeout'): void {
    if (this.phase === 'result') return;
    this.phase = 'result';

    let result: ArenaResult;
    if (reason === 'player-wins') {
      result = { winner: 'player', remainingHp: this.player.hp };
      this.winner = 'player';
    } else if (reason === 'enemy-wins') {
      result = { winner: 'enemy', remainingHp: this.enemy.hp };
      this.winner = 'enemy';
    } else {
      result = { winner: 'timeout-defender' };
      this.winner = 'timeout';
    }

    this._render();
    this._emitHud();
    setTimeout(() => { this.resultCb?.(result); }, 1800);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  private _render(): void {
    const ctx = this.ctx;
    clearCanvas(ctx);
    drawBackground(ctx, this.config.arenaUrl, this.config.faction);
    drawFloor(ctx);
    drawEntity(ctx, this.player, this.player.attackState === 'active');
    drawEntity(ctx, this.enemy,  this.enemy.attackState  === 'active');
    drawProjectiles(ctx, this.projectiles);
    drawHitEffects(ctx, this.effects);
    if (this.phase === 'countdown') drawCountdown(ctx, Math.ceil(this.countdownMs / 1000));
  }

  // ─── HUD emission ─────────────────────────────────────────────────────────

  private _emitHud(): void {
    const snap: HudSnapshot = {
      playerHp:        this.player.hp,
      playerMaxHp:     this.player.maxHp,
      playerName:      this.player.name,
      enemyHp:         this.enemy.hp,
      enemyMaxHp:      this.enemy.maxHp,
      enemyName:       this.enemy.name,
      timeRemainingMs: this.timeRemainingMs,
      phase:           this.phase,
      countdownSec:    Math.ceil(this.countdownMs / 1000),
      winner:          this.winner,
    };
    this.hudCb?.(snap);
  }
}
