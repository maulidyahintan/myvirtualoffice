import React from 'react';
import { useCurrentFrame } from 'remotion';
import type { Latar as LatarId, Suasana as SuasanaId } from '@kantor/shared/types';
import { BintangJatuh, BintangKelip, Burung, BungaGoyang, Cahaya, DaunJatuh, Debu, Gorden, Hujan, KunangKunang, KupuKupu, SinarJendela, Uap } from './Suasana';

const W = 1920;
const H = 1080;

const Bintang: React.FC<{ jumlah: number; seed: number; tinggiMaks: number }> = ({ jumlah, seed, tinggiMaks }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {Array.from({ length: jumlah }, (_, i) => {
        const x = (Math.sin(i * 12.9898 + seed) * 43758.5453) % 1;
        const y = (Math.sin(i * 78.233 + seed) * 12345.678) % 1;
        const r = 1.5 + ((i * 7) % 3);
        // berkelip sangat pelan (tidak overstimulating)
        const op = 0.45 + 0.4 * Math.sin(frame / 40 + i);
        return <circle key={i} cx={Math.abs(x) * W} cy={Math.abs(y) * tinggiMaks} r={r} fill="#FFF8E1" opacity={op} />;
      })}
    </>
  );
};

const Awan: React.FC<{ y: number; skala: number; kecepatan: number; awal: number }> = ({ y, skala, kecepatan, awal }) => {
  const frame = useCurrentFrame();
  const x = ((awal + frame * kecepatan) % (W + 400)) - 200;
  return (
    <g transform={`translate(${x} ${y}) scale(${skala})`} opacity={0.95}>
      <ellipse cx={0} cy={0} rx={90} ry={40} fill="#fff" />
      <ellipse cx={60} cy={-22} rx={70} ry={45} fill="#fff" />
      <ellipse cx={120} cy={4} rx={80} ry={36} fill="#fff" />
    </g>
  );
};

const Bulan: React.FC<{ x: number; y: number; r: number; id: string }> = ({ x, y, r, id }) => (
  <g>
    <defs>
      <mask id={id}>
        <rect x={x - r * 2} y={y - r * 2} width={r * 4} height={r * 4} fill="white" />
        <circle cx={x + r * 0.45} cy={y - r * 0.2} r={r * 0.9} fill="black" />
      </mask>
    </defs>
    <circle cx={x} cy={y} r={r * 1.7} fill="#FFF3C4" opacity={0.07} />
    <circle cx={x} cy={y} r={r} fill="#FFE9A8" mask={`url(#${id})`} />
  </g>
);

const KamarMalam = () => (
  <>
    <rect width={W} height={H} fill="#34406E" />
    <rect y={800} width={W} height={280} fill="#5A4A6E" />
    {/* jendela */}
    <rect x={1240} y={140} width={460} height={380} rx={20} fill="#1B2347" stroke="#E9D8B4" strokeWidth={16} />
    <svg x={1248} y={148} width={444} height={364}>
      <rect width={444} height={364} fill="#1B2347" />
      <Bintang jumlah={18} seed={3} tinggiMaks={364} />
      <Bulan x={300} y={110} r={50} id="bulan-kamar" />
      <BintangJatuh periode={240} />
    </svg>
    <line x1={1470} y1={140} x2={1470} y2={520} stroke="#E9D8B4" strokeWidth={12} />
    <Gorden x={1180} y={120} lebar={130} tinggi={430} warnaKain="#B98ACB" />
    <Gorden x={1630} y={120} lebar={130} tinggi={430} warnaKain="#B98ACB" kanan />
    <rect x={1170} y={110} width={600} height={20} rx={10} fill="#E9D8B4" />
    {/* tempat tidur */}
    <rect x={160} y={600} width={760} height={240} rx={30} fill="#8E6E9E" />
    <rect x={130} y={500} width={60} height={360} rx={20} fill="#6E4E7E" />
    <rect x={200} y={560} width={220} height={90} rx={40} fill="#F6EEDC" />
    <path d="M420 620 Q640 580 920 620 L920 840 L420 840 Z" fill="#7FB2D9" />
    {/* lampu tidur */}
    <LampuBerdenyut />
    <rect x={1020} y={700} width={60} height={110} rx={10} fill="#B98A5E" />
    <path d="M990 700 L1110 700 L1080 620 L1020 620 Z" fill="#FFE2A6" />
  </>
);

