import React from 'react';
import type { CombatPackManifest, Faction } from '../lib/types';
import { getAssetUrl as _getAssetUrl } from '../lib/packLoader';

interface Props {
  pack: CombatPackManifest;
  turnFaction: Faction;
  turnNumber: number;
}

export function TurnBanner({ pack: _pack, turnFaction, turnNumber }: Props) {
  const isLight = turnFaction === 'light';
  return (
    <div className={`turn-banner ${isLight ? 'turn-light' : 'turn-dark'}`} id="turn-banner">
      <span className="turn-label">Turn {turnNumber}</span>
      <span className="turn-faction">
        {isLight ? '☀ Light' : '🌑 Dark'}
      </span>
    </div>
  );
}
