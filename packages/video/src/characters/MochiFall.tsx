import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { CharacterFigure } from './CharacterFigure';
import { LANDING_FRAME, PILLOW_HIT_FRAME, fallPose, headTop, type Point } from './fallMotion';

const STAGE_WIDTH = 1920;
const STAGE_HEIGHT = 1080;
const SOUND_WORD_FRAMES = 24;
const DUST_FRAMES = 22;
const PILLOW_SCALE = 0.8;

/** Small cushion, centred on 0,0. */
const Pillow: React.FC = () => (
  <g>
    <rect x={-70} y={-34} width={140} height={68} rx={30} fill="#F6EEDC" stroke="#D9C9A6" strokeWidth={4} />
    <path d="M-48 -10 Q0 6 48 -10" stroke="#E2D3B2" strokeWidth={4} fill="none" strokeLinecap="round" />
    <circle cx={-66} cy={-30} r={7} fill="#F6EEDC" stroke="#D9C9A6" strokeWidth={3} />
    <circle cx={66} cy={-30} r={7} fill="#F6EEDC" stroke="#D9C9A6" strokeWidth={3} />
  </g>
);

/** Comic sound word that pops up briefly ("Buk!"). `elapsed` = frames since it appeared. */
const SoundWord: React.FC<{ text: string; x: number; y: number; elapsed: number }> = ({ text, x, y, elapsed }) => {
  if (elapsed < 0 || elapsed > SOUND_WORD_FRAMES) return null;
  const scale = interpolate(elapsed, [0, 6, SOUND_WORD_FRAMES], [0.4, 1.15, 1], { extrapolateRight: 'clamp' });
  const opacity = interpolate(elapsed, [0, 3, 18, SOUND_WORD_FRAMES], [0, 1, 1, 0]);
  return (
    <text
      x={x}
      y={y}
      transform={`translate(${x} ${y}) scale(${scale}) translate(${-x} ${-y})`}
      textAnchor="middle"
      fontFamily="Fredoka, sans-serif"
      fontWeight={700}
      fontSize={54}
      fill="#FFE07A"
      stroke="#5A3A2A"
      strokeWidth={6}
      paintOrder="stroke"
      opacity={opacity}
    >
      {text}
    </text>
  );
};

/** Little stars circling above the head of a dazed character. */
const DizzyStars: React.FC<{ x: number; y: number; frame: number }> = ({ x, y, frame }) => (
  <g>
    {[0, 1, 2].map((i) => {
      const angle = frame / 9 + (i * Math.PI * 2) / 3;
      return (
        <path
          key={i}
          transform={`translate(${x + Math.cos(angle) * 62} ${y + Math.sin(angle) * 16}) scale(${0.8 + Math.sin(angle) * 0.2})`}
          d="M0 -14 L4 -4 L14 -4 L6 3 L9 13 L0 7 L-9 13 L-6 3 L-14 -4 L-4 -4 Z"
          fill="#FFE07A"
          stroke="#C9962E"
          strokeWidth={2}
        />
      );
    })}
  </g>
);

/** Dust puffs on both sides of the landing spot. */
const LandingDust: React.FC<{ at: Point; elapsed: number }> = ({ at, elapsed }) => {
  if (elapsed < 0 || elapsed >= DUST_FRAMES) return null;
  const progress = elapsed / DUST_FRAMES;
  return (
    <>
      {[-1, 1].map((side) => (
        <circle key={side} cx={at.x + side * (40 + progress * 90)} cy={at.y - 10 - progress * 20} r={14 + progress * 18} fill="#E6DCCB" opacity={0.6 * (1 - progress)} />
      ))}
    </>
  );
};

/**
 * Mochi asleep at the foot of the bed (or awake on the bed, startled) is hit by a falling pillow, tumbles to the floor in front of the bed
 * and sits there dizzy with the pillow on its head. Drawn in stage coordinates on the background plane, so
 * the bed and Mochi move together with the camera. `start` = frame the pillow starts to drop.
 */
export const MochiFall: React.FC<{ height: number; from: Point; to: Point; start: number; awake?: boolean }> = ({ height, from, to, start, awake = false }) => {
  const frame = useCurrentFrame();
  const elapsed = frame - start;
  const width = (height * 240) / 400;
  const { mochi, pillow, dizzy } = fallPose(elapsed, from, to, height, awake);

  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: mochi.x - width / 2,
          top: mochi.y - height,
          width,
          height,
          transformOrigin: '50% 75%',
          transform: `rotate(${mochi.rotation}deg) scale(${mochi.scaleX}, ${mochi.scaleY})`,
        }}
      >
        <CharacterFigure
          id="mochi"
          expression={mochi.expression}
          bicara={false}
          tinggi={height}
          offset={37}
          masuk="ada"
          action={mochi.asleep ? 'sleeping' : undefined}
        />
      </div>
      <svg
        viewBox={`0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}`}
        style={{ position: 'absolute', left: 0, top: 0, width: STAGE_WIDTH, height: STAGE_HEIGHT, overflow: 'visible', pointerEvents: 'none' }}
      >
        {pillow.visible ? (
          <g transform={`translate(${pillow.x} ${pillow.y}) rotate(${pillow.rotation}) scale(${PILLOW_SCALE})`}>
            <Pillow />
          </g>
        ) : null}
        <SoundWord text="Buk!" x={from.x + 70} y={from.y - height * 0.32 - 40} elapsed={elapsed - PILLOW_HIT_FRAME} />
        <SoundWord text="Gedebuk!" x={to.x + 150} y={to.y - height * 0.75} elapsed={elapsed - LANDING_FRAME} />
        <LandingDust at={to} elapsed={elapsed - LANDING_FRAME} />
        {dizzy ? <DizzyStars x={to.x} y={headTop(to.y, height, mochi.scaleY) - 34} frame={frame} /> : null}
      </svg>
    </>
  );
};
