import React from 'react';
import type { Benda as BendaId, Properti as PropertiId } from '@kantor/shared/types';
import { warna } from '../theme';

// Gambar benda & properti. Setiap gambar berpusat di (0,0) dengan alas di y = 0 untuk properti
// lantai (`Properti`), atau berpusat di genggaman untuk benda yang dipegang (`Benda`).
// Ukuran dasar benda ±60 unit (sebesar dua kepalan tangan Mamas di koordinat karakter 240x400).

const G = 'rgba(80, 50, 40, 0.35)';

/** Mushaf Al-Qur'an. `buka` = terbuka (sedang dibaca). */
export const Quran: React.FC<{ buka?: boolean; lebar?: number }> = ({ buka, lebar = 70 }) =>
  buka ? (
    <g>
      <path d={`M${-lebar / 2 - 4} -24 Q0 -30 ${lebar / 2 + 4} -24 L${lebar / 2 + 4} 22 Q0 16 ${-lebar / 2 - 4} 22 Z`} fill="#2F6F5E" />
      <path d={`M0 -26 Q${-lebar / 4} -30 ${-lebar / 2} -24 L${-lebar / 2} 18 Q${-lebar / 4} 12 0 16 Z`} fill="#FFFBF0" stroke={G} strokeWidth={1.5} />
      <path d={`M0 -26 Q${lebar / 4} -30 ${lebar / 2} -24 L${lebar / 2} 18 Q${lebar / 4} 12 0 16 Z`} fill="#FFFBF0" stroke={G} strokeWidth={1.5} />
      {[-14, -6, 2, 10].map((y) => (
        <g key={y}>
          <path d={`M${-lebar / 2 + 6} ${y} q8 -3 ${lebar / 2 - 12} 0`} stroke="#7A6A5A" strokeWidth={1.6} fill="none" opacity={0.6} />
          <path d={`M6 ${y} q8 -3 ${lebar / 2 - 12} 0`} stroke="#7A6A5A" strokeWidth={1.6} fill="none" opacity={0.6} />
        </g>
      ))}
      <line x1={0} y1={-26} x2={0} y2={16} stroke="#C9B48A" strokeWidth={1.5} />
    </g>
  ) : (
    <g>
      <rect x={-20} y={-27} width={40} height={54} rx={4} fill="#2F6F5E" stroke="#1F5546" strokeWidth={2} />
      <rect x={16} y={-25} width={5} height={50} rx={2} fill="#FFFBF0" />
      <rect x={-14} y={-21} width={28} height={42} rx={3} fill="none" stroke={warna.emas} strokeWidth={2} />
      <path d="M0 -10 l8 8 l-8 8 l-8 -8 Z" fill={warna.emas} />
    </g>
  );

