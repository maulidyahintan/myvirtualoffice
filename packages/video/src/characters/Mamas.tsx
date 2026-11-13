import React, { useId } from 'react';
import type { HeldItem } from '@kantor/shared/types';
import { mixPose, eatingPhase, eyelid, noise, noiseS, ballBounce, type ArmPose, type RigProps } from './motion';
import { ItemArt, Quran } from '../props/ItemArt';
import { Arm } from './Arm';
import { BackpackBag, BackpackStraps } from './Backpack';
import { Mochi } from './Mochi';
import { lipLick, sparkleTwinkle } from './craving';
import { Face } from './Face';
import { shade, useLook } from './looks';

// Mamas: anak laki-laki ±4 tahun. Peci rajut biru, baju koko putih
// berkerah abu-abu, kancing kayu, panel bawah abu-abu bermotif, saku di dada.
export const K_ASLI = {
  kulit: '#F6CBAE',
  kulitTerang: '#FFE3D0',
  kulitGelap: '#E9A687',
  telinga: '#F4A898',
  telingaDalam: '#EE8F84',
  kulitBayang: '#E7AE8E',
  rambut: '#3A2A24',
  peci: '#3E6E9E',
  peciGelap: '#2E5782',
  peciTerang: '#5584B3',
  baju: '#F8F7F2',
  bajuGaris: '#CFCBC0',
  bajuTerang: '#FFFFFF',
  bajuGelap: '#E6E3DA',
  lengan: '#F7F5EE',
  kerah: '#6E6D6A',
  panel: '#DCDFE4',
  panelMotif: '#BFC4CC',
  pita: '#EEDBA4',
  kancing: '#C9A37C',
  celana: '#4B5468',
  celanaTerang: '#5A6479',
  celanaGelap: '#3E465A',
  sandal: '#F6F6F4',
  garis: 'rgba(150, 95, 70, 0.35)',
};

/** Original palette; only the parts whose base color was changed in Settings are recomputed. */
function paletMamas({ base, changed }: ReturnType<typeof useLook>) {
  const k = { ...K_ASLI };
  if (changed('skin')) {
    const c = base.skin;
    Object.assign(k, { kulit: c, kulitBayang: shade(c, -0.12), kulitTerang: shade(c, 0.45), kulitGelap: shade(c, -0.2), telinga: shade(c, -0.06), telingaDalam: shade(c, -0.14) });
  }
  if (changed('cap')) Object.assign(k, { peci: base.cap, peciGelap: shade(base.cap, -0.25), peciTerang: shade(base.cap, 0.2) });
  if (changed('shirt')) {
    const c = base.shirt;
    Object.assign(k, { baju: c, bajuGaris: shade(c, -0.18), bajuTerang: shade(c, 0.5), bajuGelap: shade(c, -0.08), lengan: shade(c, -0.01) });
  }
  if (changed('pants')) Object.assign(k, { celana: base.pants, celanaTerang: shade(base.pants, 0.12), celanaGelap: shade(base.pants, -0.15) });
  return k;
}

export type ChildPalette = Record<keyof typeof K_ASLI, string>;

/** Baju koko: patterned lower panel, mandarin collar, wooden buttons and a breast pocket. */
const KokoDetails: React.FC<{ k: ChildPalette; id: string }> = ({ k, id }) => (
  <>
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
  </>
);

/** Plain T-shirt: a crew neck and one stripe across the chest. */
const TShirtDetails: React.FC<{ k: ChildPalette }> = ({ k }) => (
  <>
    <rect x={64} y={250} width={112} height={16} fill={k.bajuTerang} opacity={0.85} />
    <path d="M98 200 Q120 216 142 200" stroke={k.bajuGaris} strokeWidth={6} fill="none" strokeLinecap="round" />
    <ellipse cx={120} cy={206} rx={40} ry={10} fill="#000000" opacity={0.08} />
  </>
);

/** Mamas's blue knitted cap. */
const KnitCap: React.FC<{ k: ChildPalette; id: string }> = ({ k, id }) => (
  <>
    <path d="M58 96 Q56 52 92 40 Q120 32 148 40 Q184 52 182 96 Q120 84 58 96 Z" fill={`url(#rajut-${id})`} />
    <path d="M58 96 Q56 52 92 40 Q120 32 148 40 Q184 52 182 96 Q120 84 58 96 Z" fill={`url(#kilap-${id})`} />
    <path d="M78 56 Q104 42 132 42" stroke="#FFFFFF" strokeWidth={5} fill="none" opacity={0.35} strokeLinecap="round" />
    <path d="M58 96 Q120 84 182 96 L182 90 Q120 77 58 90 Z" fill={k.peciGelap} />
  </>
);

