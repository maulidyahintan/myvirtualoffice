// Pose of Mochi and the pillow, frame by frame, for the "falling" action: Mochi sleeps at the foot of the
// bed, a pillow drops on it, Mochi tumbles to the floor and sits there dizzy with the pillow on its head.
// Pure functions in stage coordinates (1920×1080), so the motion can be unit-tested.
import { Easing, interpolate } from 'remotion';
import type { Expression } from '@kantor/shared/types';

/** Frames after the start at which the pillow hits Mochi. */
export const PILLOW_HIT_FRAME = 14;
/** Frames after the start at which Mochi reaches the floor. */
export const LANDING_FRAME = 42;
/** Mochi leaves the bed this long after the hit (a short squash first). */
const TAKE_OFF_DELAY_FRAMES = 2;
const SQUASH_FRAMES = 4;
const LANDING_BOUNCE_FRAMES = 10;
/** How high Mochi and the pillow are thrown before falling (px). */
const MOCHI_ARC_HEIGHT = 70;
const PILLOW_ARC_HEIGHT = 160;
/** The pillow starts above the frame and settles a little after Mochi lands. */
const PILLOW_START_Y = -120;
const PILLOW_SETTLE_FRAMES = 6;
/** Mochi comes a bit closer to the camera while falling forward off the bed. */
const CLOSER_SCALE = 0.12;

export interface Point {
  x: number;
  y: number;
}

export interface FallPose {
  mochi: { x: number; y: number; rotation: number; scaleX: number; scaleY: number; expression: Expression; asleep: boolean };
  pillow: { x: number; y: number; rotation: number; visible: boolean };
  /** Mochi sits on the floor, dazed (stars around the head). */
  dizzy: boolean;
}

const clampRange = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Where the pillow rests on Mochi's head when Mochi stands at `y` (feet) with the given height. */
export function headTop(y: number, mochiHeight: number, scale = 1): number {
  return y - mochiHeight * 0.6 * scale - 8;
}

function mochiPose(elapsed: number, from: Point, to: Point): FallPose['mochi'] {
  if (elapsed < PILLOW_HIT_FRAME) {
    return { x: from.x, y: from.y, rotation: 0, scaleX: 1, scaleY: 1, expression: 'calm', asleep: true };
  }
  const progress = interpolate(elapsed, [PILLOW_HIT_FRAME + TAKE_OFF_DELAY_FRAMES, LANDING_FRAME], [0, 1], clampRange);
  const x = from.x + (to.x - from.x) * progress;
  const y = from.y + (to.y - from.y) * Easing.in(Easing.quad)(progress) - Math.sin(progress * Math.PI) * MOCHI_ARC_HEIGHT;
  if (elapsed >= LANDING_FRAME) {
    const sinceLanding = elapsed - LANDING_FRAME;
    const bounce = sinceLanding < LANDING_BOUNCE_FRAMES ? Math.sin((sinceLanding / LANDING_BOUNCE_FRAMES) * Math.PI) : 0;
    return { x, y, rotation: 0, scaleX: 1 + bounce * 0.18, scaleY: 1 - bounce * 0.22, expression: 'thinking', asleep: false };
  }
  const squashed = elapsed < PILLOW_HIT_FRAME + SQUASH_FRAMES;
  return { x, y, rotation: -progress * 360, scaleX: squashed ? 1.2 : 1, scaleY: squashed ? 0.75 : 1, expression: 'surprised', asleep: false };
}

function pillowPose(elapsed: number, from: Point, to: Point, mochiHeight: number, closerScale: number): FallPose['pillow'] {
  const onSleepingMochi = from.y - mochiHeight * 0.32;
  const startX = from.x - 10;
  if (elapsed < PILLOW_HIT_FRAME) {
    const progress = Easing.in(Easing.quad)(Math.max(0, elapsed) / PILLOW_HIT_FRAME);
    return { x: startX, y: PILLOW_START_Y + (onSleepingMochi - PILLOW_START_Y) * progress, rotation: -20 + progress * 12, visible: elapsed >= 0 };
  }
  const progress = interpolate(elapsed, [PILLOW_HIT_FRAME, LANDING_FRAME + PILLOW_SETTLE_FRAMES], [0, 1], clampRange);
  const restY = headTop(to.y, mochiHeight, closerScale);
  const wobble = elapsed > LANDING_FRAME + PILLOW_SETTLE_FRAMES ? Math.sin((elapsed - LANDING_FRAME) / 8) * 3 : 0;
  return {
    x: startX + (to.x + 8 - startX) * progress,
    y: onSleepingMochi + (restY - onSleepingMochi) * Easing.in(Easing.quad)(progress) - Math.sin(progress * Math.PI) * PILLOW_ARC_HEIGHT,
    // one full turn in the air, landing slightly tilted
    rotation: -8 + progress * 374 + wobble,
    visible: true,
  };
}

/** Pose at `elapsed` frames after the pillow starts to drop (negative = Mochi still asleep, no pillow). */
export function fallPose(elapsed: number, from: Point, to: Point, mochiHeight: number): FallPose {
  const closerScale = 1 + interpolate(elapsed, [PILLOW_HIT_FRAME, LANDING_FRAME], [0, CLOSER_SCALE], clampRange);
  const mochi = mochiPose(elapsed, from, to);
  return {
    mochi: { ...mochi, scaleX: mochi.scaleX * closerScale, scaleY: mochi.scaleY * closerScale },
    pillow: pillowPose(elapsed, from, to, mochiHeight, closerScale),
    dizzy: elapsed >= LANDING_FRAME + 8,
  };
}
