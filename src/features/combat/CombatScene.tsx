import React, { useState, useEffect } from 'react';
import type { CombatPackManifest, Faction } from '../../lib/types';
import { useCombat } from './useCombat';
import { UnitToken } from '../../components/UnitToken';
import { TurnBanner } from '../../components/TurnBanner';
import { getAssetUrl } from '../../lib/packLoader';
import type { CombatInitOverrides } from './CombatEngine';

interface Props {
  pack: CombatPackManifest;
  /** Optional overrides from the board layer (HP, first-turn faction). Standalone mode omits this. */
  initialOverrides?: CombatInitOverrides;
}

export function CombatScene({ pack, initialOverrides }: Props) {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [vfxOverlay, setVfxOverlay] = useState<{ id: string; side: 'left' | 'right' } | null>(null);
  const [spawnVfx, setSpawnVfx] = useState<{ id: string; side: 'left' | 'right' } | null>(null);
  const {
    state,
    animating,
    handleStartBattle,
    handleAttack,
    handleReset,
    handleTurnVoice,
    handleCastSpell,
  } = useCombat({ pack, audioEnabled, initialOverrides });

  // Trigger VFX overlay on each attack/death event
  useEffect(() => {
    if (!state.lastEvent || state.lastEvent === 'none' || state.phase === 'intro') return;

    // lastEventFaction IS the defender (set by CombatEngine as defFaction)
    // No inversion needed — use directly.
    const defenderFaction = state.lastEventFaction;
    if (!defenderFaction) return;
    const defenderSide: 'left' | 'right' = defenderFaction === 'light' ? 'left' : 'right';

    const vfxId = state.lastEvent === 'death'
      ? (defenderFaction === 'light' ? 'combat-death-burst-light' : 'combat-death-burst-dark')
      : (defenderFaction === 'light' ? 'combat-hit-flash-light'   : 'combat-hit-flash-dark');

    setVfxOverlay({ id: vfxId, side: defenderSide });
    const t = setTimeout(() => setVfxOverlay(null), 700);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.turnNumber, state.lastEvent]);

  // Spawn VFX — fires when battle phase begins (start or rematch)
  useEffect(() => {
    if (state.phase !== 'battle') return;
    // Show both spawn effects briefly at battle start / rematch
    setSpawnVfx({ id: 'combat-spawn-light', side: 'left' });
    const t1 = setTimeout(() => setSpawnVfx({ id: 'combat-spawn-dark', side: 'right' }), 300);
    const t2 = setTimeout(() => setSpawnVfx(null), 900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  // fires once per phase-enter: intro→battle or reset→battle
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  const arenaUrl = getAssetUrl(pack, state.turnFaction === 'light' ? 'arena-light' : 'arena-dark');

  return (
    <div
      className="combat-scene"
      style={{ '--arena-bg': arenaUrl ? `url(${arenaUrl})` : 'none' } as React.CSSProperties}
      id="combat-scene"
      data-light-imprisoned={String(!!state.units.light.imprisoned)}
      data-dark-imprisoned={String(!!state.units.dark.imprisoned)}
    >
      {/* Arena background */}
      <div className="arena-bg" id="arena-bg" />

      {/* Ambient arena crest — subtle persistent overlay */}
      {(() => {
        const crUrl = getAssetUrl(pack, 'combat-ambient-arena');
        return crUrl ? (
          <div className="arena-crest" id="arena-crest">
            <img src={crUrl} alt="" className="arena-crest-img" />
          </div>
        ) : null;
      })()}

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

          {/* Hit/death VFX overlay — anchored to the DEFENDER's side */}
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

          {/* Spawn VFX overlay — fires at battle start */}
          {spawnVfx && (() => {
            const url = getAssetUrl(pack, spawnVfx.id);
            return url ? (
              <div
                className={`vfx-overlay vfx-overlay--${spawnVfx.side} vfx-overlay--spawn`}
                id={`vfx-spawn-${spawnVfx.side}`}
              >
                <img src={url} alt="" className="vfx-overlay-img vfx-spawn-img" />
              </div>
            ) : null;
          })()}

          {/* Stun status overlay (0.6) — renders ONLY when unit.stunned === true */}
          {(['light', 'dark'] as const).map((faction) => {
            const unit = state.units[faction];
            if (!unit.stunned) return null;
            const stunUrl = getAssetUrl(pack, 'combat-status-stun-v1');
            if (!stunUrl) return null;
            const side: 'left' | 'right' = faction === 'light' ? 'left' : 'right';
            return (
              <div
                key={`stun-${faction}`}
                className={`vfx-overlay vfx-overlay--${side} vfx-overlay--stun`}
                id={`vfx-stun-${faction}`}
                aria-label={`${unit.name} is stunned`}
              >
                <img src={stunUrl} alt="Stunned" className="vfx-overlay-img vfx-stun-img" />
              </div>
            );
          })}

          {/* Attack button — ui-button-hover-v1 applied as hover bg via inline style var */}
          <div className="battle-controls" id="battle-controls"
            style={{
              '--btn-hover-img': (() => {
                const u = getAssetUrl(pack, 'ui-button-hover-v1');
                return u ? `url(${u})` : 'none';
              })(),
            } as React.CSSProperties}
          >
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

          {/* Spell tray (0.6) — interactive during battle phase */}
          {state.phase === 'battle' && (() => {
            const healUrl   = getAssetUrl(pack, 'spell-heal-icon-v1');
            const imprisonUrl = getAssetUrl(pack, 'spell-imprison-icon-v1');
            if (!healUrl && !imprisonUrl) return null;
            return (
              <div className="spell-action-strip" id="spell-action-strip" aria-label="Spell tray">
                {/* Heal — disabled stub in 0.6. Mechanic not yet implemented. */}
                {healUrl && (
                  <button
                    id="btn-spell-heal"
                    className="spell-action-btn spell-action-btn--disabled"
                    disabled
                    title="Heal (not yet implemented)"
                    aria-label="Heal spell — not yet implemented"
                  >
                    <img src={healUrl} alt="Heal" className="spell-action-icon" />
                  </button>
                )}
                {/* Imprison — active in 0.6 */}
                {imprisonUrl && (
                  <button
                    id="btn-spell-imprison"
                    className="spell-action-btn"
                    onClick={() => handleCastSpell('imprison')}
                    disabled={animating}
                    title={`Cast Imprison on ${state.turnFaction === 'light' ? 'Sorceress' : 'Knight'}`}
                    aria-label="Cast Imprison"
                  >
                    <img src={imprisonUrl} alt="Imprison" className="spell-action-icon" />
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
