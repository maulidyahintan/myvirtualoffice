import { describe, expect, it } from 'vitest';
import { LANDING_FRAME, PILLOW_HIT_FRAME, fallPose, headTop } from './fallMotion';

const BED = { x: 790, y: 640 };
const FLOOR = { x: 680, y: 885 };
const MOCHI_HEIGHT = 280;
const pose = (elapsed: number) => fallPose(elapsed, BED, FLOOR, MOCHI_HEIGHT);

describe('fallPose', () => {
  it('keeps Mochi asleep on the bed with no pillow before the start', () => {
    const { mochi, pillow, dizzy } = pose(-10);
    expect(mochi).toMatchObject({ x: BED.x, y: BED.y, asleep: true, expression: 'calm' });
    expect(pillow.visible).toBe(false);
    expect(dizzy).toBe(false);
  });

  it('drops the pillow onto the sleeping Mochi', () => {
    const before = pose(PILLOW_HIT_FRAME - 1);
    expect(before.mochi.asleep).toBe(true);
    expect(before.pillow.y).toBeGreaterThan(pose(0).pillow.y);
    expect(before.pillow.y).toBeLessThan(BED.y);
  });

  it('wakes Mochi up surprised and squashed when the pillow hits', () => {
    const { mochi } = pose(PILLOW_HIT_FRAME);
    expect(mochi.asleep).toBe(false);
    expect(mochi.expression).toBe('surprised');
    expect(mochi.scaleY).toBeLessThan(1);
  });

  it('rolls Mochi over while it falls', () => {
    const midway = pose((PILLOW_HIT_FRAME + LANDING_FRAME) / 2);
    expect(midway.mochi.rotation).toBeLessThan(-90);
    expect(midway.mochi.x).toBeLessThan(BED.x);
    expect(midway.mochi.x).toBeGreaterThan(FLOOR.x);
  });

  it('lands Mochi upright on the floor target, dazed', () => {
    const { mochi, dizzy } = pose(LANDING_FRAME + 30);
    expect(mochi).toMatchObject({ x: FLOOR.x, y: FLOOR.y, rotation: 0, expression: 'thinking' });
    expect(dizzy).toBe(true);
  });

  it('rests the pillow on top of Mochi\'s head after landing', () => {
    const { pillow, mochi } = pose(LANDING_FRAME + 30);
    expect(pillow.x).toBeCloseTo(FLOOR.x + 8);
    expect(pillow.y).toBeCloseTo(headTop(FLOOR.y, MOCHI_HEIGHT, mochi.scaleY), 0);
    expect(pillow.y).toBeLessThan(FLOOR.y - MOCHI_HEIGHT / 2);
  });
});

describe('fallPose when Mochi is awake', () => {
  it('waits frightened instead of asleep before the pillow hits', () => {
    const awake = fallPose(PILLOW_HIT_FRAME - 1, BED, FLOOR, MOCHI_HEIGHT, true);
    expect(awake.mochi.asleep).toBe(false);
    expect(awake.mochi.expression).toBe('surprised');
  });

  it('still lands on the floor', () => {
    expect(fallPose(LANDING_FRAME, BED, FLOOR, MOCHI_HEIGHT, true).mochi.y).toBeCloseTo(FLOOR.y);
  });
});
