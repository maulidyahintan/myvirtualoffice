import { describe, expect, it } from 'vitest';
import type { Scene } from '@kantor/shared/types';
import { drawOrder, mochiLeavesRow, stageInteractions } from './staging';

const scene = (characters: Scene['characters'], actions: Scene['actions'] = []): Pick<Scene, 'characters' | 'actions'> => ({ characters, actions });

describe('stageInteractions', () => {
  it('puts a child hugging its knees on the bed only when there is a bed', () => {
    const s = scene(['mamas'], [{ character: 'mamas', action: 'hugging-knees' }]);
    expect(stageInteractions(s, { hasBed: true }).sitterOnBed).toBe('mamas');
    expect(stageInteractions(s, { hasBed: false }).sitterOnBed).toBeUndefined();
  });

  it('puts a child hiding under the blanket on the bed', () => {
    const s = scene(['mother', 'mamas'], [{ character: 'mamas', action: 'hiding-under-blanket' }]);
    expect(stageInteractions(s, { hasBed: true }).sitterOnBed).toBe('mamas');
    expect(stageInteractions(s, { hasBed: false }).sitterOnBed).toBeUndefined();
  });

  it('lets Mochi walk up to the child on the bed first', () => {
    const s = scene(['mother', 'mamas', 'mochi'], [
      { character: 'mamas', action: 'hugging-knees' },
      { character: 'mochi', action: 'approaching' },
    ]);
    expect(stageInteractions(s, { hasBed: true })).toMatchObject({ sitterOnBed: 'mamas', approachTarget: 'mamas' });
  });

  it('walks Mochi up to Mother when no child is there', () => {
    expect(stageInteractions(scene(['mother', 'mochi'], [{ character: 'mochi', action: 'approaching' }]), { hasBed: false }).approachTarget).toBe('mother');
  });

  it('has the carrying child hold Mochi, licking when Mochi licks', () => {
    const calm = scene(['mamas', 'mochi'], [{ character: 'mamas', action: 'carrying-cat' }]);
    expect(stageInteractions(calm, { hasBed: false })).toMatchObject({ carrier: 'mamas', carriedCat: 'calm' });
    const licking = scene(['friend', 'mamas', 'mochi'], [{ character: 'mochi', action: 'licking' }]);
    expect(stageInteractions(licking, { hasBed: false })).toMatchObject({ carrier: 'mamas', carriedCat: 'licking' });
  });

  it('lets Mother hug a child at her side', () => {
    expect(stageInteractions(scene(['mother', 'mamas'], [{ character: 'mother', action: 'hugging' }]), { hasBed: false }).hugged).toBe('mamas');
    expect(stageInteractions(scene(['mother'], [{ character: 'mother', action: 'hugging' }]), { hasBed: false }).hugged).toBeUndefined();
  });

  it('ignores actions of characters that are not in the scene', () => {
    const s = scene(['mamas'], [{ character: 'mochi', action: 'licking' }]);
    expect(stageInteractions(s, { hasBed: false }).carrier).toBeUndefined();
  });
});

describe('mochiLeavesRow', () => {
  it('takes Mochi out of the row when carried or walking up', () => {
    expect(mochiLeavesRow({ carrier: 'mamas' })).toBe(true);
    expect(mochiLeavesRow({ approachTarget: 'mamas' })).toBe(true);
    expect(mochiLeavesRow({})).toBe(false);
  });
});

describe('drawOrder', () => {
  it('draws the front character right after the one behind it', () => {
    expect(drawOrder(3, 2, 0)).toEqual([1, 2, 0]);
    expect(drawOrder(3, 0, 1)).toEqual([0, 1, 2]);
  });

  it('keeps the row order without a pair', () => {
    expect(drawOrder(3, -1, 0)).toEqual([0, 1, 2]);
    expect(drawOrder(2, 1, -1)).toEqual([0, 1]);
  });
});
