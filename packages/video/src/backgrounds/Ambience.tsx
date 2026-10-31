import React from 'react';
import { useCurrentFrame } from 'remotion';
import { random } from '../characters/motion';

// Gerak moods di latar supaya adegan tidak terasa diam.
// Semua pelan & lembut, tidak ada kedip cepat.

const W = 1920;

export const KupuKupu: React.FC<{ seed: number; y: number; warnaSayap: string }> = ({ seed, y, warnaSayap }) => {
  const f = useCurrentFrame() + seed * 200;
  const x = ((f * 2.2 + seed * 700) % (W + 300)) - 150;
  const yy = y + Math.sin(f / 22) * 50 + Math.sin(f / 9) * 10;
  const kepak = 0.35 + Math.abs(Math.sin(f / 3)) * 0.65;
  return (
    <g transform={`translate(${x} ${yy}) rotate(${Math.sin(f / 15) * 12})`}>
      <g transform={`scale(${kepak} 1)`}>
        <ellipse cx={-14} cy={-8} rx={16} ry={12} fill={warnaSayap} />
        <ellipse cx={14} cy={-8} rx={16} ry={12} fill={warnaSayap} />
        <ellipse cx={-10} cy={8} rx={10} ry={8} fill={warnaSayap} opacity={0.85} />
        <ellipse cx={10} cy={8} rx={10} ry={8} fill={warnaSayap} opacity={0.85} />
      </g>
      <rect x={-2.5} y={-14} width={5} height={28} rx={2.5} fill="#5A4636" />
    </g>
  );
};

export const Burung: React.FC<{ seed: number; y: number; skala?: number; warnaBurung?: string }> = ({ seed, y, skala = 1, warnaBurung = '#55607A' }) => {
  const f = useCurrentFrame() + seed * 300;
  const x = ((f * 3 + seed * 500) % (W + 400)) - 200;
  const kepak = Math.sin(f / 4) * 12;
  return (
    <g transform={`translate(${x} ${y + Math.sin(f / 30) * 20}) scale(${skala})`}>
      <path d={`M-22 ${kepak} Q-11 -6 0 2 Q11 -6 22 ${kepak}`} stroke={warnaBurung} strokeWidth={5} fill="none" strokeLinecap="round" />
    </g>
  );
};

export const DaunJatuh: React.FC<{ jumlah: number; warnaDaun: string; seed?: number }> = ({ jumlah, warnaDaun, seed = 0 }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {Array.from({ length: jumlah }, (_, i) => {
        const periode = 260 + random(i + seed) * 160;
        const p = ((frame + random(i * 3 + seed) * periode) % periode) / periode;
        const x = random(i * 7 + seed) * W + Math.sin(p * Math.PI * 4 + i) * 60;
        const y = -40 + p * 1000;
        return (
          <g key={i} transform={`translate(${x} ${y}) rotate(${Math.sin(p * 12 + i) * 70})`} opacity={Math.min(1, (1 - p) * 4)}>
            <path d="M0 -12 Q10 0 0 12 Q-10 0 0 -12 Z" fill={warnaDaun} />
            <line x1={0} y1={-10} x2={0} y2={10} stroke="rgba(0,0,0,0.15)" strokeWidth={1.5} />
          </g>
        );
      })}
    </>
  );
};

/** Butiran debu berkilau yang melayang pelan dalam berkas cahaya. */
export const Debu: React.FC<{ jumlah: number; x: number; y: number; lebar: number; tinggi: number; warnaDebu?: string }> = ({
  jumlah,
  x,
  y,
  lebar,
  tinggi,
  warnaDebu = '#FFF6D8',
}) => {
  const frame = useCurrentFrame();
  return (
    <>
      {Array.from({ length: jumlah }, (_, i) => {
        const periode = 300 + random(i) * 200;
        const p = ((frame + random(i * 5) * periode) % periode) / periode;
        const px = x + random(i * 11) * lebar + Math.sin(p * 6 + i) * 20;
        const py = y + tinggi - p * tinggi;
        return <circle key={i} cx={px} cy={py} r={2 + random(i * 13) * 3} fill={warnaDebu} opacity={Math.sin(p * Math.PI) * 0.8} />;
      })}
    </>
  );
};

