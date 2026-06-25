/**
 * combatReadability.ts — Board-layer combat-readability helpers (PURE)
 *
 * The board already carries a full health model (BoardPiece.hp / .maxHp) and a
 * unit lifecycle (BoardPiece.isDead), but most of it is invisible during play.
 * These helpers surface that existing state for the renderer:
 *
 *   - healthBarModel():    restrained, faction-tinted HP bar that hides at full HP
 *   - detectNewlyDowned() / pruneDownedBodies():  downed-body persistence
 *
 * ── Sim boundary ────────────────────────────────────────────────────────────
 * Everything here is a PURE view-model: no board state is mutated and the frozen
 * board-combat-contract is never touched. Downed-body persistence is a
 * board-layer lifecycle WRAPPER — it only READS the alive→dead transitions the
 * pure sim already produced (piece.isDead) and tracks a transient on-screen body
 * so the renderer can keep drawing the corpse after the victor advances onto its
 * square. applyCombatResult / the pure board engine are unchanged.
 */
import type { BoardPiece, BoardCoord, Faction } from '../../lib/board-combat-contract';

// ─── Health-bar view-model ──────────────────────────────────────────────────

/** At or below this fraction of maxHp the bar reads as critical (danger tint). */
export const HEALTH_LOW_FRAC = 0.35;

export interface HealthBarModel {
  /** Fill width as a 0–100 percentage of maxHp (clamped). This is exactly what
   *  the bar renders, so a damaged unit "reports" its own health through it. */
  pct: number;
  /** Whether to render the bar at all. Hidden at full health (and when dead) to
   *  keep the board uncluttered — only wounded units draw a bar. */
  visible: boolean;
  /** True when the unit is critically wounded — renderer applies the danger tint. */
  low: boolean;
}

/**
 * Derive the restrained health-bar view-model for a board piece.
 *
 * The health field is read defensively: maxHp guards against divide-by-zero and
 * hp is clamped into [0, maxHp], tolerating an absent/lazy value (hp == null
 * before a unit has ever been touched) without throwing.
 */
export function healthBarModel(
  piece: Pick<BoardPiece, 'hp' | 'maxHp' | 'isDead'>,
): HealthBarModel {
  const maxHp = piece.maxHp > 0 ? piece.maxHp : 1;           // guard /0
  const hp = Math.max(0, Math.min(piece.hp ?? maxHp, maxHp)); // clamp; absent ⇒ full
  const frac = hp / maxHp;
  const damaged = hp < maxHp;
  return {
    pct: frac * 100,
    visible: damaged && !piece.isDead,
    low: damaged && frac < HEALTH_LOW_FRAC,
  };
}

// ─── Downed-body persistence (board-layer lifecycle wrapper) ─────────────────

/** How long a downed body lingers on the board before cleanup (ms). */
export const DOWNED_BODY_TTL_MS = 4_000;

/** Pieces only need this slice of BoardPiece to produce a downed body. */
type DownablePiece = Pick<BoardPiece, 'isDead' | 'name' | 'faction' | 'coord' | 'assetIds'>;

export interface DownedBody {
  pieceId: string;
  name: string;
  faction: Faction;
  /** Where the unit fell — the renderer draws the desaturated body here, even
   *  after the victor has advanced onto the same square. */
  coord: BoardCoord;
  /** Asset id for the defeated sprite. Rendered desaturated (canon: downed is
   *  grey, never rival-red). */
  defeatedAssetId: string;
  /** Wall-clock ms after which the body is cleaned up. */
  expiresAt: number;
}

/**
 * Detect pieces that JUST transitioned alive→dead between two board snapshots
 * and produce a transient DownedBody for each.
 *
 * The body captures the coord at the moment of death so the renderer can keep
 * drawing it after the victor advances onto that square — the pure sim orphans
 * the corpse from its square the same frame it dies, so without this the body
 * would be deleted instantly. Only a genuine alive→dead transition emits a body:
 * a unit already dead in `prev`, or absent from `prev` entirely (first mount /
 * loading a save that already holds a corpse), is skipped.
 */
export function detectNewlyDowned(
  prev: Record<string, DownablePiece>,
  next: Record<string, DownablePiece>,
  nowMs: number,
  ttlMs: number = DOWNED_BODY_TTL_MS,
): DownedBody[] {
  const bodies: DownedBody[] = [];
  for (const [id, piece] of Object.entries(next)) {
    if (!piece.isDead) continue;
    const before = prev[id];
    if (!before || before.isDead) continue; // not a fresh alive→dead transition
    bodies.push({
      pieceId: id,
      name: piece.name,
      faction: piece.faction,
      coord: piece.coord,
      defeatedAssetId: piece.assetIds.defeated,
      expiresAt: nowMs + ttlMs,
    });
  }
  return bodies;
}

/** Drop downed bodies whose linger time has elapsed (cleanup). Pure. */
export function pruneDownedBodies(bodies: DownedBody[], nowMs: number): DownedBody[] {
  return bodies.filter(b => b.expiresAt > nowMs);
}
