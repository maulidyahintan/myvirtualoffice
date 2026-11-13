import { describe, expect, it } from 'vitest';
import { FPS, FORMAT_SPEC } from './constants.ts';
import { audibleSeconds, introMusicPlaybackRate, introOutroFrames } from './timing.ts';

describe('introOutroFrames', () => {
  it('caps the opening of a regular video at its maximum length when the music is longer', () => {
    expect(introOutroFrames('standard', 18.7).intro).toBe(FORMAT_SPEC.standard.maxIntroSeconds * FPS);
  });

  it('uses the default opening length when there is no music', () => {
    expect(introOutroFrames('standard').intro).toBe(FORMAT_SPEC.standard.introSeconds * FPS);
  });
});

describe('introMusicPlaybackRate', () => {
  it('speeds the music up so the whole track fits the opening', () => {
    const introFrames = 5 * FPS;
    expect(introMusicPlaybackRate(15, introFrames)).toBeCloseTo(3);
  });

  it('plays at normal speed when the track already fits', () => {
    expect(introMusicPlaybackRate(4, 5 * FPS)).toBe(1);
  });

  it('plays at normal speed when there is no music or no opening', () => {
    expect(introMusicPlaybackRate(undefined, 5 * FPS)).toBe(1);
    expect(introMusicPlaybackRate(10, 0)).toBe(1);
  });
});

describe('audibleSeconds', () => {
  const SAMPLE_RATE = 10;

  it('ignores the silence padded at the end of a track', () => {
    const samples = [0.5, -0.4, 0.3, 0.2, 0, 0, 0, 0, 0, 0];
    expect(audibleSeconds([samples], SAMPLE_RATE)).toBeCloseTo(0.4);
  });

  it('uses the channel that sounds the longest', () => {
    const left = [0.5, 0, 0, 0];
    const right = [0.5, 0.2, 0.2, 0];
    expect(audibleSeconds([left, right], SAMPLE_RATE)).toBeCloseTo(0.3);
  });

  it('returns 0 for a silent track', () => {
    expect(audibleSeconds([[0, 0.0001, 0]], SAMPLE_RATE)).toBe(0);
  });
});