const LampuBerdenyut = () => {
  const frame = useCurrentFrame();
  return <circle cx={1050} cy={660} r={180 + Math.sin(frame / 40) * 10} fill="#FFD98A" opacity={0.12 + Math.sin(frame / 40) * 0.03} />;
};

const RuangTamu = () => (
  <>
    <rect width={W} height={H} fill="#F6E7CF" />
    <rect y={820} width={W} height={260} fill="#D8B48A" />
    <ellipse cx={960} cy={940} rx={620} ry={80} fill="#C98F7A" opacity={0.7} />
    {/* bingkai kaligrafi abstrak */}
    <rect x={820} y={150} width={280} height={200} rx={16} fill="#2F6F5E" stroke="#E8B04A" strokeWidth={10} />
    <path d="M870 270 q40 -60 90 0 t90 0" stroke="#E8B04A" strokeWidth={8} fill="none" strokeLinecap="round" />
    <circle cx={960} cy={220} r={10} fill="#E8B04A" />
    {/* sofa */}
    <rect x={140} y={600} width={520} height={200} rx={40} fill="#7FA6A0" />
    <rect x={120} y={560} width={80} height={250} rx={30} fill="#6A918B" />
    <rect x={600} y={560} width={80} height={250} rx={30} fill="#6A918B" />
    {/* tanaman */}
    <rect x={1620} y={690} width={120} height={130} rx={16} fill="#C27C5A" />
    <ellipse cx={1680} cy={640} rx={90} ry={110} fill="#6FAE6A" />
    <ellipse cx={1630} cy={600} rx={50} ry={70} fill="#82C27C" />
    {/* jendela siang */}
    <rect x={1260} y={170} width={300} height={260} rx={14} fill="#BFE3F5" stroke="#FFFFFF" strokeWidth={14} />
    <svg x={1267} y={177} width={286} height={246}>
      <Burung seed={2} y={90} skala={0.6} />
    </svg>
    <Gorden x={1200} y={150} lebar={90} tinggi={320} warnaKain="#E8A87C" />
    <Gorden x={1530} y={150} lebar={90} tinggi={320} warnaKain="#E8A87C" kanan />
    <SinarJendela x={1260} y={430} lebar={300} tinggi={400} />
    <Debu jumlah={14} x={900} y={420} lebar={600} tinggi={420} />
  </>
);

const Taman = () => (
  <>
    <defs>
      <linearGradient id="langitSiang" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#9ED8F5" />
        <stop offset="1" stopColor="#E3F5FC" />
      </linearGradient>
    </defs>
    <rect width={W} height={H} fill="url(#langitSiang)" />
    <circle cx={1660} cy={180} r={90} fill="#FFE08A" />
    <circle cx={1660} cy={180} r={130} fill="#FFE08A" opacity={0.25} />
    <Awan y={170} skala={1} kecepatan={0.4} awal={200} />
    <Awan y={290} skala={0.7} kecepatan={0.25} awal={1100} />
    <ellipse cx={500} cy={1020} rx={1100} ry={300} fill="#8FCB7C" />
    <ellipse cx={1600} cy={1060} rx={900} ry={300} fill="#7BBE6A" />
    {/* pohon */}
    <rect x={240} y={500} width={60} height={300} rx={20} fill="#9A6B47" />
    <circle cx={270} cy={460} r={150} fill="#5FA35A" />
    <circle cx={190} cy={520} r={90} fill="#6DB566" />
    {[520, 1360, 1500, 1720, 760].map((x, i) => (
      <BungaGoyang key={x} x={x} y={900 + (i % 2) * 40} warnaKelopak={i % 2 ? '#F7A6C1' : '#FFD36E'} i={i} />
    ))}
    <Burung seed={1} y={140} />
    <Burung seed={4} y={210} skala={0.7} />
    <KupuKupu seed={0} y={620} warnaSayap="#F7A6C1" />
    <KupuKupu seed={3} y={720} warnaSayap="#FFD36E" />
    <DaunJatuh jumlah={6} warnaDaun="#7CBF6E" />
  </>
);

