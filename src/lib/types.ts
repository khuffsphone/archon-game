// Shared types — mirrors CombatPackManifest in archon-workshop.
// The game ONLY consumes this shape. No internal workshop Asset fields.

export interface CombatPackAsset {
  id: string;
  category: string;
  subcategory?: string;
  faction?: 'light' | 'dark' | 'neutral';
  type: 'image' | 'audio';
  path: string;   // e.g. "/assets/unit-light-knight-token-v1.png"
  hash: string;
  mime_type: string;
}

export interface CombatPackManifest {
  schema_version: string;
  generated_at: string;
  tags: string[];
  assets: CombatPackAsset[];
}

// ─── Combat Engine Types ──────────────────────────────────────────────────────

export type Faction = 'light' | 'dark';
export type CombatPhase = 'intro' | 'battle' | 'victory' | 'defeat';
export type AnimEvent = 'hit' | 'death' | 'heal' | 'none';

export interface UnitState {
  id: string;           // e.g. "knight", "sorceress"
  name: string;
  faction: Faction;
  hp: number;
  maxHp: number;
  tokenId: string;      // asset id for token image
  portraitId: string;   // asset id for portrait image
  defeatedId: string;   // asset id for defeated image
  isDead: boolean;
}

export interface CombatState {
  phase: CombatPhase;
  turnFaction: Faction;
  turnNumber: number;
  units: { light: UnitState; dark: UnitState };
  lastEvent: AnimEvent;
  lastEventFaction: Faction | null;
  winner: Faction | null;
  log: string[];
}
