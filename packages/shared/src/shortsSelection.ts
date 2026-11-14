// The owner picks which scenes of a finished video become one Short. Pure helpers, unit-tested: the scene
// numbers from the form, and whether the picked scenes fit a Short.
import { FORMAT_SPEC } from './constants.ts';

/** Scenes of one automatically cut Short may last this long together; with intro and outro it stays under a minute. */
export const SHORTS_CONTENT_LIMIT_SECONDS = 52;
/** Longest Reel the Facebook Reels API takes; a longer Short goes to the Page as an ordinary video. */
export const FACEBOOK_REELS_MAX_SECONDS = 90;
/** Longest vertical video YouTube counts as a Short. */
export const YOUTUBE_SHORTS_MAX_SECONDS = 180;
/** Shorts intro and outro at their longest, added to the scenes' length. */
const SHORTS_FRAME_SECONDS = FORMAT_SPEC.short.maxIntroSeconds + FORMAT_SPEC.short.maxOutroSeconds;

/** Scene numbers (1-based) from "3,4, 7" or a list: valid, without repeats, in story order. */
export function parseSceneSelection(raw: string | readonly (string | number)[], sceneCount: number): number[] {
  const parts = typeof raw === 'string' ? raw.split(/[\s,;]+/) : raw.map(String);
  const numbers = parts.map((p) => Number(p)).filter((n) => Number.isInteger(n) && n >= 1 && n <= sceneCount);
  return [...new Set(numbers)].sort((a, b) => a - b);
}

/** Total length (seconds) of the picked scenes, from each scene's length in the video. */
export function selectionSeconds(sceneSeconds: readonly number[], picked: readonly number[]): number {
  return picked.reduce((sum, scene) => sum + (sceneSeconds[scene - 1] ?? 0), 0);
}

/**
 * Why the picked scenes cannot become a Short, or undefined when they can. The owner's picks have no length
 * limit; `limitSeconds` is for callers that need one.
 */
export function selectionProblem(sceneSeconds: readonly number[], picked: readonly number[], limitSeconds?: number): string | undefined {
  if (!picked.length) return 'Pilih minimal satu adegan.';
  const total = selectionSeconds(sceneSeconds, picked);
  if (limitSeconds !== undefined && total > limitSeconds) {
    return `Total ${Math.round(total)} detik, melebihi batas ${limitSeconds} detik. Kurangi adegannya.`;
  }
  return undefined;
}

/** Estimated length of the finished Short (seconds): the scenes plus the Shorts intro and outro. */
export function pickedShortSeconds(sceneSeconds: number): number {
  return sceneSeconds + SHORTS_FRAME_SECONDS;
}

/** What a long picked Short means on each platform (information, not a limit). */
export function pickedShortNotes(sceneSeconds: number): string[] {
  const total = pickedShortSeconds(sceneSeconds);
  const notes: string[] = [];
  if (total > FACEBOOK_REELS_MAX_SECONDS) notes.push(`Lebih dari ${FACEBOOK_REELS_MAX_SECONDS} detik: di Facebook dikirim sebagai video Page biasa, bukan Reels.`);
  if (total > YOUTUBE_SHORTS_MAX_SECONDS) notes.push('Lebih dari 3 menit: YouTube tidak menghitungnya sebagai Shorts, tapi tetap tayang sebagai video vertikal.');
  return notes;
}

/** How a vertical Short goes to Facebook: as a Reel when it fits the Reels API, else as an ordinary Page video. */
export function facebookShortKind(totalSeconds: number): 'reel' | 'video' {
  return totalSeconds <= FACEBOOK_REELS_MAX_SECONDS ? 'reel' : 'video';
}
