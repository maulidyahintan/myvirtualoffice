// Timing and shape of lightning in the storm backgrounds. Pure functions, so they can be unit-tested.
import { random } from '../characters/motion';

/** Frame of the first flash in a scene, so the scene can settle before the sky lights up. */
export const FIRST_FLASH_FRAME = 40;
/** Shortest and longest gap between two flashes (frames at 30 fps: about 4 to 7 seconds). */
export const MIN_FLASH_GAP_FRAMES = 120;
export const MAX_FLASH_GAP_FRAMES = 210;
/** A flash rises over a few frames and then fades out over half a second. */
export const FLASH_RISE_FRAMES = 3;
export const FLASH_DECAY_FRAMES = 15;
/** Safety cap so a lookup never loops forever on absurd frame numbers. */
const MAX_FLASHES = 2000;

export interface LightningFlash {
  /** Brightness of the flash, 0 (dark) to 1 (brightest). */
  strength: number;
  /** Which flash this is (0, 1, 2 …), so every flash can have its own bolt shape. */
  index: number;
}

/** Gap before the flash after flash `index`, varied but deterministic. */
export function flashGap(index: number): number {
  return MIN_FLASH_GAP_FRAMES + Math.floor(random(index + 0.5) * (MAX_FLASH_GAP_FRAMES - MIN_FLASH_GAP_FRAMES));
}

/**
 * Lightning brightness at a frame. One soft flash every 4–7 seconds, never a fast strobe: at most one
 * flash per second, well under the 3-flashes-per-second limit for photosensitive viewers (WCAG 2.3.1).
 */
export function lightningFlash(frame: number): LightningFlash {
  let start = FIRST_FLASH_FRAME;
  for (let index = 0; index < MAX_FLASHES; index++) {
    const gap = flashGap(index);
    if (frame < start + gap) {
      return { strength: flashStrength(frame - start), index };
    }
    start += gap;
  }
  return { strength: 0, index: 0 };
}

/** Brightness `elapsed` frames after a flash starts. */
export function flashStrength(elapsed: number): number {
  if (elapsed < 0) return 0;
  if (elapsed < FLASH_RISE_FRAMES) return elapsed / FLASH_RISE_FRAMES;
  return Math.max(0, 1 - (elapsed - FLASH_RISE_FRAMES) / FLASH_DECAY_FRAMES);
}

const BOLT_SEGMENTS = 6;
const BOLT_SPREAD = 300;
const BOLT_ZIGZAG = 90;

/**
 * SVG path of a zig-zag bolt from the top (around `x`) down to `height`. The shape and position change
 * with every flash; `seed` keeps several bolts in one sky apart.
 */
export function lightningBoltPath(flashIndex: number, x: number, height: number, scale = 1, seed = 0): string {
  let currentX = x + (random(flashIndex * 5 + seed) - 0.5) * BOLT_SPREAD * scale;
  const points = [`M${currentX.toFixed(1)} 0`];
  for (let i = 1; i <= BOLT_SEGMENTS; i++) {
    currentX += (random(flashIndex * 13 + i + seed) - 0.5) * BOLT_ZIGZAG * scale;
    points.push(`L${currentX.toFixed(1)} ${((height * i) / BOLT_SEGMENTS).toFixed(1)}`);
  }
  return points.join(' ');
}