/** Short, slightly spiky hair on top of the head (a child without a cap). */
const ShortHair: React.FC<{ k: ChildPalette }> = ({ k }) => (
  <>
    <path d="M56 104 Q50 50 120 40 Q190 50 184 104 Q176 84 160 92 Q148 74 132 88 Q120 70 106 88 Q92 74 80 92 Q64 86 56 104 Z" fill={k.rambut} />
    <path d="M86 58 Q110 46 140 50" stroke="#FFFFFF" strokeWidth={4} fill="none" opacity={0.18} strokeLinecap="round" />
  </>
);

/** Left arm stretched sideways, slightly up, to a door handle. */
const CHILD_DOOR_REACH: ArmPose = { bahu: 95, siku: -8 };

/** Where the treat stands: on a cake stand at the child's right (screen right), at chest height. */
const TREAT = { x: 300, plateY: 286 };
const SPARKLES = [
  { x: TREAT.x - 70, y: 200, size: 1 },
  { x: TREAT.x + 70, y: 196, size: 0.8 },
  { x: TREAT.x + 82, y: 262, size: 0.6 },
  { x: TREAT.x - 80, y: 258, size: 0.7 },
];

/** The treat the child can't wait to eat, on a little cake stand beside the child, sparkling. */
const CravingTreat: React.FC<{ item: HeldItem; f: number }> = ({ item, f }) => (
  <g>
    <rect x={TREAT.x - 8} y={TREAT.plateY + 2} width={16} height={392 - TREAT.plateY - 4} rx={6} fill="#D9C6A5" stroke="#B8A27C" strokeWidth={2} />
    <ellipse cx={TREAT.x} cy={390} rx={40} ry={9} fill="#D9C6A5" />
    <ellipse cx={TREAT.x} cy={TREAT.plateY} rx={68} ry={12} fill="#FFFFFF" stroke="#DCD6CA" strokeWidth={3} />
    <g transform={`translate(${TREAT.x} ${TREAT.plateY - 16}) scale(2.3)`}>
      <ItemArt id={item} />
    </g>
    {SPARKLES.map((s, i) => {
      const twinkle = sparkleTwinkle(f, i);
      return (
        <path
          key={i}
          transform={`translate(${s.x} ${s.y}) scale(${s.size * (0.5 + twinkle * 0.6)})`}
          d="M0 -12 Q2 -2 12 0 Q2 2 0 12 Q-2 2 -12 0 Q-2 -2 0 -12 Z"
          fill="#FFE07A"
          opacity={0.4 + twinkle * 0.6}
        />
      );
    })}
  </g>
);

/** Knees pulled up in front of the body, for a child sitting and hugging its knees. */
const SittingLegs: React.FC<{ k: ChildPalette; id: string }> = ({ k, id }) => (
  <g>
    {[0, 1].map((i) => (
      <g key={i}>
        <rect x={84 + i * 40} y={236} width={34} height={98} rx={16} fill={`url(#celana-${id})`} stroke={k.garis} strokeWidth={2} />
        <ellipse cx={101 + i * 40} cy={244} rx={18} ry={13} fill={k.celanaTerang} />
        <path d={`M${78 + i * 40} 344 Q${78 + i * 40} 324 ${101 + i * 40} 322 Q${124 + i * 40} 324 ${124 + i * 40} 344 Z`} fill={k.sandal} />
        <rect x={76 + i * 40} y={340} width={50} height={7} rx={3.5} fill="#D9D9D5" />
      </g>
    ))}
  </g>
);

/** Mochi held in the child's arms: calm against the chest, or lifted to the face licking the cheek. */
const CarriedMochi: React.FC<{ f: number; licking: boolean }> = ({ f, licking }) => {
  const rig: RigProps = {
    expression: 'happy',
    bicara: false,
    lambai: false,
    f,
    tutup: licking ? 0 : eyelid(f, 3),
    mulut: { buka: 0, bulat: 0 },
    lihatX: licking ? 1 : 0,
    seed: 3,
    jalan: null,
    action: licking ? 'licking' : undefined,
  };
  const transform = licking
    ? `translate(166 ${178 + Math.sin(f / 3.5) * 2}) rotate(-14) scale(0.55) translate(-124 -262)`
    : `translate(120 ${300 + Math.sin(f / 20) * 2}) scale(0.58) translate(-120 -330)`;
  return (
    <g transform={transform}>
      <Mochi {...rig} />
    </g>
  );
};

