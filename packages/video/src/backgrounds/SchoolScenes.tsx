// School backgrounds for scenes around school life (arriving, the yard, the canteen), in the same flat style as
// the other backgrounds. Stage is 1920×1080; characters stand at y≈890.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Burung, Debu, SinarJendela } from './Ambience';

const W = 1920;
const H = 1080;
const GROUND_Y = 800;

/** Slowly drifting cloud. */
const Cloud: React.FC<{ y: number; scale: number; speed: number; start: number }> = ({ y, scale, speed, start }) => {
  const frame = useCurrentFrame();
  const x = ((start + frame * speed) % (W + 400)) - 200;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={0.95}>
      <ellipse cx={0} cy={0} rx={90} ry={40} fill="#FFFFFF" />
      <ellipse cx={60} cy={-22} rx={70} ry={45} fill="#FFFFFF" />
      <ellipse cx={120} cy={4} rx={80} ry={36} fill="#FFFFFF" />
    </g>
  );
};

const MorningSky = () => (
  <>
    <defs>
      <linearGradient id="schoolSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#8FD0F2" />
        <stop offset="1" stopColor="#E3F4FB" />
      </linearGradient>
    </defs>
    <rect width={W} height={H} fill="url(#schoolSky)" />
    <circle cx={1700} cy={150} r={70} fill="#FFE59A" opacity={0.9} />
    <Cloud y={120} scale={1} speed={0.25} start={100} />
    <Cloud y={200} scale={0.7} speed={0.18} start={900} />
  </>
);

/** Classroom block: cream walls, red roof and a row of windows. */
const SchoolBuilding: React.FC<{ x: number; y: number; width: number; height: number; doors?: boolean }> = ({ x, y, width, height, doors = false }) => {
  const windows = Math.floor(width / 150);
  return (
    <g>
      <path d={`M${x - 30} ${y} L${x + width / 2} ${y - 110} L${x + width + 30} ${y} Z`} fill="#D9644F" />
      <rect x={x - 30} y={y - 6} width={width + 60} height={16} fill="#B84F3E" />
      <rect x={x} y={y} width={width} height={height} fill="#FBEBC9" />
      <rect x={x} y={y + height - 26} width={width} height={26} fill="#E9C99A" />
      {Array.from({ length: windows }, (_, i) => {
        const wx = x + 40 + i * ((width - 80) / windows);
        const isDoor = doors && i % 2 === 1;
        return isDoor ? (
          <rect key={i} x={wx + 20} y={y + height - 170} width={80} height={144} rx={6} fill="#5B8FD1" stroke="#F8F2E4" strokeWidth={6} />
        ) : (
          <g key={i}>
            <rect x={wx + 10} y={y + 50} width={100} height={90} rx={6} fill="#BFE3F5" stroke="#F8F2E4" strokeWidth={8} />
            <line x1={wx + 60} y1={y + 50} x2={wx + 60} y2={y + 140} stroke="#F8F2E4" strokeWidth={5} />
          </g>
        );
      })}
    </g>
  );
};

/** Indonesian flag on a pole, waving gently. */
const Flag: React.FC<{ x: number; top: number }> = ({ x, top }) => {
  const frame = useCurrentFrame();
  const wave = (offset: number) => Math.sin(frame / 10 + offset) * 6;
  const cloth = (y0: number) =>
    `M${x + 6} ${y0} Q${x + 50} ${y0 + wave(0)} ${x + 96} ${y0 + wave(1)} L${x + 96} ${y0 + 32 + wave(1)} Q${x + 50} ${y0 + 32 + wave(0)} ${x + 6} ${y0 + 32} Z`;
  return (
    <g>
      <rect x={x - 4} y={top} width={10} height={GROUND_Y - top + 20} rx={4} fill="#C9CED6" />
      <circle cx={x + 1} cy={top} r={9} fill="#E8C35A" />
      <path d={cloth(top + 12)} fill="#E03A3A" />
      <path d={cloth(top + 44)} fill="#FFFFFF" />
      <rect x={x - 40} y={GROUND_Y + 4} width={82} height={22} rx={6} fill="#B9B2A6" />
    </g>
  );
};

