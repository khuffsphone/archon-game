/**
 * ArenaScene.tsx — Archon 2.0 Interactive Arena Shell
 *
 * React component that:
 *  1. Creates a fullscreen <canvas> and boots the GameLoop
 *  2. Renders a DOM HUD overlay (HP bars, timer, name plates) on top
 *  3. Listens to the game loop's HudSnapshot ref each rAF tick
 *  4. Translates ArenaResult back to CombatResultPayload for the board
 *
 * Integration: Rendered by App.tsx when ?arena=1 and combat fires.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { CombatLaunchPayload, CombatBridgeCallbacks } from '../../lib/board-combat-contract';
import type { CombatPackManifest } from '../../lib/types';
import { getAssetUrl } from '../../lib/packLoader';
import { boardPieceToEntity } from './entities';
import type { HudSnapshot } from './entities';
import { GameLoop } from './gameLoop';
import type { ArenaResult } from './gameLoop';
import { playSound } from '../board/audioEngine';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ArenaSceneProps {
  payload: CombatLaunchPayload;
  callbacks: CombatBridgeCallbacks;
}

// ─── Helper: get arena background URL based on square luminance ───────────────

function getArenaUrl(payload: CombatLaunchPayload): { url: string; faction: 'light' | 'dark' } {
  // Attacker's faction determines the arena theme
  const faction = payload.attacker.faction === 'light' ? 'light' : 'dark';
  const url = faction === 'light'
    ? '/assets/arena-light-v1.png'
    : '/assets/arena-dark-v1.png';
  return { url, faction };
}

// ─── HP Bar ───────────────────────────────────────────────────────────────────

function HpBar({
  hp, maxHp, faction, name, side,
}: {
  hp: number; maxHp: number; faction: 'light' | 'dark'; name: string; side: 'left' | 'right';
}) {
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const low = pct < 30;
  return (
    <div className={`arena-hp-panel arena-hp-panel--${side}`}>
      <span className="arena-hp-name">{name}</span>
      <div className="arena-hp-track">
        <div
          className={`arena-hp-fill arena-hp-fill--${faction} ${low ? 'arena-hp-fill--low' : ''}`}
          style={{ width: `${pct}%`, ...(side === 'right' ? { marginLeft: 'auto' } : {}) }}
        />
      </div>
      <span className="arena-hp-value">{Math.max(0, hp)} / {maxHp}</span>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ArenaScene({ payload, callbacks }: ArenaSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loopRef   = useRef<GameLoop | null>(null);
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [exiting, setExiting] = useState(false);

  const handleResult = useCallback((result: ArenaResult) => {
    // Translate ArenaResult → CombatResultPayload
    const { attacker, defender, contestedSquare } = payload;

    let outcome: 'attacker_wins' | 'defender_wins' | 'draw';
    let vfxHint: 'death_light' | 'death_dark' | 'hit_light' | 'hit_dark' | null = null;

    if (result.winner === 'player') {
      // Player controls the attacker
      outcome = 'attacker_wins';
      vfxHint = defender.faction === 'dark' ? 'death_dark' : 'death_light';
    } else if (result.winner === 'enemy') {
      outcome = 'defender_wins';
      vfxHint = attacker.faction === 'dark' ? 'death_dark' : 'death_light';
    } else {
      // Timeout — defender wins
      outcome = 'defender_wins';
      vfxHint = null;
    }

    const remainingHp = result.winner === 'player'
      ? result.remainingHp ?? attacker.hp
      : result.winner === 'enemy'
        ? result.remainingHp ?? defender.hp
        : defender.hp;

    const combatResult = {
      contestedSquare,
      outcome,
      survivingAttacker: outcome === 'attacker_wins'
        ? { ...attacker, hp: remainingHp }
        : null,
      survivingDefender: outcome === 'defender_wins'
        ? { ...defender, hp: remainingHp }
        : null,
      vfxHint,
    };

    setExiting(true);
    setTimeout(() => {
      loopRef.current?.stop();
      callbacks.onResult(combatResult);
    }, 500);
  }, [payload, callbacks]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { url: arenaUrl, faction } = getArenaUrl(payload);

    // Build sprite URLs via pack manifest
    const attackerTokenUrl = getAssetUrl(payload.pack, payload.attacker.assetIds.token)
      ?? `/assets/unit-${payload.attacker.faction}-${payload.attacker.pieceId.split('-')[1] ?? 'knight'}-token-v1.png`;
    const defenderTokenUrl = getAssetUrl(payload.pack, payload.defender.assetIds.token)
      ?? `/assets/unit-${payload.defender.faction}-${payload.defender.pieceId.split('-')[1] ?? 'sorceress'}-token-v1.png`;

    const playerEntity = boardPieceToEntity(payload.attacker, 'player', attackerTokenUrl);
    const enemyEntity  = boardPieceToEntity(payload.defender, 'enemy',  defenderTokenUrl);

    const loop = new GameLoop(canvas, {
      player: playerEntity,
      enemy:  enemyEntity,
      arenaUrl,
      faction,
    });

    loop.onResult(handleResult);
    loop.onHudUpdate(setHud);
    loopRef.current = loop;
    loop.start();

    // Wire arena SFX events
    const sfxHandler = (e: Event) => {
      const { id } = (e as CustomEvent).detail;
      playSound(id).catch(() => {});
    };
    window.addEventListener('arena:sfx', sfxHandler);

    return () => {
      loop.stop();
      window.removeEventListener('arena:sfx', sfxHandler);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const timeSec = hud ? Math.ceil(hud.timeRemainingMs / 1000) : 30;
  const timerLow = timeSec <= 10;

  return (
    <div className={`arena-root ${exiting ? 'arena-root--exit' : ''}`} id="arena-root">
      {/* Canvas — game renders here */}
      <canvas ref={canvasRef} className="arena-canvas" id="arena-canvas" />

      {/* DOM HUD overlay */}
      {hud && (
        <div className="arena-hud" id="arena-hud">
          {/* Player HP (left) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
            <HpBar
              hp={hud.playerHp} maxHp={hud.playerMaxHp}
              faction="light" name={hud.playerName} side="left"
            />
            {hud.playerRebirthStatus !== 'none' && (
              <div
                className={`arena-rebirth-badge arena-rebirth-badge--${hud.playerRebirthStatus}`}
                id="arena-rebirth-badge-player"
                title={hud.playerRebirthStatus === 'ready' ? 'Phoenix Rebirth: Ready' : 'Phoenix Rebirth: Used'}
              >
                🔥 {hud.playerRebirthStatus === 'ready' ? 'Rebirth Ready' : 'Rebirth Used'}
              </div>
            )}
            {hud.playerWailStatus !== 'none' && (
              <div
                className={`arena-wail-badge arena-wail-badge--${hud.playerWailStatus}`}
                id="arena-wail-badge-player"
                title={hud.playerWailStatus === 'ready' ? 'Banshee Wail: Ready' : 'Banshee Wail: Cooldown'}
              >
                👻 {hud.playerWailStatus === 'ready' ? 'Wail Ready' : 'Wail Cooldown'}
              </div>
            )}
          </div>

          {/* Center: timer + VS + difficulty badge */}
          <div className="arena-hud-center">
            <div className={`arena-timer ${timerLow && hud.phase === 'fighting' ? 'arena-timer--low' : ''} ${hud.phase === 'countdown' ? 'arena-timer--countdown' : ''}`} id="arena-timer">
              {hud.phase === 'countdown'
                ? hud.countdownLabel
                : timeSec
              }
            </div>
            <div className="arena-vs">VS</div>
            <div
              className={`arena-difficulty arena-difficulty--${hud.difficulty}`}
              id="arena-difficulty-badge"
              title={`AI Difficulty: ${hud.difficulty}`}
            >
              {hud.difficulty.toUpperCase()}
            </div>
          </div>

          {/* Enemy HP (right) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <HpBar
              hp={hud.enemyHp} maxHp={hud.enemyMaxHp}
              faction="dark" name={hud.enemyName} side="right"
            />
            {hud.enemyRegenActive && (
              <div
                className="arena-regen-badge"
                id="arena-regen-badge-enemy"
                title="Troll Regen: regenerating HP"
              >
                ♻ Regenerating
              </div>
            )}
            {hud.enemyWailStatus !== 'none' && (
              <div
                className={`arena-wail-badge arena-wail-badge--${hud.enemyWailStatus}`}
                id="arena-wail-badge-enemy"
                title={hud.enemyWailStatus === 'ready' ? 'Banshee Wail: Ready' : 'Banshee Wail: Cooldown'}
              >
                👻 {hud.enemyWailStatus === 'ready' ? 'Wail Ready' : 'Wail Cooldown'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Controls hint */}
      <div className="arena-controls-hint" id="arena-controls">
        <span>← → / A D Move</span>
        <span className="arena-controls-hint__sep">·</span>
        <span>Space Jump</span>
        <span className="arena-controls-hint__sep">·</span>
        <span>Z / X Attack</span>
      </div>

      {/* Result overlay */}
      {hud?.winner && (
        <div className={`arena-result ${hud.winner === 'player' ? 'arena-result--win' : 'arena-result--lose'}`} id="arena-result">
          <div className="arena-result__banner">
            {hud.winner === 'player'
              ? `⚔ ${hud.playerName} Wins!`
              : hud.winner === 'timeout'
                ? `⏱ Time! ${hud.enemyName} holds the square.`
                : `💀 ${hud.enemyName} Wins!`
            }
          </div>
          <div className="arena-result__sub">
            {hud.winner === 'player'
              ? 'Returning to board…'
              : 'Your piece retreats…'
            }
          </div>
        </div>
      )}
    </div>
  );
}
