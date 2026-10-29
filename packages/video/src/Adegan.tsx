import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Adegan as AdeganData, Karakter as KarakterId } from '@kantor/shared/types';
import { Latar, LATAR_GELAP } from './backgrounds/Latar';
import { Karakter, SKALA, type CaraMasuk } from './characters/Karakter';
import { noiseS } from './characters/gerak';
import { EfekEkspresi } from './Efek';
import { fontArab, fontJudul, fontTeks, warna } from './theme';

const W = 1920;
const H = 1080;
const LANTAI = 890;
const TINGGI_DASAR = 560;

function posisiX(jumlah: number, vertikal: boolean): number[] {
  if (jumlah === 1) return [960];
  // video Shorts hanya memperlihatkan bagian tengah panggung, jadi karakter dirapatkan
  if (vertikal) return jumlah === 2 ? [860, 1080] : [800, 980, 1150];
  if (jumlah === 2) return [700, 1220];
  return [560, 960, 1360];
}

/** Bagi narasi jadi potongan pendek (≤ 8 kata) supaya mudah dibaca. */
function potong(teks: string, maks = 8): string[] {
  const kata = teks.split(/\s+/).filter(Boolean);
  const hasil: string[] = [];
  let buf: string[] = [];
  for (const k of kata) {
    buf.push(k);
    if (buf.length >= maks || /[.!?]$/.test(k)) {
      hasil.push(buf.join(' '));
      buf = [];
    }
  }
  if (buf.length) hasil.push(buf.join(' '));
  return hasil;
}

// ---------------------------------------------------------------- kamera

type Shot = 'lebar' | 'sedang' | 'dekat' | 'geser';

export interface Kamera {
  x: number;
  y: number;
  z: number;
}

/**
 * Batasi kamera supaya tepi panggung (1920x1080) tidak pernah terlihat.
 * `k.z` adalah faktor zoom relatif; di frame vertikal (Shorts) zoom dasarnya
 * sudah besar supaya panggung menutupi layar, jadi faktornya diperhalus.
 */
export function jepit(k: Kamera, fw = W, fh = H): Kamera {
  const zMin = Math.max(fw / W, fh / H);
  const z = zMin * (zMin > 1 ? Math.pow(Math.max(1, k.z), 0.35) : Math.max(1, k.z));
  const bx = fw / 2 / z;
  const by = fh / 2 / z;
  return { z, x: Math.min(W - bx, Math.max(bx, k.x)), y: Math.min(H - by, Math.max(by, k.y)) };
}

/** Transformasi CSS untuk wadah panggung berukuran 1920x1080. */
export const transformKamera = (k: Kamera, fw = W, fh = H) => `translate(${fw / 2 - k.x * k.z}px, ${fh / 2 - k.y * k.z}px) scale(${k.z})`;

/** Wadah panggung 1920x1080 (koordinat dunia) yang dilihat lewat kamera. */
export const gayaPanggung = (k: Kamera, fw: number, fh: number): React.CSSProperties => ({
  position: 'absolute',
  left: 0,
  top: 0,
  width: W,
  height: H,
  transformOrigin: '0 0',
  transform: transformKamera(k, fw, fh),
});

function hitungKamera(shot: Shot, t: number, fokus: { x: number; y: number }, frame: number, fw: number, fh: number): Kamera {
  // sedikit goyang seperti kamera dipegang tangan, sangat halus
  const gx = noiseS(frame / 70, 3) * 8;
  const gy = noiseS(frame / 80, 4) * 5;
  let k: Kamera;
  if (shot === 'dekat') {
    k = { z: 1.28 + t * 0.14, x: fokus.x + gx, y: fokus.y + gy };
  } else if (shot === 'sedang') {
    k = { z: 1.1 + t * 0.1, x: 960 + (fokus.x - 960) * (0.4 + t * 0.3) + gx, y: 560 + (fokus.y - 560) * 0.4 + gy };
  } else if (shot === 'geser') {
    k = { z: 1.18, x: fokus.x - 170 + t * 340 + gx, y: 560 + gy };
  } else {
    k = { z: 1.03 + t * 0.07, x: 960 + gx, y: 540 + gy };
  }
  return jepit(k, fw, fh);
}

function pilihShot(data: AdeganData, indeks: number, adaKarakter: boolean, adaPembicara: boolean): Shot {
  if (!adaKarakter) return indeks % 2 ? 'geser' : 'lebar';
  if (data.jenis === 'pertanyaan') return 'sedang';
  if (adaPembicara) return indeks % 3 === 1 ? 'dekat' : 'sedang';
  return indeks % 2 ? 'geser' : 'lebar';
}

// ---------------------------------------------------------------- teks

const WARNA_PEMBICARA: Record<string, { nama: string; warna: string }> = {
  ibu: { nama: 'Ibu', warna: '#E0709A' },
  mamas: { nama: 'Mamas', warna: '#3E6E9E' },
};

