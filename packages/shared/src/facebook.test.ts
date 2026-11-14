import { describe, expect, it } from 'vitest';
import { lastFacebookFailure, publishedPlatforms } from './facebook.ts';

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

describe('publishedPlatforms', () => {
  const youtube = { videoId: 'yt1', url: 'https://youtu.be/yt1' };
  const facebook = { videoId: 'fb1', url: 'https://facebook.com/fb1', kind: 'video' as const, pageId: 'p' };

  it('tells which platforms have the episode', () => {
    expect(publishedPlatforms({ youtube, facebook })).toEqual({ youtube: true, facebook: true });
    expect(publishedPlatforms({ youtube })).toEqual({ youtube: true, facebook: false });
    expect(publishedPlatforms({})).toEqual({ youtube: false, facebook: false });
  });
});
