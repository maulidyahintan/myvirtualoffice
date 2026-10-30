import React from 'react';
import { useCurrentFrame } from 'remotion';
import type { Latar as LatarId } from '@kantor/shared/types';

// Lapisan paling depan (di depan karakter): perabot & tanaman di tepi bawah layar.
// Dirender kabur dan bergeser lebih cepat dari karakter, jadi terasa ada ruang 3D.
// Sengaja hanya di pojok bawah supaya tidak menutupi wajah tokoh atau subtitle.

const W = 1920;
const H = 1080;

const Rumput: React.FC<{ x: number; lebar: number; tinggi: number; warna: string; seed?: number }> = ({ x, lebar, tinggi, warna, seed = 0 }) => {
  const frame = useCurrentFrame();
  const helai = Math.round(lebar / 26);
  return (
    <g>
      {Array.from({ length: helai }, (_, i) => {
        const bx = x + (i / helai) * lebar;
        const t = tinggi * (0.55 + 0.45 * Math.abs(Math.sin(i * 2.3 + seed)));
        const ayun = Math.sin(frame / 28 + i * 0.7 + seed) * 10;
        return <path key={i} d={`M${bx - 12} ${H} Q${bx + ayun * 0.5} ${H - t * 0.5} ${bx + ayun} ${H - t} Q${bx + 4} ${H - t * 0.5} ${bx + 12} ${H} Z`} fill={warna} />;
      })}
    </g>
  );
};

const Semak: React.FC<{ x: number; y: number; r: number; warna: string; terang: string }> = ({ x, y, r, warna, terang }) => (
  <g>
    <circle cx={x} cy={y} r={r} fill={warna} />
    <circle cx={x - r * 0.8} cy={y + r * 0.25} r={r * 0.75} fill={warna} />
    <circle cx={x + r * 0.85} cy={y + r * 0.3} r={r * 0.7} fill={warna} />
    <circle cx={x - r * 0.2} cy={y - r * 0.3} r={r * 0.45} fill={terang} opacity={0.6} />
  </g>
);

/** Tanaman pot berdaun lebar. */
const DaunBesar: React.FC<{ x: number; arah: 1 | -1; warna: string }> = ({ x, arah, warna }) => {
  const frame = useCurrentFrame();
  return (
    <g>
      {[-50, -20, 10, 40, 70].map((sudut, i) => (
        <g key={i} transform={`translate(${x} ${H}) rotate(${arah * sudut + Math.sin(frame / 40 + i) * 3})`}>
          <path d="M0 0 C-60 -120 -40 -260 0 -330 C40 -260 60 -120 0 0 Z" fill={warna} opacity={0.92 - i * 0.06} />
          <path d="M0 -10 L0 -300" stroke="rgba(0,0,0,0.15)" strokeWidth={5} />
        </g>
      ))}
    </g>
  );
};

const Batu: React.FC<{ x: number; y: number; s: number; warna: string }> = ({ x, y, s, warna }) => (
  <path d={`M${x - 120 * s} ${y} Q${x - 100 * s} ${y - 110 * s} ${x - 10 * s} ${y - 120 * s} Q${x + 110 * s} ${y - 100 * s} ${x + 130 * s} ${y} Z`} fill={warna} />
);

const Pinus: React.FC<{ x: number; tinggi: number; warna: string }> = ({ x, tinggi, warna }) => (
  <g>
    <rect x={x - 14} y={H - tinggi * 0.25} width={28} height={tinggi * 0.25} fill="#4A3A2E" />
    {[0, 1, 2].map((i) => (
      <path key={i} d={`M${x} ${H - tinggi + i * tinggi * 0.22} L${x + 140 - i * 20} ${H - tinggi * 0.45 + i * tinggi * 0.18} L${x - 140 + i * 20} ${H - tinggi * 0.45 + i * tinggi * 0.18} Z`} fill={warna} />
    ))}
  </g>
);

const Lentera: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  const frame = useCurrentFrame();
  const ayun = Math.sin(frame / 50) * 4;
  return (
    <g transform={`rotate(${ayun} ${x} 0)`}>
      <line x1={x} y1={0} x2={x} y2={y} stroke="#6B4E2E" strokeWidth={6} />
      <circle cx={x} cy={y + 70} r={110} fill="#FFD98A" opacity={0.22} />
      <path d={`M${x - 45} ${y + 20} L${x + 45} ${y + 20} L${x + 60} ${y + 110} L${x - 60} ${y + 110} Z`} fill="#E8B04A" />
      <path d={`M${x - 30} ${y + 35} L${x + 30} ${y + 35} L${x + 40} ${y + 100} L${x - 40} ${y + 100} Z`} fill="#FFF0B8" />
      <path d={`M${x - 50} ${y + 20} Q${x} ${y - 30} ${x + 50} ${y + 20} Z`} fill="#3F8C7A" />
    </g>
  );
};

