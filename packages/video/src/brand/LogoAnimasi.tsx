import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { Logo, WARNA_BRAND } from './Logo';

/** Animasi logo 3 detik, bisa dipakai sebagai pembuka video atau Shorts. */
export const LogoAnimasi: React.FC = () => {
  const frame = useCurrentFrame();
  const keluar = interpolate(frame, [75, 90], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 45%, ${WARNA_BRAND.krem} 0%, #FFE0EA 70%, #F7B9CD 100%)`,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: keluar,
      }}
    >
      <Logo tinggi={220} animasi mulai={4} />
    </AbsoluteFill>
  );
};
