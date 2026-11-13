// Whether a long video already has Shorts clipped from it, so the owner can see which ones still need cutting.
import type { Episode } from './types.ts';

export interface ShortsCoverage {
  /** Only long videos (not Shorts, not compilations) can be cut into Shorts. */
  applies: boolean;
  /** Shorts clipped from this video (rejected ones don't count). */
  clips: number;
  /** A separate Shorts version made from the same idea (not a clip). */
  hasShortsTwin: boolean;
}

const isUsable = (e: Episode) => e.status !== 'rejected';

export function shortsCoverage(ep: Episode, all: Episode[]): ShortsCoverage {
  const applies = (ep.idea.format ?? 'standard') === 'standard' && !ep.compilation;
  const clips = all.filter((e) => e.source?.id === ep.id && isUsable(e)).length;
  const twin = ep.twin ? all.find((e) => e.id === ep.twin) : undefined;
  return { applies, clips, hasShortsTwin: Boolean(twin && twin.idea.format === 'short' && isUsable(twin)) };
}

/** Badge text for a long video, e.g. "✂️ 3 Shorts" or "✂️ Belum dipotong". */
export function shortsCoverageLabel(c: ShortsCoverage): string {
  if (c.clips) return `✂️ ${c.clips} Shorts`;
  return c.hasShortsTwin ? '✂️ Belum dipotong · ada versi Shorts' : '✂️ Belum dipotong';
}
