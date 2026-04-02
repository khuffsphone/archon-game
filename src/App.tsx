import React, { useEffect, useState, useCallback } from 'react';
import { CombatScene } from './features/combat/CombatScene';
import { CombatBridge } from './features/combat/CombatBridge';
import { BoardScene } from './features/board/BoardScene';
import { CombatPackManifest } from './lib/types';
import { validatePack } from './lib/packLoader';
import combatPackData from './combat-pack-manifest.json';
import type {
  CombatLaunchPayload,
  CombatBridgeCallbacks,
} from './lib/board-combat-contract';

// Asset IDs required for the Knight vs Sorceress combat slice
const REQUIRED_IDS = [
  'unit-light-knight-token',
  'unit-dark-sorceress-token',
  'arena-light',
  'arena-dark',
  'music-battle-loop',
  'sfx-melee-hit',
];

// App mode: 'board' is the Part 2 entry point, 'combat' preserves the v1.1.1 standalone
type AppMode = 'board' | 'combat';

function getInitialMode(): AppMode {
  const params = new URLSearchParams(window.location.search);
  return params.get('mode') === 'combat' ? 'combat' : 'board';
}

export default function App() {
  const [pack, setPack] = useState<CombatPackManifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<AppMode>(getInitialMode);

  // Combat launch state (when board triggers a combat)
  const [combatPayload, setCombatPayload] = useState<CombatLaunchPayload | null>(null);
  const [combatCallbacks, setCombatCallbacks] = useState<CombatBridgeCallbacks | null>(null);

  useEffect(() => {
    try {
      const manifest = combatPackData as CombatPackManifest;
      const indexed = new Set(manifest.assets.map(a => a.id));
      const missing = REQUIRED_IDS.filter(id => !indexed.has(id));
      if (missing.length > 0) {
        console.warn('Combat pack missing assets:', missing);
      }
      validatePack(manifest, []);
      setPack(manifest);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  const handleLaunchCombat = useCallback((
    payload: CombatLaunchPayload,
    callbacks: CombatBridgeCallbacks,
  ) => {
    setCombatPayload(payload);
    setCombatCallbacks({
      onResult: (result) => {
        callbacks.onResult(result);
        // Return to board after result is applied
        setCombatPayload(null);
        setCombatCallbacks(null);
      },
      onCancel: () => {
        callbacks.onCancel();
        setCombatPayload(null);
        setCombatCallbacks(null);
      },
    });
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

  // Mode toggle (dev tool — top-right corner)
  const modeToggle = (
    <div className="mode-toggle" id="mode-toggle">
      <button
        id="btn-mode-board"
        className={`mode-btn ${mode === 'board' ? 'active' : ''}`}
        onClick={() => setMode('board')}
      >
        ⊞ Board
      </button>
      <button
        id="btn-mode-combat"
        className={`mode-btn ${mode === 'combat' ? 'active' : ''}`}
        onClick={() => setMode('combat')}
      >
        ⚔ Combat
      </button>
    </div>
  );

  // Board mode — board is active, and possibly combat is in progress
  if (mode === 'board') {
    if (combatPayload && combatCallbacks) {
      // Combat phase launched from board
      return (
        <div className="app-root">
          {modeToggle}
          <CombatBridge
            mode="board"
            payload={combatPayload}
            callbacks={combatCallbacks}
          />
        </div>
      );
    }
    return (
      <div className="app-root">
        {modeToggle}
        <BoardScene pack={pack} onLaunchCombat={handleLaunchCombat} />
      </div>
    );
  }

  // Standalone combat mode — preserves v1.1.1 baseline exactly
  return (
    <div className="app-root">
      {modeToggle}
      <CombatBridge mode="standalone" pack={pack} />
    </div>
  );
}