export const SinarJendela: React.FC<{ x: number; y: number; lebar: number; tinggi: number }> = ({ x, y, lebar, tinggi }) => {
  const frame = useCurrentFrame();
  const op = 0.16 + Math.sin(frame / 50) * 0.04;
  return (
    <path
      d={`M${x} ${y} L${x + lebar} ${y} L${x + lebar - 260} ${y + tinggi} L${x - 420} ${y + tinggi} Z`}
      fill="#FFF5D6"
      opacity={op}
    />
  );
};

export const Uap: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {[0, 1, 2].map((i) => {
        const p = ((frame + i * 30) % 90) / 90;
        const yy = y - p * 120;
        const goyang = Math.sin(p * 8 + i) * 12;
        return (
          <path
            key={i}
            d={`M${x + (i - 1) * 18 + goyang} ${yy} q10 -14 0 -28 q-10 -14 0 -28`}
            stroke="#FFFFFF"
            strokeWidth={7}
            fill="none"
            strokeLinecap="round"
            opacity={Math.sin(p * Math.PI) * 0.7}
          />
        );
      })}
    </>
  );
};

export const KunangKunang: React.FC<{ jumlah: number; tinggiMaks: number; seed?: number }> = ({ jumlah, tinggiMaks, seed = 0 }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {Array.from({ length: jumlah }, (_, i) => {
        const bx = random(i * 3 + seed) * W;
        const by = 300 + random(i * 7 + seed) * (tinggiMaks - 300);
        const x = bx + Math.sin(frame / (40 + i * 3) + i) * 60;
        const y = by + Math.cos(frame / (50 + i * 2) + i) * 40;
        const op = 0.4 + 0.6 * Math.max(0, Math.sin(frame / 25 + i * 2));
        return (
          <g key={i} opacity={op}>
            <circle cx={x} cy={y} r={14} fill="#FFF3A0" opacity={0.25} />
            <circle cx={x} cy={y} r={4} fill="#FFF8C8" />
          </g>
        );
      })}
    </>
  );
};

export const BintangJatuh: React.FC<{ periode?: number }> = ({ periode = 200 }) => {
  const frame = useCurrentFrame();
  const k = Math.floor(frame / periode);
  const t = (frame % periode) / 40;
  if (t > 1) return null;
  const x0 = 300 + random(k) * 1100;
  const y0 = 60 + random(k + 9) * 180;
  const x = x0 + t * 420;
  const y = y0 + t * 200;
  return (
    <g opacity={Math.sin(t * Math.PI)}>
      <line x1={x - 160} y1={y - 76} x2={x} y2={y} stroke="#FFF8E1" strokeWidth={4} strokeLinecap="round" opacity={0.6} />
      <circle cx={x} cy={y} r={5} fill="#FFFFFF" />
    </g>
  );
};

/** Bunga yang bergoyang tertiup angin. */
export const BungaGoyang: React.FC<{ x: number; y: number; warnaKelopak: string; i: number }> = ({ x, y, warnaKelopak, i }) => {
  const frame = useCurrentFrame();
  const sudut = Math.sin(frame / 25 + i) * 8;
  return (
    <g transform={`translate(${x} ${y + 50}) rotate(${sudut}) translate(0 -50)`}>
      <line x1={0} y1={0} x2={0} y2={50} stroke="#4E8F48" strokeWidth={6} />
      <ellipse cx={8} cy={30} rx={10} ry={5} fill="#5DA457" transform="rotate(-30 8 30)" />
      {[0, 72, 144, 216, 288].map((a) => (
        <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 14} cy={Math.sin((a * Math.PI) / 180) * 14} r={11} fill={warnaKelopak} />
      ))}
      <circle r={9} fill="#FFF3D6" />
    </g>
  );
};

