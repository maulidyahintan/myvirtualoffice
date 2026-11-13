import { describe, expect, it } from 'vitest';
import { blanketBreath, blanketPeek, blanketTremble } from './blanketMotion';

describe('blanketPeek', () => {
  it('starts peeking out of the gap', () => {
    expect(blanketPeek(0)).toBe(1);
  });

  it('closes the gap for a moment as the child ducks away', () => {
    expect(blanketPeek(110)).toBe(0);
    expect(blanketPeek(95)).toBeCloseTo(0.5);
  });

  it('opens again before the next cycle', () => {
    expect(blanketPeek(149)).toBe(1);
    expect(blanketPeek(150)).toBe(1);
  });

  it('keeps the eyes visible while the child talks', () => {
    expect(blanketPeek(110, true)).toBe(0.6);
  });
});

describe('blanketTremble', () => {
  it('stays still when the child is calm', () => {
    expect(blanketTremble(7, false)).toBe(0);
  });

  it('shivers a little when the child is scared', () => {
    const shifts = Array.from({ length: 10 }, (_, f) => blanketTremble(f, true));
    expect(Math.max(...shifts.map(Math.abs))).toBeGreaterThan(1);
    expect(Math.max(...shifts.map(Math.abs))).toBeLessThanOrEqual(1.8);
  });
});

describe('blanketBreath', () => {
  it('rises and falls gently around its rest size', () => {
    const scales = Array.from({ length: 50 }, (_, f) => blanketBreath(f));
    expect(Math.min(...scales)).toBeGreaterThan(0.98);
    expect(Math.max(...scales)).toBeLessThan(1.02);
  });
});
