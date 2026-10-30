import React from 'react';
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Aksi, Benda, Ekspresi, Karakter as KarakterId } from '@kantor/shared/types';
import { faseMakan, kelopak, mulutBicara, type Mulut, type PropsRig } from './gerak';
import { Ibu } from './Ibu';
import { Mamas } from './Mamas';
import { Mochi } from './Mochi';

/** Cara karakter muncul di adegan. */
export type CaraMasuk = 'kiri' | 'kanan' | 'muncul' | 'ada';

interface Props {
  id: KarakterId;
  ekspresi: Ekspresi;
  bicara: boolean;
  /** tinggi karakter dalam px */
  tinggi: number;
  /** supaya kedip/goyang tiap karakter tidak serempak */
  offset?: number;
  lambai?: boolean;
  /** arah pandang -1 (kiri layar) .. 1 (kanan layar), misal ke arah yang sedang bicara */
  lihatX?: number;
  /** kiri/kanan = berjalan masuk dari sisi layar, muncul = pegas, ada = langsung tampil */
  masuk?: CaraMasuk;
  /** tanpa animasi masuk (untuk thumbnail / gambar diam) */
  diam?: boolean;
  aksi?: Aksi;
  benda?: Benda;
}

const SEED: Record<KarakterId, number> = { mamas: 1, ibu: 2, mochi: 3 };
export const DURASI_JALAN = 34;

export const Karakter: React.FC<Props> = ({
  id,
  ekspresi,
  bicara,
  tinggi,
  offset = 0,
  lambai = false,
  lihatX = 0,
  masuk = 'muncul',
  diam,
  aksi,
  benda,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame + offset;
  const seed = SEED[id] ?? 0;
  const cara: CaraMasuk = diam ? 'ada' : masuk;

  // --- masuk: berjalan dari sisi layar atau pop dengan pegas
  let geserMasuk = 0;
  let jalan: number | null = null;
  let lihat = lihatX;
  let skalaMuncul = 1;
  let mulaiReaksi = 4;
  if (cara === 'kiri' || cara === 'kanan') {
    const arah = cara === 'kiri' ? -1 : 1;
    const t = interpolate(frame, [0, DURASI_JALAN], [0, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) });
    geserMasuk = arah * 900 * (1 - t);
    if (frame < DURASI_JALAN) {
      jalan = frame * 0.6;
      lihat = -arah;
    }
    mulaiReaksi = DURASI_JALAN;
  } else if (cara === 'muncul') {
    skalaMuncul = spring({ frame: frame - (offset % 9), fps, config: { damping: 11, stiffness: 140 } });
  }

  // --- napas, pindah tumpuan, tekanan saat bicara
  const napas = Math.sin(f / 24);
  const goyang = Math.sin(f / 70) * 3;
  const tekanBicara = bicara ? Math.max(0, Math.sin(f / 7)) * 0.015 : 0;

  // --- lompat & squash-stretch (biar terasa kenyal)
  let naik = 0;
  let regang = 0; // >0 memanjang, <0 memipih
  if (jalan !== null) {
    naik = Math.abs(Math.sin(jalan)) * 9;
  } else {
    const sejakTiba = frame - mulaiReaksi;
    // mendarat setelah berjalan: memipih sebentar
    if ((cara === 'kiri' || cara === 'kanan') && sejakTiba >= 0 && sejakTiba < 10) {
      regang -= Math.sin((sejakTiba / 10) * Math.PI) * 0.06;
    }
    if (ekspresi === 'kaget' && sejakTiba >= 0 && sejakTiba < 18) {
      const t = sejakTiba / 18;
      naik += Math.sin(t * Math.PI) * 30;
      regang += Math.sin(t * Math.PI) * 0.08;
    }
    if (id === 'mamas' && ekspresi === 'senang' && !bicara && !aksi) {
      const p = (f % 50) / 50;
      if (p < 0.4) {
        const t = p / 0.4;
        naik += Math.sin(t * Math.PI) * 22;
        regang += Math.sin(t * Math.PI) * 0.05;
      } else if (p < 0.55) {
        regang -= Math.sin(((p - 0.4) / 0.15) * Math.PI) * 0.08;
      }
    }
  }
  const sy = (1 + napas * 0.01 + tekanBicara + regang) * skalaMuncul;
  const sx = (1 - napas * 0.006 + tekanBicara * 0.5 - regang * 0.6) * skalaMuncul;

  const rig: PropsRig = {
    ekspresi,
    bicara,
    lambai,
    f,
    tutup: kelopak(f, seed),
    mulut: bicara && id !== 'mochi' ? mulutBicara(f, seed) : aksi === 'makan' ? mulutMakan(f) : { buka: 0, bulat: 0 },
    lihatX: lihat,
    seed,
    jalan,
    aksi,
    benda,
  };

  return (
    <svg
      viewBox="0 0 240 400"
      style={{
        height: tinggi,
        width: (tinggi * 240) / 400,
        overflow: 'visible',
        opacity: cara === 'muncul' ? Math.min(1, skalaMuncul * 1.5) : 1,
        transform: `translateX(${geserMasuk}px)`,
      }}
    >
      <ellipse cx={120} cy={392} rx={(78 + napas * 2) * (1 - naik / 120)} ry={10} fill="rgba(0,0,0,0.15)" />
      <g transform={`translate(${goyang} ${-naik}) translate(120 392) scale(${sx} ${sy}) translate(-120 -392)`}>
        {id === 'mamas' && <Mamas {...rig} />}
        {id === 'ibu' && <Ibu {...rig} />}
        {id === 'mochi' && <Mochi {...rig} />}
      </g>
    </svg>
  );
};

/** Mulut saat makan: terbuka menyambut makanan, lalu mengunyah. */
function mulutMakan(f: number): Mulut {
  const p = (f % 72) / 72;
  if (faseMakan(f) > 0.6) return { buka: 0.55, bulat: 1 };
  if (p >= 0.6) return { buka: Math.max(0, Math.sin(f / 2.5)) * 0.3, bulat: 0 };
  return { buka: 0, bulat: 0 };
}

/** Tinggi relatif tiap karakter supaya proporsinya masuk akal. */
export const SKALA: Record<KarakterId, number> = { mamas: 0.82, ibu: 1.22, mochi: 0.5 };
