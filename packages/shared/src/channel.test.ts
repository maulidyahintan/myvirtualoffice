import { describe, expect, it } from 'vitest';
import { ACTIONS } from './constants.ts';
import { MOCHI_ONLY_ACTIONS, canPerform } from './channel.ts';

describe('canPerform', () => {
  it('lets Mochi do its own actions and play', () => {
    for (const action of [...MOCHI_ONLY_ACTIONS, 'playing'] as const) expect(canPerform('mochi', action)).toBe(true);
  });

  it('keeps the cat-only actions away from Mamas and Mother', () => {
    for (const character of ['mamas', 'mother'] as const) {
      for (const action of MOCHI_ONLY_ACTIONS) expect(canPerform(character, action)).toBe(false);
    }
  });

  it('does not let Mochi hold, read, pray or eat', () => {
    for (const action of ['holding', 'reading-quran', 'praying', 'eating'] as const) expect(canPerform('mochi', action)).toBe(false);
  });

  it('lets Mamas and Mother do every action that is not cat-only', () => {
    const humanActions = ACTIONS.filter((action) => !MOCHI_ONLY_ACTIONS.includes(action));
    for (const action of humanActions) {
      expect(canPerform('mamas', action)).toBe(true);
      expect(canPerform('mother', action)).toBe(true);
    }
  });
});
