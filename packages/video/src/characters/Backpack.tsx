// School backpack for the children: the bag is drawn behind the body, the straps over the shoulders.
import React from 'react';

const BAG = '#E36A5C';
const BAG_DARK = '#C2534A';
const POCKET = '#F2A65A';

/** The bag peeking out on both sides behind the body (rig coordinates 240×400). */
export const BackpackBag: React.FC = () => (
  <g>
    {/* carry handle above the shoulders */}
    <path d="M100 206 Q120 176 140 206" stroke={BAG_DARK} strokeWidth={9} fill="none" strokeLinecap="round" />
    <rect x={30} y={200} width={180} height={128} rx={34} fill={BAG} stroke={BAG_DARK} strokeWidth={3} />
    <rect x={14} y={246} width={28} height={62} rx={12} fill={POCKET} stroke={BAG_DARK} strokeWidth={2.5} />
    <rect x={198} y={246} width={28} height={62} rx={12} fill={POCKET} stroke={BAG_DARK} strokeWidth={2.5} />
  </g>
);

/** Straps over the shoulders, drawn on top of the shirt. */
export const BackpackStraps: React.FC = () => (
  <g fill="none" strokeLinecap="round">
    <path d="M86 204 Q80 250 84 300" stroke={BAG_DARK} strokeWidth={13} />
    <path d="M154 204 Q160 250 156 300" stroke={BAG_DARK} strokeWidth={13} />
    <path d="M86 204 Q80 250 84 300" stroke={BAG} strokeWidth={8} />
    <path d="M154 204 Q160 250 156 300" stroke={BAG} strokeWidth={8} />
    <rect x={78} y={262} width={14} height={10} rx={3} fill="#F5C842" stroke="none" />
    <rect x={148} y={262} width={14} height={10} rx={3} fill="#F5C842" stroke="none" />
  </g>
);
