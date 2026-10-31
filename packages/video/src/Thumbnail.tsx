import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { ThumbnailProps } from '@kantor/shared/types';
import { Backdrop, DARK_BACKGROUNDS } from './backgrounds/Backdrop';
import { CharacterFigure, CHARACTER_SCALE } from './characters/CharacterFigure';
import { titleFont } from './theme';

// 1280x720. Teks besar di kiri, characters di kanan. Jujur: tidak ada efek clickbait.
export const Thumbnail: React.FC<ThumbnailProps> = ({ text, subtitle, background, characters, expression }) => {
  const gelap = DARK_BACKGROUNDS.includes(background);
  const tampil = characters.filter((id) => id in CHARACTER_SCALE).slice(0, 2);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: 'scale(1.15)', transformOrigin: '70% 60%' }}>
        <Backdrop id={background} />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background: gelap
            ? 'linear-gradient(90deg, rgba(10,12,40,0.75) 0%, rgba(10,12,40,0) 60%)'
            : 'linear-gradient(90deg, rgba(255,251,242,0.9) 0%, rgba(255,251,242,0) 60%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 56,
          top: 0,
          bottom: 0,
          width: 640,
          display: 'flex',
          alignItems: 'center',
          fontFamily: titleFont,
          fontWeight: 700,
          fontSize: 104,
          lineHeight: 1.02,
          color: gelap ? '#FFF3C4' : '#2E2A3B',
          WebkitTextStroke: gelap ? '0' : '2px #ffffff',
        }}
      >
        <div>
          {subtitle ? (
            <div style={{ fontSize: 46, color: gelap ? '#FFE9A0' : '#2F6F5E', marginBottom: 10 }}>{subtitle}</div>
          ) : null}
          {text}
        </div>
      </div>
      {tampil.map((id, i) => {
        const tinggi = 520 * CHARACTER_SCALE[id];
        return (
          <div key={id} style={{ position: 'absolute', left: 700 + i * 260, top: 700 - tinggi }}>
            <CharacterFigure id={id} expression={expression} bicara={false} tinggi={tinggi} offset={i * 30} diam />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
