// Timing inside one scene: when each character action starts and when cued lightning strikes, taken from the
// phrase of the narration it is tied to (`at`). Pure functions, unit-tested.
import type { Character, CharacterAction, CharacterMood, Expression } from './types.ts';

/**
 * Weights that estimate where a phrase falls in the spoken narration: every word costs its letters plus a
 * base, punctuation adds a pause. Tuned on recorded scenes, where they land within about 0.7 s of the voice.
 */
const WORD_BASE_WEIGHT = 4;
const COMMA_PAUSE_WEIGHT = 3;
const STOP_PAUSE_WEIGHT = 12;
const ELLIPSIS_PAUSE_WEIGHT = 15;

/** How long a word takes to say, relative to the others (letters, plus a pause after punctuation). */
export function wordWeight(word: string): number {
  const letters = word.replace(/[^\p{L}\p{N}]/gu, '').length;
  let pause = 0;
  if (/(…|\.\.\.)$/.test(word)) pause = ELLIPSIS_PAUSE_WEIGHT;
  else if (/[.!?]$/.test(word)) pause = STOP_PAUSE_WEIGHT;
  else if (/[,;:]$/.test(word)) pause = COMMA_PAUSE_WEIGHT;
  return letters + WORD_BASE_WEIGHT + pause;
}

/**
 * Where `phrase` starts in the spoken narration, as a fraction 0..1 of the speech; undefined when the
 * narration does not contain it (case-insensitive).
 */
export function phraseStart(narration: string, phrase: string): number | undefined {
  const at = narration.toLowerCase().indexOf(phrase.trim().toLowerCase());
  if (!phrase.trim() || at < 0) return undefined;
  let before = 0;
  let total = 0;
  for (const match of narration.matchAll(/\S+/g)) {
    const weight = wordWeight(match[0]);
    total += weight;
    if ((match.index ?? 0) < at) before += weight;
  }
  return total > 0 ? before / total : 0;
}

/** Frame at which `phrase` is spoken, when speech runs `speechFrames` from `speechStart`; undefined if not found. */
export function phraseFrame(narration: string, phrase: string, speechStart: number, speechFrames: number): number | undefined {
  const fraction = phraseStart(narration, phrase);
  return fraction === undefined ? undefined : Math.round(speechStart + fraction * speechFrames);
}

export interface TimedAction extends CharacterAction {
  /** Scene frame the action starts; actions without a cue start with the scene (frame 0). */
  startFrame: number;
}

/** Start frame of every action from its cue (`at`); a cue missing from the narration starts with the scene. */
export function timeActions(
  actions: readonly CharacterAction[],
  narration: string,
  speechStart: number,
  speechFrames: number,
): TimedAction[] {
  return actions.map((action) => ({
    ...action,
    startFrame: action.at ? (phraseFrame(narration, action.at, speechStart, speechFrames) ?? 0) : 0,
  }));
}

/** Actions under way at `frame`: per character the one that started last (a later entry wins a tie). */
export function activeActions(timed: readonly TimedAction[], frame: number): TimedAction[] {
  const current = new Map<Character, TimedAction>();
  for (const action of timed) {
    const previous = current.get(action.character);
    if (action.startFrame <= frame && (!previous || action.startFrame >= previous.startFrame)) current.set(action.character, action);
  }
  return [...current.values()];
}

/** Whether `character` already did `action` earlier in the scene (started before the current one). */
export function didEarlier(timed: readonly TimedAction[], character: Character, action: CharacterAction['action'], frame: number): boolean {
  const current = activeActions(timed, frame).find((a) => a.character === character);
  return timed.some((a) => a.character === character && a.action === action && a !== current && a.startFrame <= frame);
}

/**
 * Expression of `character` at `frame`: its latest mood that has started, else the scene's expression.
 */
export function expressionAt(
  moods: readonly CharacterMood[] | undefined,
  character: Character,
  frame: number,
  scene: { narration: string; expression: Expression; speechStart: number; speechFrames: number },
): Expression {
  let current: { expression: Expression; startFrame: number } | undefined;
  for (const mood of moods ?? []) {
    if (mood.character !== character) continue;
    const startFrame = mood.at ? (phraseFrame(scene.narration, mood.at, scene.speechStart, scene.speechFrames) ?? 0) : 0;
    if (startFrame <= frame && (!current || startFrame >= current.startFrame)) current = { expression: mood.expression, startFrame };
  }
  return current?.expression ?? scene.expression;
}

/** Whether the scene's actions change during the scene (some action has a cue). */
export function hasTimedActions(actions: readonly CharacterAction[] | undefined): boolean {
  return Boolean(actions?.some((a) => a.at));
}