export const Benda: React.FC<{ id: BendaId; skala?: number }> = ({ id, skala = 1 }) => (
  <g transform={`scale(${skala})`}>
    {id === 'quran' && <Quran />}
    {id === 'apel' && (
      <g>
        <circle cx={-7} cy={2} r={15} fill="#E0504A" />
        <circle cx={7} cy={2} r={15} fill="#E0504A" />
        <ellipse cx={-8} cy={-4} rx={5} ry={7} fill="#fff" opacity={0.35} />
        <path d="M0 -12 q2 -8 6 -10" stroke="#6B4A2E" strokeWidth={3} fill="none" strokeLinecap="round" />
        <path d="M3 -16 q10 -8 16 -2 q-8 6 -16 2 Z" fill="#5FA35A" />
      </g>
    )}
    {id === 'pisang' && (
      <g>
        <path d="M-22 -8 Q-10 22 22 10 Q26 4 20 4 Q-6 12 -14 -12 Z" fill="#F5D547" stroke="#C9A62A" strokeWidth={2} strokeLinejoin="round" />
        <path d="M-22 -8 l-4 -6" stroke="#6B4A2E" strokeWidth={4} strokeLinecap="round" />
      </g>
    )}
    {id === 'kurma' && (
      <g>
        {[-10, 2, 12].map((x, i) => (
          <ellipse key={x} cx={x} cy={i === 1 ? -6 : 2} rx={7} ry={11} fill="#7A3E22" stroke="#5A2A14" strokeWidth={1.5} transform={`rotate(${(i - 1) * 25} ${x} 0)`} />
        ))}
      </g>
    )}
    {id === 'kue' && (
      <g>
        <path d="M-20 14 L-20 -4 L20 -4 L20 14 Z" fill="#F2C48D" stroke="#C9965A" strokeWidth={2} />
        <path d="M-22 -4 Q-14 -16 0 -14 Q14 -16 22 -4 Z" fill="#F7A6C1" />
        <circle cx={0} cy={-16} r={5} fill="#E0504A" />
        <path d="M-20 4 L20 4" stroke="#C9965A" strokeWidth={2} />
      </g>
    )}
    {id === 'gelas-susu' && (
      <g>
        <path d="M-13 -20 L13 -20 L10 20 L-10 20 Z" fill="#E8F4FA" stroke="#9FC4D6" strokeWidth={2} />
        <path d="M-12 -8 L12 -8 L10 18 L-10 18 Z" fill="#FFFFFF" />
        <ellipse cx={0} cy={-8} rx={12} ry={3} fill="#F4F4F0" />
      </g>
    )}
    {id === 'bola' && (
      <g>
        <circle r={20} fill="#F28C6B" />
        <path d="M-20 0 Q0 -12 20 0" stroke="#FFFFFF" strokeWidth={5} fill="none" />
        <path d="M0 -20 Q-10 0 0 20" stroke="#FFD36E" strokeWidth={5} fill="none" />
        <ellipse cx={-7} cy={-8} rx={6} ry={4} fill="#fff" opacity={0.4} />
      </g>
    )}
    {id === 'mobil-mainan' && (
      <g>
        <path d="M-26 6 L-26 -4 Q-24 -10 -14 -10 L-8 -20 L10 -20 L18 -10 Q26 -10 26 -2 L26 6 Z" fill="#4F8FD9" stroke="#3A6EAE" strokeWidth={2} strokeLinejoin="round" />
        <path d="M-6 -17 L8 -17 L13 -10 L-10 -10 Z" fill="#BFE3F5" />
        {[-14, 14].map((x) => (
          <g key={x}>
            <circle cx={x} cy={8} r={7} fill="#2E2A3B" />
            <circle cx={x} cy={8} r={3} fill="#C9D3DA" />
          </g>
        ))}
      </g>
    )}
    {id === 'boneka' && (
      <g>
        <circle cx={-12} cy={-20} r={7} fill="#B07E52" />
        <circle cx={12} cy={-20} r={7} fill="#B07E52" />
        <ellipse cx={0} cy={10} rx={16} ry={16} fill="#C8925E" />
        <circle cx={0} cy={-10} r={14} fill="#C8925E" />
        <ellipse cx={0} cy={-6} rx={6} ry={4} fill="#F2D6B0" />
        <circle cx={-5} cy={-13} r={2} fill="#2E2626" />
        <circle cx={5} cy={-13} r={2} fill="#2E2626" />
        <path d="M-8 2 q8 6 16 0" stroke="#E07A9A" strokeWidth={4} fill="none" strokeLinecap="round" />
      </g>
    )}
    {id === 'buku' && (
      <g>
        <rect x={-18} y={-24} width={36} height={48} rx={4} fill="#E8B04A" stroke="#C48E2E" strokeWidth={2} />
        <rect x={14} y={-22} width={5} height={44} rx={2} fill="#FFFBF0" />
        <circle cx={0} cy={-4} r={8} fill="#FFFFFF" opacity={0.8} />
        <rect x={-10} y={8} width={20} height={4} rx={2} fill="#FFFFFF" opacity={0.8} />
      </g>
    )}
    {id === 'bunga' && (
      <g>
        <path d="M0 22 Q-2 6 0 -6" stroke="#4E9A5A" strokeWidth={4} fill="none" />
        <path d="M0 10 q-12 -4 -14 -12 q10 0 14 12" fill="#5FA35A" />
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx={0} cy={-16} rx={6} ry={9} fill="#F7A6C1" transform={`rotate(${a} 0 -8)`} />
        ))}
        <circle cx={0} cy={-8} r={5} fill="#FFD36E" />
      </g>
    )}
  </g>
);

