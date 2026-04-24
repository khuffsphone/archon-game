/**
 * BoardScene.tsx  —  Lane 3 owner
 * The 9×9 Archon board shell.
 *
 * CONTROLLED COMPONENT (0.2 change):
 * boardState is now passed down from App.tsx via props.
 * onBoardStateChange fires when the board needs to update state.
 * This ensures board state survives mode switches (no reset when switching
 * to the standalone combat mode tab and back).
 */
import React, { useCallback, useState, useRef, useEffect } from 'react';
import type { CombatPackManifest } from '../../lib/types';
import type {
  BoardState, BoardCoord, CombatLaunchPayload, CombatBridgeCallbacks,
} from '../../lib/board-combat-contract';
import {
  makeInitialBoardState, selectPiece, deselectPiece, executeMove,
  applyCombatResult, checkBoardAssets, BOARD_SIZE, IMPRISONMENT_TURNS,
  healAlly, getAdjacentHealTargets, HEAL_AMOUNT, getGameOverMeta, getMoveProfileLabel,
  isPowerSquare, POWER_REGEN, POWER_SQUARES,
  checkPowerSquareWin, getPowerSquareControlMap, getPowerSquareController,
} from './boardState';
import type { BoardPieceState } from './boardState';
import { chooseAiMove, describeAiAction } from './aiEngine';
import {
  playSound, playMusic, stopMusic, toggleMute, isMuted, preloadSounds,
} from './audioEngine';
import { getAssetUrl } from '../../lib/packLoader';
import type { EncounterNode } from './campaignConfig';

interface Props {
  pack: CombatPackManifest;
  /** Controlled: board state owned by parent (App.tsx) */
  boardState: BoardState;
  onBoardStateChange: (next: BoardState) => void;
  onLaunchCombat: (payload: CombatLaunchPayload, callbacks: CombatBridgeCallbacks) => void;
  /** 2.7: Board log lifted to App for persistence */
  boardLog: string[];
  onBoardLogChange: (next: string[]) => void;
  /** 2.7: Called when player resets/clears save; parent handles clearSave() */
  onResetGame: () => void;
  /** 3.0: Active encounter from CampaignMap (null = Continue Game or QA setup) */
  activeEncounter?: EncounterNode | null;
}