function poseMamas(r: RigProps): { kiri: ArmPose; kanan: ArmPose } {
  const { f, expression, bicara, lambai } = r;
  const ayun = Math.sin(f / 26) * 3;
  const diam: ArmPose = { bahu: 7 + ayun, siku: 6 };
  if (r.jalan !== null) {
    const s = Math.sin(r.jalan) * 22;
    return { kiri: { bahu: 10 + s, siku: 14 }, kanan: { bahu: 10 - s, siku: 14 } };
  }
  if (lambai) {
    return { kiri: { bahu: 150, siku: 18 + Math.sin(f / 4) * 24 }, kanan: { bahu: 8 - ayun, siku: 4 } };
  }
  // actions: tangan kanan layar yang memegang/memainkan benda
  const pegang: ArmPose = { bahu: 16 + ayun, siku: -96 };
  const kiriAksi: ArmPose = bicara ? { bahu: 10 + noise(f / 22, r.seed + 5) * 30, siku: 20 + noise(f / 22, r.seed + 5) * 70 } : diam;
  switch (r.action) {
    case 'reading-quran':
      return { kiri: { bahu: -14, siku: -74 }, kanan: { bahu: -14, siku: -74 } };
    case 'praying': {
      // kedua telapak terangkat terpisah di depan dada
      const s = Math.sin(f / 40) * 2;
      return { kiri: { bahu: 18 + s, siku: -140 }, kanan: { bahu: 18 + s, siku: -140 } };
    }
    case 'eating':
      return { kiri: kiriAksi, kanan: mixPose(pegang, { bahu: -26, siku: -142 }, eatingPhase(f)) };
    case 'playing':
      return r.heldItem === 'toy-car' || r.heldItem === 'toy-elephant' || r.heldItem === 'doll'
        ? { kiri: kiriAksi, kanan: { bahu: 24 + Math.sin(f / 12) * 18, siku: -50 + Math.sin(f / 12) * 20 } }
        : // memantulkan bola: telapak menepuk bola dari atas
          { kiri: kiriAksi, kanan: { bahu: 36, siku: 30 - ballBounce(f) * 34 } };
    case 'holding':
      return { kiri: kiriAksi, kanan: pegang };
    case 'craving': {
      // fists clasped under the chin, trembling with excitement
      const shake = Math.sin(f / 2.5) * 3;
      return { kiri: { bahu: 24 + shake, siku: -150 }, kanan: { bahu: 24 - shake, siku: -150 } };
    }
    case 'hugging-knees': {
      // both forearms wrapped around the knees in front of the chest
      const hug: ArmPose = { bahu: 2 + Math.sin(f / 40), siku: -74 };
      return { kiri: hug, kanan: hug };
    }
  }
  if (r.carriedCat) {
    // cradling Mochi in front of the chest; raised towards the face while it licks the cheek
    const cradle: ArmPose = r.carriedCat === 'licking' ? { bahu: 20, siku: -126 } : { bahu: 14, siku: -104 + Math.sin(f / 24) * 3 };
    return { kiri: cradle, kanan: cradle };
  }
  if (expression === 'surprised') {
    const getar = Math.sin(f / 3) * 2;
    return { kiri: { bahu: 40 + getar, siku: 95 }, kanan: { bahu: 40 - getar, siku: 95 } };
  }
  if (expression === 'thinking') {
    // tangan kanan layar menyentuh dagu, tangan lain menyilang
    return { kiri: { bahu: -16, siku: -62 }, kanan: { bahu: -24, siku: -128 + Math.sin(f / 20) * 4 } };
  }
  if (expression === 'sad') return { kiri: { bahu: -8, siku: -30 }, kanan: { bahu: -8, siku: -30 } };
  if (expression === 'calm') return { kiri: { bahu: -14, siku: -48 }, kanan: { bahu: -14, siku: -48 } };
  if (bicara) {
    // gerak tangan saat bercerita, berganti-ganti tangan
    const g1 = noise(f / 22, r.seed + 5);
    const g2 = noise(f / 27, r.seed + 9);
    return {
      kiri: { bahu: 10 + g1 * 30, siku: 20 + g1 * 70 },
      kanan: { bahu: 8 + g2 * 22, siku: 10 + g2 * 55 },
    };
  }
  if (expression === 'happy') {
    const lompat = Math.sin(f / 9) * 6;
    return { kiri: { bahu: 22 + lompat, siku: 18 }, kanan: { bahu: 22 - lompat, siku: 18 } };
  }
  return { kiri: diam, kanan: { bahu: 7 - ayun, siku: 6 } };
}

