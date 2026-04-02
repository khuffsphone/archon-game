/**
 * BoardScene.tsx  —  Lane 3 owner
 * The 9×9 Archon board shell.
 * Renders the board, pieces, luminance states, selection, and legal move overlays.
 * Fires CombatBridgeCallbacks when a contested square is entered.
 */
import React, { useState, useCallback } from 'react';
import type { CombatPackManifest } from '../../lib/types';
import type {
  BoardState, BoardCoord, CombatLaunchPayload, CombatBridgeCallbacks,
} from '../../lib/board-combat-contract';
import {
  makeInitialBoardState, selectPiece, deselectPiece, executeMove,
  applyCombatResult, checkBoardAssets, BOARD_SIZE,
} from './boardState';
import { getAssetUrl } from '../../lib/packLoader';

interface Props {
  pack: CombatPackManifest;
  onLaunchCombat: (payload: CombatLaunchPayload, callbacks: CombatBridgeCallbacks) => void;
}

export function BoardScene({ pack, onLaunchCombat }: Props) {
  const [board, setBoard] = useState<BoardState>(makeInitialBoardState);

  // Asset coverage check (non-blocking)
  const assetCheck = checkBoardAssets(pack);
  if (assetCheck.missing.length > 0) {
    console.warn('[BoardScene] Missing assets for alpha roster:', assetCheck.missing);
  }

  const handleSquareClick = useCallback((coord: BoardCoord) => {
    if (board.phase === 'combat' || board.phase === 'gameover') return;

    const clickedPieceId = board.squares[coord.row][coord.col].pieceId;
    const clickedPiece = clickedPieceId ? board.pieces[clickedPieceId] : null;

    // If clicking on own piece — select it
    if (clickedPiece && clickedPiece.faction === board.turnFaction && !clickedPiece.isDead) {
      setBoard(prev => selectPiece(prev, clickedPieceId!));
      return;
    }

    // If a piece is selected and this square is a legal move
    if (board.selectedPieceId && board.legalMoves.some(m => m.row === coord.row && m.col === coord.col)) {
      const result = executeMove(board, coord);

      if (result.type === 'contest') {
        // Launch combat — board suspends
        setBoard(result.nextState); // phase = 'combat'

        const payload: CombatLaunchPayload = {
          contestedSquare: coord,
          attacker: result.attacker,
          defender: result.defender,
          pack,
        };

        const callbacks: CombatBridgeCallbacks = {
          onResult: (combatResult) => {
            setBoard(prev => applyCombatResult(prev, combatResult));
          },
          onCancel: () => {
            setBoard(prev => ({ ...prev, phase: 'active', selectedPieceId: null, legalMoves: [] }));
          },
        };

        onLaunchCombat(payload, callbacks);
      } else {
        setBoard(result.nextState);
      }
      return;
    }

    // Otherwise deselect
    setBoard(prev => deselectPiece(prev));
  }, [board, pack, onLaunchCombat]);

  const winner = board.phase === 'gameover'
    ? (Object.values(board.pieces).some(p => p.faction === 'light' && !p.isDead) ? 'light' : 'dark')
    : null;

  return (
    <div className="board-scene" id="board-scene">
      {/* Board HUD */}
      <header className="board-hud">
        <div className="hud-left">
          <span className="game-title">⚔ Archon</span>
          <span className="board-subtitle">Board Alpha</span>
        </div>
        <div className="hud-center">
          {board.phase === 'active' && (
            <span className={`turn-indicator turn-indicator--${board.turnFaction}`}>
              {board.turnFaction === 'light' ? '☀ Light' : '🌑 Dark'} — Turn {board.turnNumber}
            </span>
          )}
          {board.phase === 'combat' && (
            <span className="turn-indicator turn-indicator--combat">⚔ Combat in progress…</span>
          )}
          {board.phase === 'gameover' && (
            <span className={`turn-indicator turn-indicator--${winner}`}>
              {winner === 'light' ? '☀ Light Wins!' : '🌑 Dark Wins!'}
            </span>
          )}
        </div>
        <div className="hud-right">
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
            const hasEnemy = isLegal && piece && piece.faction !== board.turnFaction;

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
                ].filter(Boolean).join(' ')}
                onClick={() => handleSquareClick({ row: rowIdx, col: colIdx })}
              >
                {/* Coord debug label (small) */}
                <span className="sq-coord">{rowIdx},{colIdx}</span>

                {/* Piece token */}
                {piece && !piece.isDead && (
                  <PieceToken piece={piece} pack={pack} isSelected={isSelected} />
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
            return (
              <div className="sidebar-piece-card">
                {portraitUrl && <img src={portraitUrl} alt={p.name} className="sidebar-portrait" />}
                <div className="sidebar-info">
                  <div className="sidebar-name">{p.name}</div>
                  <div className="sidebar-role">{p.role}</div>
                  <div className="sidebar-hp">{p.hp} / {p.maxHp} HP</div>
                  <div className="sidebar-moves">{board.legalMoves.length} moves available</div>
                </div>
              </div>
            );
          })()}
        </aside>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface TokenProps {
  piece: import('../../lib/board-combat-contract').BoardPiece;
  pack: CombatPackManifest;
  isSelected?: boolean;
}

function PieceToken({ piece, pack, isSelected }: TokenProps) {
  const tokenUrl = getAssetUrl(pack, piece.assetIds.token);
  return (
    <div
      className={[
        'piece-token',
        `piece-token--${piece.faction}`,
        isSelected ? 'piece-token--selected' : '',
      ].filter(Boolean).join(' ')}
      title={`${piece.name} (${piece.faction}) — ${piece.hp}/${piece.maxHp} HP`}
    >
      {tokenUrl
        ? <img src={tokenUrl} alt={piece.name} className="piece-token-img" />
        : <span className="piece-token-fallback">{piece.faction === 'light' ? '☀' : '🌑'}</span>
      }
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
