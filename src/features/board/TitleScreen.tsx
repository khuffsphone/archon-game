/**
 * TitleScreen.tsx — Archon 1.9
 *
 * Cinematic splash / main-menu screen shown before the board.
 * Features:
 *   - Animated ARCHON title with golden glow sweep
 *   - Light vs Dark faction crest icons with breathing animation
 *   - New Game CTA button
 *   - Condensed rules / win-condition summary
 *   - Keyboard shortcut (Enter / Space → New Game)
 *   - Smooth fade-out transition into the board
 */
import React, { useEffect, useState, useCallback } from 'react';

interface Props {
  onStart: () => void;
}

const RULES = [
  {
    icon: '♟',
    heading: 'Move & Conquer',
    body: 'Move one of your 7 pieces each turn. Move onto an enemy square to trigger combat.',
  },
  {
    icon: '⚔',
    heading: 'Combat',
    body: 'Challenger and defender trade blows until one is eliminated or retreats. Winning side occupies the square.',
  },
  {
    icon: '⚡',
    heading: 'Power Squares',
    body: '5 marked squares grant +2 HP regen per turn to any piece standing on them. Control all 5 to win instantly.',
  },
  {
    icon: '🌑',
    heading: 'Dark AI',
    body: 'Dark faction is controlled by AI — it will advance, seek power squares, and initiate combat automatically.',
  },
  {
    icon: '🏆',
    heading: 'Victory',
    body: 'Annihilate all enemy pieces — or control all 5 ⚡ power squares simultaneously to claim strategic dominance.',
  },
];

export function TitleScreen({ onStart }: Props) {
  const [exiting, setExiting] = useState(false);

  const handleStart = useCallback(() => {
    if (exiting) return;
    setExiting(true);
    setTimeout(onStart, 600); // wait for fade-out
  }, [exiting, onStart]);

  // Keyboard shortcut: Enter or Space
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleStart();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleStart]);

  return (
    <div className={`title-screen ${exiting ? 'title-screen--exit' : ''}`} id="title-screen">
      {/* Animated background particles */}
      <div className="title-bg" aria-hidden="true">
        <div className="title-bg__orb title-bg__orb--light" />
        <div className="title-bg__orb title-bg__orb--dark" />
      </div>

      <div className="title-content">
        {/* Faction crests */}
        <div className="title-crests" aria-hidden="true">
          <div className="title-crest title-crest--light">
            <span className="title-crest__icon">☀</span>
            <span className="title-crest__label">Light</span>
          </div>

          {/* Logo */}
          <div className="title-logo-block">
            <h1 className="title-logo" id="title-heading">ARCHON</h1>
            <p className="title-tagline">A Game of Light &amp; Shadow</p>
          </div>

          <div className="title-crest title-crest--dark">
            <span className="title-crest__icon">🌑</span>
            <span className="title-crest__label">Dark</span>
          </div>
        </div>

        {/* CTA */}
        <button
          id="btn-new-game"
          className="title-cta"
          onClick={handleStart}
          autoFocus
        >
          <span className="title-cta__text">⚔ New Game</span>
          <span className="title-cta__hint">Press Enter or Space</span>
        </button>

        {/* Rules */}
        <section className="title-rules" aria-label="Game rules summary">
          <h2 className="title-rules__heading">How to Play</h2>
          <div className="title-rules__grid">
            {RULES.map((rule, i) => (
              <div className="title-rule" key={i}>
                <span className="title-rule__icon" aria-hidden="true">{rule.icon}</span>
                <div className="title-rule__body">
                  <strong className="title-rule__title">{rule.heading}</strong>
                  <p className="title-rule__desc">{rule.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="title-footer">
          <span>Archon v1.9 · Headless Studios</span>
        </footer>
      </div>
    </div>
  );
}
