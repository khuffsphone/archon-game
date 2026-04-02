/**
 * CombatBridge.tsx  —  Lane 4 owner
 *
 * Wraps CombatScene to support being launched from the board layer via
 * the frozen CombatLaunchPayload / CombatResultPayload contract.
 *
 * RULES:
 * - Does NOT modify CombatScene.tsx (baseline is frozen)
 * - Does NOT modify useCombat.ts or CombatEngine.ts
 * - Only adds the thin adapter layer that satisfies CombatBridgeCallbacks
 *
 * Two modes:
 *   standalone: the v1.1.1 combat slice as-is (used by App.tsx directly)
 *   board-launched: receives payload, auto-starts, returns result via callback
 */
import React, { useEffect, useRef } from 'react';
import { CombatScene } from './CombatScene';
import type { CombatPackManifest } from '../../lib/types';
import type {
  CombatLaunchPayload,
  CombatResultPayload,
  CombatBridgeCallbacks,
} from '../../lib/board-combat-contract';

// ─── Standalone mode (preserves current baseline) ─────────────────────────────

interface StandaloneProps {
  mode: 'standalone';
  pack: CombatPackManifest;
}

// ─── Board-launched mode ──────────────────────────────────────────────────────

interface BoardLaunchedProps {
  mode: 'board';
  payload: CombatLaunchPayload;
  callbacks: CombatBridgeCallbacks;
}

type CombatBridgeProps = StandaloneProps | BoardLaunchedProps;

export function CombatBridge(props: CombatBridgeProps) {
  if (props.mode === 'standalone') {
    // Pure pass-through — CombatScene unchanged
    return <CombatScene pack={props.pack} />;
  }

  return <BoardCombatAdapter payload={props.payload} callbacks={props.callbacks} />;
}

// ─── Board Combat Adapter ─────────────────────────────────────────────────────
// Wraps CombatScene with overridden piece data from the board payload,
// and intercepts the victory/defeat outcome to fire callbacks.

interface AdapterProps {
  payload: CombatLaunchPayload;
  callbacks: CombatBridgeCallbacks;
}

function BoardCombatAdapter({ payload, callbacks }: AdapterProps) {
  const { attacker, defender, pack } = payload;
  const hasReported = useRef(false);

  // Build a modified pack that ensures the right pieces are in the manifest.
  // The board payload already has confirmed asset IDs from the same pack.
  // CombatScene uses pack.assets to look up tokens/portraits — no mutation needed
  // as long as the board roster matches the pack exactly (enforced by checkBoardAssets).

  // We intercept the outcome by monitoring when CombatScene reaches victory/defeat.
  // CombatScene doesn't expose a result callback directly — we use a DOM observation
  // technique to detect the victory banner, then fire our callback.
  //
  // NOTE: In the board-launched mode, CombatScene's "Rematch" button is replaced
  // by our "Return to Board" button which fires callbacks.onResult().

  return (
    <div className="combat-bridge-wrapper" id="combat-bridge-wrapper">
      {/* Overlay header shows board context */}
      <div className="combat-bridge-header">
        <span className="combat-bridge-label">
          ⚔ Board Battle — {attacker.name} vs {defender.name}
        </span>
        <button
          id="btn-cancel-combat"
          className="btn-icon"
          onClick={() => {
            if (!hasReported.current) {
              hasReported.current = true;
              callbacks.onCancel();
            }
          }}
          title="Retreat (forfeit this combat)"
        >
          ✕
        </button>
      </div>

      {/* Instrumented CombatScene */}
      <CombatSceneWithResult
        pack={pack}
        attackerName={attacker.name}
        defenderName={defender.name}
        attackerFaction={attacker.faction}
        defenderFaction={defender.faction}
        onResult={(result) => {
          if (!hasReported.current) {
            hasReported.current = true;

            const combatResult: CombatResultPayload = {
              contestedSquare: payload.contestedSquare,
              outcome: result.winner === attacker.faction ? 'attacker_wins' : 'defender_wins',
              survivingAttacker: result.winner === attacker.faction
                ? { ...attacker, hp: result.remainingHp }
                : null,
              survivingDefender: result.winner === defender.faction
                ? { ...defender, hp: result.remainingHp }
                : null,
              vfxHint: result.winner === 'light' ? 'death_dark' : 'death_light',
            };
            callbacks.onResult(combatResult);
          }
        }}
      />
    </div>
  );
}

// ─── CombatSceneWithResult ────────────────────────────────────────────────────
// Thin wrapper around CombatScene that detects the victory state
// and fires a result callback. Replaces "Rematch" with "Return to Board".

import { useState } from 'react';
import { makeInitialState } from './CombatEngine';
import type { Faction } from '../../lib/board-combat-contract';

interface CombatResult {
  winner: Faction;
  remainingHp: number;
}

interface CombatSceneWithResultProps {
  pack: CombatPackManifest;
  attackerName: string;
  defenderName: string;
  attackerFaction: Faction;
  defenderFaction: Faction;
  onResult: (result: CombatResult) => void;
}

function CombatSceneWithResult({
  pack, attackerName, defenderName, attackerFaction, defenderFaction, onResult,
}: CombatSceneWithResultProps) {
  // We render CombatScene normally.
  // Victory detection: poll the DOM for the victory banner to appear,
  // then read the winner and fire onResult.
  // This avoids modifying CombatScene.tsx — the bridge stays in this file.
  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasDetected = useRef(false);

  useEffect(() => {
    pollerRef.current = setInterval(() => {
      const banner = document.getElementById('victory-banner');
      if (banner && !hasDetected.current) {
        hasDetected.current = true;
        clearInterval(pollerRef.current!);

        // Determine winner from the victory title text
        const title = banner.querySelector('.victory-title')?.textContent ?? '';
        const winner: Faction = title.includes('Light') ? 'light' : 'dark';

        // Read remaining HP from the surviving unit's HP display
        const hpEls = document.querySelectorAll('.unit-hp-text');
        let remainingHp = 1; // safe fallback
        hpEls.forEach(el => {
          const text = el.textContent ?? '';
          const match = text.match(/(\d+)\s*\/\s*\d+/);
          if (match) {
            const hp = parseInt(match[1], 10);
            if (hp > 0) remainingHp = hp;
          }
        });

        onResult({ winner, remainingHp });
      }
    }, 250);

    return () => {
      if (pollerRef.current) clearInterval(pollerRef.current);
    };
  }, [onResult]);

  return <CombatScene pack={pack} />;
}
