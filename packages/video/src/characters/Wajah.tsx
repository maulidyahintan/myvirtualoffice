import React, { useId } from 'react';
import type { Ekspresi } from '@kantor/shared/types';
import type { Mulut } from './gerak';

/**
 * Wajah gaya chibi lembut untuk Mamas & Ibu: mata besar dengan iris gelap
 * yang hampir memenuhi mata dan kilau besar, alis tipis yang tinggi,
 * pipi merona, hidung mungil, tanpa garis tepi gelap.
 * Koordinat relatif terhadap pusat wajah (0,0).
 * Kelopak mata digambar sebagai "tirai" warna kulit di dalam bentuk mata,
 * jadi kedip, mata sayu, dan mata tersenyum memakai mekanisme yang sama.
 */
export const Wajah: React.FC<{
  ekspresi: Ekspresi;
  gaya: 'anak' | 'ibu';
  kulit: string;
  /** 0 = terbuka, 1 = tertutup (kedip) */
  tutup: number;
  mulut: Mulut;
  bicara: boolean;
  /** arah pandang -1..1 */
  lihatX: number;
  lihatY: number;
  /** 0..1, alis terangkat saat menekankan kata */
  alisNaik: number;
}> = ({ ekspresi, gaya, kulit, tutup, mulut, bicara, lihatX, lihatY, alisNaik }) => {
  const uid = useId().replace(/:/g, '');
  const anak = gaya === 'anak';
  const mataX = anak ? 31 : 22;
  const mataY = anak ? 12 : 4;
  const rx = anak ? 17 : 12.5;
  const ry = anak ? 19.5 : 14;
  const kaget = ekspresi === 'kaget';
  const berpikir = ekspresi === 'berpikir';
  const garisMata = '#2A1A14';

  // kelopak atas (0..1) & pipi naik dari bawah (0..1) per ekspresi
  let kelopakAtas = 0;
  let pipiNaik = 0;
  if (ekspresi === 'sedih') kelopakAtas = 0.22;
  if (ekspresi === 'tenang') kelopakAtas = 0.2;
  if (ekspresi === 'senang' && bicara) pipiNaik = 0.22;
  const atas = Math.max(kelopakAtas, tutup);
  // mata tersenyum "^^" saat senang & diam
  const mataSenyum = ekspresi === 'senang' && !bicara;

  // pandangan
  const px = lihatX * rx * 0.22 + (berpikir ? rx * 0.15 : 0);
  const py = lihatY * ry * 0.12 + (berpikir ? -ry * 0.22 : 0);
  const sk = kaget ? 1.08 : 1;

  const mata = (x: number, kiri: boolean) => {
    const sx = rx * sk;
    const sy = ry * sk;
    const top = mataY - sy;
    const idKlip = `klip-${uid}-${kiri ? 'l' : 'r'}`;
    const tertutup = atas > 0.92;
    const tirai = Math.min(1, atas) * sy * 2;
    const bulu = (
      // bulu mata kecil di sudut luar
      <g stroke={garisMata} strokeWidth={anak ? 2.6 : 2.4} strokeLinecap="round" fill="none">
        {[0, 1, 2].map((i) => {
          const ax = x + (kiri ? -1 : 1) * sx * (0.62 + i * 0.16);
          const ay = mataY - sy * (0.72 - i * 0.22) + (tertutup ? sy * 0.7 : tirai * 0.8);
          return <path key={i} d={`M${ax} ${ay} l${(kiri ? -1 : 1) * (anak ? 5 : 6)} ${-(anak ? 4 : 5) + i}`} />;
        })}
      </g>
    );

    if (mataSenyum) {
      return (
        <g key={x}>
          <path d={`M${x - sx * 0.85} ${mataY + 4} Q${x} ${mataY - sy * 0.95} ${x + sx * 0.85} ${mataY + 4}`} stroke={garisMata} strokeWidth={anak ? 5.5 : 4.5} fill="none" strokeLinecap="round" />
        </g>
      );
    }
    if (tertutup) {
      return (
        <g key={x}>
          <path d={`M${x - sx * 0.9} ${mataY + 2} Q${x} ${mataY + sy * 0.55} ${x + sx * 0.9} ${mataY + 2}`} stroke={garisMata} strokeWidth={anak ? 4.5 : 4} fill="none" strokeLinecap="round" />
          {bulu}
        </g>
      );
    }
    return (
      <g key={x}>
        <defs>
          <clipPath id={idKlip}>
            <ellipse cx={x} cy={mataY} rx={sx} ry={sy} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${idKlip})`}>
          <ellipse cx={x} cy={mataY} rx={sx} ry={sy} fill="#FFFFFF" />
          {/* iris besar hampir memenuhi mata */}
          <ellipse cx={x + px} cy={mataY + py + sy * 0.04} rx={sx * (kaget ? 0.78 : 0.9)} ry={sy * (kaget ? 0.8 : 0.92)} fill={`url(#iris-${uid})`} />
          <ellipse cx={x + px} cy={mataY + py + sy * 0.08} rx={sx * 0.45} ry={sy * 0.47} fill="#1A0D08" opacity={0.85} />
          {/* kilau */}
          <ellipse cx={x + px + sx * 0.32} cy={mataY + py - sy * 0.34} rx={sx * 0.36} ry={sy * 0.32} fill="#FFFFFF" />
          <circle cx={x + px - sx * 0.34} cy={mataY + py + sy * 0.38} r={sx * 0.13} fill="#FFFFFF" opacity={0.9} />
          <ellipse cx={x + px} cy={mataY + py + sy * 0.6} rx={sx * 0.5} ry={sy * 0.18} fill="#C88A60" opacity={0.35} />
          {/* tirai kelopak */}
          {tirai > 0.5 ? <rect x={x - sx - 2} y={top - 2} width={sx * 2 + 4} height={tirai + 2} fill={kulit} /> : null}
          {pipiNaik > 0 ? <ellipse cx={x} cy={mataY + sy * 1.75 - pipiNaik * sy} rx={sx * 1.3} ry={sy} fill={kulit} /> : null}
        </g>
        {/* garis kelopak atas yang tebal & lembut */}
        <path
          d={`M${x - sx * 1.02} ${mataY - sy * 0.15 + tirai * 0.85} Q${x - sx * 0.6} ${top - 1 + tirai} ${x} ${top - 1 + tirai} Q${x + sx * 0.6} ${top - 1 + tirai} ${x + sx * 1.02} ${mataY - sy * 0.15 + tirai * 0.85}`}
          stroke={garisMata}
          strokeWidth={anak ? 3.6 : 3.4}
          fill="none"
          strokeLinecap="round"
        />
        {bulu}
      </g>
    );
  };

  const alis = (x: number, kiri: boolean) => {
    // alis tipis & tinggi, jauh dari mata supaya wajah terlihat polos
    const naik = alisNaik * 4 + (kaget ? 7 : 0) + (berpikir && !kiri ? 5 : 0);
    const y = mataY - ry - (anak ? 17 : 14) - naik;
    const w = 9;
    // sedih: ujung dalam terangkat (wajah memelas, bukan marah)
    const dalamNaik = ekspresi === 'sedih' ? 5 : 0;
    const dx = kiri ? 1 : -1; // arah ke tengah wajah
    const xDalam = x + dx * w;
    const xLuar = x - dx * w;
    return (
      <path
        d={`M${xLuar} ${y + 1} Q${x} ${y - 4 - dalamNaik / 2} ${xDalam} ${y - dalamNaik}`}
        stroke={anak ? '#5A3A2C' : '#6A4636'}
        strokeWidth={anak ? 3.6 : 3}
        fill="none"
        strokeLinecap="round"
        opacity={0.85}
      />
    );
  };

  const mulutY = anak ? 38 : 30;
  const dalam = '#B83A45';
  const lidah = '#F08A8E';
  let isiMulut: React.ReactNode;
  const mulutTerbuka = (lebar: number, tinggi: number) => (
    <g>
      <path
        d={`M${-lebar} ${mulutY} Q0 ${mulutY - tinggi * 0.18} ${lebar} ${mulutY} Q${lebar * 0.9} ${mulutY + tinggi} 0 ${mulutY + tinggi} Q${-lebar * 0.9} ${mulutY + tinggi} ${-lebar} ${mulutY} Z`}
        fill={dalam}
      />
      <ellipse cx={0} cy={mulutY + tinggi * 0.72} rx={lebar * 0.6} ry={tinggi * 0.3} fill={lidah} />
    </g>
  );
  if (mulut.buka > 0.06) {
    const w = (mulut.bulat ? 6.5 : 10.5) * (anak ? 1 : 0.85);
    isiMulut = mulutTerbuka(w, 4 + mulut.buka * (anak ? 13 : 10));
  } else if (ekspresi === 'senang') {
    isiMulut = mulutTerbuka(anak ? 11 : 9, anak ? 11 : 8);
  } else if (ekspresi === 'sedih') {
    isiMulut = <path d={`M-7 ${mulutY + 4} Q0 ${mulutY - 3} 7 ${mulutY + 4}`} stroke="#B05050" strokeWidth={3.2} fill="none" strokeLinecap="round" />;
  } else if (kaget) {
    isiMulut = <ellipse cx={0} cy={mulutY + 4} rx={6.5} ry={8} fill={dalam} />;
  } else if (berpikir) {
    isiMulut = <ellipse cx={4} cy={mulutY + 1} rx={4.5} ry={3.5} fill={dalam} />;
  } else {
    isiMulut = <path d={`M-8 ${mulutY} Q0 ${mulutY + 7} 8 ${mulutY}`} stroke="#B05050" strokeWidth={3.2} fill="none" strokeLinecap="round" />;
  }

  return (
    <g transform={`translate(${lihatX * 5} ${lihatY * 2})`}>
      <defs>
        <radialGradient id={`iris-${uid}`} cx="0.5" cy="0.8" r="0.85">
          <stop offset="0" stopColor={anak ? '#8A5636' : '#93603E'} />
          <stop offset="0.5" stopColor={anak ? '#3E2216' : '#48281A'} />
          <stop offset="1" stopColor="#140A06" />
        </radialGradient>
        <radialGradient id={`pipi-${uid}`}>
          <stop offset="0" stopColor="#FF7F86" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FF7F86" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* pipi merona lebar */}
      <ellipse cx={-mataX - (anak ? 8 : 6)} cy={mataY + (anak ? 30 : 24)} rx={anak ? 24 : 17} ry={anak ? 16 : 11} fill={`url(#pipi-${uid})`} />
      <ellipse cx={mataX + (anak ? 8 : 6)} cy={mataY + (anak ? 30 : 24)} rx={anak ? 24 : 17} ry={anak ? 16 : 11} fill={`url(#pipi-${uid})`} />
      {mata(-mataX, true)}
      {mata(mataX, false)}
      {alis(-mataX, true)}
      {alis(mataX, false)}
      {/* hidung mungil */}
      <ellipse cx={0} cy={anak ? 25 : 18} rx={anak ? 4.5 : 3.5} ry={anak ? 3.2 : 3} fill="#D0866A" opacity={0.45} />
      <ellipse cx={-1} cy={anak ? 23.5 : 16.5} rx={1.6} ry={1.1} fill="#FFFFFF" opacity={0.6} />
      {isiMulut}
    </g>
  );
};
