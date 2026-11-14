// The owner picks which scenes of a finished video become one Short. Pure helpers, unit-tested: the scene
// numbers from the form, and whether the picked scenes fit a Short.

/** Scenes of one Short may last this long together; the Shorts intro and outro keep it under a minute. */
export const SHORTS_CONTENT_LIMIT_SECONDS = 52;

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
export function selectionProblem(sceneSeconds: readonly number[], picked: readonly number[]): string | undefined {
  if (!picked.length) return 'Pilih minimal satu adegan.';
  const total = selectionSeconds(sceneSeconds, picked);
  if (total > SHORTS_CONTENT_LIMIT_SECONDS) {
    return `Total ${Math.round(total)} detik, melebihi batas Shorts ${SHORTS_CONTENT_LIMIT_SECONDS} detik. Kurangi adegannya.`;
  }
  return undefined;
}
