/**
 * gameLoop.ts — Archon 2.2 Arena Game Loop
 *
 * Reads the active Difficulty at startup and passes the corresponding
 * AIProfile to tickAI every frame. All other behaviour is unchanged from 2.1.
 */
import type { ArenaEntity, HitEffect, HudSnapshot, Projectile } from './entities';
import { BANSHEE_WAIL_FX_MS } from './entities';
import type { AIController } from './arenaAI';
import { createAIController, tickAI } from './arenaAI';
import { moveEntity, moveProjectile, checkMeleeHit, checkProjectileHit, directionTo } from './arenaPhysics';
import {
  clearCanvas, drawBackground, drawFloor, drawEntity,
  drawHitEffects, drawCountdown, drawProjectiles,
} from './arenaRenderer';
import {
  ARENA_DURATION_MS, ARENA_COUNTDOWN_MS, ARENA_RESULT_HOLD_MS,
  CANVAS_W, CANVAS_H,
  PROJECTILE_SPEED, PROJECTILE_LIFETIME_MS, PROJECTILE_W, PROJECTILE_H,
  JUMP_IMPULSE, HIT_FX_MS, DEATH_FX_MS,
} from './arenaConfig';
import { getDifficulty, getActiveProfile } from './difficultyConfig';
import type { AIProfile, Difficulty } from './difficultyConfig';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ArenaResult =
  | { winner: 'player'; remainingHp: number }
  | { winner: 'enemy';  remainingHp: number }
  | { winner: 'timeout-defender' };

export interface ArenaConfig {
  player:   ArenaEntity;
  enemy:    ArenaEntity;
  arenaUrl: string;
  faction:  'light' | 'dark';
}

// ─── Input sets ───────────────────────────────────────────────────────────────

const MOVE_LEFT  = new Set(['ArrowLeft',  'a', 'A']);
const MOVE_RIGHT = new Set(['ArrowRight', 'd', 'D']);
const JUMP_KEYS  = new Set(['ArrowUp', 'w', 'W', ' ']);
const ATTACK     = new Set(['z', 'Z', 'x', 'X', 'Enter']);

const WINDUP_MS   = 110;
const ACTIVE_MS   = 100;
const RECOVERY_MS = 190;
/** Post-hit invulnerability window (ms). Raised 320→380 to prevent back-to-back hit stacking. */
const INVULN_MS   = 380;

/** HP Phoenix is restored to on rebirth (fraction of maxHp) */
const PHOENIX_REBIRTH_HP_FRAC = 0.4;
/** Invulnerability granted to Phoenix on rebirth (ms) */
const PHOENIX_REBIRTH_INVULN_MS = 1_200;
/** Duration of the rebirth flash effect (ms) */
const PHOENIX_REBIRTH_FLASH_MS  = 900;

/** Duration of the regen particle effect (ms) */
const TROLL_REGEN_FX_MS = 600;

let _projIdCounter = 0;

// ─── Game Loop ────────────────────────────────────────────────────────────────

export class GameLoop {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: ArenaConfig;

  private rafId: number | null = null;
  private lastTime = 0;
  private heldKeys      = new Set<string>();
  private justPressedKeys = new Set<string>();

  private player: ArenaEntity;
  private enemy:  ArenaEntity;
  private ai: AIController;
  private profile: AIProfile;
  private difficulty: Difficulty;

  private effects: HitEffect[] = [];
  private projectiles: Projectile[] = [];

  private phase: 'countdown' | 'fighting' | 'result' = 'countdown';
  private countdownMs     = ARENA_COUNTDOWN_MS;
  private timeRemainingMs = ARENA_DURATION_MS;

  private resultCb: ((r: ArenaResult) => void) | null = null;
  private hudCb:    ((snap: HudSnapshot) => void) | null = null;
  private winner: HudSnapshot['winner'] = null;
  /** Guards against resultCb being called more than once per fight */
  private _resultFired = false;

