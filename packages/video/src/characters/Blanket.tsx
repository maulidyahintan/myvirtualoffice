// A blanket draped over a sitting child from head to toe (action 'hiding-under-blanket'), in the child rig's
// coordinates (240 x 400, inside the sitting offset). Only the eyes show through a gap the child holds open.
import React from 'react';
import { blanketBreath, blanketPeek, blanketTremble } from './blanketMotion';

const BLANKET = { base: '#7FB2D9', shade: '#5F93BF', light: '#A7CDEA', dots: '#FFF3B0' } as const;
/** Centre and half-size of the gap at the eyes; the face sits at this height in the child rig. */
const GAP = { x: 120, y: 136, halfWidth: 74, halfHeight: 26 } as const;
/** Fingers clutch the lower edge of the gap side by side, covering the mouth. */
const FINGER_XS = [92, 109, 131, 148];
const BOTTOM_Y = 345;
const OUTLINE = `M-36 ${BOTTOM_Y} C-40 230 -20 120 22 62 C52 18 88 2 120 2 C152 2 188 18 218 62 C260 120 280 230 276 ${BOTTOM_Y} Z`;
const FOLDS = ['M70 64 Q52 200 30 340', 'M170 64 Q188 200 210 340', 'M120 200 Q114 270 122 340'];
const DOTS = [
  [60, 110],
  [190, 120],
  [40, 260],
  [205, 250],
  [120, 300],
  [90, 40],
];
/** Height of the blanket (share of its full height) the moment the child pulls it up. */
const DRAPE_START_SCALE = 0.55;
/** Fingers peek out only once the gap is this tall (rig px). */
const MIN_GAP_FOR_FINGERS = 6;

function gapPath(halfHeight: number): string {
  const { x, y, halfWidth } = GAP;
  return `M${x - halfWidth} ${y} Q${x} ${y - halfHeight * 2} ${x + halfWidth} ${y} Q${x} ${y + halfHeight * 2} ${x - halfWidth} ${y} Z`;
}

export const Blanket: React.FC<{ f: number; drape: number; isScared: boolean; isTalking: boolean; skin: string; outline: string }> = ({
  f,
  drape,
  isScared,
  isTalking,
  skin,
  outline,
}) => {
  const halfHeight = GAP.halfHeight * blanketPeek(f, isTalking);
  const isOpen = halfHeight >= 1;
  const shift = blanketTremble(f, isScared);
  const breath = blanketBreath(f);
  // pulled down over the child's head: it grows from the bed up while it drops
  const drapeScale = DRAPE_START_SCALE + (1 - DRAPE_START_SCALE) * drape;
  // the lower edge of the gap, where the fingers hold the blanket open
  const fingerY = GAP.y + halfHeight;
  return (
    <g transform={`translate(${shift} 0) translate(120 ${BOTTOM_Y}) scale(1 ${breath * drapeScale}) translate(-120 -${BOTTOM_Y})`}>
      <path d={isOpen ? `${OUTLINE} ${gapPath(halfHeight)}` : OUTLINE} fill={BLANKET.base} fillRule="evenodd" stroke={BLANKET.shade} strokeWidth={4} strokeLinejoin="round" />
      {/* light falling on the top of the head */}
      <path d="M60 70 Q120 10 180 70 Q120 40 60 70 Z" fill={BLANKET.light} opacity={0.6} />
      {FOLDS.map((d) => (
        <path key={d} d={d} fill="none" stroke={BLANKET.shade} strokeWidth={4} strokeLinecap="round" opacity={0.55} />
      ))}
      {DOTS.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={5} fill={BLANKET.dots} opacity={0.8} />
      ))}
      {isOpen ? <path d={gapPath(halfHeight)} fill="none" stroke={BLANKET.shade} strokeWidth={7} opacity={0.8} /> : null}
      {halfHeight >= MIN_GAP_FOR_FINGERS
        ? FINGER_XS.map((x) => <ellipse key={x} cx={x} cy={fingerY - 3} rx={11} ry={10} fill={skin} stroke={outline} strokeWidth={2} />)
        : null}
    </g>
  );
};
