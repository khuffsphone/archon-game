import React, { useEffect, useState, useCallback } from 'react';
import { CombatBridge } from './features/combat/CombatBridge';
import { BoardScene } from './features/board/BoardScene';
import { TitleScreen } from './features/board/TitleScreen';
import { CampaignMap } from './features/board/CampaignMap';
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
import {
  saveGame, loadGame, clearSave, hasSavedGame,
} from './features/board/boardSave';
import type { EncounterNode } from './features/board/campaignConfig';

// Asset IDs required for the Knight vs Sorceress combat slice
const REQUIRED_IDS = [
  'unit-light-knight-token',
  'unit-dark-sorceress-token',
  'arena-light',
  'arena-dark',
  'music-battle-loop',
  'sfx-melee-hit',
];

// App mode: 'title' is the entry splash, 'campaign' is encounter selection,
// 'board' is the main game, 'combat' preserves standalone
type AppMode = 'title' | 'campaign' | 'board' | 'combat';

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

  // 3.0: Selected encounter — carried from CampaignMap to BoardScene
  const [activeEncounter, setActiveEncounter] = useState<EncounterNode | null>(null);

  // ── 2.7: Save / Resume ────────────────────────────────────────────────────
  // Board log is owned here so it can be persisted alongside boardState.
  const [boardLog, setBoardLog] = useState<string[]>(() => {
    // Restore log from save on first load (if no ?setup= override)
    const params = new URLSearchParams(window.location.search);
    if (!params.get('setup')) {
      const save = loadGame();
      if (save) return save.boardLog;
    }
    return [];
  });

  // Whether a valid save exists (drives Continue Game button)
  const [hasSave, setHasSave] = useState<boolean>(() => hasSavedGame());

  // ── Board state lifted to App so it survives mode switches ────────────────
  const [boardState, setBoardStateRaw] = useState<BoardState>(() => {
    // 2.7: Restore from save on reload (if no ?setup= override)
    const params = new URLSearchParams(window.location.search);
    if (!params.get('setup')) {
      const save = loadGame();
      if (save) return save.boardState;
    }
    return getInitialBoardState();
  });

  // Wrapped setter: auto-saves after every meaningful state change
  const setBoardState = useCallback((next: BoardState) => {
    setBoardStateRaw(next);
    // We don't have boardLog in scope here — save is triggered by the effect below
  }, []);

  // Auto-save effect: runs whenever boardState or boardLog changes
  useEffect(() => {
    // Don't save QA setups (?setup= param)
    const params = new URLSearchParams(window.location.search);
    if (params.get('setup')) return;
    saveGame(boardState, boardLog);
    setHasSave(true);
  }, [boardState, boardLog]);

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

  // 1.9 / 3.0: Title screen
  if (mode === 'title') {
    return (
      <TitleScreen
        hasSave={hasSave}
        onNewGame={() => {
          // 3.0: New Game → Campaign Map (not board directly)
          clearSave();
          setHasSave(false);
          setBoardLog([]);
          setBoardStateRaw(getInitialBoardState());
          setActiveEncounter(null);
          setMode('campaign');
        }}
        onContinue={() => {
          // Continue Game bypasses campaign map — goes straight to board
          setMode('board');
        }}
      />
    );
  }

  // 3.0: Campaign Map — encounter selection
  if (mode === 'campaign') {
    return (
      <CampaignMap
        onLaunch={(enc) => {
          setActiveEncounter(enc);
          // For skirmish, board state is already initial (v1: same roster)
          setBoardStateRaw(getInitialBoardState());
          setBoardLog([`⚔ Encounter: ${enc.title}`]);
          setMode('board');
        }}
        onBack={() => setMode('title')}
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
          boardLog={boardLog}
          onBoardLogChange={setBoardLog}
          activeEncounter={activeEncounter}
          onResetGame={() => {
            clearSave();
            setHasSave(false);
            setBoardLog([]);
            setActiveEncounter(null);
            setBoardStateRaw(makeInitialBoardState());
          }}
          onReturnToTitle={() => {
            clearSave();
            setHasSave(false);
            setBoardLog([]);
            setActiveEncounter(null);
            setBoardStateRaw(makeInitialBoardState());
            setMode('title');
          }}
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
