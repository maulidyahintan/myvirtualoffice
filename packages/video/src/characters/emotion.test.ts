import { describe, expect, it } from 'vitest';
import { faceMood, isKeenListener, isSadLike, lipQuiver, sobBounce, tearDrop } from './emotion';

describe('faceMood', () => {
  it('opens the eyes wide with small irises and high brows when surprised', () => {
    const mood = faceMood('surprised');
    expect(mood.eyeScale).toBeGreaterThan(1.1);
    expect(mood.irisScale).toBeLessThan(0.8);
    expect(mood.browLift).toBeGreaterThan(5);
  });

  it('fills sad eyes with tears and raises the inner brows', () => {
    const mood = faceMood('sad');
    expect(mood.tearPool).toBeGreaterThan(0.5);
    expect(mood.browInnerLift).toBeGreaterThan(5);
    expect(mood.tearStreams).toBe(false);
  });

  it('squeezes the eyes shut with tears streaming when crying', () => {
    const mood = faceMood('crying');
    expect(mood.eyesSqueezed).toBe(true);
    expect(mood.tearStreams).toBe(true);
  });

  it('leaves a happy face neutral', () => {
    expect(faceMood('happy')).toMatchObject({ eyeScale: 1, tearPool: 0, eyesSqueezed: false });
  });
});

describe('body language', () => {
  it('treats crying as sad', () => {
    expect(isSadLike('crying')).toBe(true);
    expect(isSadLike('surprised')).toBe(false);
  });

  it('quivers the lip only when sad', () => {
    expect(lipQuiver('happy', 3)).toBe(0);
    expect(Math.abs(lipQuiver('sad', 1))).toBeGreaterThan(0);
  });

  it('sobs only while crying', () => {
    expect(sobBounce('sad', 7)).toBe(0);
    expect(sobBounce('crying', 7)).toBeGreaterThan(0);
  });

  it('runs tears down and fades them in and out', () => {
    expect(tearDrop(0, 0)).toEqual({ y: 0, opacity: 0 });
    expect(tearDrop(18, 0).opacity).toBeCloseTo(1);
    expect(tearDrop(18, 0).y).toBeGreaterThan(tearDrop(9, 0).y);
  });
});

describe('a happy listener', () => {
  it('looks keen while someone else talks', () => {
    expect(isKeenListener('happy', true, false)).toBe(true);
    expect(faceMood('happy', true).eyeScale).toBeGreaterThan(1);
  });

  it('is not a keen listener while talking, when not happy, or with nobody talking', () => {
    expect(isKeenListener('happy', true, true)).toBe(false);
    expect(isKeenListener('sad', true, false)).toBe(false);
    expect(isKeenListener('happy', false, false)).toBe(false);
  });
});
