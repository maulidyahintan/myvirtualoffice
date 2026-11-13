import { describe, expect, it } from 'vitest';
import { APPROACH_FRAMES, BED_HOP_RUN_X, approach, armPoseTowards, bedClimbY, hangingAngle } from './interactions';

describe('hangingAngle', () => {
  it('is 0 straight down and turns clockwise', () => {
    expect(hangingAngle({ x: 0, y: 0 }, { x: 0, y: 10 })).toBeCloseTo(0);
    expect(hangingAngle({ x: 0, y: 0 }, { x: -10, y: 0 })).toBeCloseTo(90);
    expect(hangingAngle({ x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(-90);
  });
});

describe('armPoseTowards', () => {
  it('points the upper arm at the elbow aim and bends the forearm towards the hand aim', () => {
    const shoulder = { x: 0, y: 0 };
    // upper arm straight to the right, forearm then straight down
    const pose = armPoseTowards(shoulder, { x: 100, y: 0 }, { x: 100, y: 100 }, 100);
    expect(pose.bahu).toBeCloseTo(-90);
    expect(pose.siku).toBeCloseTo(90);
  });

  it('keeps the arm straight when both aims lie on one line', () => {
    const pose = armPoseTowards({ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 200, y: 200 }, 70);
    expect(pose.siku).toBeCloseTo(0);
  });
});

describe('approach', () => {
  it('starts at the side and ends next to the child, standing still', () => {
    expect(approach(0, 900, 650)).toMatchObject({ x: 900, facing: -1 });
    expect(approach(APPROACH_FRAMES, 900, 650)).toEqual({ x: 650, step: null, facing: -1 });
  });

  it('walks steadily closer and slows down at the end', () => {
    const quarter = 900 - approach(APPROACH_FRAMES / 4, 900, 650).x;
    const lastQuarter = approach(APPROACH_FRAMES * 0.75, 900, 650).x - 650;
    expect(quarter).toBeGreaterThan(0);
    expect(lastQuarter).toBeLessThan(quarter);
    expect(approach(30, 900, 650).step).toBeGreaterThan(0);
  });

  it('faces right when walking to the right', () => {
    expect(approach(10, 100, 400).facing).toBe(1);
  });
});

describe('bedClimbY', () => {
  const EDGE = 920;
  const FLOOR = 890;
  const BED = 645;

  it('walks on the floor until the bed edge', () => {
    expect(bedClimbY(EDGE + BED_HOP_RUN_X + 50, EDGE, FLOOR, BED)).toBe(FLOOR);
  });

  it('hops up in an arc above the mattress', () => {
    expect(bedClimbY(EDGE + BED_HOP_RUN_X / 2, EDGE, FLOOR, BED)).toBeLessThan((FLOOR + BED) / 2);
  });

  it('walks on the mattress once past the edge', () => {
    expect(bedClimbY(EDGE - 10, EDGE, FLOOR, BED)).toBe(BED);
  });
});
