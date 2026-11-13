import { describe, expect, it } from 'vitest';
import {
  FIRST_FLASH_FRAME,
  FLASH_DECAY_FRAMES,
  FLASH_RISE_FRAMES,
  MAX_FLASH_GAP_FRAMES,
  MIN_FLASH_GAP_FRAMES,
  flashGap,
  flashStrength,
  lightningBoltPath,
  lightningFlash,
  cuedLightningFlash,
  photosafeCues,
} from './lightning';

const FPS = 30;
const TEN_MINUTES = FPS * 60 * 10;

/** Frames where a new flash begins (strength rises from 0). */
function flashStarts(frames: number): number[] {
  const starts: number[] = [];
  for (let frame = 1; frame < frames; frame++) {
    if (lightningFlash(frame - 1).strength === 0 && lightningFlash(frame).strength > 0) starts.push(frame);
  }
  return starts;
}

describe('lightningFlash', () => {
  it('stays dark before the first flash', () => {
    for (let frame = 0; frame < FIRST_FLASH_FRAME; frame++) expect(lightningFlash(frame).strength).toBe(0);
  });

  it('reaches full brightness right after the flash rises', () => {
    expect(lightningFlash(FIRST_FLASH_FRAME + FLASH_RISE_FRAMES)).toEqual({ strength: 1, index: 0 });
  });

  it('keeps the strength between 0 and 1', () => {
    for (let frame = 0; frame < TEN_MINUTES; frame += 7) {
      const { strength } = lightningFlash(frame);
      expect(strength).toBeGreaterThanOrEqual(0);
      expect(strength).toBeLessThanOrEqual(1);
    }
  });

  it('never flashes more than 3 times per second (photosensitivity limit)', () => {
    const starts = flashStarts(TEN_MINUTES);
    expect(starts.length).toBeGreaterThan(50);
    for (let i = 1; i < starts.length; i++) expect(starts[i] - starts[i - 1]).toBeGreaterThanOrEqual(FPS);
  });

  it('is deterministic, so every render of a scene looks the same', () => {
    expect(lightningFlash(1234)).toEqual(lightningFlash(1234));
  });
});

describe('flashGap', () => {
  it('waits 4 to 7 seconds between flashes', () => {
    for (let index = 0; index < 500; index++) {
      expect(flashGap(index)).toBeGreaterThanOrEqual(MIN_FLASH_GAP_FRAMES);
      expect(flashGap(index)).toBeLessThan(MAX_FLASH_GAP_FRAMES);
    }
  });
});

describe('flashStrength', () => {
  it('fades out completely after the decay', () => {
    expect(flashStrength(-1)).toBe(0);
    expect(flashStrength(100)).toBe(0);
    expect(flashStrength(FLASH_RISE_FRAMES + 5)).toBeLessThan(1);
  });
});

describe('lightningBoltPath', () => {
  it('starts at the top and ends at the requested height', () => {
    const path = lightningBoltPath(3, 500, 640);
    expect(path.startsWith('M')).toBe(true);
    expect(path.endsWith(' 640.0')).toBe(true);
    expect(path.split('L')).toHaveLength(7);
  });

  it('draws a different bolt for every flash', () => {
    expect(lightningBoltPath(1, 500, 640)).not.toBe(lightningBoltPath(2, 500, 640));
  });
});

describe('cued lightning', () => {
  it('strikes exactly at the cue and fades out', () => {
    expect(cuedLightningFlash(99, [100]).strength).toBe(0);
    expect(cuedLightningFlash(100 + FLASH_RISE_FRAMES, [100]).strength).toBe(1);
    expect(cuedLightningFlash(100 + FLASH_RISE_FRAMES + FLASH_DECAY_FRAMES, [100]).strength).toBe(0);
  });

  it('numbers the flashes so each bolt looks different', () => {
    expect(cuedLightningFlash(205, [100, 200]).index).toBe(1);
  });

  it('never flashes twice within a second', () => {
    expect(photosafeCues([100, 110, 160])).toEqual([100, 160]);
    expect(photosafeCues([160, 100])).toEqual([100, 160]);
  });
});
