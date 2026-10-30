import React, { useId } from 'react';
import { campurPose, faseMakan, noise, noiseS, pantulBola, type PoseLengan, type PropsRig } from './gerak';
import { Benda, Quran } from '../properti/Benda';
import { Lengan } from './Lengan';
import { Wajah } from './Wajah';

// Mamas: anak laki-laki ±4 tahun. Peci rajut biru, baju koko putih
// berkerah abu-abu, kancing kayu, panel bawah abu-abu bermotif, saku di dada.
const k = {
  kulit: '#F6CBAE',
  kulitBayang: '#E7AE8E',
  rambut: '#3A2A24',
  peci: '#3E6E9E',
  peciGelap: '#2E5782',
  peciTerang: '#5584B3',
  baju: '#F8F7F2',
  bajuGaris: '#CFCBC0',
  kerah: '#6E6D6A',
  panel: '#DCDFE4',
  panelMotif: '#BFC4CC',
  pita: '#EEDBA4',
  kancing: '#C9A37C',
  celana: '#4B5468',
  sandal: '#F6F6F4',
  garis: 'rgba(150, 95, 70, 0.35)',
};

function poseMamas(r: PropsRig): { kiri: PoseLengan; kanan: PoseLengan } {
  const { f, ekspresi, bicara, lambai } = r;
  const ayun = Math.sin(f / 26) * 3;
  const diam: PoseLengan = { bahu: 7 + ayun, siku: 6 };
  if (r.jalan !== null) {
    const s = Math.sin(r.jalan) * 22;
    return { kiri: { bahu: 10 + s, siku: 14 }, kanan: { bahu: 10 - s, siku: 14 } };
  }
  if (lambai) {
    return { kiri: { bahu: 150, siku: 18 + Math.sin(f / 4) * 24 }, kanan: { bahu: 8 - ayun, siku: 4 } };
  }
  // aksi: tangan kanan layar yang memegang/memainkan benda
  const pegang: PoseLengan = { bahu: 16 + ayun, siku: -96 };
  const kiriAksi: PoseLengan = bicara ? { bahu: 10 + noise(f / 22, r.seed + 5) * 30, siku: 20 + noise(f / 22, r.seed + 5) * 70 } : diam;
  switch (r.aksi) {
    case 'membaca-quran':
      return { kiri: { bahu: -14, siku: -74 }, kanan: { bahu: -14, siku: -74 } };
    case 'berdoa': {
      // kedua telapak terangkat terpisah di depan dada
      const s = Math.sin(f / 40) * 2;
      return { kiri: { bahu: 18 + s, siku: -140 }, kanan: { bahu: 18 + s, siku: -140 } };
    }
    case 'makan':
      return { kiri: kiriAksi, kanan: campurPose(pegang, { bahu: -26, siku: -142 }, faseMakan(f)) };
    case 'bermain':
      return r.benda === 'mobil-mainan' || r.benda === 'boneka'
        ? { kiri: kiriAksi, kanan: { bahu: 24 + Math.sin(f / 12) * 18, siku: -50 + Math.sin(f / 12) * 20 } }
        : // memantulkan bola: telapak menepuk bola dari atas
          { kiri: kiriAksi, kanan: { bahu: 36, siku: 30 - pantulBola(f) * 34 } };
    case 'memegang':
      return { kiri: kiriAksi, kanan: pegang };
  }
  if (ekspresi === 'kaget') {
    const getar = Math.sin(f / 3) * 2;
    return { kiri: { bahu: 40 + getar, siku: 95 }, kanan: { bahu: 40 - getar, siku: 95 } };
  }
  if (ekspresi === 'berpikir') {
    // tangan kanan layar menyentuh dagu, tangan lain menyilang
    return { kiri: { bahu: -16, siku: -62 }, kanan: { bahu: -24, siku: -128 + Math.sin(f / 20) * 4 } };
  }
  if (ekspresi === 'sedih') return { kiri: { bahu: -8, siku: -30 }, kanan: { bahu: -8, siku: -30 } };
  if (ekspresi === 'tenang') return { kiri: { bahu: -14, siku: -48 }, kanan: { bahu: -14, siku: -48 } };
  if (bicara) {
    // gerak tangan saat bercerita, berganti-ganti tangan
    const g1 = noise(f / 22, r.seed + 5);
    const g2 = noise(f / 27, r.seed + 9);
    return {
      kiri: { bahu: 10 + g1 * 30, siku: 20 + g1 * 70 },
      kanan: { bahu: 8 + g2 * 22, siku: 10 + g2 * 55 },
    };
  }
  if (ekspresi === 'senang') {
    const lompat = Math.sin(f / 9) * 6;
    return { kiri: { bahu: 22 + lompat, siku: 18 }, kanan: { bahu: 22 - lompat, siku: 18 } };
  }
  return { kiri: diam, kanan: { bahu: 7 - ayun, siku: 6 } };
}