const Masjid = () => (
  <>
    <defs>
      <linearGradient id="langitSore" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#F7C59F" />
        <stop offset="1" stopColor="#FCE8D2" />
      </linearGradient>
    </defs>
    <rect width={W} height={H} fill="url(#langitSore)" />
    <Awan y={160} skala={0.8} kecepatan={0.2} awal={400} />
    <Burung seed={5} y={260} warnaBurung="#8A6A5A" />
    <Burung seed={7} y={320} skala={0.7} warnaBurung="#8A6A5A" />
    {/* menara */}
    <rect x={1500} y={170} width={70} height={560} fill="#EDE3D1" />
    <path d="M1490 180 L1535 90 L1580 180 Z" fill="#3F8C7A" />
    <rect x={1490} y={330} width={90} height={22} fill="#D9CDB6" />
    {/* bangunan + kubah */}
    <rect x={560} y={440} width={900} height={300} fill="#F3EBDD" />
    <path d="M720 450 Q1010 140 1300 450 Z" fill="#3F8C7A" />
    <line x1={1010} y1={210} x2={1010} y2={150} stroke="#E8B04A" strokeWidth={8} />
    <circle cx={1010} cy={140} r={14} fill="#E8B04A" />
    {[640, 820, 1180, 1360].map((x) => (
      <path key={x} d={`M${x} 700 L${x} 560 Q${x + 40} 500 ${x + 80} 560 L${x + 80} 700 Z`} fill="#C9B79A" />
    ))}
    <path d="M960 740 L960 590 Q1010 530 1060 590 L1060 740 Z" fill="#8E6E4E" />
    <rect y={740} width={W} height={340} fill="#D9C7A6" />
    <path d="M900 1080 L960 740 L1060 740 L1120 1080 Z" fill="#E9DBC0" />
  </>
);

const Dapur = () => (
  <>
    <rect width={W} height={H} fill="#DCF0E8" />
    {/* ubin */}
    {Array.from({ length: 12 }, (_, i) => (
      <line key={i} x1={i * 170} y1={330} x2={i * 170} y2={560} stroke="#C5E3D7" strokeWidth={4} />
    ))}
    <rect y={560} width={W} height={260} fill="#F2E3C9" />
    <rect y={560} width={W} height={30} fill="#D9C3A0" />
    <rect y={820} width={W} height={260} fill="#E7D3B3" />
    {/* lemari atas */}
    <rect x={120} y={80} width={600} height={220} rx={14} fill="#F7F1E3" stroke="#D9C3A0" strokeWidth={6} />
    <line x1={420} y1={80} x2={420} y2={300} stroke="#D9C3A0" strokeWidth={6} />
    {/* kulkas */}
    <rect x={1560} y={160} width={260} height={660} rx={24} fill="#F4F8FA" stroke="#C9D6DD" strokeWidth={6} />
    <line x1={1560} y1={420} x2={1820} y2={420} stroke="#C9D6DD" strokeWidth={6} />
    {/* buah di meja */}
    <ellipse cx={900} cy={540} rx={130} ry={26} fill="#FFFFFF" />
    <circle cx={860} cy={512} r={30} fill="#F07C6B" />
    <circle cx={920} cy={508} r={32} fill="#F7C04A" />
    <circle cx={970} cy={520} r={24} fill="#8BC56B" />
    {/* cangkir teh hangat */}
    <rect x={1180} y={500} width={56} height={52} rx={10} fill="#FFFFFF" stroke="#D9C3A0" strokeWidth={4} />
    <path d="M1236 512 q20 0 20 16 q0 16 -20 16" stroke="#D9C3A0" strokeWidth={6} fill="none" />
    <Uap x={1208} y={492} />
    <SinarJendela x={1000} y={300} lebar={360} tinggi={520} />
    <Debu jumlah={10} x={700} y={320} lebar={600} tinggi={450} />
  </>
);

