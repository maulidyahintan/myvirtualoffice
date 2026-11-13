import { describe, expect, it } from 'vitest';
import { ACTIONS, DEFAULT_CHARACTER_LOOKS } from './constants.ts';
import type { AppConfig } from './types.ts';
import { CHILD_ONLY_ACTIONS, MOCHI_ONLY_ACTIONS, canPerform, characterLooks } from './channel.ts';

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
    const humanActions = ACTIONS.filter((action) => !MOCHI_ONLY_ACTIONS.includes(action) && !CHILD_ONLY_ACTIONS.includes(action) && action !== 'hugging');
    for (const action of humanActions) {
      expect(canPerform('mamas', action)).toBe(true);
      expect(canPerform('mother', action)).toBe(true);
    }
  });

  it('lets only Mother hug, and only the children hug their knees or carry the cat', () => {
    expect(canPerform('mother', 'hugging')).toBe(true);
    expect(canPerform('mamas', 'hugging')).toBe(false);
    expect(canPerform('friend', 'hugging-knees')).toBe(true);
    expect(canPerform('mother', 'carrying-cat')).toBe(false);
    expect(canPerform('mochi', 'licking')).toBe(true);
    expect(canPerform('mamas', 'approaching')).toBe(false);
  });

  it('lets everyone but the cat open the front door', () => {
    for (const character of ['mamas', 'mother', 'friend'] as const) expect(canPerform(character, 'opening-door')).toBe(true);
    expect(canPerform('mochi', 'opening-door')).toBe(false);
  });

  it('gives the school bag to the children only', () => {
    expect(canPerform('friend', 'wearing-backpack')).toBe(true);
    expect(canPerform('mamas', 'wearing-backpack')).toBe(true);
    expect(canPerform('mother', 'wearing-backpack')).toBe(false);
    expect(canPerform('mochi', 'wearing-backpack')).toBe(false);
  });
});

describe('characterLooks', () => {
  it('includes the friend with his default colors and the owner overrides', () => {
    const looks = characterLooks({ characterLooks: { friend: { shirt: '#123456' } } } as AppConfig);
    expect(looks.friend.shirt).toBe('#123456');
    expect(looks.friend.hair).toBe(DEFAULT_CHARACTER_LOOKS.friend.hair);
  });
});
