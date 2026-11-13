// Camera cuts that follow what happens in a scene: every beat (an action or a change of mood starting at its
// words) gets its own shot. Pure, unit-tested; SceneView turns the shots into camera moves.
import type { Action, Character, Expression } from '@kantor/shared/types';

/** 'move' = someone crosses the stage (keep everything in view), 'react' = a fright, 'act' = anything else. */
export type BeatKind = 'move' | 'react' | 'act';

export interface Beat {
  frame: number;
  kind: BeatKind;
  /** Who the shot is about. */
  focus?: Character;
  /** A move stays in a wide shot this long, until it is over. */
  holdFrames: number;
}

export type BeatShotName = 'lebar' | 'kejut' | 'fokus' | 'sedang';

export interface BeatShot {
  shot: BeatShotName;
  mulai: number;
  durasi: number;
  focus?: Character;
}

/** Frames a moving action needs before the camera may cut in again (walks, falls, leaps). */
const MOVE_HOLD_FRAMES: Partial<Record<Action, number>> = {
  approaching: 120,
  falling: 75,
  'hiding-under-blanket': 30,
  'hugging-knees': 30,
  'opening-door': 45,
  circling: 90,
};
const REACTION_ACTIONS: readonly Action[] = ['startled'];
const REACTION_MOODS: readonly Expression[] = ['surprised', 'crying'];

/** What kind of beat an action starting mid-scene is. */
export function actionBeat(action: Action, frame: number, focus: Character): Beat {
  const hold = MOVE_HOLD_FRAMES[action];
  if (hold !== undefined) return { frame, kind: 'move', focus, holdFrames: hold };
  return { frame, kind: REACTION_ACTIONS.includes(action) ? 'react' : 'act', focus, holdFrames: 0 };
}

/** What kind of beat a change of expression mid-scene is. */
export function moodBeat(expression: Expression, frame: number, focus: Character): Beat {
  return { frame, kind: REACTION_MOODS.includes(expression) ? 'react' : 'act', focus, holdFrames: 0 };
}

const SHOT_FOR: Record<BeatKind, BeatShotName> = { move: 'lebar', react: 'kejut', act: 'fokus' };

/**
 * Shots for a scene of `duration` frames: a wide opening, then a cut at every beat. Beats closer together than
 * `minFrames` (or inside a move that is still going on) are dropped, except that a move always gets its wide
 * shot; long stretches are broken up with a medium shot every `fillFrames`.
 */
export function beatShots(beats: readonly Beat[], duration: number, minFrames: number, fillFrames: number): BeatShot[] {
  const shots: BeatShot[] = [{ shot: 'lebar', mulai: 0, durasi: 0 }];
  let holdUntil = 0;
  for (const beat of [...beats].sort((a, b) => a.frame - b.frame)) {
    if (beat.frame <= 0 || beat.frame >= duration) continue;
    const last = shots[shots.length - 1];
    const tooSoon = beat.frame - last.mulai < minFrames || beat.frame < holdUntil;
    if (tooSoon && beat.kind !== 'move') continue;
    if (tooSoon) {
      // a move during another shot: switch that shot to wide so the move stays in view
      last.shot = 'lebar';
      holdUntil = Math.max(holdUntil, beat.frame + beat.holdFrames);
      continue;
    }
    shots.push({ shot: SHOT_FOR[beat.kind], mulai: beat.frame, durasi: 0, focus: beat.focus });
    holdUntil = beat.frame + beat.holdFrames;
  }
  const filled: BeatShot[] = [];
  shots.forEach((shot, i) => {
    const end = shots[i + 1]?.mulai ?? duration;
    filled.push({ ...shot, durasi: end - shot.mulai });
    // a long, quiet stretch after a close shot: cut to a medium shot now and then
    let next = shot.mulai + fillFrames;
    while (shot.shot !== 'lebar' && end - next >= minFrames) {
      filled[filled.length - 1].durasi = next - filled[filled.length - 1].mulai;
      filled.push({ shot: 'sedang', mulai: next, durasi: end - next });
      next += fillFrames;
    }
  });
  return filled;
}
