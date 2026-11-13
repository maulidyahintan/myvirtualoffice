// Motion of a child who can't wait to eat (action 'craving'): quick little hops, hands trembling under the
// chin and licking the lips now and then. Pure functions of the frame, unit-tested.

const HOP_PERIOD = 14;
const HOP_HEIGHT = 16;
const LICK_PERIOD = 75;
const LICK_FRAMES = 18;

/** Height of the little hop (rig px, ≥ 0); two hops per second. */
export function cravingHop(frame: number): number {
  return Math.abs(Math.sin((frame / HOP_PERIOD) * Math.PI)) * HOP_HEIGHT;
}

/** Tongue out licking the lips, 0..1; once every 2.5 seconds for a short moment. */
export function lipLick(frame: number): number {
  const t = ((frame % LICK_PERIOD) + LICK_PERIOD) % LICK_PERIOD;
  return t < LICK_FRAMES ? Math.sin((t / LICK_FRAMES) * Math.PI) : 0;
}

/** Twinkle of a sparkle around the treat, 0..1, each sparkle on its own beat. */
export function sparkleTwinkle(frame: number, index: number): number {
  return Math.max(0, Math.sin(frame / 7 + index * 2.1));
}
