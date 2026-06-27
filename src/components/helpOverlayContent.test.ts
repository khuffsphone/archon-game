/**
 * helpOverlayContent.test.ts — Lane J (help / controls overlay)
 *
 * HelpOverlay is a JSX component and cannot be mounted in this project's node
 * Vitest environment (no DOM / jsdom installed). Following the established
 * project convention (see gameOverModal.test.ts, campaignMap.test.ts), the
 * overlay's renderable content is extracted into helpOverlayContent.ts and the
 * pure data + helpers are unit-tested here.
 */
import { describe, it, expect } from 'vitest';
import { getKeybindGroups, getGlossary } from './helpOverlayContent';

describe('Lane J — help overlay keybindings', () => {
  const groups = getKeybindGroups();
  const allBinds = groups.flatMap((g) => g.binds);

  it('exposes a keybind group for each input context', () => {
    const contexts = groups.map((g) => g.context);
    expect(contexts).toEqual([
      'Help & Global',
      'Title Screen',
      'Campaign Map',
      'Board (mouse-driven)',
      'Arena Combat',
    ]);
  });

  it('every keybinding has an id, at least one key, and an action', () => {
    expect(allBinds.length).toBeGreaterThan(0);
    for (const b of allBinds) {
      expect(b.id.trim().length).toBeGreaterThan(0);
      expect(b.keys.length).toBeGreaterThan(0);
      expect(b.keys.every((k) => k.trim().length > 0)).toBe(true);
      expect(b.action.trim().length).toBeGreaterThan(0);
    }
  });

  it('keybinding ids are unique', () => {
    const ids = allBinds.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('documents the F1 help toggle so the overlay is self-discoverable', () => {
    const help = allBinds.find((b) => b.id === 'global.help');
    expect(help).toBeDefined();
    expect(help!.keys).toContain('F1');
    expect(help!.action.toLowerCase()).toContain('help');
  });

  it('lists the real arena movement + attack binds (gameLoop.ts)', () => {
    const byId = Object.fromEntries(allBinds.map((b) => [b.id, b]));
    expect(byId['arena.moveLeft'].keys).toEqual(expect.arrayContaining(['A']));
    expect(byId['arena.moveRight'].keys).toEqual(expect.arrayContaining(['D']));
    expect(byId['arena.jump'].keys).toEqual(expect.arrayContaining(['W', 'Space']));
    expect(byId['arena.attack'].keys).toEqual(expect.arrayContaining(['Z', 'X', 'Enter']));
  });

  it('lists the real title / campaign / board binds', () => {
    const byId = Object.fromEntries(allBinds.map((b) => [b.id, b]));
    expect(byId['title.newGame'].keys).toEqual(expect.arrayContaining(['Enter', 'Space']));
    expect(byId['title.continue'].keys).toContain('C');
    expect(byId['campaign.launch'].keys).toEqual(expect.arrayContaining(['Enter', 'Space']));
    expect(byId['campaign.back'].keys).toContain('Esc');
    expect(byId['board.mute'].keys).toContain('M');
  });
});

describe('Lane J — help overlay remap support', () => {
  it('applies central keybind-map overrides when provided', () => {
    const overridden = getKeybindGroups({ 'arena.attack': ['K'] });
    const attack = overridden.flatMap((g) => g.binds).find((b) => b.id === 'arena.attack');
    expect(attack?.keys).toEqual(['K']);
  });

  it('falls back to built-in bindings when no override map is given', () => {
    const attack = getKeybindGroups()
      .flatMap((g) => g.binds)
      .find((b) => b.id === 'arena.attack');
    expect(attack?.keys).toEqual(['Z', 'X', 'Enter']);
  });

  it('ignores empty override lists', () => {
    const attack = getKeybindGroups({ 'arena.attack': [] })
      .flatMap((g) => g.binds)
      .find((b) => b.id === 'arena.attack');
    expect(attack?.keys).toEqual(['Z', 'X', 'Enter']);
  });

  it('returns fresh copies — callers cannot mutate the source bindings', () => {
    const first = getKeybindGroups();
    first[0].binds[0].keys.push('MUTATED');
    const second = getKeybindGroups();
    expect(second[0].binds[0].keys).not.toContain('MUTATED');
  });
});

describe('Lane J — help overlay glossary', () => {
  const glossary = getGlossary();

  it('is a concise list of core systems', () => {
    expect(glossary.length).toBeGreaterThanOrEqual(8);
    expect(glossary.length).toBeLessThanOrEqual(20);
  });

  it('every entry has a term and a non-empty summary', () => {
    for (const e of glossary) {
      expect(e.term.trim().length).toBeGreaterThan(0);
      expect(e.summary.trim().length).toBeGreaterThan(0);
    }
  });

  it('glossary terms are unique', () => {
    const terms = glossary.map((e) => e.term);
    expect(new Set(terms).size).toBe(terms.length);
  });

  it('covers the core mechanics a new player must understand', () => {
    const blob = glossary
      .map((e) => `${e.term} ${e.summary}`.toLowerCase())
      .join(' | ');
    for (const topic of ['power square', 'light', 'dark', 'arena', 'imprison', 'duel']) {
      expect(blob).toContain(topic);
    }
  });

  it('returns fresh copies — callers cannot mutate the source glossary', () => {
    const copy = getGlossary();
    copy.push({ term: 'mutant', summary: 'should not persist' });
    expect(getGlossary().length).toBe(glossary.length);
  });
});
