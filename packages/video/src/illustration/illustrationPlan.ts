// How an AI-illustration scene plays: the picture alternates with the animated characters, every picture
// stretch has its own camera move, and the picture gets moving weather that matches what it shows.
// Pure functions, unit-tested.

export type CutKind = 'illustration' | 'animation';

export interface IllustrationCut {
  kind: CutKind;
  start: number;
  end: number;
  /** Which camera move a picture stretch uses (0, 1, 2 …). */
  move: number;
}

/** Picture stretches last about this long, character stretches a bit shorter (seconds). */
const PICTURE_SECONDS = 3.6;
const ANIMATION_SECONDS = 2.6;
/** Scenes shorter than this stay on the picture (too short to cut away and back). */
const MIN_ALTERNATING_SECONDS = 6;

/**
 * Stretches of a scene `duration` frames long: picture first, then the animated characters, and so on; the
 * last stretch absorbs the remainder. Without characters the picture stays on, still with changing moves.
 */
export function illustrationCuts(duration: number, fps: number, hasCharacters: boolean): IllustrationCut[] {
  const picture = Math.round(PICTURE_SECONDS * fps);
  const animation = Math.round(ANIMATION_SECONDS * fps);
  const alternate = hasCharacters && duration >= MIN_ALTERNATING_SECONDS * fps;
  const cuts: IllustrationCut[] = [];
  let start = 0;
  let move = 0;
  while (start < duration) {
    const kind: CutKind = alternate && cuts.length % 2 === 1 ? 'animation' : 'illustration';
    const length = kind === 'animation' ? animation : picture;
    const end = Math.min(duration, start + length);
    cuts.push({ kind, start, end, move: kind === 'illustration' ? move++ : move });
    start = end;
  }
  // a stub at the end looks like a glitch: give it to the stretch before
  const last = cuts.at(-1);
  if (cuts.length > 1 && last && last.end - last.start < fps) {
    cuts.pop();
    cuts[cuts.length - 1].end = duration;
  }
  return cuts;
}

/** Around a beat the characters are shown: from a moment before it to this long after (seconds). */
const BEAT_LEAD_SECONDS = 0.3;
const BEAT_HOLD_SECONDS = 2;

/**
 * The cuts with the animated characters shown around every beat (an action or a change of expression at its
 * words), so what happens is never hidden behind the picture.
 */
export function showBeats(cuts: readonly IllustrationCut[], beats: readonly number[], fps: number): IllustrationCut[] {
  const windows = beats.map((beat) => [Math.max(0, beat - Math.round(BEAT_LEAD_SECONDS * fps)), beat + Math.round(BEAT_HOLD_SECONDS * fps)] as const);
  const inBeat = (frame: number) => windows.some(([from, to]) => frame >= from && frame < to);
  const bounds = new Set<number>(cuts.flatMap((c) => [c.start, c.end]));
  const end = cuts.at(-1)?.end ?? 0;
  windows.forEach(([from, to]) => [from, to].forEach((f) => f > 0 && f < end && bounds.add(f)));
  const edges = [...bounds].sort((a, b) => a - b);
  const result: IllustrationCut[] = [];
  edges.slice(0, -1).forEach((start, i) => {
    const original = cuts.find((c) => start >= c.start && start < c.end)!;
    const kind = inBeat(start) ? 'animation' : original.kind;
    const last = result.at(-1);
    // neighbouring pieces of the same kind (and move) stay one stretch
    if (last && last.kind === kind && last.move === original.move) last.end = edges[i + 1];
    else result.push({ kind, start, end: edges[i + 1], move: original.move });
  });
  return result;
}

/** The camera move of picture stretch `move`: zoom from/to and pan (percent) from/to. */
export function pictureMove(move: number): { z: [number, number]; x: [number, number]; y: [number, number] } {
  const MOVES = [
    { z: [1.06, 1.18], x: [0, -3], y: [0, -1] },
    { z: [1.2, 1.08], x: [-3, 2], y: [1, 0] },
    { z: [1.1, 1.28], x: [3, 1], y: [-2, 1] },
    { z: [1.16, 1.06], x: [0, 0], y: [3, -2] },
  ] as const;
  const chosen = MOVES[move % MOVES.length];
  return { z: [...chosen.z], x: [...chosen.x], y: [...chosen.y] };
}

export type Ambience = 'rain' | 'leaves' | 'stars' | 'sunrays' | 'motes';

const AMBIENCE_WORDS: [Ambience, RegExp][] = [
  ['rain', /\b(rain|rainy|raindrops?|storm|drizzle)\b/i],
  ['leaves', /\b(leaf|leaves|autumn|tree|trees|garden|wind)\b/i],
  ['stars', /\b(night|stars?|starry|moon|moonlight)\b/i],
  ['sunrays', /\b(sun|sunny|sunlight|sunrise|morning|day|daylight)\b/i],
];

/** Moving weather for a picture, from the words of its English description; light motes always drift. */
export function ambienceFor(prompt: string): Ambience[] {
  const found = AMBIENCE_WORDS.filter(([, words]) => words.test(prompt)).map(([ambience]) => ambience);
  return [...found, 'motes'];
}
