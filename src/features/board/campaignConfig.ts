/**
 * campaignConfig.ts — Archon 3.0 Campaign Map v1
 *
 * Defines the lightweight encounter list for Campaign Map v1.
 * All encounters launch the existing board game — this is a thin
 * selection shell, not a branching campaign framework.
 *
 * Hard is explicitly deferred (matching 2.2 difficulty deferrment).
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type EncounterType = 'skirmish' | 'standard' | 'arena-test';

export interface EncounterNode {
  /** Unique encounter id */
  id: EncounterType;
  /** Display title */
  title: string;
  /** Short flavour subtitle */
  subtitle: string;
  /** Emoji icon used as a visual anchor */
  icon: string;
  /** Difficulty label shown on the card */
  difficultyLabel: string;
  /** CSS modifier class suffix */
  themeClass: 'skirmish' | 'standard' | 'arena-test';
  /**
   * Hint for the board: which board setup function to use.
   * 'initial' = standard makeInitialBoardState().
   * 'skirmish' = future reduced roster (v1: same as initial).
   */
  boardSetup: 'initial' | 'skirmish';
  /** When true, route board combat through ArenaScene (requires ?arena=1 URL param) */
  preferArena: boolean;
}

// ─── Encounter definitions ────────────────────────────────────────────────────

export const ENCOUNTERS: EncounterNode[] = [
  {
    id:             'skirmish',
    title:          'Tutorial Skirmish',
    subtitle:       'Learn the basics in a shorter engagement',
    icon:           '🛡',
    difficultyLabel: 'Beginner',
    themeClass:     'skirmish',
    boardSetup:     'skirmish',
    preferArena:    false,
  },
  {
    id:             'standard',
    title:          'Standard Battle',
    subtitle:       'A full 7-vs-7 engagement for strategic dominance',
    icon:           '⚔',
    difficultyLabel: 'Normal',
    themeClass:     'standard',
    boardSetup:     'initial',
    preferArena:    false,
  },
  {
    id:             'arena-test',
    title:          'Arena Test',
    subtitle:       'Direct combat encounter — enable with ?arena=1',
    icon:           '🏟',
    difficultyLabel: 'Varies',
    themeClass:     'arena-test',
    boardSetup:     'initial',
    preferArena:    true,
  },
];

/** Find an encounter by id, returns undefined if not found. */
export function getEncounter(id: EncounterType): EncounterNode | undefined {
  return ENCOUNTERS.find(e => e.id === id);
}
