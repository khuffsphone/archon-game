/**
 * CampaignMap.tsx — Archon 3.0 Campaign Map v1
 *
 * Thin presentation shell that lets the player pick an encounter
 * before the board game starts. Sits between TitleScreen and BoardScene.
 *
 * Design constraints:
 *  - No new asset dependencies — emoji + CSS only.
 *  - No branching campaign logic.
 *  - All encounters route to the existing board game.
 *  - Back button returns to TitleScreen.
 */
import React, { useState, useCallback, useEffect } from 'react';
import { ENCOUNTERS, type EncounterNode, type EncounterType } from './campaignConfig';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  /** Called when the player confirms an encounter. */
  onLaunch:  (encounter: EncounterNode) => void;
  /** Called when the player presses Back — returns to title. */
  onBack:    () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CampaignMap({ onLaunch, onBack }: Props) {
  const [selected, setSelected] = useState<EncounterType | null>(null);
  const [exiting, setExiting]   = useState(false);

  const handleSelect = (id: EncounterType) => {
    setSelected(id === selected ? null : id); // toggle deselects
  };

  const handleLaunch = useCallback(() => {
    if (!selected || exiting) return;
    const enc = ENCOUNTERS.find(e => e.id === selected);
    if (!enc) return;
    setExiting(true);
    setTimeout(() => onLaunch(enc), 500);
  }, [selected, exiting, onLaunch]);

  const handleBack = useCallback(() => {
    if (exiting) return;
    setExiting(true);
    setTimeout(onBack, 400);
  }, [exiting, onBack]);

  // Keyboard: Enter/Space → launch selected; Escape/Backspace → back
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleLaunch(); }
      if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); handleBack(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleLaunch, handleBack]);

  const selectedEncounter = selected ? ENCOUNTERS.find(e => e.id === selected) : null;

  return (
    <div
      className={`campaign-map ${exiting ? 'campaign-map--exit' : ''}`}
      id="campaign-map"
    >
      {/* Ambient background orbs */}
      <div className="campaign-bg" aria-hidden="true">
        <div className="campaign-bg__orb campaign-bg__orb--a" />
        <div className="campaign-bg__orb campaign-bg__orb--b" />
      </div>

      <div className="campaign-content">
        {/* Header */}
        <header className="campaign-header">
          <button
            id="btn-campaign-back"
            className="campaign-back-btn"
            onClick={handleBack}
            aria-label="Back to title"
          >
            ← Back
          </button>
          <div className="campaign-title-block">
            <h1 className="campaign-heading" id="campaign-heading">Choose Your Battle</h1>
            <p  className="campaign-subheading">Select an encounter to begin</p>
          </div>
        </header>

        {/* Encounter nodes */}
        <div className="campaign-nodes" role="list" aria-label="Encounter selection">
          {ENCOUNTERS.map((enc) => {
            const isSelected = selected === enc.id;
            return (
              <button
                key={enc.id}
                id={`encounter-${enc.id}`}
                role="listitem"
                className={[
                  'encounter-node',
                  `encounter-node--${enc.themeClass}`,
                  isSelected ? 'encounter-node--selected' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => handleSelect(enc.id)}
                aria-pressed={isSelected}
              >
                <span className="encounter-node__icon" aria-hidden="true">
                  {enc.icon}
                </span>
                <div className="encounter-node__body">
                  <strong className="encounter-node__title">{enc.title}</strong>
                  <p className="encounter-node__subtitle">{enc.subtitle}</p>
                </div>
                <span className="encounter-node__badge">{enc.difficultyLabel}</span>
                {isSelected && (
                  <span className="encounter-node__check" aria-hidden="true">✓</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected encounter detail + launch CTA */}
        <div className="campaign-footer">
          {selectedEncounter ? (
            <div className="campaign-launch-row">
              <span className="campaign-launch-label">
                {selectedEncounter.icon} {selectedEncounter.title} selected
              </span>
              <button
                id="btn-launch-encounter"
                className="campaign-launch-btn"
                onClick={handleLaunch}
                autoFocus
              >
                <span className="campaign-launch-btn__text">⚔ Begin Encounter</span>
                <span className="campaign-launch-btn__hint">Press Enter</span>
              </button>
            </div>
          ) : (
            <p className="campaign-select-hint">
              Select an encounter above, then press <kbd>Enter</kbd> to begin.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