export const Mamas: React.FC<PropsRig> = (r) => {
  const id = useId().replace(/:/g, '');
  const { f, ekspresi, bicara } = r;
  const pose = poseMamas(r);

  // kepala: miring pelan, mengangguk saat bicara, tertunduk saat sedih
  let miring = noiseS(f / 45, r.seed) * 3;
  let turun = 0;
  if (bicara) {
    miring += noiseS(f / 12, r.seed + 4) * 4;
    turun = r.mulut.buka * 2.5;
  }
  if (ekspresi === 'sedih') {
    miring -= 5;
    turun += 6;
  }
  if (ekspresi === 'berpikir') miring += 7;
  if (ekspresi === 'kaget') turun -= 4;
  // menunduk membaca / khusyuk berdoa
  if (r.aksi === 'membaca-quran') turun += 5;
  const alisNaik = bicara ? Math.max(0, noiseS(f / 10, r.seed + 7)) : 0;
  const rambutAyun = Math.sin(f / 14) * 1.5;
  const langkah = r.jalan !== null ? Math.sin(r.jalan) * 20 : 0;

  const tangan = (kanan: boolean) => (
    <Lengan
      x={kanan ? 164 : 76}
      y={216}
      cermin={kanan}
      pose={kanan ? pose.kanan : pose.kiri}
      atas={50}
      bawah={44}
      tebal={23}
      warnaAtas={k.kulit}
      warnaBawah={k.kulit}
      warnaTangan={k.kulit}
      garis={k.garis}
      lenganBaju={{ panjang: 36, warna: '#F7F5EE', garis: k.bajuGaris }}
      pegang={kanan ? bendaDipegang(r) : undefined}
    />
  );

  return (
    <g>
      <defs>
        <pattern id={`motif-${id}`} width={10} height={10} patternUnits="userSpaceOnUse">
          <rect width={10} height={10} fill={k.panel} />
          <path d="M5 1 L9 5 L5 9 L1 5 Z" fill="none" stroke={k.panelMotif} strokeWidth={1.4} />
        </pattern>
        <pattern id={`rajut-${id}`} width={14} height={9} patternUnits="userSpaceOnUse">
          <rect width={14} height={9} fill={k.peci} />
          <path d="M0 6 L3.5 2 L7 6 L10.5 2 L14 6" fill="none" stroke={k.peciGelap} strokeWidth={1.6} />
        </pattern>
        <radialGradient id={`kulit-${id}`} cx="0.42" cy="0.36" r="0.72">
          <stop offset="0" stopColor="#FFE3D0" />
          <stop offset="0.6" stopColor={k.kulit} />
          <stop offset="1" stopColor="#E9A687" />
        </radialGradient>
        <linearGradient id={`baju-${id}`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#E6E3DA" />
        </linearGradient>
        <linearGradient id={`kilap-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.35" />
          <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id={`celana-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5A6479" />
          <stop offset="1" stopColor="#3E465A" />
        </linearGradient>
        <clipPath id={`panel-${id}`}>
          <path d="M66 214 Q68 205 92 200 L148 200 Q172 205 174 214 L178 322 Q120 330 62 322 Z" />
        </clipPath>
      </defs>

      {/* kaki & sandal */}
      {[0, 1].map((i) => (
        <g key={i} transform={`rotate(${(i ? -1 : 1) * langkah} ${103 + i * 34} 316)`}>
          <rect x={90 + i * 34} y={312} width={26} height={60} rx={11} fill={`url(#celana-${id})`} />
          {/* sepatu putih */}
          <path d={`M${80 + i * 40} 388 Q${78 + i * 40} 368 ${100 + i * 40} 366 Q${122 + i * 40} 368 ${122 + i * 40} 388 Z`} fill={k.sandal} />
          <rect x={78 + i * 40} y={384} width={46} height={7} rx={3.5} fill="#D9D9D5" />
          <ellipse cx={95 + i * 40} cy={373} rx={8} ry={3} fill="#FFFFFF" />
        </g>
      ))}

      {/* lengan di belakang badan saat tangan menyilang */}
      {ekspresi === 'berpikir' ? tangan(false) : null}

      {/* baju koko */}
      <path
        d="M66 214 Q68 205 92 200 L148 200 Q172 205 174 214 L178 322 Q120 330 62 322 Z"
        fill={`url(#baju-${id})`}
        stroke={k.bajuGaris}
        strokeWidth={3}
        strokeLinejoin="round"
      />
      <g clipPath={`url(#panel-${id})`}>
        <rect x={50} y={262} width={140} height={70} fill={`url(#motif-${id})`} />
        <rect x={50} y={254} width={140} height={9} fill={k.pita} />
        {Array.from({ length: 14 }, (_, i) => (
          <path key={i} d={`M${56 + i * 10} 263 L${61 + i * 10} 256 L${66 + i * 10} 263 Z`} fill="#F8EFD0" />
        ))}
      </g>
      {/* bayangan lembut di bawah dagu */}
      <ellipse cx={120} cy={206} rx={44} ry={12} fill="#000000" opacity={0.1} />
      {/* kerah shanghai abu-abu */}
      <path d="M94 199 Q96 190 114 188 L114 208 Q100 207 94 199 Z" fill={k.kerah} stroke={k.garis} strokeWidth={2} />
      <path d="M146 199 Q144 190 126 188 L126 208 Q140 207 146 199 Z" fill={k.kerah} stroke={k.garis} strokeWidth={2} />
      <line x1={120} y1={208} x2={120} y2={322} stroke={k.bajuGaris} strokeWidth={2.5} />
      {[220, 272, 306].map((y) => (
        <g key={y}>
          <circle cx={120} cy={y} r={5} fill={k.kancing} stroke="#A07C58" strokeWidth={1.5} />
          <circle cx={118.5} cy={y - 1.5} r={0.9} fill="#6B4E33" />
          <circle cx={121.5} cy={y - 1.5} r={0.9} fill="#6B4E33" />
          <circle cx={118.5} cy={y + 1.5} r={0.9} fill="#6B4E33" />
          <circle cx={121.5} cy={y + 1.5} r={0.9} fill="#6B4E33" />
        </g>
      ))}
      {/* saku */}
      <path d="M134 272 L166 272 L166 300 L150 308 L134 300 Z" fill={k.baju} stroke={k.bajuGaris} strokeWidth={2.5} strokeLinejoin="round" />
      <rect x={134} y={278} width={34} height={5} fill="#A3927C" />
      <rect x={160} y={282} width={8} height={6} fill="#5C5C5C" />

      {/* lengan */}
      {ekspresi === 'berpikir' ? null : tangan(false)}

      {/* kepala */}
      <g transform={`translate(0 ${turun}) rotate(${miring} 120 196) translate(120 196) scale(1.14) translate(-120 -196)`}>
        {/* leher */}
        <rect x={108} y={178} width={24} height={22} rx={8} fill={k.kulitBayang} />
        {/* rambut belakang */}
        <path d="M60 120 Q58 80 120 70 Q182 80 180 120 Z" fill={k.rambut} />
        {/* telinga */}
        <ellipse cx={50} cy={140} rx={17} ry={21} fill="#F4A898" />
        <ellipse cx={190} cy={140} rx={17} ry={21} fill="#F4A898" />
        <ellipse cx={52} cy={140} rx={9} ry={12} fill="#EE8F84" opacity={0.6} />
        <ellipse cx={188} cy={140} rx={9} ry={12} fill="#EE8F84" opacity={0.6} />
        {/* wajah bulat dengan pipi tembam */}
        <path
          d="M120 62 C170 62 194 98 193 138 C192 178 162 198 120 198 C78 198 48 178 47 138 C46 98 70 62 120 62 Z"
          fill={`url(#kulit-${id})`}
        />
        {/* kilau dahi & pipi */}
        <ellipse cx={100} cy={112} rx={24} ry={10} fill="#FFFFFF" opacity={0.18} transform="rotate(-12 100 112)" />
        {/* cambang */}
        <path d="M52 104 Q58 96 70 100 Q64 112 58 126 Q50 116 52 104 Z" fill={k.rambut} />
        <path d="M188 104 Q182 96 170 100 Q176 112 182 126 Q190 116 188 104 Z" fill={k.rambut} />
        {/* poni menyamping, mengintip di bawah peci */}
        <g transform={`rotate(${rambutAyun} 120 92) translate(0 -3)`}>
          <path
            d="M56 96 Q60 86 120 84 Q180 86 184 96 Q178 108 166 104 Q156 112 142 104 Q128 114 112 104 Q98 112 86 103 Q72 110 60 106 Z"
            fill={k.rambut}
          />
          <path d="M92 95 Q112 90 136 94" stroke="#6A564C" strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.7} />
        </g>
        {/* peci rajut biru */}
        <path d="M58 96 Q56 52 92 40 Q120 32 148 40 Q184 52 182 96 Q120 84 58 96 Z" fill={`url(#rajut-${id})`} />
        <path d="M58 96 Q56 52 92 40 Q120 32 148 40 Q184 52 182 96 Q120 84 58 96 Z" fill={`url(#kilap-${id})`} />
        <path d="M78 56 Q104 42 132 42" stroke="#FFFFFF" strokeWidth={5} fill="none" opacity={0.35} strokeLinecap="round" />
        <path d="M58 96 Q120 84 182 96 L182 90 Q120 77 58 90 Z" fill={k.peciGelap} />
        <g transform="translate(120 132)">
          <Wajah
            ekspresi={ekspresi}
            gaya="anak"
            kulit="#F6CBAE"
            tutup={r.tutup}
            mulut={r.mulut}
            bicara={bicara}
            lihatX={r.lihatX}
            lihatY={ekspresi === 'sedih' || r.aksi === 'membaca-quran' ? 1 : 0}
            alisNaik={alisNaik}
          />
        </g>
      </g>

      {tangan(true)}

      {/* mushaf terbuka di depan dada, dipegang kedua tangan */}
      {r.aksi === 'membaca-quran' ? (
        <g transform={`translate(120 ${262 + Math.sin(f / 30) * 1.5}) scale(1.15)`}>
          <Quran buka />
        </g>
      ) : null}
      {/* bola yang dipantulkan */}
      {r.aksi === 'bermain' && (r.benda ?? 'bola') === 'bola' ? (
        <g transform={`translate(212 ${362 - pantulBola(f) * 56})`}>
          <Benda id="bola" skala={1.5} />
        </g>
      ) : null}
    </g>
  );
};

/** Benda di tangan kanan layar sesuai aksi (bola yang dipantulkan digambar terpisah). */
export function bendaDipegang(r: PropsRig): React.ReactNode {
  if (r.aksi === 'memegang' || r.aksi === 'makan') return <Benda id={r.benda ?? 'apel'} skala={1.35} />;
  if (r.aksi === 'bermain' && r.benda && r.benda !== 'bola') return <Benda id={r.benda} skala={1.35} />;
  return null;
}
