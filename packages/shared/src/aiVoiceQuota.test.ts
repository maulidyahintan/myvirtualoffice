import { describe, expect, it } from 'vitest';
import { dateInZone, formatWait, midnightInZone, nextQuotaReset, quotaDay, quotaResetText } from './aiVoiceQuota.ts';

describe('quotaDay', () => {
  it('counts the day in Pacific time, not in UTC or Jakarta', () => {
    // 13 Nov 10:00 WIB = 03:00 UTC = 12 Nov 19:00 in Los Angeles
    expect(quotaDay(new Date('2026-11-13T03:00:00Z'))).toBe('2026-11-12');
    // 13 Nov 16:00 WIB = 09:00 UTC = 13 Nov 01:00 in Los Angeles
    expect(quotaDay(new Date('2026-11-13T09:00:00Z'))).toBe('2026-11-13');
  });
});

describe('midnightInZone', () => {
  it('finds midnight in winter (UTC-8) and summer (UTC-7)', () => {
    expect(midnightInZone('2026-11-14', 'America/Los_Angeles').toISOString()).toBe('2026-11-14T08:00:00.000Z');
    expect(midnightInZone('2026-07-01', 'America/Los_Angeles').toISOString()).toBe('2026-07-01T07:00:00.000Z');
  });

  it('handles zones ahead of UTC', () => {
    expect(midnightInZone('2026-11-14', 'Asia/Jakarta').toISOString()).toBe('2026-11-13T17:00:00.000Z');
  });
});

describe('nextQuotaReset', () => {
  it('is 15:00 WIB the same day when asked in the morning in Jakarta (winter)', () => {
    const reset = nextQuotaReset(new Date('2026-11-13T03:00:00Z'));
    expect(reset.toISOString()).toBe('2026-11-13T08:00:00.000Z');
    expect(dateInZone(reset, 'Asia/Jakarta')).toBe('2026-11-13');
  });

  it('is the next day at 15:00 WIB when asked in the evening in Jakarta', () => {
    expect(nextQuotaReset(new Date('2026-11-13T12:00:00Z')).toISOString()).toBe('2026-11-14T08:00:00.000Z');
  });

  it('is 14:00 WIB during US daylight saving time', () => {
    expect(nextQuotaReset(new Date('2026-07-01T03:00:00Z')).toISOString()).toBe('2026-07-01T07:00:00.000Z');
  });

  it('crosses the day the clocks go back (1 Nov 2026) correctly', () => {
    expect(nextQuotaReset(new Date('2026-11-01T12:00:00Z')).toISOString()).toBe('2026-11-02T08:00:00.000Z');
  });

  it('is always in the future and at most a day away', () => {
    for (let hour = 0; hour < 48; hour++) {
      const now = new Date(Date.UTC(2026, 10, 13, hour, 30));
      const wait = nextQuotaReset(now).getTime() - now.getTime();
      expect(wait).toBeGreaterThan(0);
      expect(wait).toBeLessThanOrEqual(86_400_000);
    }
  });
});

describe('formatWait', () => {
  const at = (iso: string) => new Date(iso);
  it('writes hours and minutes', () => {
    expect(formatWait(at('2026-11-13T05:45:00Z'), at('2026-11-13T08:00:00Z'))).toBe('±2 jam 15 menit');
    expect(formatWait(at('2026-11-13T06:00:00Z'), at('2026-11-13T08:00:00Z'))).toBe('±2 jam');
    expect(formatWait(at('2026-11-13T07:20:00Z'), at('2026-11-13T08:00:00Z'))).toBe('±40 menit');
  });
});

describe('quotaResetText', () => {
  it('says today at 15.00 WIB in the Jakarta morning', () => {
    expect(quotaResetText(new Date('2026-11-13T06:00:00Z'), 'Asia/Jakarta')).toBe('hari ini pukul 15.00 WIB (±2 jam lagi)');
  });

  it('says tomorrow once the reset has passed in Jakarta', () => {
    expect(quotaResetText(new Date('2026-11-13T12:00:00Z'), 'Asia/Jakarta')).toBe('besok pukul 15.00 WIB (±20 jam lagi)');
  });
});
