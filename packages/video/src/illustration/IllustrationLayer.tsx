// An AI picture laid over the animated scene: it alternates with the characters (cross-fading), moves with a
// different camera move each time it comes back, and has moving weather that matches what it shows.
import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { random } from '../characters/motion';
import { ambienceFor, illustrationCuts, pictureMove, type Ambience } from './illustrationPlan';

/** Frames to cross-fade between the picture and the animated characters. */
const CROSS_FADE_FRAMES = 10;
const RAIN_DROPS = 70;
const LEAVES = 9;
const STARS = 26;
const MOTES = 18;

const Weather: React.FC<{ kind: Ambience; frame: number }> = ({ kind, frame }) => {
  switch (kind) {
    case 'rain':
      return (
        <g stroke="#DCE8FF" strokeWidth={3} strokeLinecap="round" opacity={0.55}>
          {Array.from({ length: RAIN_DROPS }, (_, i) => {
            const x = random(i) * 1960 - 20;
            const y = ((random(i + 99) * 1080 + frame * (26 + random(i + 7) * 10)) % 1180) - 100;
            return <line key={i} x1={x} y1={y} x2={x - 8} y2={y + 34} />;
          })}
        </g>
      );
    case 'leaves':
      return (
        <g>
          {Array.from({ length: LEAVES }, (_, i) => {
            const y = ((random(i + 5) * 1080 + frame * (1.6 + random(i) * 1.2)) % 1200) - 60;
            const x = random(i + 11) * 1920 + Math.sin(frame / 25 + i) * 50;
            return <ellipse key={i} cx={x} cy={y} rx={14} ry={7} fill={i % 2 ? '#8FC46A' : '#E3A548'} opacity={0.75} transform={`rotate(${frame * 2 + i * 40} ${x} ${y})`} />;
          })}
        </g>
      );
    case 'stars':
      return (
        <g fill="#FFF6C8">
          {Array.from({ length: STARS }, (_, i) => (
            <circle key={i} cx={random(i + 3) * 1920} cy={random(i + 31) * 520} r={2 + random(i) * 3} opacity={0.3 + 0.6 * Math.max(0, Math.sin(frame / 12 + i * 1.7))} />
          ))}
        </g>
      );
    case 'sunrays':
      return (
        <g opacity={0.16 + Math.sin(frame / 50) * 0.05}>
          {[0, 1, 2, 3].map((i) => (
            <path key={i} d={`M${120 + i * 90} -40 L${520 + i * 260} 1120 L${380 + i * 260} 1120 Z`} fill="#FFF1C2" />
          ))}
        </g>
      );
    default:
      return (
        <g fill="#FFFFFF">
          {Array.from({ length: MOTES }, (_, i) => {
            const y = 1080 - ((random(i + 41) * 1080 + frame * (0.6 + random(i) * 0.6)) % 1140);
            const x = random(i + 17) * 1920 + Math.sin(frame / 40 + i) * 30;
            return <circle key={i} cx={x} cy={y} r={2.5 + random(i + 2) * 3} opacity={0.25 + 0.25 * Math.sin(frame / 20 + i)} />;
          })}
        </g>
      );
  }
};

export const IllustrationLayer: React.FC<{ image: string; prompt: string; duration: number; hasCharacters: boolean }> = ({
  image,
  prompt,
  duration,
  hasCharacters,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cuts = illustrationCuts(duration, fps, hasCharacters);
  const cut = cuts.find((c) => frame >= c.start && frame < c.end) ?? cuts[cuts.length - 1];
  const pictureCut = cut.kind === 'illustration' ? cut : cuts.find((c) => c.kind === 'illustration' && c.start >= cut.end) ?? cut;
  // cross-fade at the edges of a picture stretch (the first stretch starts fully visible)
  const fadeIn = cut.start === 0 ? 1 : interpolate(frame - cut.start, [0, CROSS_FADE_FRAMES], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = cut.end >= duration ? 1 : interpolate(cut.end - frame, [0, CROSS_FADE_FRAMES], [0, 1], { extrapolateRight: 'clamp' });
  const visible = cut.kind === 'illustration' ? Math.min(fadeIn, fadeOut) : 0;
  if (visible <= 0) return null;

  const move = pictureMove(pictureCut.move);
  const t = interpolate(frame, [pictureCut.start, pictureCut.end], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.sin) });
  const lerp = ([a, b]: [number, number]) => a + (b - a) * t;
  const glow = 0.06 + Math.sin(frame / 40) * 0.03;
  return (
    <AbsoluteFill style={{ opacity: visible, overflow: 'hidden', backgroundColor: '#000' }}>
      <AbsoluteFill style={{ transform: `scale(${lerp(move.z)}) translate(${lerp(move.x)}%, ${lerp(move.y)}%)` }}>
        <Img src={staticFile(image)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 35% 25%, rgba(255,240,200,${glow}) 0%, transparent 60%)` }} />
      <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {ambienceFor(prompt).map((kind) => (
          <Weather key={kind} kind={kind} frame={frame} />
        ))}
      </svg>
    </AbsoluteFill>
  );
};
