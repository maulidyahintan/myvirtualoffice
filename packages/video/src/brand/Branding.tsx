import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Karakter } from '../characters/Karakter';
import { fontTeks } from '../theme';
import { IkonBulan, Logo, WARNA_BRAND } from './Logo';

// Aset branding YouTube. Render dengan:
//   npx remotion still src/index.ts <Id> out/branding/<nama>.png

const Kilau: React.FC<{ x: number; y: number; r: number; warnaIsi?: string; opacity?: number }> = ({ x, y, r, warnaIsi = '#FFFFFF', opacity = 0.9 }) => (
  <path
    d={`M${x} ${y - r} Q${x + r * 0.2} ${y - r * 0.2} ${x + r} ${y} Q${x + r * 0.2} ${y + r * 0.2} ${x} ${y + r} Q${x - r * 0.2} ${y + r * 0.2} ${x - r} ${y} Q${x - r * 0.2} ${y - r * 0.2} ${x} ${y - r} Z`}
    fill={warnaIsi}
    opacity={opacity}
  />
);

/** Logo lengkap di latar transparan (untuk watermark, opening, dsb). 1600x600 */
export const LogoStill: React.FC = () => (
  <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
    <Logo tinggi={300} />
  </AbsoluteFill>
);

/** Ikon saja di latar transparan. 1000x1000 */
export const IkonStill: React.FC = () => (
  <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
    <IkonBulan ukuran={860} />
  </AbsoluteFill>
);

/**
 * Foto profil YouTube 800x800. YouTube memotongnya jadi lingkaran,
 * jadi isi penting ada di tengah.
 */
export const Avatar: React.FC = () => (
  <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 40%, #FFF6E4 0%, #FFE0EA 55%, #F7B9CD 100%)` }}>
    <svg viewBox="0 0 800 800" style={{ position: 'absolute', inset: 0 }}>
      <Kilau x={170} y={210} r={26} warnaIsi={WARNA_BRAND.emas} />
      <Kilau x={640} y={230} r={18} />
      <Kilau x={600} y={600} r={22} warnaIsi={WARNA_BRAND.emas} />
      <Kilau x={190} y={590} r={14} />
      <circle cx={400} cy={400} r={300} fill="#FFFFFF" opacity={0.35} />
    </svg>
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingBottom: 30 }}>
      <IkonBulan ukuran={470} />
    </AbsoluteFill>
  </AbsoluteFill>
);

/**
 * Banner channel YouTube 2560x1440. Area aman yang terlihat di semua
 * perangkat hanya bagian tengah 1546x423 (x 507–2053, y 508–931),
 * jadi logo, tulisan, dan karakter ditaruh di sana.
 */
export const Banner: React.FC = () => (
  <AbsoluteFill style={{ background: 'linear-gradient(180deg, #A9DDF5 0%, #D9F0FA 45%, #FFF4E2 100%)' }}>
    <svg viewBox="0 0 2560 1440" style={{ position: 'absolute', inset: 0 }}>
      {/* awan */}
      {[
        [300, 380, 1.4],
        [2200, 330, 1.2],
        [1250, 230, 0.9],
        [700, 1080, 1],
      ].map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`} opacity={0.95}>
          <ellipse cx={0} cy={0} rx={110} ry={48} fill="#fff" />
          <ellipse cx={70} cy={-28} rx={85} ry={55} fill="#fff" />
          <ellipse cx={150} cy={4} rx={95} ry={44} fill="#fff" />
        </g>
      ))}
      {/* bukit */}
      <ellipse cx={700} cy={1300} rx={1300} ry={420} fill="#9ED48C" />
      <ellipse cx={2000} cy={1340} rx={1100} ry={420} fill="#86C674" />
      {/* masjid kecil di kejauhan */}
      <g transform="translate(2330 800)" opacity={0.55}>
        <rect x={-120} y={0} width={240} height={110} fill="#F3EBDD" />
        <path d="M-80 4 Q0 -110 80 4 Z" fill="#3FAE9A" />
        <rect x={150} y={-110} width={30} height={220} fill="#F3EBDD" />
        <path d="M145 -106 L165 -150 L185 -106 Z" fill="#3FAE9A" />
      </g>
      {/* bunga di bukit (terlihat di TV / layar lebar) */}
      {[
        [300, 1080, '#F7A6C1'],
        [520, 1180, '#FFD36E'],
        [880, 1240, '#F7A6C1'],
        [1300, 1150, '#FFFFFF'],
        [1700, 1260, '#FFD36E'],
        [2050, 1120, '#F7A6C1'],
        [2350, 1220, '#FFFFFF'],
        [1080, 1360, '#FFD36E'],
      ].map(([x, y, c], i) => (
        <g key={`b${i}`} transform={`translate(${x} ${y})`}>
          <line x1={0} y1={0} x2={0} y2={46} stroke="#4E8F48" strokeWidth={6} />
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 15} cy={Math.sin((a * Math.PI) / 180) * 15} r={12} fill={c as string} />
          ))}
          <circle r={10} fill={c === '#FFD36E' ? '#FFF3D6' : '#FFD36E'} />
        </g>
      ))}
      {/* kilau bintang */}
      <Kilau x={560} y={560} r={22} warnaIsi={WARNA_BRAND.emas} />
      <Kilau x={1380} y={540} r={16} />
      <Kilau x={2000} y={560} r={20} warnaIsi={WARNA_BRAND.pink} />
      <Kilau x={1480} y={880} r={14} warnaIsi={WARNA_BRAND.emas} />
    </svg>

    {/* area aman: logo + slogan di kiri, karakter di kanan */}
    <div style={{ position: 'absolute', left: 560, top: 520, width: 900, height: 400, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <Logo tinggi={170} />
      <div
        style={{
          marginTop: 20,
          marginLeft: 12,
          fontFamily: fontTeks,
          fontWeight: 800,
          fontSize: 40,
          whiteSpace: 'nowrap',
          color: WARNA_BRAND.navy,
          background: 'rgba(255,255,255,0.8)',
          padding: '10px 30px',
          borderRadius: 999,
          alignSelf: 'flex-start',
        }}
      >
        Cerita Islami Anak · Doa · Akhlak · Al-Qur&apos;an
      </div>
    </div>
    <div style={{ position: 'absolute', left: 1500, top: 931 - 410 }}>
      <Karakter id="ibu" ekspresi="senang" bicara={false} tinggi={410} lihatX={1} diam />
    </div>
    <div style={{ position: 'absolute', left: 1745, top: 931 - 290 }}>
      <Karakter id="mamas" ekspresi="senang" bicara={false} tinggi={290} lambai diam />
    </div>
    <div style={{ position: 'absolute', left: 1915, top: 931 - 160 }}>
      <Karakter id="mochi" ekspresi="senang" bicara={false} tinggi={160} lihatX={-1} diam />
    </div>
  </AbsoluteFill>
);