const Isi: React.FC<{ id: LatarId }> = ({ id }) => {
  switch (id) {
    case 'kamar-malam':
      return (
        <>
          {/* bantal & boneka di pojok kiri, tumpukan buku di kanan */}
          <rect x={-60} y={880} width={420} height={260} rx={90} fill="#7E5E8E" />
          <ellipse cx={220} cy={900} rx={150} ry={80} fill="#F6EEDC" />
          <rect x={1600} y={900} width={340} height={70} rx={12} fill="#E07A7A" />
          <rect x={1630} y={840} width={300} height={64} rx={12} fill="#7FB2D9" />
          <rect x={1580} y={960} width={380} height={140} rx={16} fill="#5A4A6E" />
        </>
      );
    case 'ruang-tamu':
      return (
        <>
          <DaunBesar x={110} arah={1} warna="#4E9A5A" />
          <rect x={30} y={980} width={180} height={120} rx={20} fill="#B0684A" />
          {/* sandaran kursi */}
          <rect x={1620} y={760} width={360} height={360} rx={70} fill="#E8A87C" />
          <rect x={1590} y={900} width={120} height={200} rx={40} fill="#D08F64" />
        </>
      );
    case 'taman':
    case 'halaman-rumah':
    case 'taman-bermain':
      return (
        <>
          <Semak x={150} y={1000} r={150} warna="#4F9450" terang="#7CC46E" />
          <Semak x={1790} y={1010} r={140} warna="#4A8C4A" terang="#78BF6A" />
          <Rumput x={-20} lebar={520} tinggi={200} warna="#3F8743" />
          <Rumput x={1440} lebar={500} tinggi={190} warna="#3F8743" seed={3} />
        </>
      );
    case 'masjid':
      return (
        <>
          <Lentera x={1720} y={140} />
          <rect x={-40} y={120} width={170} height={980} fill="#E9DFCB" />
          <rect x={-60} y={100} width={210} height={40} rx={8} fill="#D9CDB6" />
          <Semak x={1780} y={1030} r={110} warna="#4F9450" terang="#7CC46E" />
        </>
      );
    case 'dapur':
      return (
        <>
          {/* ujung meja dengan mangkuk buah */}
          <rect x={-80} y={900} width={560} height={220} rx={24} fill="#C8925E" />
          <ellipse cx={230} cy={900} rx={150} ry={36} fill="#FFFFFF" />
          <circle cx={170} cy={870} r={42} fill="#F2A33A" />
          <circle cx={250} cy={862} r={40} fill="#E05A4A" />
          <path d="M290 880 Q340 820 380 860" stroke="#F5D547" strokeWidth={30} fill="none" strokeLinecap="round" />
          <rect x={1660} y={780} width={40} height={320} rx={12} fill="#9A6B47" />
          <rect x={1840} y={780} width={40} height={320} rx={12} fill="#9A6B47" />
          <rect x={1640} y={760} width={260} height={50} rx={14} fill="#B07E52" />
        </>
      );
    case 'langit-malam':
    case 'fajar':
      return (
        <>
          <ellipse cx={180} cy={1100} rx={420} ry={180} fill="#1E2446" />
          <ellipse cx={1760} cy={1110} rx={400} ry={170} fill="#1E2446" />
          <Rumput x={-20} lebar={460} tinggi={170} warna="#252B52" />
          <Rumput x={1500} lebar={440} tinggi={160} warna="#252B52" seed={2} />
        </>
      );
    case 'gurun':
      return (
        <>
          <Batu x={180} y={1090} s={1.6} warna="#C99A62" />
          <Batu x={1760} y={1090} s={1.3} warna="#B88A55" />
          <g>
            <path d="M1800 1080 Q1780 760 1830 520" stroke="#8A6440" strokeWidth={36} fill="none" />
            {[-60, -20, 25, 70].map((s, i) => (
              <path key={i} d="M0 0 Q90 -40 200 30" transform={`translate(1830 520) rotate(${s})`} stroke="#5E9A4A" strokeWidth={34} fill="none" strokeLinecap="round" />
            ))}
          </g>
        </>
      );
    case 'laut':
      return (
        <>
          <Batu x={160} y={1090} s={1.5} warna="#7D8A99" />
          <Batu x={1780} y={1095} s={1.2} warna="#6E7B8A" />
          <Rumput x={1560} lebar={360} tinggi={150} warna="#9BB86A" />
        </>
      );
    case 'gunung':
      return (
        <>
          <Pinus x={120} tinggi={620} warna="#2F6B4A" />
          <Pinus x={1800} tinggi={560} warna="#2A6044" />
          <Rumput x={-20} lebar={420} tinggi={150} warna="#3B7A50" />
          <Rumput x={1520} lebar={420} tinggi={150} warna="#3B7A50" seed={4} />
        </>
      );
    case 'sekolah':
      return (
        <>
          {/* sudut meja dengan buku & pensil, tas di kanan */}
          <rect x={-60} y={880} width={520} height={240} rx={16} fill="#D9A066" />
          <rect x={120} y={840} width={220} height={46} rx={6} fill="#5B8FD1" />
          <rect x={360} y={846} width={120} height={14} rx={7} fill="#F5C842" transform="rotate(-12 420 853)" />
          <rect x={1620} y={800} width={260} height={300} rx={50} fill="#E06A6A" />
          <rect x={1680} y={860} width={140} height={90} rx={20} fill="#C85454" />
        </>
      );
    case 'perpustakaan':
      return (
        <>
          {/* tepi rak buku */}
          <rect x={-40} y={80} width={260} height={1020} fill="#7A5236" />
          {[200, 420, 640, 860].map((y) => (
            <g key={y}>
              <rect x={-40} y={y} width={260} height={18} fill="#5E3E28" />
              {[0, 1, 2, 3, 4].map((i) => (
                <rect key={i} x={-20 + i * 46} y={y - 150 + (i % 2) * 20} width={38} height={150 - (i % 2) * 20} fill={['#D9634F', '#4F8FD9', '#E8B04A', '#5BAE7A', '#A06BC8'][i]} />
              ))}
            </g>
          ))}
          <DaunBesar x={1800} arah={-1} warna="#4E9A5A" />
        </>
      );
    case 'tempat-wudhu':
      return (
        <>
          {/* keran & pipa di kiri, tepi bak di bawah */}
          <rect x={-40} y={820} width={600} height={300} rx={20} fill="#9FCFD6" />
          <rect x={-40} y={800} width={620} height={40} rx={12} fill="#7FB8C2" />
          <rect x={1660} y={300} width={40} height={800} fill="#B9C4CC" />
          <rect x={1600} y={420} width={140} height={34} rx={12} fill="#C9D3DA" />
          <Semak x={1830} y={1040} r={100} warna="#4F9450" terang="#7CC46E" />
        </>
      );
    case 'dalam-masjid':
      return (
        <>
          {/* tiang masjid & rak Al-Qur'an */}
          <rect x={-40} y={0} width={170} height={1080} fill="#E2D2B4" />
          <rect x={-60} y={0} width={210} height={60} fill="#C9A86A" />
          <rect x={1640} y={800} width={320} height={300} rx={12} fill="#8A5E3C" />
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={1660 + i * 52} y={720} width={42} height={84} rx={4} fill="#2F6F5E" stroke="#E8B04A" strokeWidth={3} />
          ))}
        </>
      );
    case 'pasar':
      return (
        <>
          {/* tumpukan keranjang & karung di depan */}
          <rect x={-40} y={880} width={360} height={220} rx={30} fill="#C8925E" />
          {[40, 120, 200, 280].map((x, i) => (
            <circle key={x} cx={x} cy={870} r={34} fill={['#E0504A', '#F2A33A', '#5FA35A', '#F5D547'][i]} />
          ))}
          <path d="M1600 1100 Q1580 880 1700 860 Q1820 840 1900 880 Q1960 1000 1940 1100 Z" fill="#D9C29A" />
          <path d="M1680 870 Q1760 840 1860 870" stroke="#B89E72" strokeWidth={8} fill="none" />
        </>
      );
    case 'toko':
      return (
        <>
          {/* troli belanja & ujung rak */}
          <rect x={-60} y={820} width={360} height={280} rx={16} fill="#C9D6DE" />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={-40 + i * 80} y={760} width={64} height={70} rx={8} fill={['#F5C842', '#E0504A', '#4F8FD9', '#5BAE7A'][i]} />
          ))}
          <g>
            <path d="M1600 840 L1880 840 L1850 980 L1630 980 Z" fill="none" stroke="#7A8B96" strokeWidth={10} />
            {[1660, 1720, 1780, 1840].map((x) => (
              <line key={x} x1={x} y1={840} x2={x - 6} y2={980} stroke="#7A8B96" strokeWidth={5} />
            ))}
            <circle cx={1660} cy={1020} r={26} fill="#4A5560" />
            <circle cx={1840} cy={1020} r={26} fill="#4A5560" />
          </g>
        </>
      );
    default:
      return null;
  }
};

export const LatarDepan: React.FC<{ id: LatarId }> = ({ id }) => (
  <svg viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
    <Isi id={id} />
  </svg>
);
