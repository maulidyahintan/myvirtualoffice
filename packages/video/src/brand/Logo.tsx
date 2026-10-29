import React, { useId } from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { fontJudul } from '../theme';

// Logo channel: bulan sabit tersenyum + tulisan "Tasnie" warna-warni.
// Dipakai di intro/outro video, avatar, dan banner YouTube.

export const WARNA_BRAND = {
  navy: '#24305E',
  pink: '#F07AA0',
  hijau: '#3FAE9A',
  emas: '#F5B83D',
  biru: '#4F86C6',
  krem: '#FFF8EC',
};

const WARNA_HURUF = [WARNA_BRAND.navy, WARNA_BRAND.pink, WARNA_BRAND.hijau, WARNA_BRAND.emas, WARNA_BRAND.biru, WARNA_BRAND.pink];

/** Ikon bulan sabit tersenyum dengan bintang. viewBox 200x200. */
export const IkonBulan: React.FC<{ ukuran: number; animasi?: boolean }> = ({ ukuran, animasi }) => {
  const id = useId().replace(/:/g, '');
  const frame = useCurrentFrame();
  const goyang = animasi ? Math.sin(frame / 20) * 4 : 0;
  const kilau = animasi ? 0.85 + Math.sin(frame / 10) * 0.15 : 1;
  return (
    <svg viewBox="0 0 200 200" width={ukuran} height={ukuran} style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id={`emas-${id}`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#FFE9A3" />
          <stop offset="0.55" stopColor="#FFCB4F" />
          <stop offset="1" stopColor="#F2A12E" />
        </radialGradient>
        <mask id={`sabit-${id}`}>
          <rect width={200} height={200} fill="white" />
          <circle cx={138} cy={78} r={62} fill="black" />
        </mask>
        <radialGradient id={`pipi-${id}`}>
          <stop offset="0" stopColor="#FF7F86" stopOpacity="0.7" />
          <stop offset="1" stopColor="#FF7F86" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g transform={`rotate(${goyang} 100 100)`}>
        {/* bayangan lembut */}
        <circle cx={100} cy={106} r={82} fill="#000" opacity={0.08} mask={`url(#sabit-${id})`} />
        <circle cx={100} cy={100} r={82} fill={`url(#emas-${id})`} mask={`url(#sabit-${id})`} />
        {/* kilau */}
        <path d="M40 70 Q50 40 82 28" stroke="#FFFFFF" strokeWidth={9} fill="none" strokeLinecap="round" opacity={0.55} mask={`url(#sabit-${id})`} />
        {/* wajah tersenyum */}
        <path d="M38 112 q8 -9 16 0" stroke="#5A3A20" strokeWidth={5} fill="none" strokeLinecap="round" />
        <path d="M64 120 q8 -9 16 0" stroke="#5A3A20" strokeWidth={5} fill="none" strokeLinecap="round" />
        <ellipse cx={40} cy={130} rx={11} ry={8} fill={`url(#pipi-${id})`} />
        <ellipse cx={82} cy={138} rx={11} ry={8} fill={`url(#pipi-${id})`} />
        <path d="M52 134 q10 12 22 2" stroke="#5A3A20" strokeWidth={5} fill="none" strokeLinecap="round" />
      </g>
      {/* bintang di pelukan bulan */}
      <g transform={`translate(142 92) scale(${kilau}) rotate(${goyang * 2})`}>
        <path
          d="M0 -30 L8 -9 L30 -8 L13 6 L19 28 L0 16 L-19 28 L-13 6 L-30 -8 L-8 -9 Z"
          fill={WARNA_BRAND.pink}
          stroke="#FFFFFF"
          strokeWidth={5}
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};

/** Tulisan "Tasnie" warna-warni dengan tepi putih. Bisa memantul huruf demi huruf. */
export const TulisanLogo: React.FC<{ tinggi: number; teks?: string; animasi?: boolean; mulai?: number }> = ({
  tinggi,
  teks = 'Tasnie',
  animasi,
  mulai = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', fontFamily: fontJudul, fontWeight: 700, fontSize: tinggi, lineHeight: 1 }}>
      {teks.split('').map((h, i) => {
        const s = animasi ? spring({ frame: frame - mulai - i * 3, fps, config: { damping: 9, stiffness: 170 } }) : 1;
        const ayun = animasi ? Math.sin(frame / 14 + i * 0.9) * 3 : 0;
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              color: WARNA_HURUF[i % WARNA_HURUF.length],
              WebkitTextStroke: `${tinggi * 0.09}px #FFFFFF`,
              paintOrder: 'stroke',
              textShadow: `0 ${tinggi * 0.06}px 0 rgba(36,48,94,0.18)`,
              transform: `translateY(${(1 - s) * -tinggi * 0.9 + ayun}px) rotate(${(i % 2 ? 1 : -1) * 3}deg)`,
              opacity: Math.min(1, s * 2),
              marginLeft: i ? -tinggi * 0.02 : 0,
            }}
          >
            {h}
          </span>
        );
      })}
    </div>
  );
};

/** Logo lengkap: ikon di kiri, tulisan di kanan. */
export const Logo: React.FC<{ tinggi: number; animasi?: boolean; mulai?: number; teks?: string }> = ({ tinggi, animasi, mulai = 0, teks }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = animasi ? spring({ frame: frame - mulai, fps, config: { damping: 10, stiffness: 120 } }) : 1;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: tinggi * 0.08 }}>
      <div style={{ transform: `scale(${s}) rotate(${(1 - s) * -90}deg)` }}>
        <IkonBulan ukuran={tinggi * 1.25} animasi={animasi} />
      </div>
      <TulisanLogo tinggi={tinggi} animasi={animasi} mulai={mulai + 6} teks={teks} />
    </div>
  );
};
