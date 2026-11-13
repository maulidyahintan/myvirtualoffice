import { describe, expect, it } from 'vitest';
import { cravingHop, lipLick, sparkleTwinkle } from './craving';

describe('cravingHop', () => {
  it('hops up and lands again, never below the floor', () => {
    expect(cravingHop(0)).toBeCloseTo(0);
    expect(cravingHop(7)).toBeCloseTo(16);
    for (let f = 0; f < 100; f++) expect(cravingHop(f)).toBeGreaterThanOrEqual(0);
  });
});

describe('lipLick', () => {
  it('licks briefly, then rests', () => {
    expect(lipLick(9)).toBeCloseTo(1);
    expect(lipLick(40)).toBe(0);
    expect(lipLick(75 + 9)).toBeCloseTo(1);
  });

  it('works for any frame, including negative ones', () => {
    expect(lipLick(-66)).toBeCloseTo(1);
  });
});

describe('sparkleTwinkle', () => {
  it('stays between 0 and 1 and differs per sparkle', () => {
    for (let f = 0; f < 60; f++) {
      expect(sparkleTwinkle(f, 0)).toBeGreaterThanOrEqual(0);
      expect(sparkleTwinkle(f, 0)).toBeLessThanOrEqual(1);
    }
    expect(sparkleTwinkle(10, 0)).not.toBeCloseTo(sparkleTwinkle(10, 1));
  });
});
