// In front of the family's house: the porch with the front door, a window, a lamp, the doormat and a shoe
// rack. The door panel is a separate layer so it can swing open (action 'opening-door').
import React from 'react';
import { useCurrentFrame } from 'remotion';

const W = 1920;
const H = 1080;
const PORCH_Y = 840;

/** The doorway in stage coordinates; the hinge is on the left, the handle on the right. */
export const FRONT_DOOR = { left: 800, right: 1020, top: 400, bottom: PORCH_Y, handle: { x: 990, y: 640 } } as const;

const PottedPlant: React.FC<{ x: number }> = ({ x }) => {
  const frame = useCurrentFrame();
  const sway = Math.sin(frame / 45 + x) * 2;
  return (
    <g>
      <g transform={`rotate(${sway} ${x} ${PORCH_Y - 70})`}>
        <ellipse cx={x} cy={PORCH_Y - 150} rx={60} ry={80} fill="#5FA35A" />
        <ellipse cx={x - 30} cy={PORCH_Y - 180} rx={34} ry={46} fill="#74B86A" />
      </g>
      <path d={`M${x - 50} ${PORCH_Y - 80} L${x + 50} ${PORCH_Y - 80} L${x + 38} ${PORCH_Y} L${x - 38} ${PORCH_Y} Z`} fill="#C27C5A" />
    </g>
  );
};

/** House front without the door panel (drawn by FrontDoor on top). */
export const HouseFront = () => {
  const { left, right, top, bottom } = FRONT_DOOR;
  return (
    <>
      {/* sky strip above the eave */}
      <rect width={W} height={H} fill="#BFE3F5" />
      {/* wall with wooden siding */}
      <rect y={110} width={W} height={PORCH_Y - 110} fill="#F4E3C3" />
      {Array.from({ length: 16 }, (_, i) => (
        <rect key={i} y={150 + i * 44} width={W} height={3} fill="#E5CFA6" />
      ))}
      {/* roof eave */}
      <rect y={70} width={W} height={50} fill="#B84F3E" />
      <rect y={115} width={W} height={14} fill="#8E3A2E" opacity={0.6} />
      {/* doorway: warm light from inside the house, with a glimpse of the living room */}
      <defs>
        <linearGradient id="homeLight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE7AE" />
          <stop offset="1" stopColor="#F6C978" />
        </linearGradient>
      </defs>
      <rect x={left} y={top} width={right - left} height={bottom - top} fill="url(#homeLight)" />
      <rect x={left + 60} y={top + 70} width={90} height={70} rx={6} fill="#2F6F5E" stroke="#E8B04A" strokeWidth={6} />
      <rect x={left} y={bottom - 60} width={right - left} height={60} fill="#E9B97E" />
      {/* door frame and step */}
      <rect x={left - 26} y={top - 26} width={right - left + 52} height={26} rx={6} fill="#8A5A3C" />
      <rect x={left - 26} y={top} width={26} height={bottom - top} fill="#8A5A3C" />
      <rect x={right} y={top} width={26} height={bottom - top} fill="#8A5A3C" />
      <rect x={left - 60} y={bottom - 6} width={right - left + 120} height={22} rx={6} fill="#B9AE9B" />
      {/* window with curtains */}
      <rect x={1240} y={360} width={360} height={280} rx={14} fill="#FFE7AE" stroke="#FFFFFF" strokeWidth={14} />
      <path d="M1247 367 Q1300 480 1260 633 L1247 633 Z" fill="#E8A87C" />
      <path d="M1593 367 Q1540 480 1580 633 L1593 633 Z" fill="#E8A87C" />
      <line x1={1420} y1={360} x2={1420} y2={640} stroke="#FFFFFF" strokeWidth={10} />
      {/* wall lamp */}
      <rect x={1078} y={430} width={34} height={60} rx={10} fill="#FFE59A" stroke="#8A5A3C" strokeWidth={5} />
      <circle cx={1095} cy={460} r={70} fill="#FFE59A" opacity={0.18} />
      {/* shoe rack: shoes are left outside */}
      <rect x={300} y={720} width={260} height={16} rx={4} fill="#9A6B47" />
      <rect x={300} y={780} width={260} height={16} rx={4} fill="#9A6B47" />
      <rect x={300} y={720} width={14} height={120} fill="#7A5236" />
      <rect x={546} y={720} width={14} height={120} fill="#7A5236" />
      {[330, 400, 470].map((x, i) => (
        <ellipse key={x} cx={x + 20} cy={712} rx={30} ry={12} fill={['#5B8FD1', '#F6F6F4', '#E06A6A'][i]} />
      ))}
      <PottedPlant x={680} />
      <PottedPlant x={1720} />
      {/* porch floor */}
      <rect y={PORCH_Y} width={W} height={H - PORCH_Y} fill="#D8C7A8" />
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={i * 170} y={PORCH_Y} width={4} height={H - PORCH_Y} fill="#C4B08D" />
      ))}
      {/* doormat */}
      <rect x={left - 20} y={PORCH_Y + 18} width={right - left + 40} height={46} rx={10} fill="#C98F5B" />
      <rect x={left - 8} y={PORCH_Y + 28} width={right - left + 16} height={26} rx={6} fill="none" stroke="#A86F43" strokeWidth={4} />
    </>
  );
};

/**
 * The wooden door panel, swinging inwards on its left hinge as `open` goes from 0 to 1: it gets narrower and
 * its free edge shorter, as seen at an angle.
 */
export const FrontDoor: React.FC<{ open: number }> = ({ open }) => {
  const { left, right, top, bottom, handle } = FRONT_DOOR;
  const width = (right - left) * (1 - 0.82 * open);
  const tilt = 26 * open;
  const edge = left + width;
  const panel = `M${left} ${top} L${edge} ${top + tilt} L${edge} ${bottom - tilt} L${left} ${bottom} Z`;
  const inset = (y0: number, y1: number) =>
    `M${left + width * 0.16} ${y0 + tilt * 0.3} L${left + width * 0.84} ${y0 + tilt * 0.8} L${left + width * 0.84} ${y1 - tilt * 0.8} L${left + width * 0.16} ${y1 - tilt * 0.3} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0, width: W, height: H, overflow: 'visible', pointerEvents: 'none' }}>
      <path d={panel} fill="#9A6440" stroke="#7A4A2C" strokeWidth={4} strokeLinejoin="round" />
      <path d={inset(top + 50, top + 190)} fill="#AD7450" />
      <path d={inset(top + 230, bottom - 50)} fill="#AD7450" />
      {open < 0.6 ? <circle cx={left + (handle.x - left) * (width / (right - left))} cy={handle.y} r={11} fill="#E8C35A" stroke="#B38A2E" strokeWidth={3} /> : null}
    </svg>
  );
};
