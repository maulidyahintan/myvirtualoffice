import { describe, expect, it } from 'vitest';
import { APPROACH_FRAMES, BED_HOP_RUN_X, CHILD_APPROACH_GAP_X, approach, armEnd, armPoseTowards, bedClimbY, childApproachGoal, hangingAngle, hugArmAims } from './interactions';

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

describe('hugArmAims', () => {
  const FLOOR = 890;
  const MOTHER = { x: 700, height: 683, drop: 80 };
  const CHILD = { x: 830, height: 459 };
  const MOTHER_ARM_REACH = (66 + 58) * (683 / 400);
  const { near, far } = hugArmAims(MOTHER, CHILD, FLOOR);
  const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

  it('uses both arms, one from each shoulder', () => {
    expect(near.shoulder.x).toBeGreaterThan(MOTHER.x);
    expect(far.shoulder.x).toBeLessThan(MOTHER.x);
  });

  it('reaches the child with both hands', () => {
    expect(distance(near.shoulder, near.handAim)).toBeLessThanOrEqual(MOTHER_ARM_REACH);
    expect(distance(far.shoulder, far.handAim)).toBeLessThanOrEqual(MOTHER_ARM_REACH);
  });

  it('wraps the near arm across to the far side of the child', () => {
    expect(near.handAim.x).toBeGreaterThan(CHILD.x);
  });
});

describe('armEnd', () => {
  it('ends where armPoseTowards aimed when the target is in reach', () => {
    const shoulder = { x: 0, y: 0 };
    const pose = armPoseTowards(shoulder, { x: 100, y: 0 }, { x: 100, y: 100 }, 100);
    const hand = armEnd(shoulder, pose, 100, 100);
    expect(hand.x).toBeCloseTo(100);
    expect(hand.y).toBeCloseTo(100);
  });

  it('hangs straight down with a neutral pose', () => {
    expect(armEnd({ x: 5, y: 0 }, { bahu: 0, siku: 0 }, 50, 40)).toEqual({ x: 5, y: 90 });
  });
});

describe('childApproachGoal', () => {
  it('stops beside the friend, on the side the child comes from', () => {
    expect(childApproachGoal(['mamas', 'friend'], 0, [700, 1220])).toEqual({ x: 1220 - CHILD_APPROACH_GAP_X, target: 1 });
    expect(childApproachGoal(['friend', 'mamas'], 1, [700, 1220])).toEqual({ x: 700 + CHILD_APPROACH_GAP_X, target: 0 });
  });

  it('walks to a person, never to the cat, and needs someone there', () => {
    expect(childApproachGoal(['mamas', 'mochi', 'mother'], 0, [560, 960, 1360])?.target).toBe(2);
    expect(childApproachGoal(['mamas', 'mochi'], 0, [700, 1220])).toBeUndefined();
  });
});
