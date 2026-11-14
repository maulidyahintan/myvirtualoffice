import { describe, expect, it } from 'vitest';
import { FORMAT_SPEC } from './constants.ts';
import { facebookShortKind, parseSceneSelection, pickedShortNotes, pickedShortSeconds, selectionProblem, selectionSeconds } from './shortsSelection.ts';

describe('parseSceneSelection', () => {
  it('reads scene numbers in story order without repeats', () => {
    expect(parseSceneSelection('7, 3,4 3', 10)).toEqual([3, 4, 7]);
    expect(parseSceneSelection(['5', 2], 10)).toEqual([2, 5]);
  });

  it('drops numbers that are not scenes of the video', () => {
    expect(parseSceneSelection('0, 2, 11, x, 2.5', 10)).toEqual([2]);
  });
});

describe('selectionSeconds and selectionProblem', () => {
  const seconds = [10, 20, 15, 30, 40];

  it('adds up the length of the picked scenes', () => {
    expect(selectionSeconds(seconds, [1, 3])).toBe(25);
  });

  it('has no length limit for the owner picks, only a picked scene is needed', () => {
    expect(selectionProblem(seconds, [1, 2, 3, 4, 5])).toBeUndefined();
    expect(selectionProblem(seconds, [])).toMatch(/minimal satu/);
  });

  it('can check against another limit', () => {
    expect(selectionProblem(seconds, [1, 2, 3, 4], 52)).toMatch(/52/);
  });
});

describe('long picked Shorts', () => {
  it('adds the Shorts intro and outro to the scenes', () => {
    expect(pickedShortSeconds(80)).toBeGreaterThan(80);
  });

  it('only informs about what a long Short means on each platform', () => {
    expect(pickedShortNotes(40)).toEqual([]);
    expect(pickedShortNotes(100)).toHaveLength(1);
    expect(pickedShortNotes(200)).toHaveLength(2);
  });

  it('sends a Short longer than the Reels limit to Facebook as a Page video', () => {
    expect(facebookShortKind(59)).toBe('reel');
    expect(facebookShortKind(90)).toBe('reel');
    expect(facebookShortKind(120)).toBe('video');
  });
});