/** Meja kecil rendah tempat makanan & minuman diletakkan. Alas meja di y = 0. */
const MejaKecil: React.FC<{ lebar: number; children: React.ReactNode }> = ({ lebar, children }) => (
  <g>
    <rect x={-lebar / 2 + 14} y={-52} width={14} height={52} rx={4} fill="#9A6B47" />
    <rect x={lebar / 2 - 28} y={-52} width={14} height={52} rx={4} fill="#9A6B47" />
    <rect x={-lebar / 2} y={-64} width={lebar} height={16} rx={6} fill="#B98A5E" />
    <rect x={-lebar / 2} y={-52} width={lebar} height={4} fill="#8A5E3C" opacity={0.6} />
    <g transform="translate(0 -64)">{children}</g>
  </g>
);

const Piring: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <g>
    <ellipse cx={0} cy={-6} rx={46} ry={12} fill="#FFFFFF" stroke="#D8D4CC" strokeWidth={2} />
    <ellipse cx={0} cy={-8} rx={32} ry={7} fill="#F4F1EA" />
    <g transform="translate(0 -14)">{children}</g>
  </g>
);

const MAKANAN: PropertiId[] = ['apel', 'pisang', 'kurma', 'kue', 'gelas-susu', 'piring-buah', 'piring-nasi'];
export const diMeja = (p: PropertiId) => MAKANAN.includes(p);

/** Isi meja makan (dipanggil sekali untuk semua properti makanan sebuah adegan). */
export const MejaMakanan: React.FC<{ isi: PropertiId[] }> = ({ isi }) => {
  const lebar = Math.max(170, isi.length * 100 + 40);
  return (
    <MejaKecil lebar={lebar}>
      {isi.map((p, i) => (
        <g key={p} transform={`translate(${(i - (isi.length - 1) / 2) * 96} 0)`}>
          {p === 'piring-buah' ? (
            <Piring>
              <g transform="translate(-16 -4) scale(0.8)">
                <Benda id="apel" />
              </g>
              <g transform="translate(16 -2) scale(0.8)">
                <Benda id="pisang" />
              </g>
              <g transform="translate(0 -14) scale(0.6)">
                <Benda id="kurma" />
              </g>
            </Piring>
          ) : p === 'piring-nasi' ? (
            <Piring>
              <ellipse cx={-6} cy={-4} rx={22} ry={13} fill="#FFFFFF" stroke="#E6E2D8" strokeWidth={2} />
              <ellipse cx={18} cy={-2} rx={12} ry={7} fill="#E8B04A" />
              <circle cx={16} cy={-6} r={6} fill="#F2E9A0" />
              <path d="M-26 2 q6 -6 14 -2" stroke="#5FA35A" strokeWidth={5} fill="none" strokeLinecap="round" />
            </Piring>
          ) : p === 'kue' || p === 'kurma' ? (
            <Piring>
              <Benda id={p} />
            </Piring>
          ) : (
            <g transform="translate(0 -22)">
              <Benda id={p as BendaId} />
            </g>
          )}
        </g>
      ))}
    </MejaKecil>
  );
};

