// How each expression shapes the face and body: eye size, brows, tears, the sob. Pure functions of the
// expression and the frame, unit-tested; Face, the poses and the effects read them.
import type { Expression } from '@kantor/shared/types';

export interface FaceMood {
  /** Eye size (1 = normal). */
  eyeScale: number;
  /** Iris size inside the eye (1 = normal); a fright makes it small. */
  irisScale: number;
  /** Extra brow lift (face units). */
  browLift: number;
  /** How much the inner ends of the brows rise (pleading, sad). */
  browInnerLift: number;
  /** Upper eyelid lowered (0..1). */
  lidTop: number;
  /** Eyes squeezed shut while crying. */
  eyesSqueezed: boolean;
  /** Tears welling up along the lower lid (0..1). */
  tearPool: number;
  /** Tears running down the cheeks. */
  tearStreams: boolean;
}

const NEUTRAL: FaceMood = { eyeScale: 1, irisScale: 1, browLift: 0, browInnerLift: 0, lidTop: 0, eyesSqueezed: false, tearPool: 0, tearStreams: false };

const MOODS: Partial<Record<Expression, Partial<FaceMood>>> = {
  surprised: { eyeScale: 1.18, irisScale: 0.62, browLift: 10 },
  sad: { lidTop: 0.28, browInnerLift: 8, tearPool: 0.8 },
  crying: { browInnerLift: 11, eyesSqueezed: true, tearPool: 1, tearStreams: true },
  calm: { lidTop: 0.2 },
};

/** A happy listener is keen rather than bouncy: eyes a little wider and bright, brows up. */
const KEEN_LISTENER: Partial<FaceMood> = { eyeScale: 1.07, browLift: 4 };

/** Face for an expression; `listening` = someone else is talking (a happy listener looks keen). */
export function faceMood(expression: Expression, listening = false): FaceMood {
  const keen = listening && expression === 'happy' ? KEEN_LISTENER : {};
  return { ...NEUTRAL, ...MOODS[expression], ...keen };
}

/** A happy child listening to someone: keen and still, not hopping about. */
export function isKeenListener(expression: Expression, listening: boolean, isTalking: boolean): boolean {
  return listening && !isTalking && expression === 'happy';
}

/** Sad and crying share the down-cast body language. */
export function isSadLike(expression: Expression): boolean {
  return expression === 'sad' || expression === 'crying';
}

const LIP_QUIVER_SPEED = 2.2;
const LIP_QUIVER_PX = 1.4;
/** Trembling lower lip of a sad or crying face (face units); still otherwise. */
export function lipQuiver(expression: Expression, frame: number): number {
  return isSadLike(expression) ? Math.sin(frame * LIP_QUIVER_SPEED) * LIP_QUIVER_PX : 0;
}

const TEAR_RUN_FRAMES = 36;
const TEAR_RUN_DISTANCE = 46;
/** A tear running down the cheek: how far down (face units) and how visible, each tear on its own beat. */
export function tearDrop(frame: number, index: number): { y: number; opacity: number } {
  const t = ((frame + index * (TEAR_RUN_FRAMES / 2)) % TEAR_RUN_FRAMES) / TEAR_RUN_FRAMES;
  return { y: t * TEAR_RUN_DISTANCE, opacity: Math.sin(t * Math.PI) };
}

const SOB_PERIOD_FRAMES = 5;
const SOB_HEIGHT = 5;
/** Shoulders jerking up with each sob while crying (rig px, ≥ 0). */
export function sobBounce(expression: Expression, frame: number): number {
  return expression === 'crying' ? Math.abs(Math.sin(frame / SOB_PERIOD_FRAMES)) * SOB_HEIGHT : 0;
}
