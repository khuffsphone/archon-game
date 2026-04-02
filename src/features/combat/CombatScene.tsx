import React, { useState, useEffect } from 'react';
import type { CombatPackManifest, Faction } from '../../lib/types';
import { useCombat } from './useCombat';
import { UnitToken } from '../../components/UnitToken';
import { TurnBanner } from '../../components/TurnBanner';
import { getAssetUrl } from '../../lib/packLoader';

interface Props {
  pack: CombatPackManifest;
}

export function CombatScene({ pack }: Props) {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [vfxOverlay, setVfxOverlay] = useState<{ id: string; side: 'left' | 'right' } | null>(null);

  const {
    state,
    animating,
    handleStartBattle,
    handleAttack,
    handleReset,
    handleTurnVoice,
  } = useCombat({ pack, audioEnabled });

  // Trigger VFX overlay on each attack/death event
  useEffect(() => {
    if (!state.lastEvent || state.phase === 'intro') return;

    // The defending faction is opposite of who is attacking (lastEventFaction = attacker)
    const defenderFaction = state.lastEventFaction === 'light' ? 'dark' : 'light';
    const defenderSide    = defenderFaction === 'light' ? 'left' : 'right';

    let vfxId: string;
    if (state.lastEvent === 'death') {
      vfxId = defenderFaction === 'light' ? 'combat-death-burst-light' : 'combat-death-burst-dark';
    } else {
      vfxId = defenderFaction === 'light' ? 'combat-hit-flash-light' : 'combat-hit-flash-dark';
    }

    setVfxOverlay({ id: vfxId, side: defenderSide });
    const t = setTimeout(() => setVfxOverlay(null), 700);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.turnNumber, state.lastEvent]);

  const arenaUrl = getAssetUrl(pack, state.turnFaction === 'light' ? 'arena-light' : 'arena-dark');

  return (
    <div
      className="combat-scene"
      style={{ '--arena-bg': arenaUrl ? `url(${arenaUrl})` : 'none' } as React.CSSProperties}
      id="combat-scene"
    >
      {/* Arena background */}
      <div className="arena-bg" id="arena-bg" />

      {/* HUD top bar */}
      <header className="combat-hud">
        <div className="hud-left">
          <span className="game-title">⚔ Archon</span>
          <span className="combat-subtitle">Combat Slice v1.1</span>
        </div>
        <div className="hud-right">
          <button
            id="btn-audio-toggle"
            className={`btn-icon ${audioEnabled ? 'active' : ''}`}
            onClick={() => setAudioEnabled(e => !e)}
            title={audioEnabled ? 'Mute' : 'Unmute'}
          >
            {audioEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      </header>

      {/* Turn Banner */}
      {state.phase === 'battle' && (
        <TurnBanner pack={pack} turnFaction={state.turnFaction} turnNumber={state.turnNumber} />
      )}

      {/* Intro */}
      {state.phase === 'intro' && (
        <div className="intro-overlay" id="intro-overlay">
          <div className="intro-card">
            <h1 className="intro-title">⚔ Archon</h1>
            <p className="intro-sub">Knight vs Sorceress — Combat Slice v1</p>
            <button
              id="btn-start-battle"
              className="btn-start"
              onClick={handleStartBattle}
            >
              Begin Battle
            </button>
          </div>
        </div>
      )}

      {/* Battle arena */}
      {(state.phase === 'battle' || state.phase === 'victory' || state.phase === 'defeat') && (
        <div className="battle-field" id="battle-field">
          {/* Units */}
          <div className="units-row">
            <UnitToken
              unit={state.units.light}
              pack={pack}
              lastEvent={state.lastEvent}
              lastEventFaction={state.lastEventFaction}
              align="left"
            />
            <div className="vs-badge">VS</div>
            <UnitToken
              unit={state.units.dark}
              pack={pack}
              lastEvent={state.lastEvent}
              lastEventFaction={state.lastEventFaction}
              align="right"
            />
          </div>

          {/* VFX overlay — flashes on the defending unit's side */}
          {vfxOverlay && (() => {
            const url = getAssetUrl(pack, vfxOverlay.id);
            return url ? (
              <div
                className={`vfx-overlay vfx-overlay--${vfxOverlay.side}`}
                id={`vfx-overlay-${vfxOverlay.side}`}
              >
                <img src={url} alt="" className="vfx-overlay-img" />
              </div>
            ) : null;
          })()}

          {/* Controls */}
          <div className="battle-controls" id="battle-controls">
            {state.phase === 'battle' && (
              <>
                <button
                  id="btn-attack"
                  className="btn-attack"
                  onClick={handleAttack}
                  disabled={animating}
                >
                  {animating ? '…' : `${state.turnFaction === 'light' ? '☀ Knight' : '🌑 Sorceress'} Attacks`}
                </button>
                <button
                  id="btn-turn-voice"
                  className="btn-secondary-sm"
                  onClick={handleTurnVoice}
                  title="Announce turn"
                >
                  📣
                </button>
              </>
            )}

            {(state.phase === 'victory') && (
              <div className="victory-banner" id="victory-banner">
                <div className="victory-title">
                  {state.winner === 'light' ? '☀ Light Wins!' : '🌑 Dark Wins!'}
                </div>
                <button id="btn-rematch" className="btn-rematch" onClick={handleReset}>
                  Rematch
                </button>
              </div>
            )}
          </div>

          {/* Combat log */}
          <div className="combat-log" id="combat-log">
            {state.log.map((entry, i) => (
              <div key={i} className="log-entry">{entry}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
