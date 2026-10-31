import React, { useId } from 'react';
import { campurPose, faseMakan, noise, noiseS, type PoseLengan, type PropsRig } from './gerak';
import { Quran } from '../properti/Benda';
import { bendaDipegang } from './Mamas';
import { Lengan } from './Lengan';
import { Wajah } from './Wajah';

// Ibu: kerudung pink panjang menutup dada, abaya navy sampai mata kaki.
const w = {
  kulit: '#F7CFB4',
  kerudung: '#F3A9C2',
  kerudungBayang: '#DE88A6',
  kerudungTerang: '#F9C9D9',
  ciput: '#E07FA0',
  abaya: '#24305E',
  abayaBayang: '#1A2348',
  abayaAksen: '#3E4F8C',
  sepatu: '#3A2E2E',
  garis: '#4A3A40',
};

function poseIbu(r: PropsRig): { kiri: PoseLengan; kanan: PoseLengan } {
  const { f, expression, bicara, lambai } = r;
  // posisi dasar: kedua tangan bertaut lembut di depan
  const taut = Math.sin(f / 30) * 2;
  const bertaut: PoseLengan = { bahu: -12 + taut, siku: -42 };
  if (r.jalan !== null) {
    const s = Math.sin(r.jalan) * 12;
    return { kiri: { bahu: 4 + s, siku: 10 }, kanan: { bahu: 4 - s, siku: 10 } };
  }
  if (lambai) {
    return { kiri: { bahu: 140, siku: 20 + Math.sin(f / 5) * 20 }, kanan: { bahu: -12 - taut, siku: -42 } };
  }
  const pegang: PoseLengan = { bahu: 8 + taut, siku: -88 };
  const kiriAksi: PoseLengan = bicara ? { bahu: 6 + noise(f / 24, r.seed + 5) * 22, siku: 30 + noise(f / 24, r.seed + 5) * 60 } : bertaut;
  switch (r.action) {
    case 'reading-quran':
      return { kiri: { bahu: -16, siku: -70 }, kanan: { bahu: -16, siku: -70 } };
    case 'praying': {
      const s = Math.sin(f / 40) * 2;
      return { kiri: { bahu: 20 + s, siku: -140 }, kanan: { bahu: 20 + s, siku: -140 } };
    }
    case 'eating':
      return { kiri: kiriAksi, kanan: campurPose(pegang, { bahu: -30, siku: -132 }, faseMakan(f)) };
    case 'holding':
    case 'playing':
      return { kiri: kiriAksi, kanan: pegang };
  }
  if (expression === 'surprised') {
    // kedua tangan terangkat ke dada
    return { kiri: { bahu: -8, siku: -78 }, kanan: { bahu: -8, siku: -78 } };
  }
  if (expression === 'thinking') {
    // satu tangan menopang siku tangan lain, kepala dimiringkan
    return { kiri: { bahu: -14, siku: -64 }, kanan: { bahu: -6, siku: -96 + Math.sin(f / 22) * 4 } };
  }
  if (bicara) {
    // menjelaskan dengan telapak terbuka, tangan lain tetap tenang
    const g = noise(f / 24, r.seed + 5);
    return { kiri: bertaut, kanan: { bahu: 6 + g * 22, siku: 30 + g * 60 } };
  }
  if (expression === 'happy') return { kiri: { bahu: 10 + taut, siku: 50 }, kanan: { bahu: 10 - taut, siku: 50 } };
  return { kiri: bertaut, kanan: { bahu: -12 - taut, siku: -42 } };
}

