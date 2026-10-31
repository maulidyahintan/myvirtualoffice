import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { MemorizationVerse } from '@kantor/shared/types';
import { Backdrop, LATAR_GELAP, LapisanSuasana } from './backgrounds/Latar';
import { gayaPanggung, gayaTransisi, jepit } from './Adegan';
import { CharacterFigure } from './characters/Karakter';
import { fontArab, fontJudul, fontTeks, warna } from './theme';

// Satu ayat dalam video hafalan. Ayat bisa dibaca berulang (ulang),
// latar tetap sama selama pengulangan, hanya penanda bacaan yang berganti.

/** Ukuran huruf Arab menyesuaikan panjang ayat supaya selalu muat. */
function ukuranArab(text: string, vertikal: boolean): number {
  const n = text.length;
  const dasar = n < 40 ? 104 : n < 80 ? 88 : n < 140 ? 72 : n < 220 ? 60 : 50;
  return vertikal ? Math.round(dasar * 0.82) : dasar;
}

/** Medali number ayat (gaya hiasan akhir ayat di mushaf). */
const NomorAyat: React.FC<{ number: number; ukuran: number }> = ({ number, ukuran }) => (
  <svg width={ukuran} height={ukuran} viewBox="0 0 100 100">
    <path
      d="M50 4 L61 16 L77 12 L80 28 L95 36 L88 50 L95 64 L80 72 L77 88 L61 84 L50 96 L39 84 L23 88 L20 72 L5 64 L12 50 L5 36 L20 28 L23 12 L39 16 Z"
      fill={warna.emas}
    />
    <circle cx={50} cy={50} r={30} fill="#FFFBF0" stroke="#2F6F5E" strokeWidth={4} />
    <text x={50} y={62} textAnchor="middle" fontFamily={fontJudul} fontWeight={700} fontSize={number > 99 ? 26 : 34} fill="#2F6F5E">
      {number}
    </text>
  </svg>
);