const LangitMalam = () => (
  <>
    <defs>
      <linearGradient id="langitMalam" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#141B3D" />
        <stop offset="1" stopColor="#3B3F7A" />
      </linearGradient>
    </defs>
    <rect width={W} height={H} fill="url(#langitMalam)" />
    <Bintang jumlah={70} seed={11} tinggiMaks={720} />
    <Bulan x={1500} y={230} r={90} id="bulan-langit" />
    <BintangJatuh />
    <KunangKunang jumlah={10} tinggiMaks={900} seed={2} />
    {/* bukit pasir */}
    <path d={`M0 820 Q480 700 960 830 T${W} 800 L${W} ${H} L0 ${H} Z`} fill="#2C2A55" />
    <path d={`M0 920 Q560 820 1200 930 T${W} 900 L${W} ${H} L0 ${H} Z`} fill="#232046" />
  </>
);

const Gurun = () => (
  <>
    <defs>
      <linearGradient id="langitGurun" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#F9C88B" />
        <stop offset="1" stopColor="#FDEBCB" />
      </linearGradient>
    </defs>
    <rect width={W} height={H} fill="url(#langitGurun)" />
    <circle cx={1450} cy={260} r={110} fill="#FFE7A6" />
    <circle cx={1450} cy={260} r={170} fill="#FFE7A6" opacity={0.25} />
    <Awan y={180} skala={0.7} kecepatan={0.15} awal={300} />
    <path d={`M0 700 Q400 600 800 690 T1600 660 T${W} 680 L${W} ${H} L0 ${H} Z`} fill="#EBC28A" />
    <path d={`M0 820 Q500 720 1000 820 T${W} 790 L${W} ${H} L0 ${H} Z`} fill="#E2B074" />
    {/* pohon kurma */}
    {[260, 1660].map((x, i) => (
      <g key={x} transform={`translate(${x} ${720 + i * 30})`}>
        <path d="M0 0 Q-10 -120 10 -240" stroke="#8C6440" strokeWidth={22} fill="none" strokeLinecap="round" />
        {[-70, -30, 10, 50, 90].map((a) => (
          <ellipse key={a} cx={10} cy={-240} rx={90} ry={20} fill="#5E9B4E" transform={`rotate(${a + 180} 10 -240) translate(70 0)`} />
        ))}
      </g>
    ))}
    {/* unta kecil di kejauhan */}
    <g transform="translate(1180 700)" fill="#B98552" opacity={0.75}>
      <ellipse cx={0} cy={0} rx={50} ry={22} />
      <circle cx={-14} cy={-18} r={16} />
      <path d="M40 -6 Q66 -40 78 -44 L86 -36 Q70 -30 56 2 Z" />
      {[-34, -14, 18, 34].map((x) => (
        <rect key={x} x={x - 4} y={10} width={8} height={44} rx={4} />
      ))}
    </g>
  </>
);

