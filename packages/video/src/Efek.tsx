import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Expression } from '@kantor/shared/types';
import { fontJudul, warna } from './theme';

// Efek kecil di atas kepala karakter supaya emosi terbaca anak-anak.
// Semua gerak pelan & lembut (pedoman: tidak overstimulating).

const Hati: React.FC<{ warnaIsi: string }> = ({ warnaIsi }) => (
  <path d="M0 6 C-10 -4 -22 4 -12 16 L0 28 L12 16 C22 4 10 -4 0 6 Z" fill={warnaIsi} />
);

const Kilau: React.FC<{ r: number; warnaIsi: string }> = ({ r, warnaIsi }) => (
  <path d={`M0 ${-r} Q${r * 0.2} ${-r * 0.2} ${r} 0 Q${r * 0.2} ${r * 0.2} 0 ${r} Q${-r * 0.2} ${r * 0.2} ${-r} 0 Q${-r * 0.2} ${-r * 0.2} 0 ${-r} Z`} fill={warnaIsi} />
);

export const EfekEkspresi: React.FC<{ expression: Expression; x: number; y: number; mulai?: number }> = ({ expression, x, y, mulai = 0 }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame() - mulai;
  if (frame < 0) return null;

  let isi: React.ReactNode = null;
  if (expression === 'happy') {
    isi = [0, 1, 2].map((i) => {
      const p = ((frame + i * 26) % 78) / 78;
      const op = Math.sin(p * Math.PI);
      return (
        <g key={i} transform={`translate(${(i - 1) * 46 + Math.sin(frame / 12 + i) * 10} ${-p * 130}) scale(${0.7 + op * 0.4})`} opacity={op}>
          {i === 1 ? <Kilau r={16} warnaIsi={warna.emas} /> : <Hati warnaIsi="#F27BA0" />}
        </g>
      );
    });
  } else if (expression === 'surprised') {
    const s = spring({ frame, fps, config: { damping: 8, stiffness: 180 } });
    const goyang = Math.sin(frame / 4) * 6 * Math.max(0, 1 - frame / 40);
    isi = (
      <g transform={`scale(${s}) rotate(${goyang})`}>
        {[-50, -20, 20, 50].map((a) => (
          <line key={a} x1={0} y1={-56} x2={0} y2={-80} transform={`rotate(${a} 0 0)`} stroke={warna.emas} strokeWidth={7} strokeLinecap="round" />
        ))}
        <text x={0} y={10} textAnchor="middle" fontFamily={fontJudul} fontWeight={700} fontSize={78} fill="#F06A5A" stroke="#fff" strokeWidth={6} paintOrder="stroke">
          !
        </text>
      </g>
    );
  } else if (expression === 'thinking') {
    const muncul = (i: number) => spring({ frame: frame - i * 10, fps, config: { damping: 12 } });
    isi = (
      <g>
        <circle cx={-34} cy={30} r={7 * muncul(0)} fill="#fff" stroke="#B9C4D6" strokeWidth={3} />
        <circle cx={-18} cy={4} r={11 * muncul(1)} fill="#fff" stroke="#B9C4D6" strokeWidth={3} />
        <g transform={`translate(18 -46) scale(${muncul(2)}) rotate(${Math.sin(frame / 10) * 8})`}>
          <ellipse cx={0} cy={0} rx={44} ry={36} fill="#fff" stroke="#B9C4D6" strokeWidth={3} />
          <text x={0} y={20} textAnchor="middle" fontFamily={fontJudul} fontWeight={700} fontSize={56} fill="#5B7FC7">
            ?
          </text>
        </g>
      </g>
    );
  } else if (expression === 'sad') {
    const p = (frame % 70) / 70;
    isi = (
      <g transform={`translate(44 ${30 + p * 26})`} opacity={Math.sin(p * Math.PI)}>
        <path d="M0 -16 Q12 2 0 10 Q-12 2 0 -16 Z" fill="#8EC5F0" stroke="#fff" strokeWidth={3} />
      </g>
    );
  } else {
    isi = [0, 1, 2, 3].map((i) => {
      const op = 0.5 + 0.5 * Math.sin(frame / 14 + i * 1.7);
      return (
        <g key={i} transform={`translate(${Math.cos(i * 1.6) * 70} ${Math.sin(i * 1.6) * 30 - 20}) scale(${0.6 + op * 0.4})`} opacity={op}>
          <Kilau r={12} warnaIsi="#FFE9A0" />
        </g>
      );
    });
  }

  return (
    <svg style={{ position: 'absolute', left: x, top: y, overflow: 'visible', width: 1, height: 1 }}>
      {isi}
    </svg>
  );
};
