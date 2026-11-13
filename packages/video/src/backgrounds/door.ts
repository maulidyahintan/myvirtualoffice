import type { Character } from '@kantor/shared/types';

// Timing of the front door being opened (action 'opening-door'): the hand reaches the handle, the door swings
// open and stays open, then the hand comes back down. Frames are counted from the start of the action.

/** The hand reaches the handle in this many frames. */
export const REACH_FRAMES = 12;
/** The door starts to open once the hand holds the handle, and is fully open after DOOR_SWING_FRAMES. */
export const DOOR_START_FRAME = 16;
export const DOOR_SWING_FRAMES = 30;
/** The hand lets go after the door is open and is back down REACH_FRAMES later. */
export const RELEASE_FRAME = 60;

const smooth = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

/** How far the opener's arm is stretched towards the handle, 0 (down) to 1 (on the handle). */
export function doorReach(elapsed: number): number {
  if (elapsed < RELEASE_FRAME) return smooth(elapsed / REACH_FRAMES);
  return 1 - smooth((elapsed - RELEASE_FRAME) / REACH_FRAMES);
}

/** How far the door is open, 0 (closed) to 1 (swung open). */
export function doorOpen(elapsed: number): number {
  return smooth((elapsed - DOOR_START_FRAME) / DOOR_SWING_FRAMES);
}

/**
 * How far right of the door handle each character stands so that its stretched left arm reaches the handle
 * (stage px; from the rigs' shoulder positions and arm lengths). The cat never opens doors.
 */
export const DOOR_STANCE_X: Partial<Record<Character, number>> = { mamas: 159, friend: 167, mother: 262 };

const STAGE_RIGHT = 1900;
const GAP = 20;

/**
 * Centers for the other characters while someone opens the door: side by side to the right of the opener,
 * and once the stage is full, to the left of the doorway. `widths` in the characters' order.
 */
export function placeAroundDoor(opener: { x: number; width: number }, widths: number[], doorLeft: number): number[] {
  let right = opener.x + opener.width / 2 + GAP;
  let left = doorLeft - GAP;
  return widths.map((width) => {
    if (right + width <= STAGE_RIGHT) {
      const x = right + width / 2;
      right += width + GAP;
      return x;
    }
    const x = left - width / 2;
    left -= width + GAP;
    return x;
  });
}