/** Subtitle ala karaoke: kata muncul satu per satu sesuai perkiraan waktu bicara. */
const Subtitle: React.FC<{ teks: string; durasi: number; pembicara: string; mulai: number }> = ({ teks, durasi, pembicara, mulai }) => {
  const { fps, width, height } = useVideoConfig();
  const vertikal = height > width;
  const frame = useCurrentFrame() - mulai;
  if (frame < 0) return null;
  const potongan = potong(teks, vertikal ? 6 : 8);
  const total = potongan.reduce((s, p) => s + p.length, 0);
  let acc = 0;
  let aktif = potongan.length - 1;
  let awalPotongan = 0;
  for (let i = 0; i < potongan.length; i++) {
    const panjang = (potongan[i].length / total) * durasi;
    if (frame < acc + panjang) {
      aktif = i;
      awalPotongan = acc;
      break;
    }
    acc += panjang;
    awalPotongan = acc - panjang;
  }
  const lokal = frame - awalPotongan;
  const durasiPotongan = (potongan[aktif].length / total) * durasi;
  const kata = potongan[aktif].split(' ');
  const totalHuruf = kata.reduce((s, k) => s + k.length + 1, 0);
  const pop = spring({ frame: lokal, fps, config: { damping: 14, stiffness: 200 } });
  const label = WARNA_PEMBICARA[pembicara];

  let hurufSampai = 0;
  return (
    // di Shorts, bagian bawah & kanan tertutup tombol YouTube, jadi subtitle dinaikkan
    <div style={{ position: 'absolute', left: vertikal ? 50 : 140, right: vertikal ? 120 : 140, bottom: vertikal ? 290 : 48, display: 'flex', justifyContent: 'center' }}>
      <div style={{ position: 'relative', transform: `scale(${0.92 + pop * 0.08})` }}>
        {label ? (
          <div
            style={{
              position: 'absolute',
              top: -40,
              left: 28,
              background: label.warna,
              color: '#fff',
              fontFamily: fontJudul,
              fontWeight: 700,
              fontSize: 34,
              padding: '4px 24px',
              borderRadius: 999,
              boxShadow: '0 4px 0 rgba(0,0,0,0.12)',
            }}
          >
            {label.nama}
          </div>
        ) : null}
        <div
          style={{
            background: 'rgba(255, 251, 242, 0.95)',
            borderRadius: 36,
            padding: '20px 44px',
            fontFamily: fontTeks,
            fontWeight: 800,
            fontSize: vertikal ? 56 : 50,
            lineHeight: 1.25,
            color: warna.teksGelap,
            textAlign: 'center',
            boxShadow: '0 8px 0 rgba(0,0,0,0.08)',
            border: label ? `4px solid ${label.warna}` : '4px solid transparent',
          }}
        >
          {kata.map((k, i) => {
            const waktu = (hurufSampai / totalHuruf) * durasiPotongan * 0.9;
            hurufSampai += k.length + 1;
            const s = spring({ frame: lokal - waktu, fps, config: { damping: 12, stiffness: 220 } });
            const terucap = lokal >= waktu;
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  verticalAlign: 'top',
                  marginRight: '0.28em',
                  opacity: terucap ? 1 : 0.35,
                  transform: terucap ? `translateY(${(1 - s) * 10}px) scale(${0.9 + s * 0.1})` : undefined,
                }}
              >
                {k}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const TeksLayar: React.FC<{ teks: string; gelap: boolean; besar?: boolean }> = ({ teks, gelap, besar }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const vertikal = height > width;
  const s = spring({ frame: frame - 8, fps, config: { damping: 9, stiffness: 120 } });
  const goyang = Math.sin(frame / 18) * 1.5;
  return (
    <div
      style={{
        position: 'absolute',
        top: vertikal ? (besar ? 300 : 240) : besar ? 110 : 56,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        transform: `scale(${s}) rotate(${goyang}deg)`,
        opacity: Math.min(1, s * 2),
      }}
    >
      <div
        style={{
          fontFamily: fontJudul,
          fontWeight: 700,
          fontSize: besar ? 84 : 64,
          color: gelap ? '#FFF3C4' : warna.teksGelap,
          background: gelap ? 'rgba(20, 24, 60, 0.6)' : 'rgba(255,255,255,0.85)',
          padding: '12px 44px',
          borderRadius: vertikal ? 48 : 999,
          maxWidth: vertikal ? 940 : 1500,
          textAlign: 'center',
          border: `5px solid ${warna.emas}`,
          boxShadow: '0 10px 0 rgba(0,0,0,0.1)',
        }}
      >
        {teks}
      </div>
    </div>
  );
};

const KartuDoa: React.FC<{ doa: NonNullable<AdeganData['doa']>; judul?: string }> = ({ doa, judul }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const vertikal = height > width;
  const masuk = spring({ frame, fps, config: { damping: 14, stiffness: 90 } });
  const melayang = Math.sin(frame / 30) * 6;
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      {/* kilau lembut di sekitar kartu */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        {Array.from({ length: 10 }, (_, i) => {
          const op = 0.3 + 0.5 * Math.max(0, Math.sin(frame / 20 + i * 1.3));
          const x = 200 + ((i * 397) % 1520);
          const y = 120 + ((i * 263) % 840);
          const r = 10 + (i % 3) * 5;
          return (
            <path
              key={i}
              d={`M${x} ${y - r} Q${x + r * 0.2} ${y - r * 0.2} ${x + r} ${y} Q${x + r * 0.2} ${y + r * 0.2} ${x} ${y + r} Q${x - r * 0.2} ${y + r * 0.2} ${x - r} ${y} Q${x - r * 0.2} ${y - r * 0.2} ${x} ${y - r} Z`}
              fill="#FFF0B8"
              opacity={op * masuk}
            />
          );
        })}
      </svg>
      <div
        style={{
          width: vertikal ? 960 : 1400,
          background: warna.kartu,
          borderRadius: 48,
          padding: vertikal ? '48px 44px' : '56px 80px',
          border: `8px solid ${warna.emas}`,
          textAlign: 'center',
          opacity: masuk,
          transform: `translateY(${melayang + (1 - masuk) * 60}px) scale(${0.9 + masuk * 0.1})`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
      >
        {judul ? (
          <div style={{ fontFamily: fontJudul, fontSize: 52, fontWeight: 700, color: '#2F6F5E', marginBottom: 20 }}>{judul}</div>
        ) : null}
        <div dir="rtl" style={{ fontFamily: fontArab, fontSize: vertikal ? 64 : 76, lineHeight: 1.7, color: warna.teksGelap, fontWeight: 700 }}>
          {doa.arab}
        </div>
        <div style={{ fontFamily: fontTeks, fontStyle: 'italic', fontSize: 40, color: '#5A5470', marginTop: 18 }}>{doa.latin}</div>
        <div style={{ fontFamily: fontTeks, fontWeight: 700, fontSize: 40, color: '#2F6F5E', marginTop: 18 }}>“{doa.arti}”</div>
      </div>
    </AbsoluteFill>
  );
};

/** "..." berdenyut pelan saat anak diberi waktu berpikir. */
const TitikBerpikir: React.FC<{ mulai: number; gelap: boolean }> = ({ mulai, gelap }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  if (frame < mulai) return null;
  const f = frame - mulai;
  return (
    <div style={{ position: 'absolute', top: height > width ? 560 : 300, width: '100%', display: 'flex', justifyContent: 'center', gap: 36 }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 44,
            height: 44,
            borderRadius: 99,
            background: gelap ? '#FFF3C4' : warna.emas,
            transform: `translateY(${-Math.max(0, Math.sin((f - i * 8) / 8)) * 16}px)`,
            opacity: 0.45 + 0.55 * Math.max(0, Math.sin((f - i * 8) / 8)),
          }}
        />
      ))}
    </div>
  );
};

// ---------------------------------------------------------------- transisi

/** Bentuk transisi masuk adegan, bergantian supaya tidak monoton. */
export function gayaTransisi(indeks: number, p: number): React.CSSProperties {
  if (p >= 1) return {};
  const jenis = indeks % 3;
  if (jenis === 0) return { clipPath: `circle(${p * 80}% at 50% 55%)` };
  if (jenis === 1) return { transform: `translateX(${(1 - p) * 100}%)`, boxShadow: '-30px 0 60px rgba(0,0,0,0.25)' };
  return { clipPath: `inset(0 ${(1 - p) * 100}% 0 0 round 0 80px 80px 0)` };
}

// ---------------------------------------------------------------- adegan

export const Adegan: React.FC<{
  data: AdeganData;
  /** total frame sequence, termasuk transisi */
  durasi: number;
  denganSubtitle: boolean;
  indeks?: number;
  /** karakter di adegan sebelumnya (yang baru muncul akan berjalan masuk) */
  sebelumnya?: KarakterId[];
  /** frame awal yang tumpang-tindih dengan adegan sebelumnya */
  transisi?: number;
}> = ({ data, durasi, denganSubtitle, indeks = 0, sebelumnya = [], transisi = 0 }) => {
  const frame = useCurrentFrame();
  const { fps, width: fw, height: fh } = useVideoConfig();
  const vertikal = fh > fw;
  // di Shorts karakter berdiri sedikit lebih tinggi supaya subtitle di bawah tidak menutupi badan
  const lantai = vertikal ? 820 : LANTAI;
  const gelap = LATAR_GELAP.includes(data.latar);
  const isDoa = data.jenis === 'doa' && data.doa;
  const durasiIsi = durasi - transisi;

  // abaikan id karakter lama yang sudah tidak ada (misal dari episode sebelum konsep berubah)
  const urut = isDoa ? [] : data.karakter.filter((id) => id in SKALA);
  const xs = posisiX(urut.length, vertikal);
  const iPembicara = urut.findIndex((id) => id === data.pembicara);
  const tinggiDari = (id: KarakterId) => (vertikal ? 470 : TINGGI_DASAR) * SKALA[id];

  // fokus kamera: wajah pembicara, atau tengah-tengah karakter
  let fokus = { x: 960, y: 560 };
  if (iPembicara >= 0) {
    fokus = { x: xs[iPembicara], y: lantai - tinggiDari(urut[iPembicara]) * 0.62 };
  } else if (urut.length) {
    const tinggiMaks = Math.max(...urut.map(tinggiDari));
    fokus = { x: xs.reduce((a, b) => a + b, 0) / xs.length, y: lantai - tinggiMaks * 0.55 };
  }
  const shot = isDoa ? 'lebar' : pilihShot(data, indeks, urut.length > 0, iPembicara >= 0);
  const t = interpolate(frame, [0, durasi], [0, 1], { easing: Easing.inOut(Easing.sin) });
  const kam = hitungKamera(shot, t, fokus, frame, fw, fh);
  // latar bergerak lebih sedikit dari karakter → kesan kedalaman (parallax)
  const zDasar = Math.max(fw / W, fh / H);
  const zRel = kam.z / zDasar;
  const kamLatar = jepit({ z: 1 + (zRel - 1) * 0.75, x: 960 + (kam.x - 960) * 0.75, y: 540 + (kam.y - 540) * 0.75 }, fw, fh);
  // jepit() memperhalus zoom di frame vertikal; latar tidak perlu dihaluskan dua kali
  if (zDasar > 1) kamLatar.z = Math.max(zDasar, kamLatar.z);

  const pTransisi = transisi > 0 ? interpolate(frame, [0, transisi], [0, 1], { extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) }) : 1;

  // siapa yang diberi efek ekspresi: pembicara, atau tokoh manusia pertama
  const iEfek = iPembicara >= 0 ? iPembicara : urut.findIndex((id) => id !== 'mochi');

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden', ...gayaTransisi(indeks, pTransisi) }}>
      <div style={gayaPanggung(kamLatar, fw, fh)}>
        <Latar id={data.latar} />
      </div>

      {isDoa ? <AbsoluteFill style={{ backgroundColor: 'rgba(20,20,40,0.35)' }} /> : null}

      <div style={gayaPanggung(kam, fw, fh)}>
        {urut.map((id: KarakterId, i) => {
          const tinggi = tinggiDari(id);
          const lebar = (tinggi * 240) / 400;
          // yang mendengarkan menoleh ke pembicara; pembicara menatap penonton
          const lihatX = iPembicara >= 0 && iPembicara !== i ? Math.sign(xs[iPembicara] - xs[i]) : 0;
          // di Shorts karakter langsung muncul (berjalan masuk terlalu lama untuk video < 60 detik)
          const masuk: CaraMasuk = sebelumnya.includes(id) ? 'ada' : vertikal || xs[i] === 960 ? 'muncul' : xs[i] < 960 ? 'kiri' : 'kanan';
          return (
            <div key={id} style={{ position: 'absolute', left: xs[i] - lebar / 2, top: lantai - tinggi }}>
              <Karakter
                id={id}
                ekspresi={data.ekspresi}
                bicara={data.pembicara === id}
                tinggi={tinggi}
                offset={i * 37}
                lihatX={lihatX}
                masuk={masuk}
              />
            </div>
          );
        })}
        {iEfek >= 0 && data.jenis !== 'pertanyaan' ? (
          <EfekEkspresi
            ekspresi={data.ekspresi}
            x={xs[iEfek] + tinggiDari(urut[iEfek]) * 0.22}
            y={lantai - tinggiDari(urut[iEfek]) * 1.02}
            mulai={transisi + 6}
          />
        ) : null}
      </div>

      {isDoa ? <KartuDoa doa={data.doa!} judul={data.teksLayar} /> : null}

      {!isDoa && data.teksLayar ? (
        <TeksLayar teks={data.teksLayar} gelap={gelap} besar={data.jenis === 'pertanyaan' || urut.length === 0} />
      ) : null}

      {data.jenis === 'pertanyaan' ? <TitikBerpikir mulai={durasi - fps * 3} gelap={gelap} /> : null}

      {denganSubtitle && !isDoa ? <Subtitle teks={data.narasi} durasi={durasiIsi} pembicara={data.pembicara} mulai={transisi} /> : null}
    </AbsoluteFill>
  );
};
