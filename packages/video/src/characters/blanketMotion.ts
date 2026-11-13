// Motion of a child hiding under a blanket (action 'hiding-under-blanket'): the gap at the eyes opens to peek
// and now and then closes as the child ducks away, and the blanket trembles when the child is scared.
// Pure functions of the frame, unit-tested.

const PEEK_CYCLE_FRAMES = 150;
const PEEK_OPEN_UNTIL_FRAME = 90;
const PEEK_TOGGLE_FRAMES = 10;
const PEEK_CLOSED_UNTIL_FRAME = 125;
/** While talking the gap stays at least this open, so the child doesn't vanish mid-sentence. */
const PEEK_WHILE_TALKING = 0.6;

const TREMBLE_SPEED = 1.9;
const TREMBLE_PX = 1.8;
const BREATH_PERIOD_FRAMES = 25;
const BREATH_SCALE = 0.012;

/** How far the gap at the eyes is open, 0 (hidden) .. 1 (peeking); a 5-second cycle that starts open. */
export function blanketPeek(frame: number, isTalking = false): number {
  const t = ((frame % PEEK_CYCLE_FRAMES) + PEEK_CYCLE_FRAMES) % PEEK_CYCLE_FRAMES;
  let open = 1;
  if (t >= PEEK_OPEN_UNTIL_FRAME && t < PEEK_OPEN_UNTIL_FRAME + PEEK_TOGGLE_FRAMES) {
    open = 1 - (t - PEEK_OPEN_UNTIL_FRAME) / PEEK_TOGGLE_FRAMES;
  } else if (t >= PEEK_OPEN_UNTIL_FRAME + PEEK_TOGGLE_FRAMES && t < PEEK_CLOSED_UNTIL_FRAME) {
    open = 0;
  } else if (t >= PEEK_CLOSED_UNTIL_FRAME && t < PEEK_CLOSED_UNTIL_FRAME + PEEK_TOGGLE_FRAMES) {
    open = (t - PEEK_CLOSED_UNTIL_FRAME) / PEEK_TOGGLE_FRAMES;
  }
  return isTalking ? Math.max(PEEK_WHILE_TALKING, open) : open;
}

/** Sideways shiver of a scared child's blanket (rig px); 0 when calm. */
export function blanketTremble(frame: number, isScared: boolean): number {
  return isScared ? Math.sin(frame * TREMBLE_SPEED) * TREMBLE_PX : 0;
}

/** Slow rise and fall of the blanket with the child's breathing (vertical scale around 1). */
export function blanketBreath(frame: number): number {
  return 1 + Math.sin((frame / BREATH_PERIOD_FRAMES) * Math.PI) * BREATH_SCALE;
}

const DRAPE_FRAMES = 8;

/** How far the blanket has dropped over the child, 0 (just thrown up) .. 1 (covering), `elapsed` frames in. */
export function blanketDrape(elapsed: number): number {
  return Math.min(1, Math.max(0, elapsed / DRAPE_FRAMES));
}
