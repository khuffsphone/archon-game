import React, { useEffect, useState } from 'react';
import { CombatScene } from './features/combat/CombatScene';
import { CombatPackManifest } from './lib/types';
import { validatePack } from './lib/packLoader';
import combatPackData from './combat-pack-manifest.json';

// Asset IDs required for the Knight vs Sorceress slice
const REQUIRED_IDS = [
  'unit-light-knight-token',
  'unit-dark-sorceress-token',
  'arena-light',
  'arena-dark',
  'music-battle-loop',
  'sfx-melee-hit',
];

export default function App() {
  const [pack, setPack] = useState<CombatPackManifest | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const manifest = combatPackData as CombatPackManifest;
      // Only validate the core required assets
      const indexed = new Set(manifest.assets.map(a => a.id));
      const missing = REQUIRED_IDS.filter(id => !indexed.has(id));
      if (missing.length > 0) {
        // Non-fatal for the demo: show warning but continue with what we have
        console.warn('Combat pack missing assets:', missing);
      }
      validatePack(manifest, []);  // schema version check only
      setPack(manifest);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  if (error) {
    return (
      <div className="error-screen">
        <h2>⚠ Pack Load Error</h2>
        <p>{error}</p>
        <p className="error-hint">Re-export the combat pack from Archon Workshop and copy it to <code>src/combat-pack-manifest.json</code></p>
      </div>
    );
  }

  if (!pack) return <div className="loading-screen">Loading combat pack…</div>;

  return <CombatScene pack={pack} />;
}