const Laut = () => {
  const frame = useCurrentFrame();
  const ombak = (y: number, warnaOmbak: string, fase: number, amp: number) => {
    const g = Math.sin(frame / 25 + fase) * 30;
    return <path d={`M0 ${y} Q240 ${y - amp} 480 ${y} T960 ${y} T1440 ${y} T1920 ${y} L${W} ${H} L0 ${H} Z`} fill={warnaOmbak} transform={`translate(${g} 0)`} />;
  };
  return (
    <>
      <defs>
        <linearGradient id="langitLaut" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8FD0F2" />
          <stop offset="1" stopColor="#DDF3FC" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#langitLaut)" />
      <circle cx={400} cy={220} r={90} fill="#FFE08A" />
      <Awan y={160} skala={1} kecepatan={0.3} awal={900} />
      {ombak(560, '#5BB4E0', 0, 30)}
      {ombak(660, '#3E9ED3', 1.5, 36)}
      {ombak(780, '#2C86C0', 3, 40)}
      <path d={`M0 920 Q600 880 1200 930 T${W} 900 L${W} ${H} L0 ${H} Z`} fill="#F3DDB0" />
      {/* perahu layar kecil */}
      <g transform={`translate(${1300 + Math.sin(frame / 40) * 20} ${590 + Math.sin(frame / 18) * 6})`}>
        <path d="M-70 0 L70 0 L50 30 L-50 30 Z" fill="#B5784B" />
        <line x1={0} y1={0} x2={0} y2={-120} stroke="#6B4A30" strokeWidth={6} />
        <path d="M6 -116 L70 -10 L6 -10 Z" fill="#FFFFFF" />
      </g>
    </>
  );
};

const Gunung = () => (
  <>
    <defs>
      <linearGradient id="langitGunung" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#A8DBF5" />
        <stop offset="1" stopColor="#EAF7FC" />
      </linearGradient>
    </defs>
    <rect width={W} height={H} fill="url(#langitGunung)" />
    <Awan y={150} skala={1.1} kecepatan={0.25} awal={100} />
    <Awan y={260} skala={0.7} kecepatan={0.18} awal={1200} />
    <path d="M-100 820 L420 260 L940 820 Z" fill="#7E9CB8" />
    <path d="M420 260 L330 360 L380 350 L420 390 L470 345 L510 360 Z" fill="#FFFFFF" />
    <path d="M700 840 L1260 200 L1820 840 Z" fill="#6A8BAA" />
    <path d="M1260 200 L1160 314 L1215 300 L1260 345 L1310 298 L1362 314 Z" fill="#FFFFFF" />
    <path d={`M0 760 Q480 680 960 770 T${W} 740 L${W} ${H} L0 ${H} Z`} fill="#8FCB7C" />
    <path d={`M0 880 Q560 800 1200 890 T${W} 860 L${W} ${H} L0 ${H} Z`} fill="#7BBE6A" />
  </>
);

const Fajar = () => (
  <>
    <defs>
      <linearGradient id="langitFajar" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#3B4A8C" />
        <stop offset="0.45" stopColor="#C98BB5" />
        <stop offset="0.75" stopColor="#FFC48A" />
        <stop offset="1" stopColor="#FFE6B8" />
      </linearGradient>
    </defs>
    <rect width={W} height={H} fill="url(#langitFajar)" />
    <Bintang jumlah={25} seed={5} tinggiMaks={320} />
    <circle cx={960} cy={760} r={170} fill="#FFE29A" />
    <circle cx={960} cy={760} r={280} fill="#FFE29A" opacity={0.25} />
    <path d={`M0 760 Q480 700 960 770 T${W} 740 L${W} ${H} L0 ${H} Z`} fill="#5C6E9E" />
    <path d={`M0 860 Q560 800 1200 870 T${W} 850 L${W} ${H} L0 ${H} Z`} fill="#46588A" />
    {/* siluet masjid kecil */}
    <g transform="translate(1500 760)" fill="#3A4778">
      <rect x={-90} y={-70} width={180} height={80} />
      <path d="M-60 -66 Q0 -150 60 -66 Z" />
      <rect x={110} y={-170} width={24} height={180} />
      <path d="M106 -166 L122 -200 L138 -166 Z" />
    </g>
  </>
);