/** Gorden yang bergoyang pelan. */
export const Gorden: React.FC<{ x: number; y: number; lebar: number; tinggi: number; warnaKain: string; kanan?: boolean }> = ({
  x,
  y,
  lebar,
  tinggi,
  warnaKain,
  kanan,
}) => {
  const frame = useCurrentFrame();
  const g = Math.sin(frame / 35 + (kanan ? 1 : 0)) * 10;
  const d = kanan
    ? `M${x + lebar} ${y} L${x} ${y} Q${x + 20 + g} ${y + tinggi * 0.5} ${x + 40 + g} ${y + tinggi} L${x + lebar} ${y + tinggi} Z`
    : `M${x} ${y} L${x + lebar} ${y} Q${x + lebar - 20 + g} ${y + tinggi * 0.5} ${x + lebar - 40 + g} ${y + tinggi} L${x} ${y + tinggi} Z`;
  return (
    <g>
      <path d={d} fill={warnaKain} />
      {[0.3, 0.6].map((r) => (
        <line key={r} x1={x + lebar * r} y1={y} x2={x + lebar * r + g * 0.5} y2={y + tinggi} stroke="rgba(0,0,0,0.08)" strokeWidth={6} />
      ))}
    </g>
  );
};

export const Hujan: React.FC<{ jumlah?: number }> = ({ jumlah = 70 }) => {
  const frame = useCurrentFrame();
  return (
    <g opacity={0.55}>
      {Array.from({ length: jumlah }, (_, i) => {
        const periode = 40 + random(i) * 20;
        const p = ((frame + random(i * 3) * periode) % periode) / periode;
        const x = random(i * 7) * (W + 200) - 100 + p * 60;
        const y = -60 + p * 1180;
        return <line key={i} x1={x} y1={y} x2={x + 10} y2={y + 34} stroke="#E8F4FF" strokeWidth={3} strokeLinecap="round" />;
      })}
    </g>
  );
};

/** Bintang berkelip lembut di seluruh langit (dipakai sebagai lapisan moods). */
export const BintangKelip: React.FC<{ jumlah?: number }> = ({ jumlah = 40 }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {Array.from({ length: jumlah }, (_, i) => {
        const x = random(i * 5 + 1) * W;
        const y = random(i * 9 + 2) * 620;
        const op = 0.35 + 0.55 * Math.max(0, Math.sin(frame / 30 + i * 1.7));
        const r = 3 + random(i) * 5;
        return (
          <path
            key={i}
            d={`M${x} ${y - r * 2} Q${x + r * 0.3} ${y - r * 0.3} ${x + r * 2} ${y} Q${x + r * 0.3} ${y + r * 0.3} ${x} ${y + r * 2} Q${x - r * 0.3} ${y + r * 0.3} ${x - r * 2} ${y} Q${x - r * 0.3} ${y - r * 0.3} ${x} ${y - r * 2} Z`}
            fill="#FFF6D0"
            opacity={op}
          />
        );
      })}
    </>
  );
};

/** Berkas cahaya lembut dari atas, berputar sangat pelan. */
export const Cahaya: React.FC = () => {
  const frame = useCurrentFrame();
  const putar = Math.sin(frame / 90) * 4;
  return (
    <g transform={`rotate(${putar} 960 -200)`} opacity={0.22 + Math.sin(frame / 45) * 0.05}>
      {[-50, -28, -8, 12, 32, 52].map((a, i) => (
        <path key={i} d="M960 -200 L900 1100 L1020 1100 Z" fill="#FFF7D6" transform={`rotate(${a} 960 -200)`} opacity={0.5 + (i % 2) * 0.3} />
      ))}
    </g>
  );
};