export const Ibu: React.FC<PropsRig> = (r) => {
  const id = useId().replace(/:/g, '');
  const { f, expression, bicara } = r;
  const pose = poseIbu(r);
  const kibar = Math.sin(f / 28) * 3 + (r.jalan !== null ? Math.sin(r.jalan * 2) * 3 : 0);
  const kibarBawah = Math.sin(f / 34 + 1) * 4 + (r.jalan !== null ? Math.sin(r.jalan) * 8 : 0);

  let miring = noiseS(f / 55, r.seed) * 2.5 + 2;
  let turun = 0;
  if (bicara) {
    miring += noiseS(f / 14, r.seed + 4) * 3;
    turun = r.mulut.buka * 1.5;
  }
  if (expression === 'sad') {
    miring += 4;
    turun += 3;
  }
  if (expression === 'thinking') miring += 5;
  if (r.action === 'reading-quran') turun += 4;
  const tanganDepan = r.action !== undefined && r.action !== 'sleeping';
  const alisNaik = bicara ? Math.max(0, noiseS(f / 11, r.seed + 7)) : 0;

  const tangan = (kanan: boolean) => (
    <Lengan
      x={kanan ? 166 : 74}
      y={196}
      cermin={kanan}
      pose={kanan ? pose.kanan : pose.kiri}
      atas={66}
      bawah={58}
      tebal={26}
      warnaAtas={w.abaya}
      warnaBawah={w.abaya}
      warnaTangan={w.kulit}
      garis={w.abayaBayang}
      manset={w.abayaAksen}
      pegang={kanan ? bendaDipegang({ ...r, action: r.action === 'playing' ? 'holding' : r.action }) : undefined}
    />
  );

  return (
    <g>
      <defs>
        <radialGradient id={`kulit-${id}`} cx="0.42" cy="0.38" r="0.7">
          <stop offset="0" stopColor="#FFE5D4" />
          <stop offset="0.65" stopColor={w.kulit} />
          <stop offset="1" stopColor="#EAAA8C" />
        </radialGradient>
        <radialGradient id={`kerudung-${id}`} cx="0.38" cy="0.2" r="0.95">
          <stop offset="0" stopColor="#FBCADB" />
          <stop offset="0.55" stopColor={w.kerudung} />
          <stop offset="1" stopColor="#E58CAC" />
        </radialGradient>
        <linearGradient id={`abaya-${id}`} x1="0" y1="0" x2="1" y2="0.2">
          <stop offset="0" stopColor="#34437E" />
          <stop offset="0.55" stopColor={w.abaya} />
          <stop offset="1" stopColor="#18204A" />
        </linearGradient>
      </defs>
      {/* abaya navy, ujung bawah bergoyang pelan */}
      <path
        d={`M80 186 Q64 290 ${44 + kibarBawah} 386 Q120 400 ${196 + kibarBawah} 386 Q176 290 160 186 Z`}
        fill={`url(#abaya-${id})`}
        stroke={w.abayaBayang}
        strokeWidth={3}
        strokeLinejoin="round"
      />
      <path d={`M104 230 Q98 310 ${90 + kibarBawah * 0.6} 392`} stroke={w.abayaBayang} strokeWidth={4} fill="none" strokeLinecap="round" />
      <path d={`M136 230 Q142 310 ${150 + kibarBawah * 0.6} 392`} stroke={w.abayaBayang} strokeWidth={4} fill="none" strokeLinecap="round" />
      <path d={`M120 214 L${120 + kibarBawah * 0.5} 392`} stroke={w.abayaAksen} strokeWidth={5} strokeLinecap="round" />
      <path d={`M${46 + kibarBawah} 380 Q120 394 ${194 + kibarBawah} 380`} stroke={w.abayaAksen} strokeWidth={5} fill="none" strokeLinecap="round" />
      <ellipse cx={100 + (r.jalan !== null ? Math.sin(r.jalan) * 8 : 0)} cy={394} rx={16} ry={7} fill={w.sepatu} />
      <ellipse cx={140 - (r.jalan !== null ? Math.sin(r.jalan) * 8 : 0)} cy={394} rx={16} ry={7} fill={w.sepatu} />

      {/* lengan keluar dari bawah kerudung (saat beraksi, tangan di depan kerudung) */}
      {tanganDepan ? null : tangan(false)}
      {tanganDepan ? null : tangan(true)}

      {/* kepala + kerudung */}
      <g transform={`translate(0 ${turun}) rotate(${miring} 120 180) translate(120 180) scale(1.12) translate(-120 -180)`}>
        {/* kerudung panjang menjuntai menutup dada */}
        <path
          d={`M120 30 C62 30 52 84 56 124 C58 156 ${46 + kibar} 186 ${38 + kibar} 214 Q120 ${244 + kibar} ${202 + kibar} 214 C${194 + kibar} 186 182 156 184 124 C188 84 178 30 120 30 Z`}
          fill={`url(#kerudung-${id})`}
          stroke={w.kerudungBayang}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <path d={`M70 176 Q92 ${206 + kibar} 112 ${232 + kibar}`} stroke={w.kerudungBayang} strokeWidth={4} fill="none" strokeLinecap="round" />
        <path d={`M170 176 Q150 ${208 + kibar} 136 ${232 + kibar}`} stroke={w.kerudungBayang} strokeWidth={4} fill="none" strokeLinecap="round" />
        <path d="M84 50 Q120 38 156 50" stroke={w.kerudungTerang} strokeWidth={6} fill="none" strokeLinecap="round" opacity={0.8} />
        {/* wajah oval dibingkai kerudung */}
        <ellipse cx={120} cy={106} rx={50} ry={54} fill={`url(#kulit-${id})`} stroke={w.kerudungBayang} strokeWidth={4} />
        <ellipse cx={104} cy={92} rx={14} ry={7} fill="#FFFFFF" opacity={0.18} transform="rotate(-15 104 92)" />
        {/* ciput di dahi */}
        <path d="M76 98 Q78 52 120 50 Q162 52 164 98 Q150 72 120 70 Q90 72 76 98 Z" fill="#F6B3CA" />
        <path d="M80 86 Q120 60 160 86" stroke={w.ciput} strokeWidth={4} fill="none" strokeLinecap="round" />
        <g transform="translate(120 108)">
          <Wajah
            expression={expression}
            gaya="mother"
            kulit="#F7CFB4"
            tutup={r.tutup}
            mulut={r.mulut}
            bicara={bicara}
            lihatX={r.lihatX}
            lihatY={r.action === 'reading-quran' ? 1 : 0.6}
            alisNaik={alisNaik}
          />
        </g>
      </g>

      {tanganDepan ? tangan(false) : null}
      {tanganDepan ? tangan(true) : null}
      {r.action === 'reading-quran' ? (
        <g transform={`translate(120 ${258 + Math.sin(f / 30) * 1.5}) scale(1.3)`}>
          <Quran buka />
        </g>
      ) : null}
    </g>
  );
};