const Sekolah = () => (
  <>
    <rect width={W} height={H} fill="#FBEFD9" />
    <rect y={780} width={W} height={300} fill="#CFA77A" />
    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
      <rect key={i} x={i * 240} y={780} width={6} height={300} fill="#B88E62" opacity={0.6} />
    ))}
    {/* papan tulis */}
    <rect x={560} y={130} width={800} height={400} rx={18} fill="#2F5E4E" stroke="#B07E52" strokeWidth={18} />
    <path d="M640 250 q40 -50 80 0 t80 0" stroke="#F4F1E6" strokeWidth={7} fill="none" strokeLinecap="round" opacity={0.85} />
    <text x={960} y={330} textAnchor="middle" fontSize={72} fill="#F4F1E6" fontFamily="Nunito, sans-serif" fontWeight={800} opacity={0.9}>
      1 + 2 = 3
    </text>
    <circle cx={1220} cy={420} r={34} fill="none" stroke="#F5C842" strokeWidth={6} />
    <rect x={600} y={530} width={720} height={16} rx={6} fill="#B07E52" />
    {/* jam dinding */}
    <circle cx={260} cy={220} r={70} fill="#FFFFFF" stroke="#E07A5F" strokeWidth={12} />
    <JarumJam x={260} y={220} />
    {/* jendela */}
    <rect x={1480} y={170} width={320} height={300} rx={14} fill="#BFE3F5" stroke="#FFFFFF" strokeWidth={14} />
    <svg x={1487} y={177} width={306} height={286}>
      <Burung seed={8} y={100} skala={0.6} />
    </svg>
    <line x1={1640} y1={170} x2={1640} y2={470} stroke="#FFFFFF" strokeWidth={10} />
    <SinarJendela x={1480} y={470} lebar={320} tinggi={380} />
    {/* meja-meja di belakang */}
    {[180, 1500].map((x) => (
      <g key={x}>
        <rect x={x} y={640} width={260} height={30} rx={8} fill="#D9A066" />
        <rect x={x + 20} y={670} width={18} height={140} fill="#9A6B47" />
        <rect x={x + 222} y={670} width={18} height={140} fill="#9A6B47" />
      </g>
    ))}
    <Debu jumlah={10} x={1300} y={480} lebar={500} tinggi={360} />
  </>
);

const JarumJam: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  const frame = useCurrentFrame();
  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={y - 40} stroke="#2E2A3B" strokeWidth={7} strokeLinecap="round" transform={`rotate(${frame * 0.6} ${x} ${y})`} />
      <line x1={x} y1={y} x2={x + 28} y2={y} stroke="#2E2A3B" strokeWidth={9} strokeLinecap="round" />
      <circle cx={x} cy={y} r={7} fill="#E07A5F" />
    </g>
  );
};

const HalamanRumah = () => (
  <>
    <defs>
      <linearGradient id="langitHalaman" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#A7DDF7" />
        <stop offset="1" stopColor="#EAF7FD" />
      </linearGradient>
    </defs>
    <rect width={W} height={H} fill="url(#langitHalaman)" />
    <Awan y={140} skala={0.9} kecepatan={0.35} awal={500} />
    <Awan y={240} skala={0.6} kecepatan={0.2} awal={1400} />
    {/* rumah */}
    <rect x={1180} y={330} width={600} height={430} fill="#F6E1C3" />
    <path d="M1130 350 L1480 140 L1830 350 Z" fill="#D9634F" />
    <rect x={1420} y={540} width={130} height={220} rx={10} fill="#9A6B47" />
    <circle cx={1530} cy={650} r={8} fill="#E8B04A" />
    <rect x={1240} y={430} width={130} height={110} rx={8} fill="#BFE3F5" stroke="#FFFFFF" strokeWidth={10} />
    <rect x={1610} y={430} width={130} height={110} rx={8} fill="#BFE3F5" stroke="#FFFFFF" strokeWidth={10} />
    {/* pagar */}
    {Array.from({ length: 22 }, (_, i) => (
      <path key={i} d={`M${i * 56 - 10} 820 L${i * 56 - 10} 690 L${i * 56 + 10} 670 L${i * 56 + 30} 690 L${i * 56 + 30} 820 Z`} fill="#FFFFFF" stroke="#E2D6C2" strokeWidth={3} />
    ))}
    <rect y={720} width={W} height={18} fill="#FFFFFF" />
    <rect y={800} width={W} height={280} fill="#8FCB7C" />
    <path d="M1400 1080 L1460 800 L1520 800 L1600 1080 Z" fill="#E9DBC0" />
    {/* pohon mangga */}
    <rect x={250} y={420} width={60} height={400} rx={20} fill="#9A6B47" />
    <circle cx={280} cy={380} r={170} fill="#5FA35A" />
    <circle cx={180} cy={450} r={100} fill="#6DB566" />
    {[[220, 360], [330, 420], [280, 300]].map(([x, y]) => (
      <ellipse key={`${x}-${y}`} cx={x} cy={y} rx={16} ry={22} fill="#F2B33A" />
    ))}
    {[640, 820, 1000].map((x, i) => (
      <BungaGoyang key={x} x={x} y={880 + (i % 2) * 30} warnaKelopak={i % 2 ? '#F7A6C1' : '#FFD36E'} i={i} />
    ))}
    <KupuKupu seed={5} y={660} warnaSayap="#F7A6C1" />
    <Burung seed={9} y={180} skala={0.8} />
  </>
);

