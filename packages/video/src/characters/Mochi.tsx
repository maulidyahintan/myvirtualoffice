import React from 'react';
import { warna } from '../theme';
import { random, noiseS, type RigProps } from './motion';

/** Ekor dari beberapa ruas yang bergelombang seperti ekor kucing sungguhan. */
function jalurEkor(f: number, tegak: boolean): string {
  let x = 184;
  let y = 352;
  let sudut = tegak ? -50 : -20;
  const titik = [`M${x} ${y}`];
  for (let i = 0; i < 7; i++) {
    sudut += (tegak ? -3 : -12) + Math.sin(f / 11 - i * 0.7) * (tegak ? 6 : 12);
    const rad = (sudut * Math.PI) / 180;
    x += Math.cos(rad) * 16;
    y += Math.sin(rad) * 16;
    titik.push(`L${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return titik.join(' ');
}

/** Mochi tidur meringkuk: badan bulat rendah, kepala di atas kaki depan, ekor melingkar, "Zzz". */
const MochiTidur: React.FC<{ f: number }> = ({ f }) => {
  const g = warna.garis;
  const napas = 1 + Math.sin(f / 30) * 0.035;
  return (
    <g>
      <g transform={`translate(120 392) scale(${1 + (napas - 1) * 0.5} ${napas}) translate(-120 -392)`}>
        <ellipse cx={128} cy={352} rx={92} ry={44} fill={warna.mochi} stroke={warna.mochiBelang} strokeWidth={3} />
        <path d="M78 326 Q86 320 92 330 M104 318 Q112 312 118 322 M150 318 Q158 312 164 322" stroke={warna.mochiBelang} strokeWidth={5} fill="none" strokeLinecap="round" />
        {/* ekor melingkar ke depan */}
        <path d="M212 360 Q232 392 170 394 Q110 396 92 384" stroke={warna.mochiBelang} strokeWidth={24} fill="none" strokeLinecap="round" />
        <path d="M212 360 Q232 392 170 394 Q110 396 92 384" stroke={warna.mochi} strokeWidth={18} fill="none" strokeLinecap="round" />
      </g>
      {/* kepala bersandar di kaki depan */}
      <g transform={`translate(0 ${Math.sin(f / 30) * 1.5})`}>
        <ellipse cx={70} cy={378} rx={26} ry={12} fill={warna.mochi} stroke={warna.mochiBelang} strokeWidth={3} />
        <path d="M30 330 L38 284 L66 312 Z" fill={warna.mochi} stroke={warna.mochiBelang} strokeWidth={3} strokeLinejoin="round" />
        <path d="M100 328 L98 282 L72 308 Z" fill={warna.mochi} stroke={warna.mochiBelang} strokeWidth={3} strokeLinejoin="round" />
        <ellipse cx={68} cy={340} rx={50} ry={40} fill={warna.mochi} stroke={warna.mochiBelang} strokeWidth={3} />
        <ellipse cx={68} cy={358} rx={22} ry={13} fill={warna.mochiPerut} />
        <path d="M44 340 q9 5 18 0 M76 340 q9 5 18 0" stroke={g} strokeWidth={4} fill="none" strokeLinecap="round" />
        <ellipse cx={36} cy={352} rx={7} ry={4} fill={warna.pipi} opacity={0.5} />
        <ellipse cx={100} cy={352} rx={7} ry={4} fill={warna.pipi} opacity={0.5} />
        <path d="M63 352 L73 352 L68 358 Z" fill="#C0605A" />
      </g>
      {/* Zzz melayang naik */}
      {[0, 1, 2].map((i) => {
        const p = ((f + i * 30) % 90) / 90;
        return (
          <text
            key={i}
            x={110 + p * 50 + i * 6}
            y={300 - p * 110}
            fontSize={22 + i * 8}
            fontFamily="Fredoka, sans-serif"
            fontWeight={700}
            fill="#7C8BC9"
            opacity={Math.sin(p * Math.PI)}
          >
            z
          </text>
        );
      })}
    </g>
  );
};

/** Gulungan benang yang digelindingkan Mochi. */
const GulunganBenang: React.FC<{ f: number }> = ({ f }) => {
  const geser = Math.sin(f / 20) * 14;
  return (
    <g transform={`translate(${10 + geser} 368) rotate(${geser * 8}) scale(1.35)`}>
      <circle r={18} fill="#F28CB0" stroke="#D96A92" strokeWidth={2} />
      <path d="M-14 -8 Q0 4 14 -8 M-16 2 Q0 14 16 2 M-8 -16 Q4 0 -6 16" stroke="#D96A92" strokeWidth={2} fill="none" />
      <path d={`M14 8 Q30 ${20 + Math.sin(f / 7) * 6} 50 14`} stroke="#F28CB0" strokeWidth={3} fill="none" />
    </g>
  );
};

export const Mochi: React.FC<RigProps> = (r) => {
  const { f, expression, tutup } = r;
  if (r.action === 'sleeping') return <MochiTidur f={f} />;
  const main = r.action === 'playing';
  const g = warna.garis;
  const kaget = expression === 'surprised';
  const senang = expression === 'happy';
  const napas = 1 + Math.sin(f / 18) * 0.02;
  const mengembang = kaget ? 1.06 : 1;
  // telinga sesekali berkedut
  const kedut = (s: number) => {
    const t = f % 90;
    return random(Math.floor(f / 90) + s) > 0.5 && t < 8 ? Math.sin((t / 8) * Math.PI) * 14 : 0;
  };
  const miring = noiseS(f / 40, r.seed) * 6 + (expression === 'thinking' ? 12 : 0);
  // sesekali melompat kecil kalau senang
  const lompat = senang ? -Math.max(0, Math.sin(f / 12)) * 10 : 0;
  const mataBuka = tutup < 0.9;

  return (
    <g transform={`translate(0 ${lompat})`}>
      {main ? <GulunganBenang f={f} /> : null}
      <path d={jalurEkor(f, kaget || senang)} stroke={warna.mochiBelang} strokeWidth={kaget ? 30 : 24} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={jalurEkor(f, kaget || senang)} stroke={warna.mochi} strokeWidth={kaget ? 24 : 18} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <g transform={`translate(120 380) scale(${mengembang} ${napas * mengembang}) translate(-120 -380)`}>
        <ellipse cx={120} cy={326} rx={72} ry={58} fill={warna.mochi} stroke={warna.mochiBelang} strokeWidth={3} />
        <ellipse cx={120} cy={342} rx={40} ry={36} fill={warna.mochiPerut} />
        <path d="M70 300 Q78 296 82 306 M66 322 Q74 318 78 328 M170 300 Q162 296 158 306" stroke={warna.mochiBelang} strokeWidth={5} fill="none" strokeLinecap="round" />
        <ellipse
          cx={88 - (main ? Math.max(0, Math.sin(f / 6)) * 22 : 0)}
          cy={378 - (r.jalan !== null ? Math.max(0, Math.sin(r.jalan)) * 8 : 0) - (main ? Math.max(0, Math.sin(f / 6)) * 26 : 0)}
          rx={20}
          ry={11}
          fill={warna.mochi}
          stroke={warna.mochiBelang}
          strokeWidth={3}
        />
        <ellipse cx={152} cy={378 - (r.jalan !== null ? Math.max(0, -Math.sin(r.jalan)) * 8 : 0)} rx={20} ry={11} fill={warna.mochi} stroke={warna.mochiBelang} strokeWidth={3} />
      </g>

      {/* kepala */}
      <g transform={`rotate(${miring} 120 270)`}>
        <g transform={`rotate(${-kedut(1)} 84 196)`}>
          <path d="M62 222 L70 158 L110 194 Z" fill={warna.mochi} stroke={warna.mochiBelang} strokeWidth={3} strokeLinejoin="round" />
          <path d="M73 206 L76 176 L98 196 Z" fill="#F7B9A4" />
        </g>
        <g transform={`rotate(${kedut(2)} 156 196)`}>
          <path d="M178 222 L170 158 L130 194 Z" fill={warna.mochi} stroke={warna.mochiBelang} strokeWidth={3} strokeLinejoin="round" />
          <path d="M167 206 L164 176 L142 196 Z" fill="#F7B9A4" />
        </g>
        <ellipse cx={120} cy={232} rx={66} ry={55} fill={warna.mochi} stroke={warna.mochiBelang} strokeWidth={3} />
        <path d="M100 184 L106 204 M120 180 L120 202 M140 184 L134 204" stroke={warna.mochiBelang} strokeWidth={6} strokeLinecap="round" />
        <ellipse cx={120} cy={258} rx={30} ry={18} fill={warna.mochiPerut} />
        {senang && mataBuka ? (
          <>
            <path d="M86 234 q12 -14 24 0" stroke={g} strokeWidth={5} fill="none" strokeLinecap="round" />
            <path d="M130 234 q12 -14 24 0" stroke={g} strokeWidth={5} fill="none" strokeLinecap="round" />
          </>
        ) : mataBuka ? (
          <>
            {[98, 142].map((x) => (
              <g key={x}>
                <ellipse cx={x} cy={230} rx={kaget ? 13 : 11} ry={kaget ? 15 : 13} fill="#2E2626" />
                <ellipse cx={x + (main ? -4 : r.lihatX * 3)} cy={main ? 236 : 232} rx={kaget ? 4 : 7} ry={kaget ? 10 : 11} fill="#1A1414" />
                <circle cx={x + 4} cy={224} r={4} fill="#fff" />
                <circle cx={x - 4} cy={236} r={1.8} fill="#fff" />
              </g>
            ))}
          </>
        ) : (
          <>
            <path d="M88 232 q10 5 20 0" stroke={g} strokeWidth={4} fill="none" strokeLinecap="round" />
            <path d="M132 232 q10 5 20 0" stroke={g} strokeWidth={4} fill="none" strokeLinecap="round" />
          </>
        )}
        <ellipse cx={80} cy={252} rx={9} ry={5} fill={warna.pipi} opacity={0.5} />
        <ellipse cx={160} cy={252} rx={9} ry={5} fill={warna.pipi} opacity={0.5} />
        <path d="M114 250 L126 250 L120 257 Z" fill="#C0605A" />
        {kaget ? (
          <ellipse cx={120} cy={266} rx={5} ry={6} fill="#8A3434" />
        ) : (
          <path d="M120 257 q-7 10 -14 4 M120 257 q7 10 14 4" stroke={g} strokeWidth={3} fill="none" strokeLinecap="round" />
        )}
        <path d="M70 252 L38 245 M70 261 L40 265 M170 252 L202 245 M170 261 L200 265" stroke={g} strokeWidth={2.5} strokeLinecap="round" />
      </g>
    </g>
  );
};
