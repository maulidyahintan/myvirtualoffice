import { describe, expect, it } from 'vitest';
import { FORMAT_SPEC } from './constants.ts';
import { PICKED_SHORT_CONTENT_LIMIT_SECONDS, PICKED_SHORT_TOTAL_SECONDS, parseSceneSelection, selectionProblem, selectionSeconds } from './shortsSelection.ts';

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

  it('accepts picked scenes of up to about 80 seconds', () => {
    expect(selectionProblem(seconds, [1, 2, 3, 4])).toBeUndefined();
  });

  it('explains when nothing is picked or the Short gets too long', () => {
    expect(selectionProblem(seconds, [])).toMatch(/minimal satu/);
    expect(selectionProblem(seconds, [2, 3, 4, 5])).toMatch(String(PICKED_SHORT_CONTENT_LIMIT_SECONDS));
  });

  it('keeps a picked Short with its intro and outro within 90 seconds', () => {
    const longest = PICKED_SHORT_CONTENT_LIMIT_SECONDS + FORMAT_SPEC.short.maxIntroSeconds + FORMAT_SPEC.short.maxOutroSeconds;
    expect(longest).toBe(PICKED_SHORT_TOTAL_SECONDS);
  });

  it('can check against another limit', () => {
    expect(selectionProblem(seconds, [1, 2, 3, 4], 52)).toMatch(/52/);
  });
});
