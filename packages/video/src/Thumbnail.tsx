import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import type { ThumbnailProps } from '@kantor/shared/types';
import { Backdrop, DARK_BACKGROUNDS } from './backgrounds/Backdrop';
import { CharacterFigure, CHARACTER_SCALE } from './characters/CharacterFigure';
import { titleFont, textFont } from './theme';

// 1280x720. Teks besar di satu sisi, tokoh di sisi lain; label & warna aksen menandai playlist.
// Jujur: tidak ada efek clickbait.
export const Thumbnail: React.FC<ThumbnailProps> = ({
  text,
  subtitle,
  background,
  characters,
  expression,
  illustration,
  badge,
  accent = '#2F6F5E',
  mirror = false,
}) => {
  // an illustration is treated as a light picture (soft pastel style)
  const gelap = !illustration && DARK_BACKGROUNDS.includes(background);
  const tampil = characters.filter((id) => id in CHARACTER_SCALE).slice(0, 2);
  const sisiTeks = mirror ? { right: 56 } : { left: 56 };
  const arahTerang = mirror ? '270deg' : '90deg';
  // characters packed against the outer edge (40px margin, slight overlap) so the tallest one is never cut off
  const lebar = tampil.map((id) => (520 * CHARACTER_SCALE[id] * 240) / 400);
  const rapat = 30;
  const total = lebar.reduce((a, b) => a + b, 0) - rapat * Math.max(0, lebar.length - 1);
  let mulai = mirror ? 40 : 1280 - 40 - total;
  const posisiTokoh = lebar.map((w) => {
    const x = mulai;
    mulai += w - rapat;
    return x;
  });
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: 'scale(1.15)', transformOrigin: mirror ? '30% 60%' : '70% 60%' }}>
        {illustration ? (
          <Img src={staticFile(illustration)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Backdrop id={background} />
        )}
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background: gelap
            ? `linear-gradient(${arahTerang}, rgba(10,12,40,0.78) 0%, rgba(10,12,40,0) 62%)`
            : `linear-gradient(${arahTerang}, rgba(255,251,242,0.92) 0%, rgba(255,251,242,0) 62%)`,
        }}
      />
      {/* garis aksen playlist di bawah */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 18, background: accent }} />
      <div
        style={{
          position: 'absolute',
          ...sisiTeks,
          top: 0,
          bottom: 18,
          width: 640,
          display: 'flex',
          alignItems: 'center',
          justifyContent: mirror ? 'flex-end' : 'flex-start',
          textAlign: mirror ? 'right' : 'left',
          fontFamily: titleFont,
          fontWeight: 700,
          fontSize: 100,
          lineHeight: 1.02,
          color: gelap ? '#FFF3C4' : '#2E2A3B',
          WebkitTextStroke: gelap ? '0' : '2px #ffffff',
        }}
      >
        <div>
          {badge ? (
            <div
              style={{
                display: 'inline-block',
                marginBottom: 18,
                padding: '10px 22px',
                borderRadius: 999,
                background: accent,
                color: '#fff',
                fontFamily: textFont,
                fontWeight: 800,
                fontSize: 30,
                letterSpacing: 1,
                WebkitTextStroke: '0',
                boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
              }}
            >
              {badge}
            </div>
          ) : null}
          {subtitle ? <div style={{ fontSize: 46, color: gelap ? '#FFE9A0' : accent, marginBottom: 10 }}>{subtitle}</div> : null}
          <div>{text}</div>
        </div>
      </div>
      {tampil.map((id, i) => {
        const tinggi = 520 * CHARACTER_SCALE[id];
        const x = posisiTokoh[i];
        return (
          <div key={id} style={{ position: 'absolute', left: x, top: 702 - tinggi }}>
            <CharacterFigure id={id} expression={expression} bicara={false} tinggi={tinggi} offset={i * 30} lihatX={mirror ? 1 : -1} diam />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