const Perpustakaan = () => (
  <>
    <rect width={W} height={H} fill="#F3E3C8" />
    <rect y={810} width={W} height={270} fill="#B98A5E" />
    <ellipse cx={960} cy={930} rx={640} ry={80} fill="#7FA6A0" opacity={0.6} />
    {/* rak buku */}
    {[120, 1380].map((rx) => (
      <g key={rx}>
        <rect x={rx} y={140} width={420} height={680} rx={12} fill="#8E5E3C" />
        {[260, 420, 580, 740].map((y, r) => (
          <g key={y}>
            {Array.from({ length: 9 }, (_, i) => (
              <rect
                key={i}
                x={rx + 22 + i * 43}
                y={y - 120 + ((i + r) % 3) * 12}
                width={36}
                height={120 - ((i + r) % 3) * 12}
                rx={4}
                fill={['#D9634F', '#4F8FD9', '#E8B04A', '#5BAE7A', '#A06BC8', '#F2A3B3'][(i + r * 2) % 6]}
              />
            ))}
            <rect x={rx} y={y} width={420} height={18} fill="#6E4630" />
          </g>
        ))}
      </g>
    ))}
    {/* jendela bulat & kaligrafi */}
    <circle cx={960} cy={300} r={150} fill="#BFE3F5" stroke="#FFFFFF" strokeWidth={16} />
    <line x1={810} y1={300} x2={1110} y2={300} stroke="#FFFFFF" strokeWidth={10} />
    <line x1={960} y1={150} x2={960} y2={450} stroke="#FFFFFF" strokeWidth={10} />
    <SinarJendela x={810} y={450} lebar={300} tinggi={360} />
    {/* meja baca & lampu */}
    <rect x={760} y={640} width={400} height={28} rx={10} fill="#9A6B47" />
    <rect x={790} y={668} width={20} height={150} fill="#7A5236" />
    <rect x={1110} y={668} width={20} height={150} fill="#7A5236" />
    <rect x={840} y={610} width={120} height={30} rx={4} fill="#4F8FD9" />
    <rect x={1060} y={560} width={12} height={80} fill="#5A4A3A" />
    <path d="M1020 560 L1110 560 L1090 510 L1040 510 Z" fill="#5BAE7A" />
    <circle cx={1066} cy={600} r={90} fill="#FFE2A6" opacity={0.18} />
    <Debu jumlah={12} x={700} y={400} lebar={520} tinggi={400} />
  </>
);

