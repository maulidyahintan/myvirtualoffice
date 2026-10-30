import React from 'react';
import type { PoseLengan } from './gerak';

/**
 * Lengan dua ruas (lengan atas + lengan bawah) dengan tangan.
 * Digambar menggantung ke bawah dari titik bahu (x, y). Lengan kanan layar
 * memakai `cermin`, sehingga sudut positif selalu berarti "menjauh dari badan".
 */
export const Lengan: React.FC<{
  x: number;
  y: number;
  cermin?: boolean;
  pose: PoseLengan;
  atas: number;
  bawah: number;
  tebal: number;
  warnaAtas: string;
  warnaBawah: string;
  warnaTangan: string;
  garis: string;
  /** lengan baju pendek yang menutup sebagian lengan atas */
  lenganBaju?: { panjang: number; warna: string; garis: string };
  /** manset di ujung lengan bawah */
  manset?: string;
  /** benda di genggaman (digambar tegak, tidak ikut berputar bersama lengan) */
  pegang?: React.ReactNode;
}> = ({ x, y, cermin, pose, atas, bawah, tebal, warnaAtas, warnaBawah, warnaTangan, garis, lenganBaju, manset, pegang }) => {
  const t2 = tebal / 2;
  const tb = tebal * 0.88;
  const rTangan = tebal * 0.58;
  return (
    <g transform={`translate(${x} ${y}) scale(${cermin ? -1 : 1} 1) rotate(${pose.bahu})`}>
      <rect x={-t2} y={-t2} width={tebal} height={atas + t2} rx={t2} fill={warnaAtas} stroke={garis} strokeWidth={2.5} />
      <g transform={`translate(0 ${atas}) rotate(${pose.siku})`}>
        <rect x={-tb / 2} y={-tb / 2} width={tb} height={bawah + tb / 2} rx={tb / 2} fill={warnaBawah} stroke={garis} strokeWidth={2.5} />
        {manset ? <rect x={-tb / 2 - 1} y={bawah - 9} width={tb + 2} height={9} rx={4} fill={manset} /> : null}
        {/* tangan + ibu jari */}
        <ellipse cx={tebal * 0.32} cy={bawah + rTangan * 0.2} rx={rTangan * 0.42} ry={rTangan * 0.6} fill={warnaTangan} stroke={garis} strokeWidth={2} transform={`rotate(-25 ${tebal * 0.32} ${bawah})`} />
        <ellipse cx={0} cy={bawah + rTangan * 0.55} rx={rTangan * 0.92} ry={rTangan} fill={warnaTangan} stroke={garis} strokeWidth={2.5} />
        {pegang ? (
          // benda di depan telapak, tetap tegak walau lengan berputar
          <g transform={`translate(0 ${bawah + rTangan * 0.3}) rotate(${-(pose.bahu + pose.siku)}) scale(${cermin ? -1 : 1} 1)`}>{pegang}</g>
        ) : null}
      </g>
      {lenganBaju ? (
        <path
          d={`M${-t2 - 3} ${-t2 + 2} Q${-t2 - 7} ${lenganBaju.panjang * 0.6} ${-t2 - 5} ${lenganBaju.panjang} Q0 ${lenganBaju.panjang + 5} ${t2 + 5} ${lenganBaju.panjang} Q${t2 + 7} ${lenganBaju.panjang * 0.6} ${t2 + 3} ${-t2 + 2} Q0 ${-t2 - 8} ${-t2 - 3} ${-t2 + 2} Z`}
          fill={lenganBaju.warna}
          stroke={lenganBaju.garis}
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
      ) : null}
    </g>
  );
};
