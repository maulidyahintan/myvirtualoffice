import { describe, expect, it } from 'vitest';
import { DOOR_START_FRAME, DOOR_SWING_FRAMES, REACH_FRAMES, RELEASE_FRAME, doorOpen, doorReach, placeAroundDoor } from './door';

describe('doorReach', () => {
  it('stretches the arm to the handle, holds it, then lowers it', () => {
    expect(doorReach(0)).toBe(0);
    expect(doorReach(REACH_FRAMES)).toBe(1);
    expect(doorReach(RELEASE_FRAME - 1)).toBe(1);
    expect(doorReach(RELEASE_FRAME + REACH_FRAMES)).toBe(0);
  });

  it('moves smoothly in between', () => {
    expect(doorReach(REACH_FRAMES / 2)).toBeCloseTo(0.5);
  });
});

describe('doorOpen', () => {
  it('stays closed until the hand holds the handle', () => {
    expect(doorOpen(0)).toBe(0);
    expect(doorOpen(DOOR_START_FRAME)).toBe(0);
    expect(DOOR_START_FRAME).toBeGreaterThanOrEqual(REACH_FRAMES);
  });

  it('swings fully open and stays open', () => {
    expect(doorOpen(DOOR_START_FRAME + DOOR_SWING_FRAMES)).toBe(1);
    expect(doorOpen(1000)).toBe(1);
  });

  it('is fully open before the hand lets go', () => {
    expect(DOOR_START_FRAME + DOOR_SWING_FRAMES).toBeLessThan(RELEASE_FRAME);
  });
});

describe('placeAroundDoor', () => {
  it('puts the others side by side to the right of the opener', () => {
    expect(placeAroundDoor({ x: 1250, width: 400 }, [276], 800)).toEqual([1450 + 20 + 138]);
  });

  it('moves whoever does not fit to the left of the doorway', () => {
    const [first, second] = placeAroundDoor({ x: 1500, width: 400 }, [276, 276], 800);
    expect(first).toBeLessThan(800);
    expect(second).toBeLessThan(first);
  });

  it('never overlaps the opener', () => {
    const [x] = placeAroundDoor({ x: 1150, width: 276 }, [410], 800);
    expect(x - 205).toBeGreaterThan(1150 + 138);
  });
});