/** Properti lantai (bukan makanan). Alas di y = 0, ukuran di koordinat panggung 1920x1080. */
export const PropertiLantai: React.FC<{ id: PropertiId; frame: number }> = ({ id, frame }) => {
  switch (id) {
    case 'keranjang-buah':
      return (
        <g transform="scale(1.4)">
          <g transform="translate(-14 -42) scale(0.8)">
            <Benda id="apel" />
          </g>
          <g transform="translate(14 -40) scale(0.8)">
            <Benda id="pisang" />
          </g>
          <g transform="translate(0 -50) scale(0.8)">
            <Benda id="apel" />
          </g>
          <path d="M-42 -36 L42 -36 L32 0 L-32 0 Z" fill="#C8925E" stroke="#9A6B47" strokeWidth={3} />
          {[-24, -8, 8, 24].map((x) => (
            <line key={x} x1={x} y1={-34} x2={x * 0.8} y2={-2} stroke="#9A6B47" strokeWidth={2} />
          ))}
          <path d="M-36 -36 Q0 -86 36 -36" stroke="#9A6B47" strokeWidth={5} fill="none" />
        </g>
      );
    case 'balok-mainan':
      return (
        <g>
          {[
            [-40, -36, '#E0504A'],
            [0, -36, '#4F8FD9'],
            [40, -36, '#F5C842'],
            [-20, -72, '#5BAE7A'],
            [20, -72, '#A06BC8'],
            [0, -108, '#F28C6B'],
          ].map(([x, y, c]) => (
            <g key={`${x}${y}`}>
              <rect x={(x as number) - 18} y={y as number} width={36} height={36} rx={5} fill={c as string} stroke="rgba(0,0,0,0.15)" strokeWidth={2} />
              <circle cx={x as number} cy={(y as number) + 18} r={7} fill="#fff" opacity={0.35} />
            </g>
          ))}
        </g>
      );
    case 'kotak-mainan':
      return (
        <g>
          <g transform="translate(-30 -96) rotate(-15)">
            <Benda id="boneka" skala={1.2} />
          </g>
          <g transform="translate(34 -86) rotate(10)">
            <Benda id="bola" skala={1.1} />
          </g>
          <rect x={-70} y={-70} width={140} height={70} rx={10} fill="#F28C6B" stroke="#C86A4C" strokeWidth={3} />
          <rect x={-70} y={-70} width={140} height={14} rx={6} fill="#FFD36E" />
          <circle cx={0} cy={-30} r={14} fill="#FFFFFF" opacity={0.5} />
        </g>
      );
    case 'pohon-pot': {
      const ayun = Math.sin(frame / 50) * 2;
      return (
        <g>
          <rect x={-10} y={-210} width={20} height={150} fill="#8A6440" />
          <g transform={`rotate(${ayun} 0 -100)`}>
            <circle cx={0} cy={-240} r={80} fill="#5FA35A" />
            <circle cx={-50} cy={-200} r={50} fill="#6DB566" />
            <circle cx={50} cy={-205} r={52} fill="#4F9450" />
            <circle cx={-20} cy={-270} r={30} fill="#7CC46E" opacity={0.7} />
          </g>
          <path d="M-50 -80 L50 -80 L38 0 L-38 0 Z" fill="#C27C5A" stroke="#A0603E" strokeWidth={3} />
          <rect x={-56} y={-90} width={112} height={18} rx={6} fill="#D48D68" />
        </g>
      );
    }
    case 'sajadah':
      // dilihat dari depan-atas: trapesium di lantai
      return (
        <g>
          <path d="M-150 0 L150 0 L110 -60 L-110 -60 Z" fill="#B23A48" />
          <path d="M-132 -6 L132 -6 L100 -54 L-100 -54 Z" fill="none" stroke={warna.emas} strokeWidth={4} />
          <path d="M-30 -54 Q0 -78 30 -54" fill="#8E2A36" stroke={warna.emas} strokeWidth={3} />
          <path d="M0 -40 l14 14 l-14 14 l-14 -14 Z" fill={warna.emas} opacity={0.8} />
          {[-120, -100, -80, 80, 100, 120].map((x) => (
            <line key={x} x1={x} y1={0} x2={x} y2={8} stroke={warna.emas} strokeWidth={3} />
          ))}
        </g>
      );
    case 'rehal-quran':
      return (
        <g transform="scale(1.6)">
          <path d="M-40 0 L0 -40 L40 0" stroke="#8A5E3C" strokeWidth={8} fill="none" strokeLinejoin="round" />
          <path d="M-40 -12 L0 -44 L40 -12" stroke="#A8764E" strokeWidth={6} fill="none" strokeLinejoin="round" />
          <g transform="translate(0 -54) scale(0.8)">
            <Quran buka lebar={84} />
          </g>
        </g>
      );
    case 'bantal':
      return (
        <g>
          <path d="M-80 0 Q-90 -50 -60 -60 Q0 -70 60 -60 Q90 -50 80 0 Q0 10 -80 0 Z" fill="#7FB2D9" stroke="#5E93BC" strokeWidth={3} />
          <path d="M-50 -30 Q0 -40 50 -30" stroke="#FFFFFF" strokeWidth={4} fill="none" opacity={0.5} />
        </g>
      );
    default:
      // benda kecil langsung di lantai, sedikit diperbesar
      return (
        <g transform="translate(0 -30) scale(1.5)">
          <Benda id={id as BendaId} />
        </g>
      );
  }
};
