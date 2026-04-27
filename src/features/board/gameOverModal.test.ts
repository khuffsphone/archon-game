/**
 * gameOverModal.test.ts — Archon 3.6
 *
 * Tests for the GameOverModal encounter-complete feedback behaviour.
 *
 * Because GameOverModal is a JSX component we cannot mount it in a node Vitest
 * environment without a DOM. Instead we test the LOGIC that determines what the
 * modal receives as props — the conditional expressions in BoardScene's render,
 * mirrored as plain functions here so they can run without a browser.
 *
 * Covers:
 *  - encounterTitle is set only when Light wins AND activeEncounter is set
 *  - encounterTitle is undefined on Dark win (no banner)
 *  - encounterTitle is undefined when no activeEncounter (non-campaign game-over)
 *  - onReturnToCampaign provided only when Light wins + activeEncounter + handler
 *  - onReturnToCampaign absent on Dark win
 *  - onReturnToCampaign absent when no activeEncounter
 *  - fireComplete: fires once and not again (double-fire guard)
 *  - fireComplete: does not fire on Dark win
 *  - fireComplete: does not fire when no activeEncounter
 *  - fireComplete: fires correctly when Light wins with encounter
 *  - Non-campaign game-over (no activeEncounter): modal shows plain Light win copy
 *  - Dark win: no encounter banner, no Return to Campaign
 *  - campaignProgress still marks correctly after encounter completion
 */
import { describe, it, expect, vi } from 'vitest';
import { markEncounterComplete, isEncounterComplete, type CampaignProgressPayload, PROGRESS_VERSION } from './campaignProgress';

// ─── Helpers — mirror the prop-derivation logic from BoardScene render ────────

type Faction = 'light' | 'dark';

interface EncounterLike {
  id: 'skirmish' | 'standard' | 'arena-test';
  title: string;
}

/** Mirror of the encounterTitle ternary in BoardScene */
function deriveEncounterTitle(
  winnerFaction: Faction,
  activeEncounter: EncounterLike | null,
): string | undefined {
  return winnerFaction === 'light' && activeEncounter
    ? activeEncounter.title
    : undefined;
}

/** Mirror of the onReturnToCampaign ternary in BoardScene */
function deriveHasReturnToCampaign(
  winnerFaction: Faction,
  activeEncounter: EncounterLike | null,
  handlerProvided: boolean,
): boolean {
  return winnerFaction === 'light' && activeEncounter !== null && handlerProvided;
}

