// Logo channel versi dashboard: sama dengan packages/video/src/brand/Logo.tsx
// (bulan sabit tersenyum + tulisan "Tasnie" warna-warni), tanpa animasi Remotion.

const WARNA_HURUF = ['#24305E', '#F07AA0', '#3FAE9A', '#F5B83D', '#4F86C6', '#F07AA0'];

export function IkonBulan({ ukuran }: { ukuran: number }) {
  return (
    <svg viewBox="0 0 200 200" width={ukuran} height={ukuran} style={{ overflow: 'visible', flex: 'none' }} aria-hidden>
      <defs>
        <radialGradient id="logo-emas" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#FFE9A3" />
          <stop offset="0.55" stopColor="#FFCB4F" />
          <stop offset="1" stopColor="#F2A12E" />
        </radialGradient>
        <mask id="logo-sabit">
          <rect width={200} height={200} fill="white" />
          <circle cx={138} cy={78} r={62} fill="black" />
        </mask>
        <radialGradient id="logo-pipi">
          <stop offset="0" stopColor="#FF7F86" stopOpacity="0.7" />
          <stop offset="1" stopColor="#FF7F86" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={100} cy={106} r={82} fill="#000" opacity={0.08} mask="url(#logo-sabit)" />
      <circle cx={100} cy={100} r={82} fill="url(#logo-emas)" mask="url(#logo-sabit)" />
      <path d="M40 70 Q50 40 82 28" stroke="#FFFFFF" strokeWidth={9} fill="none" strokeLinecap="round" opacity={0.55} mask="url(#logo-sabit)" />
      <path d="M38 112 q8 -9 16 0" stroke="#5A3A20" strokeWidth={5} fill="none" strokeLinecap="round" />
      <path d="M64 120 q8 -9 16 0" stroke="#5A3A20" strokeWidth={5} fill="none" strokeLinecap="round" />
      <ellipse cx={40} cy={130} rx={11} ry={8} fill="url(#logo-pipi)" />
      <ellipse cx={82} cy={138} rx={11} ry={8} fill="url(#logo-pipi)" />
      <path d="M52 134 q10 12 22 2" stroke="#5A3A20" strokeWidth={5} fill="none" strokeLinecap="round" />
      <path
        transform="translate(142 92)"
        d="M0 -30 L8 -9 L30 -8 L13 6 L19 28 L0 16 L-19 28 L-13 6 L-30 -8 L-8 -9 Z"
        fill="#F07AA0"
        stroke="#FFFFFF"
        strokeWidth={5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Logo lengkap: ikon bulan + "Tasnie" warna-warni; `keterangan` tampil kecil di sebelahnya. */
export function LogoTasnie({ tinggi = 26, keterangan, fontJudul }: { tinggi?: number; keterangan?: string; fontJudul: string }) {
  return (
    <span className="logo" style={{ display: 'inline-flex', alignItems: 'center', gap: tinggi * 0.15 }}>
      <IkonBulan ukuran={tinggi * 1.35} />
      <span style={{ display: 'inline-flex', fontFamily: fontJudul, fontWeight: 700, fontSize: tinggi, lineHeight: 1 }}>
        {'Tasnie'.split('').map((h, i) => (
          <span
            key={i}
            style={{
              display: 'inline-block',
              color: WARNA_HURUF[i],
              WebkitTextStroke: `${tinggi * 0.14}px #FFFFFF`,
              paintOrder: 'stroke',
              transform: `rotate(${(i % 2 ? 1 : -1) * 3}deg)`,
              marginLeft: i ? -tinggi * 0.02 : 0,
            }}
          >
            {h}
          </span>
        ))}
      </span>
      {keterangan ? <span style={{ fontFamily: fontJudul, fontWeight: 600, fontSize: tinggi * 0.62, marginLeft: 4 }}>{keterangan}</span> : null}
    </span>
  );
}
