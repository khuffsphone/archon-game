/**
 * CampaignMap.tsx — Archon 3.0 Campaign Map v1
 *
 * Thin presentation shell that lets the player pick an encounter
 * before the board game starts. Sits between TitleScreen and BoardScene.
 *
 * Design constraints:
 *  - No new asset dependencies — emoji + CSS only.
 *  - All encounters route to the existing board game.
 *  - Back button returns to TitleScreen.
 *
 * 3.9: Unlock gates — locked encounters show a lock icon, requirement
 * text, and a disabled card. They cannot be selected or launched.
 */
import React, { useState, useCallback, useEffect } from 'react';
import { ENCOUNTERS, type EncounterNode, type EncounterType } from './campaignConfig';
import { UNLOCK_PREREQUISITES } from './campaignProgress';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  /** Called when the player confirms an encounter. */
  onLaunch:  (encounter: EncounterNode) => void;
  /** Called when the player presses Back — returns to title. */
  onBack:    () => void;
  /** 3.5: Set of completed encounter ids from campaign progression */
  completedIds?: string[];
  /** 3.9: Set of unlocked encounter ids (derived from progress in App.tsx) */
  unlockedIds?: string[];
  /** 3.5: Called when player clears all progression state */
  onClearProgress?: () => void;
}

// ─── Requirement label helper ─────────────────────────────────────────────────

/** Returns human-readable requirement text for a locked encounter, or null. */
function getRequirementLabel(id: EncounterType): string | null {
  const prereq = UNLOCK_PREREQUISITES[id];
  if (!prereq) return null;
  const prereqEnc = ENCOUNTERS.find(e => e.id === prereq);
  return prereqEnc ? `Complete ${prereqEnc.title} to unlock` : 'Locked';
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CampaignMap({
  onLaunch,
  onBack,
  completedIds  = [],
  unlockedIds,
  onClearProgress,
}: Props) {
  // Default: all unlocked (backward-compatible when prop is omitted)
  const effectiveUnlocked = unlockedIds ?? ENCOUNTERS.map(e => e.id);

  const [selected, setSelected] = useState<EncounterType | null>(null);
  const [exiting, setExiting]   = useState(false);

  const isLocked = (id: EncounterType) => !effectiveUnlocked.includes(id);

  const handleSelect = (id: EncounterType) => {
    if (isLocked(id)) return; // locked — no selection
    setSelected(id === selected ? null : id);
  };

  const handleLaunch = useCallback(() => {
    if (!selected || exiting) return;
    if (isLocked(selected)) return; // safety guard
    const enc = ENCOUNTERS.find(e => e.id === selected);
    if (!enc) return;
    setExiting(true);
    setTimeout(() => onLaunch(enc), 500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, exiting, onLaunch, effectiveUnlocked]);

  const handleBack = useCallback(() => {
    if (exiting) return;
    setExiting(true);
    setTimeout(onBack, 400);
  }, [exiting, onBack]);

  // Keyboard: Enter/Space → launch selected; Escape → back
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleLaunch(); }
      if (e.key === 'Escape') { e.preventDefault(); handleBack(); }
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
            const isSelected  = selected === enc.id;
            const isCompleted = completedIds.includes(enc.id);
            const locked      = isLocked(enc.id);
            const reqLabel    = locked ? getRequirementLabel(enc.id) : null;
            return (
              <button
                key={enc.id}
                id={`encounter-${enc.id}`}
                role="listitem"
                className={[
                  'encounter-node',
                  `encounter-node--${enc.themeClass}`,
                  isSelected  ? 'encounter-node--selected'  : '',
                  isCompleted ? 'encounter-node--completed'  : '',
                  locked      ? 'encounter-node--locked'     : '',
                ].filter(Boolean).join(' ')}
                onClick={() => handleSelect(enc.id)}
                disabled={locked}
                aria-pressed={locked ? undefined : isSelected}
                aria-disabled={locked ? true : undefined}
                aria-label={locked ? `${enc.title} — ${reqLabel ?? 'Locked'}` : enc.title}
              >
                <span className="encounter-node__icon" aria-hidden="true">
                  {locked ? '🔒' : enc.icon}
                </span>
                <div className="encounter-node__body">
                  <strong className="encounter-node__title">{enc.title}</strong>
                  <p className="encounter-node__subtitle">
                    {locked && reqLabel ? reqLabel : enc.subtitle}
                  </p>
                </div>
                <span className="encounter-node__badge">{enc.difficultyLabel}</span>
                {isCompleted && !locked && (
                  <span className="encounter-node__completed-badge" aria-label="Completed">
                    ✓ Completed
                  </span>
                )}
                {isSelected && !isCompleted && !locked && (
                  <span className="encounter-node__check" aria-hidden="true">✓</span>
                )}
              </button>
            );
          })}
        </div>

        {/* 3.5: Clear Progress link — only shown when at least one encounter is completed */}
        {completedIds.length > 0 && onClearProgress && (
          <div className="campaign-clear-progress">
            <button
              id="btn-clear-progress"
              className="campaign-clear-progress__btn"
              onClick={() => {
                if (window.confirm('Clear all encounter progress?')) {
                  onClearProgress();
                }
              }}
            >
              ↺ Clear Progress
            </button>
          </div>
        )}

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
