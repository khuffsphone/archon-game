/**
 * helpOverlayContent.ts — Lane J (help / controls overlay)
 *
 * Single source of truth for the in-game help overlay's renderable content:
 * the keybinding reference and the mechanics glossary.
 *
 * This module is intentionally framework-free (no React import) so it can be
 * unit-tested in the project's node Vitest environment, which has no DOM and
 * cannot mount JSX components. `HelpOverlay.tsx` is a thin presentational map
 * over the data exported here.
 *
 * Every keybinding below is grounded in the actual `window` keydown handlers in
 * the codebase (there is no central remap module to read from yet):
 *   - Arena combat: src/features/arena/gameLoop.ts:45-48
 *   - Title screen: src/features/board/TitleScreen.tsx:80-87
 *   - Campaign map: src/features/board/CampaignMap.tsx:83-90
 *   - Board mute:   src/features/board/BoardScene.tsx:106-115
 *   - Help (F1):    src/components/HelpOverlay.tsx (added by this lane)
 *
 * If a central keybind map is introduced later (e.g. a remap settings UI),
 * `getKeybindGroups(overrides)` accepts an `actionId -> keys` map so the help
 * overlay stays accurate after remaps without re-authoring this file.
 */

export interface Keybind {
  /** Stable action id — also the key a future remap map would override. */
  id: string;
  /** Display tokens for the keys/inputs bound to this action. */
  keys: string[];
  /** Player-facing description of what the input does. */
  action: string;
}

export interface KeybindGroup {
  /** Input context / mode these bindings apply in. */
  context: string;
  /** Optional clarifying note for the group. */
  note?: string;
  binds: Keybind[];
}

export interface GlossaryEntry {
  term: string;
  summary: string;
}

/** Optional central remap source: action id -> display keys. */
export type KeybindOverrides = Readonly<Record<string, readonly string[]>>;

/**
 * Built-in bindings, grouped by the scene/mode that owns each window keydown
 * listener. Keep this list in sync with the handlers cited in the file header.
 */
const KEYBIND_GROUPS: readonly KeybindGroup[] = [
  {
    context: 'Help & Global',
    binds: [
      { id: 'global.help', keys: ['F1'], action: 'Open or close this help overlay' },
      { id: 'global.closeHelp', keys: ['Esc'], action: 'Close this help overlay' },
    ],
  },
  {
    context: 'Title Screen',
    binds: [
      { id: 'title.newGame', keys: ['Enter', 'Space'], action: 'Start a new game' },
      { id: 'title.continue', keys: ['C'], action: 'Continue your saved game (if one exists)' },
    ],
  },
  {
    context: 'Campaign Map',
    binds: [
      { id: 'campaign.launch', keys: ['Enter', 'Space'], action: 'Launch the selected encounter' },
      { id: 'campaign.back', keys: ['Esc'], action: 'Back to the title screen' },
    ],
  },
  {
    context: 'Board (mouse-driven)',
    note: 'Pieces are commanded with the mouse; the board itself has no movement keys.',
    binds: [
      { id: 'board.select', keys: ['Click piece'], action: 'Select or deselect one of your pieces' },
      { id: 'board.move', keys: ['Click square'], action: 'Move there — or attack an enemy piece to start a duel' },
      { id: 'board.heal', keys: ['Heal button'], action: 'Cure or heal an adjacent ally (board sidebar)' },
      { id: 'board.mute', keys: ['M'], action: 'Toggle game audio (mute / unmute)' },
    ],
  },
  {
    context: 'Arena Combat',
    note: 'Active during a live arena duel; the enemy is AI-controlled.',
    binds: [
      { id: 'arena.moveLeft', keys: ['←', 'A'], action: 'Move left' },
      { id: 'arena.moveRight', keys: ['→', 'D'], action: 'Move right' },
      { id: 'arena.jump', keys: ['↑', 'W', 'Space'], action: 'Jump' },
      { id: 'arena.attack', keys: ['Z', 'X', 'Enter'], action: 'Attack — melee strike or ranged projectile' },
    ],
  },
];

