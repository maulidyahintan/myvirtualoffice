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

/** Where the hand of an unmirrored two-part Arm at `shoulder` ends up with `pose`. */
export function armEnd(shoulder: Point, pose: ArmPose, upperLength: number, lowerLength: number): Point {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const upper = toRadians(pose.bahu);
  const lower = toRadians(pose.bahu + pose.siku);
  return {
    x: shoulder.x - Math.sin(upper) * upperLength - Math.sin(lower) * lowerLength,
    y: shoulder.y + Math.cos(upper) * upperLength + Math.cos(lower) * lowerLength,
  };
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

/** Rig size every character is drawn in (240 × 400 units, scaled to its height). */
const RIG_WIDTH = 240;
const RIG_HEIGHT = 400;
/** Mother's shoulders in her rig, and where her hands hold the hugged child (in the child's rig). */
const MOTHER_SHOULDERS = { near: { x: 166, y: 196 }, far: { x: 74, y: 196 } };
const CHILD_HUG_AIMS = {
  // around the child's back (drawn behind the child), the hand holding the far shoulder
  near: { elbow: { x: 120, y: 262 }, hand: { x: 178, y: 228 } },
  // across Mother's front to the child's waist
  far: { elbow: { x: 30, y: 330 }, hand: { x: 66, y: 318 } },
};

export interface HugArmAim {
  shoulder: Point;
  elbowAim: Point;
  handAim: Point;
}

/** A character standing at `x` (centre) on the floor, `height` tall, and lowered by `drop` rig units. */
interface Figure {
  x: number;
  height: number;
  drop?: number;
}

function rigPoint(figure: Figure, floorY: number, point: Point): Point {
  const scale = figure.height / RIG_HEIGHT;
  return { x: figure.x + (point.x - RIG_WIDTH / 2) * scale, y: floorY - figure.height + (point.y + (figure.drop ?? 0)) * scale };
}

/**
 * Both of Mother's arms around the child at her right: the near arm over the child's shoulders to the far
 * shoulder, the far arm across her front to the child's waist. Stage coordinates.
 */
export function hugArmAims(mother: Figure, child: Figure, floorY: number): { near: HugArmAim; far: HugArmAim } {
  const arm = (side: 'near' | 'far'): HugArmAim => ({
    shoulder: rigPoint(mother, floorY, MOTHER_SHOULDERS[side]),
    elbowAim: rigPoint(child, floorY, CHILD_HUG_AIMS[side].elbow),
    handAim: rigPoint(child, floorY, CHILD_HUG_AIMS[side].hand),
  });
  return { near: arm('near'), far: arm('far') };
}
