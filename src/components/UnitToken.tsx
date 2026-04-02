import React from 'react';
import type { UnitState, CombatPackManifest, AnimEvent, Faction } from '../lib/types';
import { getAssetUrl } from '../lib/packLoader';

interface Props {
  unit: UnitState;
  pack: CombatPackManifest;
  lastEvent: AnimEvent;
  lastEventFaction: Faction | null;
  align: 'left' | 'right';
}

export function UnitToken({ unit, pack, lastEvent, lastEventFaction, align }: Props) {
  const isHit  = lastEvent === 'hit'  && lastEventFaction === unit.faction;
  const isDead = unit.isDead;

  const tokenUrl    = getAssetUrl(pack, unit.tokenId);
  const defeatedUrl = getAssetUrl(pack, unit.defeatedId);

  const hpPct = (unit.hp / unit.maxHp) * 100;
  const hpColor = hpPct > 50 ? 'var(--success)' : hpPct > 25 ? 'var(--warn)' : 'var(--danger)';

  return (
    <div
      className={`unit-token ${align} ${isHit ? 'hit-anim' : ''} ${isDead ? 'dead' : ''}`}
      id={`unit-${unit.id}`}
    >
      <div className="unit-name" style={{ color: unit.faction === 'light' ? 'var(--light)' : 'var(--dark-clr)' }}>
        {unit.name}
      </div>

      <div className="unit-portrait-wrap">
        {isDead && defeatedUrl ? (
          <img
            src={defeatedUrl}
            alt={`${unit.name} defeated`}
            className="unit-img defeated"
            id={`img-defeated-${unit.id}`}
          />
        ) : tokenUrl ? (
          <img
            src={tokenUrl}
            alt={unit.name}
            className="unit-img"
            id={`img-token-${unit.id}`}
          />
        ) : (
          <div className="unit-placeholder" style={{ borderColor: unit.faction === 'light' ? 'var(--light)' : 'var(--dark-clr)' }}>
            <span>{unit.name}</span>
            <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>No image</span>
          </div>
        )}
      </div>

      {/* Health bar */}
      <div className="hp-bar-track" id={`hp-track-${unit.id}`}>
        <div
          className="hp-bar-fill"
          style={{ width: `${hpPct}%`, background: hpColor }}
          id={`hp-fill-${unit.id}`}
        />
      </div>
      <div className="hp-label">{unit.hp} / {unit.maxHp} HP</div>

      {isDead && <div className="defeat-stamp" id={`stamp-dead-${unit.id}`}>☠ Defeated</div>}
    </div>
  );
}
