// The owner picks which scenes of a finished video become one Short. Pure helpers, unit-tested: the scene
// numbers from the form, and whether the picked scenes fit a Short.
import { FORMAT_SPEC } from './constants.ts';

/** Scenes of one automatically cut Short may last this long together; with intro and outro it stays under a minute. */
export const SHORTS_CONTENT_LIMIT_SECONDS = 52;
/** A Short from scenes the owner picked may last this long in all (also the Facebook Reels limit). */
export const PICKED_SHORT_TOTAL_SECONDS = 90;
/** Scenes the owner picked may last this long together, leaving room for the longest Shorts intro and outro. */
export const PICKED_SHORT_CONTENT_LIMIT_SECONDS =
  PICKED_SHORT_TOTAL_SECONDS - FORMAT_SPEC.short.maxIntroSeconds - FORMAT_SPEC.short.maxOutroSeconds;

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

/** Why the picked scenes cannot become a Short, or undefined when they can. */
export function selectionProblem(
  sceneSeconds: readonly number[],
  picked: readonly number[],
  limitSeconds = PICKED_SHORT_CONTENT_LIMIT_SECONDS,
): string | undefined {
  if (!picked.length) return 'Pilih minimal satu adegan.';
  const total = selectionSeconds(sceneSeconds, picked);
  if (total > limitSeconds) {
    return `Total ${Math.round(total)} detik, melebihi batas ${limitSeconds} detik untuk Shorts pilihan. Kurangi adegannya.`;
  }
  return undefined;
}
