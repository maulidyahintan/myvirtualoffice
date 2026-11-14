import { describe, expect, it } from 'vitest';
import { lastFacebookFailure } from './facebook.ts';

const entry = (message: string) => ({ time: '2026-11-14T03:00:00.000Z', by: 'channel-manager', message });

describe('lastFacebookFailure', () => {
  it('gives the reason when the last try failed', () => {
    const log = [entry('Mengirim ke Page Facebook sebagai video'), entry('Gagal mengirim ke Facebook: Facebook: HTTP 413')];
    expect(lastFacebookFailure({ log })).toBe('Facebook: HTTP 413');
  });

  it('is undefined once the video is on Facebook', () => {
    const log = [entry('Gagal mengirim ke Facebook: Facebook: HTTP 413')];
    expect(lastFacebookFailure({ log, facebook: { videoId: 'v', url: 'u', kind: 'video', pageId: 'p' } })).toBeUndefined();
  });

  it('is undefined while a new try is running or when never tried', () => {
    expect(lastFacebookFailure({ log: [entry('Gagal mengirim ke Facebook: x'), entry('Mengirim ke Page Facebook sebagai video')] })).toBeUndefined();
    expect(lastFacebookFailure({ log: [entry('Upload ke YouTube')] })).toBeUndefined();
  });
});
