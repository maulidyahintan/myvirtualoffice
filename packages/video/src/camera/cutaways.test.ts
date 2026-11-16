import { describe, expect, it } from 'vitest';
import { cutawayAt, cutawayWindows } from './cutaways';

const PHRASES: Record<string, number> = { malam: 100, wahyu: 200, ejek: 320, dhuha: 400 };
const frameOf = (phrase: string) => PHRASES[phrase];

describe('cutawayWindows', () => {
  it('shows each place from its words until the next one or its end', () => {
    const windows = cutawayWindows(
      [
        { background: 'night-sky', at: 'malam' },
        { background: 'desert', at: 'wahyu', until: 'ejek' },
      ],
      frameOf,
      500,
      90,
    );
    expect(windows).toEqual([
      { background: 'night-sky', start: 100, end: 190 },
      { background: 'desert', start: 200, end: 320 },
    ]);
  });

  it('stops a cutaway at the next one', () => {
    const windows = cutawayWindows(
      [
        { background: 'night-sky', at: 'malam', until: 'dhuha' },
        { background: 'desert', at: 'wahyu' },
      ],
      frameOf,
      500,
      90,
    );
    expect(windows[0].end).toBe(200);
  });

  it('skips cutaways whose words are missing or that would only flicker', () => {
    expect(cutawayWindows([{ background: 'dawn', at: 'pelangi' }], frameOf, 500, 90)).toEqual([]);
    expect(cutawayWindows([{ background: 'dawn', at: 'dhuha' }], frameOf, 410, 90)).toEqual([]);
  });

  it('finds the cutaway on screen', () => {
    const windows = [{ background: 'dawn', start: 10, end: 50 }];
    expect(cutawayAt(windows, 20)?.background).toBe('dawn');
    expect(cutawayAt(windows, 50)).toBeUndefined();
  });
});
