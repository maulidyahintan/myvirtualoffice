// Short reactions a character plays from the moment its action starts: a fright jump ('startled') and a
// shout ('shouting'). Pure functions of frames, unit-tested.
import type { ArmPose, Mouth } from './motion';

const STARTLE_JUMP_FRAMES = 16;
const STARTLE_JUMP_HEIGHT = 40;
const TREMBLE_SPEED = 1.9;
const TREMBLE_PX = 2.2;
const SHOUT_PULSE_PERIOD = 4;

/** Height of the fright jump `elapsed` frames after being startled (rig px, ≥ 0). */
export function startleJump(elapsed: number): number {
  if (elapsed < 0 || elapsed >= STARTLE_JUMP_FRAMES) return 0;
  return Math.sin((elapsed / STARTLE_JUMP_FRAMES) * Math.PI) * STARTLE_JUMP_HEIGHT;
}

/** Sideways shiver after the jump (rig px); still during the jump itself. */
export function startleTremble(elapsed: number): number {
  return elapsed < STARTLE_JUMP_FRAMES ? 0 : Math.sin(elapsed * TREMBLE_SPEED) * TREMBLE_PX;
}

/** Wide-open shouting mouth, pulsing a little with each call. */
export function shoutMouth(frame: number): Mouth {
  return { buka: 0.85 + Math.sin(frame / SHOUT_PULSE_PERIOD) * 0.15, bulat: 0.35 };
}

/**
 * Child's arms while shouting: the front hand at the corner of the mouth (elbow tucked in, solved for the
 * 50 + 44 px arm reaching the mouth) and the other fist raised and shaking ("Go away!").
 */
export function childShoutArms(frame: number): { kiri: ArmPose; kanan: ArmPose } {
  const shake = Math.sin(frame * TREMBLE_SPEED) * 6;
  return { kiri: { bahu: 115 + shake, siku: 45 }, kanan: { bahu: -105, siku: -112 } };
}

/** Child's arms flung up in fright, shaking. */
export function childStartleArms(frame: number): { kiri: ArmPose; kanan: ArmPose } {
  const shake = Math.sin(frame * TREMBLE_SPEED) * 4;
  return { kiri: { bahu: 118 + shake, siku: 34 }, kanan: { bahu: 118 - shake, siku: 34 } };
}
