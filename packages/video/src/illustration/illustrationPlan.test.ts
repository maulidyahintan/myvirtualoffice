import { describe, expect, it } from 'vitest';
import { ambienceFor, illustrationCuts, pictureMove } from './illustrationPlan';

const FPS = 30;

describe('illustrationCuts', () => {
  it('alternates the picture with the animated characters', () => {
    const kinds = illustrationCuts(20 * FPS, FPS, true).map((c) => c.kind);
    expect(kinds.slice(0, 4)).toEqual(['illustration', 'animation', 'illustration', 'animation']);
  });

  it('covers the whole scene without gaps', () => {
    const cuts = illustrationCuts(17 * FPS, FPS, true);
    expect(cuts[0].start).toBe(0);
    cuts.slice(1).forEach((cut, i) => expect(cut.start).toBe(cuts[i].end));
    expect(cuts.at(-1)!.end).toBe(17 * FPS);
  });

  it('keeps the picture on without characters, still changing the move', () => {
    const cuts = illustrationCuts(12 * FPS, FPS, false);
    expect(cuts.every((c) => c.kind === 'illustration')).toBe(true);
    expect(new Set(cuts.map((c) => c.move)).size).toBeGreaterThan(1);
  });

  it('stays on the picture in a short scene', () => {
    expect(illustrationCuts(5 * FPS, FPS, true).every((c) => c.kind === 'illustration')).toBe(true);
  });

  it('never ends on a stub shorter than a second', () => {
    for (let seconds = 6; seconds < 30; seconds++) {
      const last = illustrationCuts(seconds * FPS, FPS, true).at(-1)!;
      expect(last.end - last.start).toBeGreaterThanOrEqual(FPS);
    }
  });
});

describe('pictureMove', () => {
  it('gives consecutive stretches different moves', () => {
    expect(pictureMove(0)).not.toEqual(pictureMove(1));
    expect(pictureMove(4)).toEqual(pictureMove(0));
  });
});

describe('ambienceFor', () => {
  it('matches the weather to the picture', () => {
    expect(ambienceFor('A home garden in gentle rain, raindrops on leaves')).toEqual(['rain', 'leaves', 'motes']);
    expect(ambienceFor('A starry night sky over the desert')).toContain('stars');
  });

  it('always lets light motes drift', () => {
    expect(ambienceFor('A wooden table')).toEqual(['motes']);
  });
});