/** Mirror of the fireComplete guard logic in BoardScene */
function makeFireComplete(
  onEncounterComplete: ((id: string) => void) | undefined,
) {
  let fired = false;
  return function fireComplete(
    winnerFaction: Faction,
    activeEncounter: EncounterLike | null,
  ) {
    if (fired) return;
    if (winnerFaction === 'light' && activeEncounter && onEncounterComplete) {
      fired = true;
      onEncounterComplete(activeEncounter.id);
    }
  };
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SKIRMISH: EncounterLike = { id: 'skirmish', title: 'Tutorial Skirmish' };
const STANDARD: EncounterLike = { id: 'standard', title: 'Standard Battle' };

// ─── encounterTitle derivation ────────────────────────────────────────────────

describe('3.6 — encounterTitle derivation', () => {
  it('is the encounter title when Light wins with active encounter', () => {
    expect(deriveEncounterTitle('light', SKIRMISH)).toBe('Tutorial Skirmish');
  });

  it('is the encounter title for Standard Battle too', () => {
    expect(deriveEncounterTitle('light', STANDARD)).toBe('Standard Battle');
  });

  it('is undefined on Dark win even with active encounter', () => {
    expect(deriveEncounterTitle('dark', SKIRMISH)).toBeUndefined();
  });

  it('is undefined when no active encounter (Continue Game / QA path)', () => {
    expect(deriveEncounterTitle('light', null)).toBeUndefined();
  });

  it('is undefined on Dark win with no encounter', () => {
    expect(deriveEncounterTitle('dark', null)).toBeUndefined();
  });
});

// ─── Return to Campaign prop derivation ───────────────────────────────────────

describe('3.6 — Return to Campaign prop derivation', () => {
  it('is provided when Light wins, encounter active, handler provided', () => {
    expect(deriveHasReturnToCampaign('light', SKIRMISH, true)).toBe(true);
  });

  it('is absent when Dark wins', () => {
    expect(deriveHasReturnToCampaign('dark', SKIRMISH, true)).toBe(false);
  });

  it('is absent when no active encounter (non-campaign game-over)', () => {
    expect(deriveHasReturnToCampaign('light', null, true)).toBe(false);
  });

  it('is absent when handler not provided', () => {
    expect(deriveHasReturnToCampaign('light', SKIRMISH, false)).toBe(false);
  });

  it('is absent when Dark wins AND no encounter AND no handler', () => {
    expect(deriveHasReturnToCampaign('dark', null, false)).toBe(false);
  });
});

// ─── fireComplete double-fire guard ───────────────────────────────────────────

describe('3.6 — fireComplete double-fire guard', () => {
  it('fires onEncounterComplete exactly once on Light win with encounter', () => {
    const cb = vi.fn();
    const fire = makeFireComplete(cb);
    fire('light', SKIRMISH);
    fire('light', SKIRMISH);
    fire('light', SKIRMISH);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('fires with the correct encounter id', () => {
    const cb = vi.fn();
    const fire = makeFireComplete(cb);
    fire('light', SKIRMISH);
    expect(cb).toHaveBeenCalledWith('skirmish');
  });

  it('does not fire on Dark win', () => {
    const cb = vi.fn();
    const fire = makeFireComplete(cb);
    fire('dark', SKIRMISH);
    expect(cb).not.toHaveBeenCalled();
  });

  it('does not fire when activeEncounter is null', () => {
    const cb = vi.fn();
    const fire = makeFireComplete(cb);
    fire('light', null);
    expect(cb).not.toHaveBeenCalled();
  });

  it('does not fire when onEncounterComplete is not provided', () => {
    const fire = makeFireComplete(undefined);
    // Should not throw
    expect(() => fire('light', SKIRMISH)).not.toThrow();
  });

  it('each fireComplete instance has its own guard (separate game-overs)', () => {
    const cb = vi.fn();
    const fire1 = makeFireComplete(cb);
    const fire2 = makeFireComplete(cb);
    fire1('light', SKIRMISH);  // first game-over
    fire2('light', STANDARD);  // second game-over (fresh guard)
    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb).toHaveBeenNthCalledWith(1, 'skirmish');
    expect(cb).toHaveBeenNthCalledWith(2, 'standard');
  });
});

// ─── Non-encounter game-over (no activeEncounter) ─────────────────────────────

describe('3.6 — non-campaign game-over still works', () => {
  it('encounterTitle is undefined (no banner)', () => {
    expect(deriveEncounterTitle('light', null)).toBeUndefined();
  });

  it('Return to Campaign is absent', () => {
    expect(deriveHasReturnToCampaign('light', null, true)).toBe(false);
  });

  it('fireComplete does not fire', () => {
    const cb = vi.fn();
    const fire = makeFireComplete(cb);
    fire('light', null);
    expect(cb).not.toHaveBeenCalled();
  });
});

// ─── Dark win ─────────────────────────────────────────────────────────────────

describe('3.6 — Dark win: no encounter-complete feedback', () => {
  it('encounterTitle is undefined even with active encounter', () => {
    expect(deriveEncounterTitle('dark', SKIRMISH)).toBeUndefined();
  });

  it('Return to Campaign absent', () => {
    expect(deriveHasReturnToCampaign('dark', SKIRMISH, true)).toBe(false);
  });

  it('fireComplete does not fire', () => {
    const cb = vi.fn();
    const fire = makeFireComplete(cb);
    fire('dark', SKIRMISH);
    expect(cb).not.toHaveBeenCalled();
  });
});

// ─── Integration with campaignProgress ───────────────────────────────────────

describe('3.6 — progression marks correctly via fireComplete pattern', () => {
  const empty: CampaignProgressPayload = { progressVersion: PROGRESS_VERSION, completedIds: [] };

  it('marks encounter complete when Light wins (simulated callback)', () => {
    let prog = empty;
    const cb = (id: string) => {
      prog = markEncounterComplete(prog, id as 'skirmish' | 'standard' | 'arena-test');
    };
    const fire = makeFireComplete(cb);
    fire('light', SKIRMISH);
    expect(isEncounterComplete(prog, 'skirmish')).toBe(true);
  });

  it('does not mark encounter when Dark wins', () => {
    let prog = empty;
    const cb = (id: string) => {
      prog = markEncounterComplete(prog, id as 'skirmish' | 'standard' | 'arena-test');
    };
    const fire = makeFireComplete(cb);
    fire('dark', SKIRMISH);
    expect(isEncounterComplete(prog, 'skirmish')).toBe(false);
  });

  it('marking is idempotent even if fire somehow called multiple times', () => {
    let prog = empty;
    const cb = (id: string) => {
      prog = markEncounterComplete(prog, id as 'skirmish' | 'standard' | 'arena-test');
    };
    const fire = makeFireComplete(cb);
    fire('light', SKIRMISH);
    fire('light', SKIRMISH); // guard prevents second call
    expect(prog.completedIds.filter(id => id === 'skirmish')).toHaveLength(1);
  });

  it('correctly marks Standard Battle separately', () => {
    let prog = empty;
    const cb = (id: string) => {
      prog = markEncounterComplete(prog, id as 'skirmish' | 'standard' | 'arena-test');
    };
    const fire = makeFireComplete(cb);
    fire('light', STANDARD);
    expect(isEncounterComplete(prog, 'standard')).toBe(true);
    expect(isEncounterComplete(prog, 'skirmish')).toBe(false);
  });
});
