import { describe, expect, it } from 'vitest';
import { childShoutArms, childStartleArms, shoutMouth, startleJump, startleTremble } from './reactions';

describe('startleJump', () => {
  it('jumps right after being startled and lands again', () => {
    expect(startleJump(-1)).toBe(0);
    expect(startleJump(8)).toBeGreaterThan(30);
    expect(startleJump(16)).toBe(0);
  });
});

describe('startleTremble', () => {
  it('only shivers once the jump has landed', () => {
    expect(startleTremble(5)).toBe(0);
    const shivers = Array.from({ length: 10 }, (_, i) => Math.abs(startleTremble(20 + i)));
    expect(Math.max(...shivers)).toBeGreaterThan(1);
  });
});

describe('shoutMouth', () => {
  it('keeps the mouth wide open', () => {
    for (let frame = 0; frame < 30; frame++) expect(shoutMouth(frame).buka).toBeGreaterThanOrEqual(0.7);
  });
});

describe('childStartleArms', () => {
  it('raises both arms', () => {
    const { kiri, kanan } = childStartleArms(0);
    expect(kiri.bahu).toBeGreaterThan(90);
    expect(kanan.bahu).toBeGreaterThan(90);
  });
});

describe('childShoutArms', () => {
  it('raises one fist while the other hand is at the mouth', () => {
    const { kiri, kanan } = childShoutArms(0);
    expect(kiri.bahu).toBeGreaterThan(100);
    expect(kanan.bahu).toBeLessThan(0);
  });
});
