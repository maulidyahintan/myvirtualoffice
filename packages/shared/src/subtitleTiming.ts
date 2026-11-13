// When each subtitle line of a scene appears: estimated from the spoken weight of its words (punctuation
// pauses included), then moved by the owner's corrections. Pure functions, unit-tested.
import { wordWeight } from './sceneTimeline.ts';

/** Words per subtitle line: regular videos and the narrower Shorts frame. */
export const SUBTITLE_MAX_WORDS = { standard: 8, short: 6 } as const;
/** A line stays at least this long on screen, however the owner moves the lines (seconds). */
export const MIN_SUBTITLE_SECONDS = 0.4;
/** Step of the "earlier / later" buttons (seconds). */
export const SUBTITLE_NUDGE_SECONDS = 0.5;

/** Narration split into short lines: at most `maxWords` words, a sentence end always ends a line. */
export function subtitleLines(text: string, maxWords: number): string[] {
  const lines: string[] = [];
  let current: string[] = [];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    current.push(word);
    if (current.length >= maxWords || /[.!?]$/.test(word)) {
      lines.push(current.join(' '));
      current = [];
    }
  }
  if (current.length) lines.push(current.join(' '));
  return lines;
}

/**
 * Start (seconds into the scene's speech) of every line: proportional to the spoken weight of the lines
 * before it, plus the owner's `shifts` (seconds per line), kept in order and inside the speech.
 */
export function subtitleStarts(lines: readonly string[], speechSeconds: number, shifts: readonly (number | null)[] = []): number[] {
  const weights = lines.map((line) => line.split(/\s+/).filter(Boolean).reduce((sum, word) => sum + wordWeight(word), 0));
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  let before = 0;
  const latest = Math.max(0, speechSeconds - MIN_SUBTITLE_SECONDS);
  let previous = -MIN_SUBTITLE_SECONDS;
  return weights.map((weight, i) => {
    const estimate = (before / total) * speechSeconds;
    before += weight;
    const wanted = estimate + (shifts[i] ?? 0);
    const start = Math.min(latest, Math.max(i === 0 ? 0 : previous + MIN_SUBTITLE_SECONDS, wanted));
    previous = start;
    return start;
  });
}

/** Shifts after moving line `index` so that it starts at `wantedStart` seconds into the speech. */
export function moveSubtitleLine(
  lines: readonly string[],
  speechSeconds: number,
  shifts: readonly (number | null)[],
  index: number,
  wantedStart: number,
): number[] {
  const base = subtitleStarts(lines, speechSeconds, []);
  const next = lines.map((_, i) => shifts[i] ?? 0);
  next[index] = Math.round((wantedStart - base[index]) * 10) / 10;
  return next;
}

/** The voice of a scene ends this long before the scene does (the breath between scenes). */
export const SPEECH_BREATH_SECONDS = 1;

export interface TimedSubtitleLine {
  text: string;
  /** Seconds into the whole video. */
  start: number;
}

/** A rendered scene's subtitle lines with the moment each appears in the video. */
export function sceneSubtitleTimeline(
  narration: string,
  scene: { start: number; duration: number },
  maxWords: number,
  shifts: readonly (number | null)[] = [],
): TimedSubtitleLine[] {
  const lines = subtitleLines(narration, maxWords);
  const speech = Math.max(1, scene.duration - SPEECH_BREATH_SECONDS);
  return subtitleStarts(lines, speech, shifts).map((start, i) => ({ text: lines[i], start: scene.start + start }));
}