export function BoardScene({ pack, boardState: board, onBoardStateChange: setBoard, onLaunchCombat, boardLog, onBoardLogChange, onResetGame, activeEncounter }: Props) {
  // Asset coverage check (non-blocking)
  const assetCheck = checkBoardAssets(pack);
  if (assetCheck.missing.length > 0) {
    console.warn('[BoardScene] Missing assets for alpha roster:', assetCheck.missing);
  }

  // ── 1.0: Board event log (lifted to App.tsx in 2.7) ───────────────────────────
  const appendLog = useCallback((entry: string) => {
    onBoardLogChange([...boardLog.slice(-99), entry]);
  }, [boardLog, onBoardLogChange]);

  // ── 1.8: Audio state ────────────────────────────────────────────────────────
  const [audioMuted, setAudioMuted] = useState<boolean>(isMuted());
  const hasPreloaded = useRef(false);

  // Preload all sounds on first board interaction (respects browser autoplay policy)
  const ensurePreloaded = useCallback(() => {
    if (!hasPreloaded.current) {
      hasPreloaded.current = true;
      preloadSounds();
    }
  }, []);

  // Start music when game becomes active, stop on gameover
  useEffect(() => {
    if (board.phase === 'active') {
      playMusic();
    } else if (board.phase === 'gameover') {
      stopMusic(1.5);
      playSound('victory').catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.phase]);

  // Play turn-announcement voice when faction changes
  const prevTurnFactionRef = useRef<string>('');
  useEffect(() => {
    if (board.phase !== 'active') return;
    if (board.turnFaction === prevTurnFactionRef.current) return;
    prevTurnFactionRef.current = board.turnFaction;
    // Skip very first render
    if (!hasPreloaded.current) return;
    playSound(board.turnFaction === 'light' ? 'turn-light' : 'turn-dark').catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.turnFaction, board.phase]);

  // ── 1.0: Cure flash — detect imprisoned→false transitions ──────────────────
  const [justCuredId, setJustCuredId] = useState<string | null>(null);
  const prevPiecesRef = useRef<Record<string, BoardPieceState>>({});

  useEffect(() => {
    const prev = prevPiecesRef.current;
    for (const [id, piece] of Object.entries(board.pieces as Record<string, BoardPieceState>)) {
      const wasImprisoned = (prev[id] as BoardPieceState | undefined)?.imprisoned;
      if (wasImprisoned && !(piece as BoardPieceState).imprisoned) {
        setJustCuredId(id);
        appendLog(`✨ ${piece.name} imprisonment cleared`);
      }
    }
    prevPiecesRef.current = board.pieces as Record<string, BoardPieceState>;
  }, [board.pieces, appendLog]);

  useEffect(() => {
    if (!justCuredId) return;
    const t = setTimeout(() => setJustCuredId(null), 900);
    return () => clearTimeout(t);
  }, [justCuredId]);

  // ── 1.6: AI v1 — Dark faction CPU ──────────────────────────────────────────
  const AI_FACTION = 'dark' as const;
  const [isAiThinking, setIsAiThinking] = React.useState(false);

  useEffect(() => {
    if (board.phase !== 'active') return;
    if (board.turnFaction !== AI_FACTION) return;

    setIsAiThinking(true);
    const t = setTimeout(() => {
      setIsAiThinking(false);
      const action = chooseAiMove(board, AI_FACTION);
      if (!action) return; // no legal moves — board already handles win/stalemate

      appendLog(describeAiAction(action, board));

      // Select the piece so executeMove can validate it
      const withSelection = selectPiece(board, action.pieceId);
      const result = executeMove(withSelection, action.targetCoord);

      if (result.type === 'contest') {
        // AI triggered combat — suspend board and launch combat bridge
        setBoard(result.nextState);
        appendLog(`⚔ ${result.attacker.name} challenges ${result.defender.name}`);
        playSound('combat').catch(() => {});

        const payload = {
          contestedSquare: action.targetCoord,
          attacker: result.attacker,
          defender: result.defender,
          pack,
        };

        onLaunchCombat(payload, {
          onResult: (combatResult) => {
            const nextState = applyCombatResult(result.nextState, combatResult);
            setBoard(nextState);
            if (combatResult.outcome === 'attacker_wins') {
              appendLog(`🗡 ${result.attacker.name} defeated ${result.defender.name}`);
              playSound(result.defender.faction === 'dark' ? 'death-dark' : 'death-light').catch(() => {});
            } else {
              appendLog(`🛡 ${result.defender.name} repelled ${result.attacker.name}`);
              playSound('hit-heavy').catch(() => {});
            }
          },
          onCancel: () => setBoard(board),
        });
      } else {
        // Normal move
        setBoard(result.nextState);
        playSound('move-dark').catch(() => {});
      }
    }, 750);

    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.turnFaction, board.phase, board.turnNumber]);


  const handleSquareClick = useCallback((coord: BoardCoord) => {
    // Block player interaction while AI is thinking or during combat/gameover
    if (isAiThinking) return;
    if (board.phase === 'combat' || board.phase === 'gameover') return;
    // Block player clicks on dark's turn (it's the AI's turn)
    if (board.turnFaction === AI_FACTION) return;

    // 1.8: Unlock audio context on first user gesture
    ensurePreloaded();

    const clickedPieceId = board.squares[coord.row][coord.col].pieceId;
    const clickedPiece = clickedPieceId ? board.pieces[clickedPieceId] : null;

    // If clicking on own piece — select it
    if (clickedPiece && clickedPiece.faction === board.turnFaction && !clickedPiece.isDead) {
      setBoard(selectPiece(board, clickedPieceId!));
      return;
    }

    // If a piece is selected and this square is a legal move
    if (board.selectedPieceId && board.legalMoves.some(m => m.row === coord.row && m.col === coord.col)) {
      const result = executeMove(board, coord);

      if (result.type === 'contest') {
        // Launch combat — board suspends
        setBoard(result.nextState); // phase = 'combat'
        appendLog(`⚔ ${result.attacker.name} challenges ${result.defender.name}`);
        playSound('combat').catch(() => {});

        const payload: CombatLaunchPayload = {
          contestedSquare: coord,
          attacker: result.attacker,
          defender: result.defender,
          pack,
        };

        const callbacks: CombatBridgeCallbacks = {
          onResult: (combatResult) => {
            const nextState = applyCombatResult(result.nextState, combatResult);
            setBoard(nextState);
            // Log + audio outcome
            if (combatResult.outcome === 'attacker_wins') {
              appendLog(`🗡 ${result.attacker.name} defeated ${result.defender.name}`);
              playSound(result.defender.faction === 'dark' ? 'death-dark' : 'death-light').catch(() => {});
            } else {
              appendLog(`🛡 ${result.defender.name} repelled ${result.attacker.name}`);
              playSound('hit').catch(() => {});
            }
            // Detect newly imprisoned pieces from the result
            const nextPieces = nextState.pieces as Record<string, BoardPieceState>;
            for (const p of Object.values(nextPieces)) {
              if ((p as BoardPieceState).imprisoned) {
                const prevImprisoned = (prevPiecesRef.current[p.pieceId] as BoardPieceState | undefined)?.imprisoned;
                if (!prevImprisoned) {
                  appendLog(`🔒 ${p.name} was imprisoned`);
                  playSound('magic').catch(() => {});
                }
              }
            }
          },
          onCancel: () => {
            setBoard({ ...result.nextState, phase: 'active', selectedPieceId: null, legalMoves: [] });
            appendLog(`↩ Combat cancelled`);
          },
        };

        onLaunchCombat(payload, callbacks);
      } else {
        // Normal move — log it + play move sound
        const mover = board.pieces[board.selectedPieceId!];
        setBoard(result.nextState);
        appendLog(`➡ ${mover.name} moved to ${coord.row},${coord.col}`);
        playSound('move-light').catch(() => {});
      }
      return;
    }

    // Otherwise deselect
    setBoard(deselectPiece(board));
  }, [board, pack, onLaunchCombat, setBoard, appendLog, ensurePreloaded]);

  // 1.7: compute game-over metadata — pass squares for power-square win check
  const gameOverMeta = board.phase === 'gameover'
    ? getGameOverMeta(board.pieces, board.squares)
    : undefined;

  // Derive winner from meta (handles power-square win correctly)
  const winner = gameOverMeta?.winnerFaction ?? null;

  // 1.7: live power-square control map for HUD strip
  const psControlMap = getPowerSquareControlMap(board.squares, board.pieces);
  const lightPsCount = psControlMap.filter(e => e.controller === 'light').length;
  const darkPsCount  = psControlMap.filter(e => e.controller === 'dark').length;
  return (
    <div className="board-scene" id="board-scene">
      {/* Board HUD */}
      <header className="board-hud">
        <div className="hud-left">
          <span className="game-title">⚔ Archon</span>
          <span className="board-subtitle">Board Alpha</span>
          {/* 3.0: Encounter badge */}
          {activeEncounter && (
            <span
              className={`encounter-badge encounter-badge--${activeEncounter.themeClass}`}
              id="encounter-badge"
              title={activeEncounter.subtitle}
            >
              {activeEncounter.icon} {activeEncounter.title}
            </span>
          )}
          {/* 1.7: Power-square control strip */}
          <div className="ps-strip" id="ps-strip" aria-label="Power square control">
            {psControlMap.map((entry, i) => (
              <span
                key={i}
                className={[
                  'ps-pip',
                  entry.controller === 'light' ? 'ps-pip--light' : '',
                  entry.controller === 'dark'  ? 'ps-pip--dark'  : '',
                  !entry.controller ? 'ps-pip--empty' : '',
                ].filter(Boolean).join(' ')}
                title={`(${entry.coord.row},${entry.coord.col}): ${entry.controller ?? 'uncontrolled'}`}
              >⚡</span>
            ))}
            <span className="ps-score">{lightPsCount}L / {darkPsCount}D</span>
          </div>
        </div>
        <div className="hud-center">
          {board.phase === 'active' && (
            <span className={`turn-indicator turn-indicator--${isAiThinking ? 'ai' : board.turnFaction}`}>
              {isAiThinking
                ? '🤖 Dark is thinking…'
                : board.turnFaction === 'light' ? '✦ Light — Your Turn' : '🌑 Dark — Turn ' + board.turnNumber
              }
            </span>
          )}
          {board.phase === 'combat' && (
            <span className="turn-indicator turn-indicator--combat">⚔ Combat in progress…</span>
          )}
          {board.phase === 'gameover' && (
            <span className={`turn-indicator turn-indicator--${winner}`}>
              {gameOverMeta?.reason === 'power_squares_controlled'
                ? `${winner === 'light' ? '✦ Light' : '🌑 Dark'} ⚡ Controls All 5!`
                : winner === 'light' ? '✦ Light Wins!' : '🌑 Dark Wins!'
              }
            </span>
          )}
        </div>
        <div className="hud-right">
          {/* 1.8: Mute toggle */}
          <button
            id="btn-mute"
            className={`btn-mute ${audioMuted ? 'btn-mute--off' : ''}`}
            title={audioMuted ? 'Unmute sound' : 'Mute sound'}
            onClick={() => {
              const next = toggleMute();
              setAudioMuted(next);
            }}
            aria-label={audioMuted ? 'Unmute' : 'Mute'}
          >
            {audioMuted ? '🔇' : '🔊'}
          </button>
          {/* 2.7: Reset / New Game button — always visible, clears save */}
          <button
            id="btn-reset-game"
            className="btn-reset-game"
            title="Start a new game and clear save"
            onClick={() => {
              if (!window.confirm('Start a new game? Your current progress will be lost.')) return;
              onResetGame();
            }}
          >
            ↺ Reset
          </button>
          {board.phase === 'gameover' && (
            <button
              id="btn-board-reset"
              className="btn-rematch"
              onClick={() => setBoard(makeInitialBoardState())}
            >
              New Game
            </button>
          )}
        </div>
      </header>

      {/* 9×9 Grid */}
      <div
        className="board-grid"
        id="board-grid"
        style={{ '--board-size': BOARD_SIZE } as React.CSSProperties}
      >
        {board.squares.map((rowArr, rowIdx) =>
          rowArr.map((square, colIdx) => {
            const isSelected = board.selectedPieceId !== null &&
              board.pieces[board.selectedPieceId!]?.coord.row === rowIdx &&
              board.pieces[board.selectedPieceId!]?.coord.col === colIdx;
            const isLegal = board.legalMoves.some(m => m.row === rowIdx && m.col === colIdx);
            const piece = square.pieceId ? board.pieces[square.pieceId] : null;
            const hasEnemy = isLegal && piece !== null && piece.faction !== board.turnFaction;

            return (
              <div
                key={`${rowIdx}-${colIdx}`}
                id={`sq-${rowIdx}-${colIdx}`}
                className={[
                  'board-square',
                  `board-square--${square.luminance}`,
                  isSelected ? 'board-square--selected' : '',
                  isLegal ? 'board-square--legal' : '',
                  hasEnemy ? 'board-square--attack' : '',
                  (rowIdx + colIdx) % 2 === 0 ? 'board-square--even' : 'board-square--odd',
                  isPowerSquare({ row: rowIdx, col: colIdx }) ? 'board-square--power' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => handleSquareClick({ row: rowIdx, col: colIdx })}
              >
                {/* Coord debug label (small) */}
                <span className="sq-coord">{rowIdx},{colIdx}</span>

                {/* Piece token */}
                {piece && !piece.isDead && (
                  <PieceToken
                    piece={piece as BoardPieceState}
                    pack={pack}
                    isSelected={isSelected}
                    justCured={justCuredId === piece.pieceId}
                  />
                )}
                {piece && piece.isDead && (
                  <DefeatedToken piece={piece} pack={pack} />
                )}

                {/* Legal move indicator */}
                {isLegal && !piece && (
                  <div className="legal-dot" />
                )}
                {hasEnemy && (
                  <div className="attack-ring" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Side panel — selected piece info */}
      {board.selectedPieceId && board.pieces[board.selectedPieceId] && (
        <aside className="board-sidebar" id="board-sidebar">
          {(() => {
            const p = board.pieces[board.selectedPieceId!];
            const portraitUrl = getAssetUrl(pack, p.assetIds.portrait);
            // 0.10: adjacent allies that are imprisoned OR below maxHp
            const healTargets = (!p.isDead && p.faction === board.turnFaction)
              ? getAdjacentHealTargets(board, board.selectedPieceId!)
              : [];
            const canHeal = healTargets.length > 0;
            // Compute label: show whether we're curing imprisonment and/or restoring HP
            const healTarget = healTargets.length > 0
              ? board.pieces[healTargets[0]] as BoardPieceState
              : null;
            const hpDelta = healTarget && healTarget.hp < healTarget.maxHp
              ? Math.min(HEAL_AMOUNT, healTarget.maxHp - healTarget.hp)
              : 0;
            const healLabel = healTarget?.imprisoned
              ? hpDelta > 0 ? `✨ Cure + Heal (+${hpDelta} HP)` : '✨ Cure Ally'
              : hpDelta > 0 ? `✨ Heal Ally (+${hpDelta} HP)` : '✨ Heal Ally';
            return (
              <div className="sidebar-piece-card">
                {portraitUrl && <img src={portraitUrl} alt={p.name} className="sidebar-portrait" />}
                <div className="sidebar-info">
                  <div className="sidebar-name">{p.name}</div>
                  <div className="sidebar-role">{p.role}</div>
                  <div className="sidebar-move-profile" id={`sidebar-move-profile-${p.pieceId}`}>
                    ⟶ {getMoveProfileLabel(p.pieceId)}
                  </div>
                  <div className="sidebar-hp">{p.hp} / {p.maxHp} HP</div>
                  {isPowerSquare(p.coord) && (
                    <div className="sidebar-power-badge" id={`sidebar-power-badge-${p.pieceId}`}>
                      ⚡ Power Square (+{POWER_REGEN} HP/turn)
                    </div>
                  )}
                  {(p as BoardPieceState).imprisoned ? (
                    <div className="sidebar-imprisoned-status" id="sidebar-imprisoned-status">
                      🔒 Imprisoned — {(p as BoardPieceState).imprisonedTurnsRemaining ?? IMPRISONMENT_TURNS} turn(s) remaining
                    </div>
                  ) : (
                    <div className="sidebar-moves">{board.legalMoves.length} moves available</div>
                  )}
                  {canHeal && (
                    <button
                      id="btn-heal-ally"
                      className="sidebar-heal-btn"
                      onClick={() => {
                        const caster = board.selectedPieceId!;
                        const target = healTargets[0];
                        const targetPiece = board.pieces[target] as BoardPieceState;
                        setBoard(healAlly(board, caster, target));
                        appendLog(`✨ ${board.pieces[caster].name} healed ${targetPiece.name}${
                          targetPiece.imprisoned ? ' — imprisonment cleared' : ''
                        }${targetPiece.hp < targetPiece.maxHp ? ` +${Math.min(HEAL_AMOUNT, targetPiece.maxHp - targetPiece.hp)} HP` : ''}`);
                      }}
                      title="Heal adjacent ally — removes imprisonment and restores HP"
                    >
                      {healLabel}
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
        </aside>
      )}

      {/* 1.0: Board event log */}
      {boardLog.length > 0 && (
        <div className="board-log" id="board-log" aria-label="Game log">
          {boardLog.slice(-6).map((entry, i) => (
            <div key={i} className="board-log-entry">{entry}</div>
          ))}
        </div>
      )}

      {/* 1.1: Game-over modal overlay */}
      {board.phase === 'gameover' && gameOverMeta && (
        <GameOverModal
          winner={gameOverMeta.winnerFaction}
          reason={gameOverMeta.reason}
          onPlayAgain={() => {
            onResetGame();
          }}
        />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface TokenProps {
  piece: BoardPieceState;
  pack: CombatPackManifest;
  isSelected?: boolean;
}

function PieceToken({ piece, pack, isSelected, justCured }: TokenProps & { justCured?: boolean }) {
  const tokenUrl = getAssetUrl(pack, piece.assetIds.token);
  const imprisonBadgeUrl = piece.imprisoned ? getAssetUrl(pack, 'spell-imprison-icon-v1') : null;
  return (
    <div
      className={[
        'piece-token',
        `piece-token--${piece.faction}`,
        isSelected ? 'piece-token--selected' : '',
        piece.imprisoned ? 'piece-token--imprisoned' : '',
        justCured ? 'piece-token--just-cured' : '',
      ].filter(Boolean).join(' ')}
      title={piece.imprisoned
        ? `${piece.name} (${piece.faction}) — IMPRISONED — ${piece.hp}/${piece.maxHp} HP`
        : `${piece.name} (${piece.faction}) — ${piece.hp}/${piece.maxHp} HP`}
    >
      {tokenUrl
        ? <img src={tokenUrl} alt={piece.name} className="piece-token-img" />
        : <span className="piece-token-fallback">{piece.faction === 'light' ? '☀' : '🌑'}</span>
      }
      {/* Imprisoned badge (0.7) — only when unit.imprisoned === true */}
      {piece.imprisoned && (
        <div className="imprisoned-badge" id={`imprisoned-badge-${piece.pieceId}`} aria-label="Imprisoned">
          {imprisonBadgeUrl
            ? <img src={imprisonBadgeUrl} alt="Imprisoned" className="imprisoned-badge-img" />
            : <span className="imprisoned-badge-fallback">🔒</span>}
        </div>
      )}
      <div className="piece-hp-bar">
        <div
          className="piece-hp-fill"
          style={{ width: `${(piece.hp / piece.maxHp) * 100}%` }}
        />
      </div>
    </div>
  );
}

function DefeatedToken({ piece, pack }: TokenProps) {
  const defeatedUrl = getAssetUrl(pack, piece.assetIds.defeated);
  return (
    <div className={`piece-token piece-token--defeated piece-token--${piece.faction}`}>
      {defeatedUrl
        ? <img src={defeatedUrl} alt={`${piece.name} (defeated)`} className="piece-token-img piece-token-img--defeated" />
        : <span className="piece-token-fallback piece-token-fallback--dead">☠</span>
      }
    </div>
  );
}

// ─── 1.1: Game Over Modal ──────────────────────────────────────────────────────

interface GameOverModalProps {
  winner: 'light' | 'dark';
  reason: 'all_enemies_eliminated' | 'faction_annihilated' | 'power_squares_controlled';
  onPlayAgain: () => void;
}

function GameOverModal({ winner, reason, onPlayAgain }: GameOverModalProps) {
  const isLight = winner === 'light';
  const title   = isLight ? '✦ Light Victorious' : '🌑 Dark Triumphant';
  const sub     = reason === 'power_squares_controlled'
    ? '⚡ All 5 power squares controlled — strategic dominance achieved!'
    : reason === 'faction_annihilated'
    ? 'All enemy forces have been annihilated.'
    : 'All enemies have been eliminated.';

  return (
    <div
      className={`gameover-overlay gameover-overlay--${winner}`}
      id="gameover-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`${winner === 'light' ? 'Light' : 'Dark'} wins`}
    >
      <div className={`gameover-card gameover-card--${winner}`} id="gameover-card">
        <div className="gameover-emblem" aria-hidden="true">
          {isLight ? '☀' : '🌑'}
        </div>
        <h2 className="gameover-title" id="gameover-title">{title}</h2>
        <p  className="gameover-sub">{sub}</p>
        <div className="gameover-divider" />
        <button
          id="btn-play-again"
          className="gameover-play-again"
          onClick={onPlayAgain}
          autoFocus
        >
          ↺ Play Again
        </button>
      </div>
    </div>
  );
}
