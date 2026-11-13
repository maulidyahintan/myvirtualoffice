import { describe, expect, it } from 'vitest';
import { shortsCoverage, shortsCoverageLabel } from './shortsCoverage.ts';
import type { Episode } from './types.ts';

const episode = (id: string, extra: Partial<Episode> & { format?: 'standard' | 'short' } = {}): Episode => {
  const { format = 'standard', ...rest } = extra;
  return { id, status: 'published', idea: { format }, ...rest } as unknown as Episode;
};

describe('shortsCoverage', () => {
  it('counts the Shorts clipped from a long video', () => {
    const video = episode('video');
    const all = [video, episode('a', { format: 'short', source: { id: 'video', scenes: [1] } }), episode('b', { format: 'short', source: { id: 'video', scenes: [2] } })];
    expect(shortsCoverage(video, all)).toEqual({ applies: true, clips: 2, hasShortsTwin: false });
  });

  it('ignores rejected clips and clips of other videos', () => {
    const video = episode('video');
    const all = [
      video,
      episode('a', { format: 'short', status: 'rejected', source: { id: 'video', scenes: [1] } }),
      episode('b', { format: 'short', source: { id: 'other', scenes: [1] } }),
    ];
    expect(shortsCoverage(video, all).clips).toBe(0);
  });

  it('notices a Shorts twin of the same idea', () => {
    const video = episode('video', { twin: 'twin' });
    expect(shortsCoverage(video, [video, episode('twin', { format: 'short', twin: 'video' })]).hasShortsTwin).toBe(true);
  });

  it('does not apply to Shorts and compilations', () => {
    const short = episode('s', { format: 'short' });
    const compilation = episode('c', { compilation: { items: [] } } as Partial<Episode>);
    expect(shortsCoverage(short, [short]).applies).toBe(false);
    expect(shortsCoverage(compilation, [compilation]).applies).toBe(false);
  });
});

describe('shortsCoverageLabel', () => {
  it('shows the number of clips, or that the video is not cut yet', () => {
    expect(shortsCoverageLabel({ applies: true, clips: 3, hasShortsTwin: true })).toBe('✂️ 3 Shorts');
    expect(shortsCoverageLabel({ applies: true, clips: 0, hasShortsTwin: false })).toBe('✂️ Belum dipotong');
    expect(shortsCoverageLabel({ applies: true, clips: 0, hasShortsTwin: true })).toBe('✂️ Belum dipotong · ada versi Shorts');
  });
});
