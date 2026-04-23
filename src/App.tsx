import React, { useEffect, useState, useCallback } from 'react';
import { CombatBridge } from './features/combat/CombatBridge';
import { BoardScene } from './features/board/BoardScene';
import { TitleScreen } from './features/board/TitleScreen';
import { ArenaScene } from './features/arena/ArenaScene';
import { CombatPackManifest } from './lib/types';
import { validatePack } from './lib/packLoader';
import combatPackData from './combat-pack-manifest.json';
import type {
  CombatLaunchPayload,
  CombatBridgeCallbacks,
  BoardState,
} from './lib/board-combat-contract';
import {
  makeInitialBoardState,
  makeAdjacentContestSetup,
  makeDarkAttackerContestSetup,
  makeGameOverSetup,
  makeDarkWinsSetup,
} from './features/board/boardState';

// Asset IDs required for the Knight vs Sorceress combat slice
const REQUIRED_IDS = [
  'unit-light-knight-token',
  'unit-dark-sorceress-token',
  'arena-light',
  'arena-dark',
  'music-battle-loop',
  'sfx-melee-hit',
];

// App mode: 'title' is the entry splash, 'board' is the main game, 'combat' preserves standalone
type AppMode = 'title' | 'board' | 'combat';

/** Feature flag: ?arena=1 routes board combat to the new 2D ArenaScene */
const USE_ARENA = new URLSearchParams(window.location.search).get('arena') === '1';

function getInitialMode(): AppMode {
  const params = new URLSearchParams(window.location.search);
  if (params.get('mode') === 'combat') return 'combat';
  // If a ?setup= param is present, skip title for QA convenience
  if (params.get('setup')) return 'board';
  return 'title';
}

function getInitialBoardState(): BoardState {
  const params = new URLSearchParams(window.location.search);
  const setup = params.get('setup');
  // ?setup=adjacent places Knight and Sorceress one legal-move apart for contest QA
  if (setup === 'adjacent') return makeAdjacentContestSetup();
  // ?setup=dark-attacker places Sorceress (dark) attacking Herald (light) for 0.3 QA
  if (setup === 'dark-attacker') return makeDarkAttackerContestSetup();
  // ?setup=gameover places one piece per side for a quick game-over proof
  if (setup === 'gameover') return makeGameOverSetup();
  // ?setup=dark-wins — Sorceress (dark, HP=16) vs Knight (light, HP=1), dark moves first
  // Proves KI-001 (dark wins combat) + KI-002 (dark wins gameover) together
  if (setup === 'dark-wins') return makeDarkWinsSetup();
  return makeInitialBoardState();
}

export default function App() {
  const [pack, setPack] = useState<CombatPackManifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<AppMode>(getInitialMode);

  // ── Board state lifted to App so it survives mode switches ────────────────
  // BoardScene is a controlled component — App owns boardState, BoardScene renders
  // it and fires onBoardStateChange. Switching to Combat mode no longer unmounts
  // and resets the board because BoardScene simply isn't rendered (not destroyed).
  const [boardState, setBoardState] = useState<BoardState>(getInitialBoardState);

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
        // Clear combat payload — board renders with updated state
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

  // 1.9: Title screen — shown before the board on fresh load
  if (mode === 'title') {
    return (
      <TitleScreen
        onStart={() => {
          setBoardState(getInitialBoardState());
          setMode('board');
        }}
      />
    );
  }
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
      // 2.0: Route to interactive ArenaScene when ?arena=1 flag is set
      if (USE_ARENA) {
        return (
          <div className="app-root">
            <ArenaScene
              payload={combatPayload}
              callbacks={combatCallbacks}
            />
          </div>
        );
      }
      // Legacy: static CombatBridge
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
        <BoardScene
          pack={pack}
          boardState={boardState}
          onBoardStateChange={setBoardState}
          onLaunchCombat={handleLaunchCombat}
        />
      </div>
    );
  }

  // Standalone combat mode — preserves v1.1.1 baseline exactly.
  // boardState is NOT reset here — it lives in App's useState and persists.
  return (
    <div className="app-root">
      {modeToggle}
      <CombatBridge mode="standalone" pack={pack} />
    </div>
  );
}
