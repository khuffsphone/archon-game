import type { CombatState, Faction, UnitState } from '../../lib/types';

// ─── Initial State Factory ────────────────────────────────────────────────────

export interface CombatInitOverrides {
  /** Override starting HP for light unit (Knight). Defaults to 20. */
  lightHp?: number;
  /** Override starting HP for dark unit (Sorceress). Defaults to 16. */
  darkHp?: number;
  /** Override which faction attacks first. Defaults to 'light'. */
  firstTurn?: Faction;
}

/**
 * makeInitialState
 * Produces a fresh CombatState ready for the intro phase.
 * All params are optional — zero-arg call is identical to the original behaviour.
 * Overrides are used by CombatBridge to inject board piece HP into combat.
 */
export function makeInitialState(overrides?: CombatInitOverrides): CombatState {
  const lightHp = overrides?.lightHp ?? 20;
  const darkHp  = overrides?.darkHp  ?? 16;

  const knight: UnitState = {
    id: 'knight', name: 'Knight', faction: 'light',
    hp: lightHp, maxHp: 20,  // maxHp = roster max, hp = current (may be overridden)
    tokenId:    'unit-light-knight-token',
    portraitId: 'unit-light-knight-portrait',
    defeatedId: 'unit-light-knight-defeated',
    isDead: false,
  };
  const sorceress: UnitState = {
    id: 'sorceress', name: 'Sorceress', faction: 'dark',
    hp: darkHp, maxHp: 16,
    tokenId:    'unit-dark-sorceress-token',
    portraitId: 'unit-dark-sorceress-portrait',
    defeatedId: 'unit-dark-sorceress-defeated',
    isDead: false,
  };
  return {
    phase: 'intro',
    turnFaction: overrides?.firstTurn ?? 'light',
    turnNumber: 1,
    units: { light: knight, dark: sorceress },
    lastEvent: 'none',
    lastEventFaction: null,
    winner: null,
    log: ['Battle begins!'],
  };
}

// ─── Damage Table ─────────────────────────────────────────────────────────────

function rollDamage(attacker: Faction): number {
  // Knight hits for 3–6, Sorceress hits for 4–7
  const base = attacker === 'light' ? 3 : 4;
  const spread = attacker === 'light' ? 4 : 4;
  return base + Math.floor(Math.random() * spread);
}

// ─── Transitions ─────────────────────────────────────────────────────────────

/** Returns a new CombatState — pure, no mutation */
export function processAttack(state: CombatState): CombatState {
  if (state.phase !== 'battle') return state;

  const attFaction  = state.turnFaction;
  const defFaction: Faction = attFaction === 'light' ? 'dark' : 'light';
  const attacker = state.units[attFaction];
  const defender = { ...state.units[defFaction] };

  const dmg = rollDamage(attFaction);
  defender.hp = Math.max(0, defender.hp - dmg);
  const killed = defender.hp === 0;
  if (killed) defender.isDead = true;

  const newLog = [
    `${attacker.name} attacks ${defender.name} for ${dmg} damage.`,
    ...(killed ? [`${defender.name} has been defeated!`] : []),
    ...state.log,
  ].slice(0, 20);

  const winner: Faction | null = killed ? attFaction : null;

  return {
    ...state,
    units: { ...state.units, [defFaction]: defender },
    lastEvent: killed ? 'death' : 'hit',
    lastEventFaction: defFaction,
    winner,
    phase: winner ? 'victory' : 'battle',
    turnFaction: winner ? state.turnFaction : defFaction,
    turnNumber: winner ? state.turnNumber : state.turnNumber + (defFaction === 'light' ? 1 : 0),
    log: newLog,
  };
}

export function startBattle(state: CombatState): CombatState {
  return { ...state, phase: 'battle', log: ['Battle begins!', ...state.log] };
}

export function resetBattle(): CombatState {
  return makeInitialState();
}