/**
 * Concise, player-facing glossary of the core systems a new player needs.
 * Every entry is grounded in the simulation/source (no invented mechanics):
 * see src/features/board/boardState.ts, src/features/arena/*, and
 * src/lib/board-combat-contract.ts.
 */
const GLOSSARY: readonly GlossaryEntry[] = [
  {
    term: 'Light vs Dark',
    summary:
      'Two factions fight on a 9×9 board. Dark holds the top rows, Light the bottom. Every living piece projects its faction’s colour onto the eight squares around it; where the colours meet, a square becomes contested.',
  },
  {
    term: 'Turns',
    summary:
      'Light moves first, then the sides strictly alternate — one action per turn. On your turn, pick one of your pieces and either move it or attack with it.',
  },
  {
    term: 'Pieces & Roles',
    summary:
      'Each side fields up to seven pieces, each with a role (warrior, caster, sentinel, herald) and its own movement profile — short king-style steps or long sliding lines. You cannot land on your own pieces.',
  },
  {
    term: 'Contesting & Duels',
    summary:
      'Moving onto an enemy-occupied square does not capture automatically — it launches a duel between the two pieces. The mover attacks first; the winner takes the square with its remaining HP and the loser is removed.',
  },
  {
    term: 'Two Combat Modes',
    summary:
      'By default a duel is a quick automated turn-based exchange. With the ?arena=1 flag (or the Arena Test encounter) it becomes a live 2D fight you control directly with the Arena Combat keys.',
  },
  {
    term: 'Arena Combat',
    summary:
      'A side-view duel with a 3–2–1 countdown, a 30-second round, gravity and jumping. Land hits to drain the enemy’s HP bar — reach zero first to win, or hold the lead when time runs out.',
  },
  {
    term: 'Power Squares',
    summary:
      'The four corners and the centre are ⚡ power squares. A piece that ends its turn on one regenerates +2 HP, and holding all five at once wins the game instantly.',
  },
  {
    term: 'Winning',
    summary:
      'Win by destroying every enemy piece, or by controlling all five power squares at the same time. Power-square victory is checked first.',
  },
  {
    term: 'Imprisonment',
    summary:
      'A beaten piece can be imprisoned: it stays on the board but cannot move and skips its turns until it is freed, automatically after two of its faction’s turns.',
  },
  {
    term: 'Heal & Cure',
    summary:
      'An adjacent ally can spend its turn to free an imprisoned friend and/or restore +3 HP (up to that piece’s maximum).',
  },
  {
    term: 'Special Abilities',
    summary:
      'Some units carry arena powers: the Troll slowly regenerates HP, the Banshee looses a damaging wail at close range, and a Phoenix can revive once when downed.',
  },
  {
    term: 'Campaign & Unlocks',
    summary:
      'Encounters unlock in sequence as you win them — clear the Tutorial Skirmish to open the Standard Battle, then Dragon’s Gate. Progress is saved between sessions.',
  },
  {
    term: 'Difficulty',
    summary:
      'Choose Easy or Normal on the title screen; the setting tunes how aggressive and reactive the arena enemy AI is.',
  },
];

/**
 * Returns the keybinding groups for display. If a central remap map is supplied
 * (actionId -> keys), matching bindings show the remapped keys; otherwise the
 * built-in bindings are returned. Always returns fresh, independently-mutable
 * copies so callers can never mutate the source data.
 */
export function getKeybindGroups(overrides?: KeybindOverrides): KeybindGroup[] {
  return KEYBIND_GROUPS.map((group) => ({
    context: group.context,
    ...(group.note !== undefined ? { note: group.note } : {}),
    binds: group.binds.map((bind) => {
      const override = overrides?.[bind.id];
      return {
        id: bind.id,
        action: bind.action,
        keys: override && override.length > 0 ? [...override] : [...bind.keys],
      };
    }),
  }));
}

/** Returns the mechanics glossary as fresh, independently-mutable copies. */
export function getGlossary(): GlossaryEntry[] {
  return GLOSSARY.map((entry) => ({ ...entry }));
}
