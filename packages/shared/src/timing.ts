import { FPS, FORMAT_SPEC } from './constants.ts';
import type { Scene, MemorizationVerse, Format } from './types.ts';

const WORDS_PER_SECOND = 2.1; // Slow & clear children's story reading tempo
const QUESTION_PAUSE_SECONDS = 3; // Child given time to think

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Weight of each scene, proportional to its narration length. */
function weight(s: Scene): number {
  return Math.max(4, countWords(s.narration));
}

/** Frames for each segment from their start seconds in recording (+1 second breath at end). */
function framesFromStarts(starts: number[], audioDurationSeconds: number): number[] {
  const ends = [...starts.slice(1), audioDurationSeconds + 1];
  let prev = 0;
  return ends.map((t) => {
    const f = Math.max(FPS, Math.round(t * FPS) - prev);
    prev += f;
    return f;
  });
}

/**
 * Calculate duration (frames) of each scene.
 * - Without audio: estimate from word count.
 * - Per-scene recording (`sceneStarts`): each scene exactly matches its recording.
 * - With audio: audio duration divided proportionally by narration length,
 *   so on-screen text roughly follows your voice.
 */
export function sceneFrames(scenes: Scene[], audioDurationSeconds?: number, sceneStarts?: number[]): number[] {
  if (scenes.length === 0) return [];
  if (audioDurationSeconds && sceneStarts?.length === scenes.length) return framesFromStarts(sceneStarts, audioDurationSeconds);
  if (audioDurationSeconds && audioDurationSeconds > 0) {
    const total = scenes.reduce((s, a) => s + weight(a), 0);
    const totalFrames = Math.ceil(audioDurationSeconds * FPS) + FPS; // +1 second breath at end
    const result = scenes.map((a) => Math.max(FPS * 2, Math.round((weight(a) / total) * totalFrames)));
    return result;
  }
  return scenes.map((a) => {
    const seconds = countWords(a.narration) / WORDS_PER_SECOND + 1 + (a.type === 'question' ? QUESTION_PAUSE_SECONDS : 0);
    return Math.round(Math.max(3, seconds) * FPS);
  });
}

/** Intro/outro length: format default, extended to match music (limited to format maximum). */
export function introOutroFrames(format: Format = 'standard', introSeconds?: number, outroSeconds?: number) {
  const spec = FORMAT_SPEC[format];
  const match = (def: number, max: number, music?: number) => Math.round(Math.min(max, Math.max(def, music ?? 0)) * FPS);
  return {
    intro: match(spec.introSeconds, spec.maxIntroSeconds, introSeconds),
    outro: match(spec.outroSeconds, spec.maxOutroSeconds, outroSeconds),
  };
}

export function totalFrames(sceneFrames: number[], format: Format = 'standard', intro?: number, outro?: number): number {
  const def = introOutroFrames(format);
  return (intro ?? def.intro) + sceneFrames.reduce((s, f) => s + f, 0) + (outro ?? def.outro);
}

/** Memorization segment order: each verse repeated `repetitions` times (basmalah only once). */
export function memorizationSegments(verses: MemorizationVerse[], repetitions: number): { verse: number; repetition: number }[] {
  const result: { verse: number; repetition: number }[] = [];
  verses.forEach((v, i) => {
    const n = v.number === 0 ? 1 : Math.max(1, repetitions);
    for (let k = 1; k <= n; k++) result.push({ verse: i, repetition: k });
  });
  return result;
}

/**
 * Duration (frames) of each memorization segment.
 * - Has `segmentStarts` (pause detection result in recording): use that timing exactly.
 * - Has audio duration only: divide by Arabic text length.
 * - Without audio: estimate slow reading tempo.
 */
export function memorizationFrames(
  verses: MemorizationVerse[],
  repetitions: number,
  audioDurationSeconds?: number,
  segmentStarts?: number[],
): number[] {
  const segments = memorizationSegments(verses, repetitions);
  if (segments.length === 0) return [];
  if (audioDurationSeconds && segmentStarts && segmentStarts.length === segments.length) return framesFromStarts(segmentStarts, audioDurationSeconds);
  const lengths = segments.map((s) => Math.max(8, verses[s.verse].arabic.replace(/[ً-ٰٟۖ-ۭ\s]/g, '').length));
  if (audioDurationSeconds && audioDurationSeconds > 0) {
    const total = lengths.reduce((a, b) => a + b, 0);
    const totalF = Math.ceil(audioDurationSeconds * FPS) + FPS;
    return lengths.map((p) => Math.max(FPS * 2, Math.round((p / total) * totalF)));
  }
  // ±6 letters per second for child to imitate, plus 1.5 second pause
  return lengths.map((p) => Math.round((p / 6 + 1.5) * FPS));
}
