import { describe, expect, it } from 'vitest';
import { MIN_SUBTITLE_SECONDS, moveSubtitleLine, sceneSubtitleTimeline, subtitleLines, subtitleStarts } from './subtitleTiming.ts';

const NARRATION = 'Mamas berteriak ke arah jendela. Tapi… duar! Guruh malah terdengar lagi. Mamas cepat-cepat menyelam ke bawah selimut.';

describe('subtitleLines', () => {
  it('ends a line at every sentence and after the word limit', () => {
    expect(subtitleLines(NARRATION, 8)).toEqual([
      'Mamas berteriak ke arah jendela.',
      'Tapi… duar!',
      'Guruh malah terdengar lagi.',
      'Mamas cepat-cepat menyelam ke bawah selimut.',
    ]);
    expect(subtitleLines('satu dua tiga empat', 2)).toEqual(['satu dua', 'tiga empat']);
  });
});

describe('subtitleStarts', () => {
  const lines = subtitleLines(NARRATION, 8);

  it('starts the first line with the voice and spreads the rest over the speech', () => {
    const starts = subtitleStarts(lines, 15);
    expect(starts[0]).toBe(0);
    starts.slice(1).forEach((start, i) => expect(start).toBeGreaterThan(starts[i]));
    expect(starts.at(-1)!).toBeLessThan(15);
  });

  it('moves a line by the owner shift', () => {
    const base = subtitleStarts(lines, 15);
    expect(subtitleStarts(lines, 15, [0, 1.5])[1]).toBeCloseTo(base[1] + 1.5);
  });

  it('keeps the lines in order and on screen long enough, whatever the shifts', () => {
    const starts = subtitleStarts(lines, 15, [0, 0, -20, 0]);
    starts.slice(1).forEach((start, i) => expect(start - starts[i]).toBeGreaterThanOrEqual(MIN_SUBTITLE_SECONDS - 1e-9));
  });
});

describe('moveSubtitleLine', () => {
  const lines = subtitleLines(NARRATION, 8);

  it('stores the shift that puts the line at the wanted moment', () => {
    const shifts = moveSubtitleLine(lines, 15, [], 2, 7);
    expect(subtitleStarts(lines, 15, shifts)[2]).toBeCloseTo(7, 1);
  });

  it('keeps the other lines as they were', () => {
    const shifts = moveSubtitleLine(lines, 15, [0.5, null, 0, 0], 2, 7);
    expect(shifts[0]).toBe(0.5);
    expect(shifts[1]).toBe(0);
  });
});

describe('sceneSubtitleTimeline', () => {
  it('places the lines at their moment in the whole video', () => {
    const timeline = sceneSubtitleTimeline(NARRATION, { start: 40, duration: 16 }, 8);
    expect(timeline[0]).toEqual({ text: 'Mamas berteriak ke arah jendela.', start: 40 });
    expect(timeline.at(-1)!.start).toBeLessThan(40 + 16 - 1);
  });
});