const Tree: React.FC<{ x: number; y: number; scale?: number }> = ({ x, y, scale = 1 }) => {
  const frame = useCurrentFrame();
  const sway = Math.sin(frame / 40 + x) * 2;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale}) rotate(${sway} 0 0)`}>
      <rect x={-16} y={-200} width={32} height={200} rx={10} fill="#8A5A3C" />
      <ellipse cx={0} cy={-250} rx={120} ry={110} fill="#5FA35A" />
      <ellipse cx={-50} cy={-290} rx={70} ry={60} fill="#74B86A" />
      <ellipse cx={60} cy={-220} rx={60} ry={50} fill="#4F9350" />
    </g>
  );
};

const Bush: React.FC<{ x: number; y: number; width: number }> = ({ x, y, width }) => (
  <g>
    <ellipse cx={x} cy={y} rx={width / 2} ry={42} fill="#5FA35A" />
    <ellipse cx={x - width / 4} cy={y - 18} rx={width / 4} ry={34} fill="#74B86A" />
    <ellipse cx={x + width / 4} cy={y - 10} rx={width / 4} ry={30} fill="#6AAE62" />
  </g>
);

/** In front of the school gate in the morning: arch with the school sign, fence, open gate and the sidewalk. */
export const SchoolGate = () => (
  <>
    <MorningSky />
    <SchoolBuilding x={160} y={330} width={1600} height={330} />
    <Tree x={120} y={GROUND_Y} scale={1.1} />
    <Tree x={1820} y={GROUND_Y} scale={1.05} />
    {/* yard behind the fence */}
    <rect y={660} width={W} height={GROUND_Y - 660} fill="#D8CFB6" />
    {/* fence */}
    {Array.from({ length: 33 }, (_, i) => {
      const fx = i * 60;
      if (fx > 640 && fx < 1280) return null;
      return <rect key={i} x={fx + 18} y={600} width={14} height={200} rx={6} fill="#3F8F6E" />;
    })}
    <rect x={0} y={630} width={660} height={14} fill="#2F7A5C" />
    <rect x={1260} y={630} width={660} height={14} fill="#2F7A5C" />
    <rect x={0} y={740} width={660} height={14} fill="#2F7A5C" />
    <rect x={1260} y={740} width={660} height={14} fill="#2F7A5C" />
    {/* gate pillars, arch and sign */}
    <rect x={620} y={420} width={60} height={390} rx={8} fill="#F1E3C6" stroke="#D3BE95" strokeWidth={6} />
    <rect x={1240} y={420} width={60} height={390} rx={8} fill="#F1E3C6" stroke="#D3BE95" strokeWidth={6} />
    <path d="M620 430 Q960 300 1300 430 L1300 470 Q960 345 620 470 Z" fill="#3E6E9E" />
    <rect x={760} y={330} width={400} height={84} rx={18} fill="#FFFFFF" stroke="#3E6E9E" strokeWidth={8} />
    <text x={960} y={386} textAnchor="middle" fontSize={44} fontWeight={800} fill="#2E5782" fontFamily="Fredoka, sans-serif">
      SEKOLAH CERIA
    </text>
    {/* open gate leaves */}
    <path d="M680 600 L760 640 L760 800 L680 800 Z" fill="#3F8F6E" opacity={0.9} />
    <path d="M1240 600 L1160 640 L1160 800 L1240 800 Z" fill="#3F8F6E" opacity={0.9} />
    {/* sidewalk */}
    <rect y={GROUND_Y} width={W} height={H - GROUND_Y} fill="#CFC6B5" />
    {Array.from({ length: 12 }, (_, i) => (
      <rect key={i} x={i * 170} y={GROUND_Y} width={4} height={H - GROUND_Y} fill="#B8AE9B" />
    ))}
    <Bush x={360} y={790} width={300} />
    <Bush x={1560} y={790} width={320} />
    <svg x={0} y={0} width={W} height={400}>
      <Burung seed={4} y={180} skala={0.7} />
    </svg>
  </>
);

/** School yard: long classroom block with doors, the flagpole and a few trees. */
export const SchoolYard = () => (
  <>
    <MorningSky />
    <SchoolBuilding x={80} y={300} width={1760} height={420} doors />
    {/* corridor in front of the classrooms */}
    <rect x={80} y={690} width={1760} height={30} fill="#D9B98A" />
    {/* yard */}
    <rect y={720} width={W} height={H - 720} fill="#A8CF7E" />
    <rect y={720} width={W} height={18} fill="#93BD6A" />
    <ellipse cx={960} cy={960} rx={700} ry={70} fill="#9CC673" />
    <Flag x={1500} top={380} />
    <Tree x={260} y={760} scale={0.9} />
    {/* bench */}
    <rect x={480} y={740} width={200} height={16} rx={6} fill="#C98F5B" />
    <rect x={495} y={756} width={12} height={44} fill="#8A5A3C" />
    <rect x={653} y={756} width={12} height={44} fill="#8A5A3C" />
    <svg x={0} y={0} width={W} height={360}>
      <Burung seed={11} y={150} skala={0.6} />
    </svg>
  </>
);

/** School canteen: counter with snacks and drinks, menu board, tables and hanging lamps. */
export const SchoolCanteen = () => (
  <>
    <rect width={W} height={H} fill="#FCEBD2" />
    <rect y={GROUND_Y} width={W} height={H - GROUND_Y} fill="#E3B98B" />
    {Array.from({ length: 10 }, (_, i) => (
      <rect key={i} x={i * 200} y={GROUND_Y} width={5} height={H - GROUND_Y} fill="#CFA375" />
    ))}
    {/* menu board */}
    <rect x={700} y={110} width={520} height={210} rx={18} fill="#2F5E4E" stroke="#B07E52" strokeWidth={14} />
    <text x={960} y={180} textAnchor="middle" fontSize={52} fontWeight={800} fill="#F5C842" fontFamily="Fredoka, sans-serif">
      KANTIN
    </text>
    {['Nasi', 'Roti', 'Buah', 'Susu'].map((item, i) => (
      <text key={item} x={780 + i * 120} y={260} textAnchor="middle" fontSize={30} fill="#F4F1E6" fontFamily="Fredoka, sans-serif">
        {item}
      </text>
    ))}
    {/* serving counter */}
    <rect x={560} y={480} width={800} height={50} rx={10} fill="#C98F5B" />
    <rect x={580} y={530} width={760} height={200} fill="#E9A85F" />
    {[640, 830, 1020, 1210].map((x) => (
      <rect key={x} x={x} y={560} width={110} height={140} rx={12} fill="#F3C07E" />
    ))}
    {/* snacks and drinks on the counter */}
    {[620, 700, 780].map((x, i) => (
      <ellipse key={x} cx={x} cy={470} rx={34} ry={16} fill={['#F28C8C', '#F5C842', '#8FD08A'][i]} />
    ))}
    {[1100, 1160, 1220, 1280].map((x) => (
      <g key={x}>
        <rect x={x} y={410} width={36} height={70} rx={8} fill="#BFE3F5" stroke="#FFFFFF" strokeWidth={4} />
        <rect x={x} y={440} width={36} height={14} fill="#5B8FD1" />
      </g>
    ))}
    {/* hanging lamps */}
    {[420, 960, 1500].map((x) => (
      <g key={x}>
        <line x1={x} y1={0} x2={x} y2={60} stroke="#7A6A5A" strokeWidth={4} />
        <path d={`M${x - 40} 90 Q${x} 40 ${x + 40} 90 Z`} fill="#F5C842" />
        <ellipse cx={x} cy={96} rx={70} ry={18} fill="#FFE59A" opacity={0.35} />
      </g>
    ))}
    {/* tables with benches on both sides */}
    {[200, 1500].map((x) => (
      <g key={x}>
        <rect x={x} y={640} width={260} height={24} rx={8} fill="#D9A066" />
        <rect x={x + 20} y={664} width={16} height={120} fill="#9A6B47" />
        <rect x={x + 224} y={664} width={16} height={120} fill="#9A6B47" />
        <rect x={x - 20} y={720} width={300} height={16} rx={6} fill="#C98F5B" />
      </g>
    ))}
    <SinarJendela x={60} y={200} lebar={300} tinggi={500} />
    <Debu jumlah={8} x={600} y={300} lebar={700} tinggi={400} />
  </>
);