  constructor(canvas: HTMLCanvasElement, config: ArenaConfig) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d')!;
    this.config  = config;
    this.player  = config.player;
    this.enemy   = config.enemy;

    // Read difficulty once at arena launch
    this.difficulty = getDifficulty();
    this.profile    = getActiveProfile();
    this.ai = createAIController(this.enemy, this.profile);

    canvas.width  = CANVAS_W;
    canvas.height = CANVAS_H;
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  start(): void { this._attachInput(); this.lastTime = performance.now(); this.rafId = requestAnimationFrame(this._tick); }
  stop():  void { if (this.rafId !== null) { cancelAnimationFrame(this.rafId); this.rafId = null; } this._detachInput(); }
  onResult(cb: (r: ArenaResult) => void): void { this.resultCb = cb; }
  onHudUpdate(cb: (s: HudSnapshot) => void): void { this.hudCb = cb; }

  // ─── Input ────────────────────────────────────────────────────────────────

  private _onKeyDown = (e: KeyboardEvent) => {
    if (!this.heldKeys.has(e.key)) this.justPressedKeys.add(e.key);
    this.heldKeys.add(e.key);
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
  };
  private _onKeyUp = (e: KeyboardEvent) => { this.heldKeys.delete(e.key); };
  private _attachInput() { window.addEventListener('keydown', this._onKeyDown); window.addEventListener('keyup', this._onKeyUp); }
  private _detachInput() { window.removeEventListener('keydown', this._onKeyDown); window.removeEventListener('keyup', this._onKeyUp); }

  // ─── Tick ─────────────────────────────────────────────────────────────────

  private _tick = (now: number) => {
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
    if (this.phase === 'countdown') {
      this.countdownMs -= dt;
      if (this.countdownMs <= 0) { this.phase = 'fighting'; this.countdownMs = 0; }
      return;
    }
    if (this.phase === 'result') return;

    this.timeRemainingMs -= dt;
    if (this.timeRemainingMs <= 0) { this.timeRemainingMs = 0; this._endFight('timeout'); return; }

    if (this.player.attackTimer  > 0) this.player.attackTimer  -= dt;
    if (this.enemy.attackTimer   > 0) this.enemy.attackTimer   -= dt;
    if (this.player.invulnTimer  > 0) this.player.invulnTimer  -= dt;
    if (this.enemy.invulnTimer   > 0) this.enemy.invulnTimer   -= dt;

    // Player
    this._tickAttackState(this.player, this.enemy, dt);
    this._processPlayerInput();
    moveEntity(this.player, dt);

    // Enemy AI — pass profile for this session's difficulty
    const aiWantsAttack = tickAI(this.ai, this.enemy, this.player, dt, this.profile);
    if (aiWantsAttack && this.enemy.attackState === 'idle' && this.enemy.attackTimer <= 0) {
      this._startAttack(this.enemy);
    }
    this._tickAttackState(this.enemy, this.player, dt);
    moveEntity(this.enemy, dt);

    this._tickProjectiles(dt);

    // Troll Regen — tick after all combat, before effect cleanup
    this._tickRegen(this.player, dt);
    this._tickRegen(this.enemy,  dt);

    // Banshee Wail — auto-fires when ready and target is in range
    this._tickWail(this.player, this.enemy, dt);
    this._tickWail(this.enemy,  this.player, dt);

    for (const fx of this.effects) fx.timeRemaining -= dt;
    this.effects = this.effects.filter(fx => fx.timeRemaining > 0);
  }

  // ─── Player input ─────────────────────────────────────────────────────────