export const AyatHafalanView: React.FC<{
  verse: MemorizationVerse;
  surahName: string;
  /** urutan ayat (bukan basmalah) & jumlah ayat yang dihafal */
  keAyat: number;
  totalAyat: number;
  /** frame mulai tiap bacaan ulang di dalam sequence ini (relatif terhadap awal isi) */
  mulaiBacaan: number[];
  durasi: number;
  transisi: number;
  indeks: number;
  /** progres keseluruhan video hafalan (0..1) di awal & akhir ayat ini */
  progres: [number, number];
}> = ({ verse, surahName, keAyat, totalAyat, mulaiBacaan, durasi, transisi, indeks, progres }) => {
  const frame = useCurrentFrame();
  const { fps, width: fw, height: fh } = useVideoConfig();
  const vertikal = fh > fw;
  const isi = frame - transisi;
  const gelap = LATAR_GELAP.includes(verse.background);
  const basmalah = verse.number === 0;

  // bacaan ke berapa sekarang
  let bacaan = 0;
  mulaiBacaan.forEach((m, i) => {
    if (isi >= m) bacaan = i;
  });
  const sejakBacaan = isi - (mulaiBacaan[bacaan] ?? 0);
  const denyut = bacaan > 0 ? spring({ frame: sejakBacaan, fps, config: { damping: 10, stiffness: 160 } }) : 1;
  const masuk = spring({ frame: frame - transisi * 0.5, fps, config: { damping: 14, stiffness: 100 } });

  // kamera pelan mendekat sepanjang ayat
  const t = interpolate(frame, [0, durasi], [0, 1], { easing: Easing.inOut(Easing.sin) });
  const kam = jepit({ x: 960 + (indeks % 2 ? 1 : -1) * 80 * t, y: 540, z: 1.04 + t * 0.08 }, fw, fh);
  const pTransisi = transisi > 0 ? interpolate(frame, [0, transisi], [0, 1], { extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) }) : 1;
  const progresKini = interpolate(frame, [0, durasi], progres, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const lebarKartu = vertikal ? 960 : 1500;
  const pil: React.CSSProperties = {
    fontFamily: fontTeks,
    fontWeight: 800,
    fontSize: vertikal ? 38 : 34,
    color: '#2F6F5E',
    background: 'rgba(255,255,255,0.88)',
    padding: '8px 26px',
    borderRadius: 999,
    boxShadow: '0 4px 0 rgba(0,0,0,0.08)',
  };

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden', ...gayaTransisi(indeks, pTransisi) }}>
      <div style={gayaPanggung(kam, fw, fh)}>
        <Backdrop id={verse.background} />
        <LapisanSuasana moods={verse.moods} />
      </div>
      {/* lapisan lembut supaya text mudah dibaca */}
      <AbsoluteFill
        style={{
          background: gelap
            ? 'radial-gradient(ellipse at 50% 50%, rgba(10,14,40,0.45) 0%, rgba(10,14,40,0.15) 70%)'
            : 'radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 70%)',
        }}
      />

      {/* kepala: nama surat & posisi ayat */}
      <div
        style={{
          position: 'absolute',
          top: vertikal ? 190 : 44,
          left: vertikal ? 50 : 60,
          right: vertikal ? 50 : 60,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          opacity: masuk,
        }}
      >
        <div style={pil}>📖 Surat {surahName}</div>
        <div style={pil}>{basmalah ? 'Basmalah' : `Ayat ${keAyat} / ${totalAyat}`}</div>
      </div>

      {/* kartu ayat */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingBottom: vertikal ? 120 : 30 }}>
        <div
          style={{
            width: lebarKartu,
            background: 'rgba(255, 251, 242, 0.93)',
            borderRadius: 48,
            border: `7px solid ${warna.emas}`,
            padding: vertikal ? '40px 40px 34px' : '40px 70px 34px',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
            transform: `translateY(${(1 - masuk) * 50}px) scale(${(0.94 + masuk * 0.06) * (0.97 + denyut * 0.03)})`,
            opacity: masuk,
          }}
        >
          {basmalah ? null : (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
              <NomorAyat number={verse.number} ukuran={vertikal ? 84 : 76} />
            </div>
          )}
          <div
            dir="rtl"
            style={{
              fontFamily: fontArab,
              fontWeight: 700,
              fontSize: ukuranArab(verse.arabic, vertikal),
              lineHeight: 1.75,
              color: warna.teksGelap,
              textShadow: `0 0 ${18 * (1 - denyut)}px rgba(232,176,74,0.9)`,
            }}
          >
            {verse.arabic}
          </div>
          <div style={{ fontFamily: fontTeks, fontStyle: 'italic', fontWeight: 700, fontSize: vertikal ? 38 : 36, color: '#5A5470', marginTop: 12 }}>
            {verse.latin}
          </div>
          <div style={{ fontFamily: fontTeks, fontWeight: 700, fontSize: vertikal ? 36 : 32, color: '#2F6F5E', marginTop: 12, lineHeight: 1.35 }}>
            “{verse.meaning}”
          </div>

          {/* penanda bacaan berulang */}
          {mulaiBacaan.length > 1 ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14, marginTop: 20 }}>
              <span style={{ fontFamily: fontTeks, fontWeight: 800, fontSize: 28, color: '#8A7F6A' }}>Ulangi:</span>
              {mulaiBacaan.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 99,
                    border: `4px solid ${warna.emas}`,
                    background: i <= bacaan ? warna.emas : 'transparent',
                    transform: `scale(${i === bacaan ? 0.85 + denyut * 0.25 : 1})`,
                  }}
                />
              ))}
            </div>
          ) : null}
        </div>
      </AbsoluteFill>

      {/* Mamas ikut menirukan bacaan di pojok (video biasa saja) */}
      {vertikal ? null : (
        <div style={{ position: 'absolute', left: 30, bottom: -20 }}>
          <CharacterFigure id="mamas" expression="calm" bicara={bacaan > 0} tinggi={300} masuk="ada" lihatX={1} />
        </div>
      )}

      {/* progres hafalan */}
      <div
        style={{
          position: 'absolute',
          left: vertikal ? 80 : 360,
          right: vertikal ? 80 : 360,
          bottom: vertikal ? 300 : 36,
          height: 16,
          borderRadius: 99,
          background: 'rgba(255,255,255,0.6)',
          overflow: 'hidden',
        }}
      >
        <div style={{ width: `${progresKini * 100}%`, height: '100%', background: warna.emas, borderRadius: 99 }} />
      </div>
    </AbsoluteFill>
  );
};
