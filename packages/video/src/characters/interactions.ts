// Geometry of scenes where characters touch: an arm reaching around someone and the cat walking up to a child.
// Pure functions in stage coordinates, unit-tested.
import type { ArmPose } from './motion';

export interface Point {
  x: number;
  y: number;
}

const toDegrees = (radians: number) => (radians * 180) / Math.PI;

/** Angle (Arm convention: 0 = hanging down, positive = clockwise) of the direction from `from` to `to`. */
export function hangingAngle(from: Point, to: Point): number {
  return toDegrees(Math.atan2(-(to.x - from.x), to.y - from.y));
}

/**
 * Pose for an unmirrored two-part Arm at `shoulder` whose upper arm points at `elbowAim` and whose forearm
 * then points at `handAim`, e.g. an arm laid over a child's shoulders.
 */
export function armPoseTowards(shoulder: Point, elbowAim: Point, handAim: Point, upperLength: number): ArmPose {
  const bahu = hangingAngle(shoulder, elbowAim);
  const radians = (bahu * Math.PI) / 180;
  const elbow = { x: shoulder.x - Math.sin(radians) * upperLength, y: shoulder.y + Math.cos(radians) * upperLength };
  return { bahu, siku: hangingAngle(elbow, handAim) - bahu };
}

/** Frames the cat needs to walk up to the child, and the pace of its little steps. */
export const APPROACH_FRAMES = 120;
const STEP_PACE = 0.35;

export interface ApproachState {
  x: number;
  /** Walking phase for the legs, null once the cat stands still next to the child. */
  step: number | null;
  /** Direction the cat walks: -1 to the left, 1 to the right. */
  facing: -1 | 1;
}

/** Where the cat is `elapsed` frames after it starts walking from `fromX` to `toX`, slowing down at the end. */
export function approach(elapsed: number, fromX: number, toX: number, frames = APPROACH_FRAMES): ApproachState {
  const facing = toX < fromX ? -1 : 1;
  if (elapsed <= 0) return { x: fromX, step: 0, facing };
  if (elapsed >= frames) return { x: toX, step: null, facing };
  const progress = elapsed / frames;
  const eased = 1 - (1 - progress) * (1 - progress);
  return { x: fromX + (toX - fromX) * eased, step: elapsed * STEP_PACE, facing };
}

/** Horizontal run of the cat's hop from the floor onto the mattress (px), and how high it arcs above it. */
export const BED_HOP_RUN_X = 90;
const BED_HOP_ARC_HEIGHT = 60;

/**
 * Height (feet) of the cat walking from the floor in front of the bed onto the mattress: on the floor until it
 * reaches the bed's edge, a short hop across `BED_HOP_RUN_X`, then on the mattress. `bedEdgeX` is the end of
 * the bed it walks towards (the cat comes from the right).
 */
export function bedClimbY(x: number, bedEdgeX: number, floorY: number, bedY: number): number {
  if (x >= bedEdgeX + BED_HOP_RUN_X) return floorY;
  if (x <= bedEdgeX) return bedY;
  const progress = (bedEdgeX + BED_HOP_RUN_X - x) / BED_HOP_RUN_X;
  return floorY + (bedY - floorY) * progress - Math.sin(progress * Math.PI) * BED_HOP_ARC_HEIGHT;
}