export type ChildOutfit = 'koko' | 'tshirt';
export type ChildHeadwear = 'knit-cap' | 'hair';

/** Mamas: blue knitted cap and baju koko. */
export const Mamas: React.FC<RigProps> = (r) => <Child {...r} look={paletMamas(useLook('mamas'))} outfit="koko" headwear="knit-cap" />;

/** A drawn child (Mamas, his friend): shared body, face and motion; outfit and headwear differ. */
export const Child: React.FC<RigProps & { look: ChildPalette; outfit: ChildOutfit; headwear: ChildHeadwear }> = ({ look: k, outfit, headwear, ...r }) => {
  const id = useId().replace(/:/g, '');
  const { f, expression, bicara } = r;
  const pose = poseMamas(r);
  // opening the front door: the left arm stretches out to the handle
  if (r.action === 'opening-door') pose.kiri = mixPose(pose.kiri, CHILD_DOOR_REACH, r.reach ?? 0);

  // kepala: miring pelan, mengangguk saat bicara, tertunduk saat sedih
  let miring = noiseS(f / 45, r.seed) * 3;
  let turun = 0;
  if (bicara) {
    miring += noiseS(f / 12, r.seed + 4) * 4;
    turun = r.mulut.buka * 2.5;
  }
  if (expression === 'sad') {
    miring -= 5;
    turun += 6;
  }
  if (expression === 'thinking') miring += 7;
  if (expression === 'surprised') turun -= 4;
  // menunduk membaca / khusyuk berdoa
  if (r.action === 'reading-quran') turun += 5;
  const sitting = r.action === 'hugging-knees';
  const craving = r.action === 'craving';
  // looking down: sad, reading, hugging the knees; a little down at the treat while craving
  const lookingDown = expression === 'sad' || r.action === 'reading-quran' || sitting;
  const gazeDown = lookingDown ? 1 : Number(craving) * 0.7;
  const licked = r.carriedCat === 'licking';
  // sitting with the head resting low over the knees; leaning away, giggling, while Mochi licks the cheek
  if (sitting) turun += 8;
  if (licked) miring -= 7;
  const alisNaik = bicara ? Math.max(0, noiseS(f / 10, r.seed + 7)) : 0;
  const rambutAyun = Math.sin(f / 14) * 1.5;
  const langkah = r.jalan !== null ? Math.sin(r.jalan) * 20 : 0;

  const tangan = (kanan: boolean) => (
    <Arm
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
      lenganBaju={{ panjang: 36, warna: k.lengan, garis: k.bajuGaris }}
      pegang={kanan ? heldItemArt(r) : undefined}
    />
  );

  return (
    <g transform={sitting ? 'translate(0 64)' : undefined}>
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
          <stop offset="0" stopColor={k.kulitTerang} />
          <stop offset="0.6" stopColor={k.kulit} />
          <stop offset="1" stopColor={k.kulitGelap} />
        </radialGradient>
        <linearGradient id={`baju-${id}`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor={k.bajuTerang} />
          <stop offset="1" stopColor={k.bajuGelap} />
        </linearGradient>
        <linearGradient id={`kilap-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.35" />
          <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id={`celana-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={k.celanaTerang} />
          <stop offset="1" stopColor={k.celanaGelap} />
        </linearGradient>
        <clipPath id={`panel-${id}`}>
          <path d="M66 214 Q68 205 92 200 L148 200 Q172 205 174 214 L178 322 Q120 330 62 322 Z" />
        </clipPath>
      </defs>

      {r.action === 'wearing-backpack' ? <BackpackBag /> : null}

      {/* kaki & sandal */}
      {sitting ? null : [0, 1].map((i) => (
        <g key={i} transform={`rotate(${(i ? -1 : 1) * langkah} ${103 + i * 34} 316)`}>
          <rect x={90 + i * 34} y={312} width={26} height={60} rx={11} fill={`url(#celana-${id})`} />
          {/* sepatu putih */}
          <path d={`M${80 + i * 40} 388 Q${78 + i * 40} 368 ${100 + i * 40} 366 Q${122 + i * 40} 368 ${122 + i * 40} 388 Z`} fill={k.sandal} />
          <rect x={78 + i * 40} y={384} width={46} height={7} rx={3.5} fill="#D9D9D5" />
          <ellipse cx={95 + i * 40} cy={373} rx={8} ry={3} fill="#FFFFFF" />
        </g>
      ))}

      {/* lengan di belakang badan saat tangan menyilang */}
      {expression === 'thinking' ? tangan(false) : null}

      {/* baju koko */}
      <path
        d="M66 214 Q68 205 92 200 L148 200 Q172 205 174 214 L178 322 Q120 330 62 322 Z"
        fill={`url(#baju-${id})`}
        stroke={k.bajuGaris}
        strokeWidth={3}
        strokeLinejoin="round"
      />
      {outfit === 'koko' ? <KokoDetails k={k} id={id} /> : <TShirtDetails k={k} />}

      {r.action === 'wearing-backpack' ? <BackpackStraps /> : null}
      {sitting ? <SittingLegs k={k} id={id} /> : null}
      {craving ? <CravingTreat item={r.heldItem ?? 'chocolate-cake'} f={f} /> : null}

      {/* lengan (saat menggendong Mochi digambar sesudah Mochi) */}
      {expression === 'thinking' || r.carriedCat ? null : tangan(false)}

      {/* kepala */}
      <g transform={`translate(0 ${turun}) rotate(${miring} 120 196) translate(120 196) scale(1.14) translate(-120 -196)`}>
        {/* leher */}
        <rect x={108} y={178} width={24} height={22} rx={8} fill={k.kulitBayang} />
        {/* rambut belakang */}
        <path d="M60 120 Q58 80 120 70 Q182 80 180 120 Z" fill={k.rambut} />
        {/* telinga */}
        <ellipse cx={50} cy={140} rx={17} ry={21} fill={k.telinga} />
        <ellipse cx={190} cy={140} rx={17} ry={21} fill={k.telinga} />
        <ellipse cx={52} cy={140} rx={9} ry={12} fill={k.telingaDalam} opacity={0.6} />
        <ellipse cx={188} cy={140} rx={9} ry={12} fill={k.telingaDalam} opacity={0.6} />
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
        {headwear === 'knit-cap' ? <KnitCap k={k} id={id} /> : <ShortHair k={k} />}
        <g transform="translate(120 132)">
          <Face
            expression={licked ? 'happy' : expression}
            gaya="anak"
            kulit={k.kulit}
            tutup={licked ? 1 : r.tutup}
            mulut={r.mulut}
            bicara={bicara}
            lihatX={craving ? 1 : r.lihatX}
            lihatY={gazeDown}
            starEyes={craving}
            lickLips={craving && !bicara ? lipLick(f) : 0}
            alisNaik={alisNaik}
          />
        </g>
      </g>

      {r.carriedCat ? <CarriedMochi f={f} licking={licked} /> : null}
      {r.carriedCat ? tangan(false) : null}
      {tangan(true)}

      {/* mushaf terbuka di depan dada, dipegang kedua tangan */}
      {r.action === 'reading-quran' ? (
        <g transform={`translate(120 ${262 + Math.sin(f / 30) * 1.5}) scale(1.15)`}>
          <Quran buka />
        </g>
      ) : null}
      {/* bola yang dipantulkan */}
      {r.action === 'playing' && (r.heldItem ?? 'ball') === 'ball' ? (
        <g transform={`translate(212 ${362 - ballBounce(f) * 56})`}>
          <ItemArt id="ball" skala={1.5} />
        </g>
      ) : null}
    </g>
  );
};

/** Benda di tangan kanan layar sesuai aksi (bola yang dipantulkan digambar terpisah). */
export function heldItemArt(r: RigProps): React.ReactNode {
  if (r.action === 'holding' || r.action === 'eating') return <ItemArt id={r.heldItem ?? 'apple'} skala={1.35} />;
  if (r.action === 'playing' && r.heldItem && r.heldItem !== 'ball') return <ItemArt id={r.heldItem} skala={1.35} />;
  return null;
}