const TempatWudhu = () => {
  const frame = useCurrentFrame();
  return (
    <>
      <rect width={W} height={H} fill="#E4F2F1" />
      {/* ubin dinding */}
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1={i * 170} y1={0} x2={i * 170} y2={760} stroke="#CFE4E2" strokeWidth={4} />
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <line key={i} x1={0} y1={i * 170} x2={W} y2={i * 170} stroke="#CFE4E2" strokeWidth={4} />
      ))}
      {/* lengkung & pola islami */}
      {[420, 960, 1500].map((x) => (
        <g key={x}>
          <path d={`M${x - 170} 520 L${x - 170} 300 Q${x} 120 ${x + 170} 300 L${x + 170} 520 Z`} fill="#F7FBFA" stroke="#3F8C7A" strokeWidth={10} />
          <path d={`M${x} 230 l30 30 l-30 30 l-30 -30 Z`} fill="#E8B04A" />
        </g>
      ))}
      {/* deretan keran + air mengalir */}
      <rect x={160} y={560} width={1600} height={40} rx={12} fill="#B9C4CC" />
      {[320, 640, 960, 1280, 1600].map((x, i) => (
        <g key={x}>
          <rect x={x - 12} y={600} width={24} height={50} fill="#9AA6AE" />
          <rect x={x - 26} y={640} width={52} height={20} rx={8} fill="#C9D3DA" />
          {i % 2 === 0 ? (
            <rect x={x - 5} y={660} width={10} height={110} rx={5} fill="#8FD3F0" opacity={0.6 + 0.2 * Math.sin(frame / 4 + i)} />
          ) : null}
        </g>
      ))}
      <rect x={120} y={760} width={1680} height={60} rx={14} fill="#9FCFD6" />
      <rect y={820} width={W} height={260} fill="#C9E0DF" />
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1={i * 170} y1={820} x2={i * 170 - 80} y2={1080} stroke="#B6D2D1" strokeWidth={4} />
      ))}
      <Debu jumlah={8} x={500} y={400} lebar={900} tinggi={300} />
    </>
  );
};

/** Lapisan gerak suasana tambahan di atas latar (video hafalan). */
export const LapisanSuasana: React.FC<{ suasana: SuasanaId[] }> = ({ suasana }) => (
  <svg viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
    {suasana.includes('cahaya') && <Cahaya />}
    {suasana.includes('bintang') && <BintangKelip />}
    {suasana.includes('burung') && (
      <>
        <Burung seed={11} y={200} />
        <Burung seed={13} y={280} skala={0.7} />
        <Burung seed={17} y={150} skala={0.8} />
      </>
    )}
    {suasana.includes('kupu') && (
      <>
        <KupuKupu seed={21} y={600} warnaSayap="#F7A6C1" />
        <KupuKupu seed={23} y={700} warnaSayap="#FFD36E" />
      </>
    )}
    {suasana.includes('daun') && <DaunJatuh jumlah={8} warnaDaun="#7CBF6E" seed={31} />}
    {suasana.includes('hujan') && <Hujan />}
  </svg>
);

export const Latar: React.FC<{ id: LatarId }> = ({ id }) => (
  <svg viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
    {id === 'kamar-malam' && <KamarMalam />}
    {id === 'ruang-tamu' && <RuangTamu />}
    {id === 'taman' && <Taman />}
    {id === 'masjid' && <Masjid />}
    {id === 'dapur' && <Dapur />}
    {id === 'langit-malam' && <LangitMalam />}
    {id === 'gurun' && <Gurun />}
    {id === 'laut' && <Laut />}
    {id === 'gunung' && <Gunung />}
    {id === 'fajar' && <Fajar />}
    {id === 'sekolah' && <Sekolah />}
    {id === 'halaman-rumah' && <HalamanRumah />}
    {id === 'perpustakaan' && <Perpustakaan />}
    {id === 'tempat-wudhu' && <TempatWudhu />}
  </svg>
);

/** Latar gelap → teks dibuat terang. */
export const LATAR_GELAP: LatarId[] = ['kamar-malam', 'langit-malam', 'fajar'];