  private _processPlayerInput(): void {
    const p = this.player;
    const speed = p.moveSpeed;
    p.vx = 0;

    if ([...MOVE_LEFT].some(k  => this.heldKeys.has(k))) { p.vx = -speed; p.facing = 'left';  }
    if ([...MOVE_RIGHT].some(k => this.heldKeys.has(k))) { p.vx =  speed; p.facing = 'right'; }

    if ([...JUMP_KEYS].some(k => this.justPressedKeys.has(k)) && p.onFloor) {
      p.vy = JUMP_IMPULSE;
    }

    if (p.attackState !== 'idle') p.facing = directionTo(p, this.enemy);

    if ([...ATTACK].some(k => this.justPressedKeys.has(k)) && p.attackState === 'idle' && p.attackTimer <= 0) {
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
      this._spawnProjectile(attacker);
    } else {
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
    const alive: Projectile[] = [];
    for (const proj of this.projectiles) {
      if (!moveProjectile(proj, dt)) continue;
      const target = proj.ownerSide === 'player' ? this.enemy : this.player;
      if (target.invulnTimer <= 0 && checkProjectileHit(proj, target)) {
        const dmgAttacker = { attackDamage: proj.damage, faction: proj.faction } as Pick<ArenaEntity, 'attackDamage' | 'faction'>;
        this._applyDamage(dmgAttacker as ArenaEntity, target);
        continue;
      }
      alive.push(proj);
    }
    this.projectiles = alive;
  }

  // ─── Damage ───────────────────────────────────────────────────────────────

  private _applyDamage(attacker: Pick<ArenaEntity, 'attackDamage' | 'faction'>, target: ArenaEntity): void {
    const dmg = Math.max(1, Math.round(attacker.attackDamage));
    target.hp = Math.max(0, target.hp - dmg);
    target.invulnTimer = INVULN_MS;

    // ── Phoenix Rebirth interception ────────────────────────────────────────
    if (target.hp <= 0 && target.rebirthAvailable) {
      target.rebirthAvailable = false;
      target.hp = Math.max(1, Math.round(target.maxHp * PHOENIX_REBIRTH_HP_FRAC));
      target.invulnTimer = PHOENIX_REBIRTH_INVULN_MS;

      // Rebirth flash effect
      this.effects.push({
        x: target.x,
        y: target.y - target.height * 0.5,
        faction: target.faction,
        timeRemaining: PHOENIX_REBIRTH_FLASH_MS,
        type: 'rebirth',
      });

      window.dispatchEvent(new CustomEvent('arena:sfx', {
        detail: { id: 'sfx-teleport-light-v1' },
      }));
      return; // ← do NOT call _endFight
    }

    this.effects.push({
      x: target.x,
      y: target.y - target.height * 0.6,
      faction: attacker.faction,
      timeRemaining: target.hp <= 0 ? DEATH_FX_MS : HIT_FX_MS,
      type: target.hp <= 0 ? 'death' : 'hit',
    });

    window.dispatchEvent(new CustomEvent('arena:sfx', {
      detail: { id: target.hp <= 0
        ? (target.faction === 'dark' ? 'sfx-death-dark' : 'sfx-death-light')
        : 'sfx-melee-hit',
      },
    }));

    if (target.hp <= 0) this._endFight(target.side === 'player' ? 'enemy-wins' : 'player-wins');
  }

  // ─── Troll Regen ────────────────────────────────────────────────────────────────

  private _tickRegen(entity: ArenaEntity, dt: number): void {
    if (entity.regenRate <= 0) return;      // not a Troll
    if (entity.hp <= 0)        return;      // already defeated
    if (entity.hp >= entity.maxHp) return;  // already full

    entity.regenAccumulator += entity.regenRate * (dt / 1000);

    if (entity.regenAccumulator >= 1) {
      const healed = Math.floor(entity.regenAccumulator);
      entity.regenAccumulator -= healed;
      entity.hp = Math.min(entity.maxHp, entity.hp + healed);

      // Floating green "+" particle
      this.effects.push({
        x: entity.x,
        y: entity.y - entity.height * 0.7,
        faction: entity.faction,
        timeRemaining: TROLL_REGEN_FX_MS,
        type: 'regen',
      });
    }
  }

  // ─── Banshee Wail ─────────────────────────────────────────────────────────────

  private _tickWail(caster: ArenaEntity, target: ArenaEntity, dt: number): void {
    if (caster.wailCooldownMs <= 0) return; // not a Banshee
    if (caster.hp <= 0)             return; // defeated
    if (this.phase !== 'fighting')  return; // countdown or result

    if (caster.wailTimer > 0) { caster.wailTimer = Math.max(0, caster.wailTimer - dt); return; }

    // Timer is 0 — check range
    const dist = Math.hypot(caster.x - target.x, caster.y - target.y);
    if (dist > caster.wailRadius) return; // not close enough yet; keep waiting

    // ── Fire! ──────────────────────────────────────────────
    caster.wailTimer = caster.wailCooldownMs; // reset cooldown

    // Expanding ring VFX on the caster
    this.effects.push({
      x: caster.x,
      y: caster.y - caster.height * 0.5,
      faction: caster.faction,
      timeRemaining: BANSHEE_WAIL_FX_MS,
      type: 'wail',
    });

    window.dispatchEvent(new CustomEvent('arena:sfx', {
      detail: { id: 'sfx-magic-release' },
    }));

    // Apply damage to target (skips if target has invuln; handles Phoenix Rebirth)
    if (target.invulnTimer <= 0) {
      this._applyDamage({ attackDamage: caster.wailDamage, faction: caster.faction }, target);
    }
  }

  // ─── Win condition ───────────────────────────────────────────────────────────

  private _endFight(reason: 'player-wins' | 'enemy-wins' | 'timeout'): void {
    if (this.phase === 'result') return;
    if (this._resultFired) return; // belt-and-suspenders guard
    this.phase = 'result';
    let result: ArenaResult;
    if (reason === 'player-wins')      { result = { winner: 'player', remainingHp: this.player.hp }; this.winner = 'player'; }
    else if (reason === 'enemy-wins')  { result = { winner: 'enemy',  remainingHp: this.enemy.hp  }; this.winner = 'enemy';  }
    else                               { result = { winner: 'timeout-defender' };                     this.winner = 'timeout'; }
    this._render(); this._emitHud();
    this._resultFired = true;
    setTimeout(() => { this.resultCb?.(result); }, ARENA_RESULT_HOLD_MS);
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

  // ─── HUD snapshot ─────────────────────────────────────────────────────────

  private _emitHud(): void {
    const rebirthStatus = (e: ArenaEntity): 'ready' | 'used' | 'none' =>
      !e.rebirthAvailable && e.pieceId.toLowerCase().includes('phoenix') ? 'used'
      : e.rebirthAvailable ? 'ready'
      : 'none';

    const regenActive = (e: ArenaEntity): boolean =>
      e.regenRate > 0 && e.hp > 0 && e.hp < e.maxHp;

    const wailStatus = (e: ArenaEntity): 'ready' | 'cooldown' | 'none' =>
      e.wailCooldownMs <= 0 || e.hp <= 0 ? 'none'
      : e.wailTimer <= 0 ? 'ready'
      : 'cooldown';

    const sec = Math.ceil(this.countdownMs / 1000);
    const countdownLabel =
      this.phase === 'countdown'
        ? (sec > 0 ? String(sec) : 'FIGHT!')
        : '';

    this.hudCb?.({
      playerHp:        this.player.hp,
      playerMaxHp:     this.player.maxHp,
      playerName:      this.player.name,
      enemyHp:         this.enemy.hp,
      enemyMaxHp:      this.enemy.maxHp,
      enemyName:       this.enemy.name,
      timeRemainingMs: this.timeRemainingMs,
      phase:           this.phase,
      countdownSec:    sec,
      countdownLabel,
      winner:          this.winner,
      difficulty:      this.difficulty,
      playerRebirthStatus: rebirthStatus(this.player),
      enemyRebirthStatus:  rebirthStatus(this.enemy),
      playerRegenActive:   regenActive(this.player),
      enemyRegenActive:    regenActive(this.enemy),
      playerWailStatus:    wailStatus(this.player),
      enemyWailStatus:     wailStatus(this.enemy),
    });
  }
}
