import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Scene as AdeganData, Character as KarakterId } from '@kantor/shared/types';
import { Backdrop, LATAR_GELAP } from './backgrounds/Latar';
import { LatarDepan } from './backgrounds/LatarDepan';
import { PropertiAdegan } from './properti/Properti';
import { CharacterFigure, SKALA, type CaraMasuk } from './characters/Karakter';
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
function potong(text: string, maks = 8): string[] {
  const kata = text.split(/\s+/).filter(Boolean);
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

type Shot = 'lebar' | 'sedang' | 'dekat' | 'geser' | 'reaksi' | 'bahu' | 'rendah' | 'dorong' | 'orbit';

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

/**
 * Lensa satu shot: posisi kamera + "kedalaman" 2.5D. Latar adalah bidang di belakang yang ikut
 * berputar sedikit (putarY/putarX) dan kabur saat close-up, karakter tetap tegak di depannya,
 * dan lapisan depan (tanaman, perabot) bergeser paling cepat → kesan ruang 3D.
 */
interface Lensa {
  kam: Kamera;
  /** derajat, putar bidang latar ke kiri/kanan (kamera mengorbit) */
  putarY: number;
  /** derajat, + = kamera dari bawah (latar condong ke belakang) */
  putarX: number;
  /** px blur latar (depth of field) */
  blurLatar: number;
  /** 0..1 seberapa terlihat lapisan depan */
  depan: number;
  /** indeks karakter yang tampil besar & kabur di depan (shot dari balik bahu) */
  bahu?: number;
}

/**
 * Kesan bidang latar berputar (kamera mengorbit / dari bawah) tanpa transformasi 3D CSS:
 * rotateY/perspective membuat render ±5x lebih lambat, jadi didekati dengan skew + geser 2D.
 */
function bidangLatar(l: Lensa): string {
  const zoom = 1 + (Math.abs(l.putarY) + Math.abs(l.putarX)) * 0.012;
  return `translate(${-l.putarY * 7}px, ${l.putarX * 7}px) skewY(${l.putarY * 0.22}deg) scale(${zoom}, ${zoom * (1 + l.putarX * 0.008)})`;
}

interface KonteksShot {
  /** titik wajah tiap karakter */
  wajah: { x: number; y: number }[];
  /** titik tengah rombongan */
  tengah: { x: number; y: number };
  iPembicara: number;
  /** yang mendengarkan (manusia lebih dulu), -1 kalau tidak ada */
  iPendengar: number;
}

function hitungLensa(shot: Shot, t: number, c: KonteksShot, frame: number, fw: number, fh: number): Lensa {
  // sedikit goyang seperti kamera dipegang tangan, sangat halus
  const gx = noiseS(frame / 70, 3) * 8;
  const gy = noiseS(frame / 80, 4) * 5;
  const bicara = c.wajah[c.iPembicara] ?? c.tengah;
  const dengar = c.wajah[c.iPendengar] ?? c.tengah;
  const arah = Math.sign(bicara.x - c.tengah.x) || 1;
  const k = (z: number, x: number, y: number) => jepit({ z, x: x + gx, y: y + gy }, fw, fh);
  switch (shot) {
    case 'dekat':
      return { kam: k(1.32 + t * 0.14, bicara.x, bicara.y), putarY: -arah * (2 + t * 2), putarX: 0, blurLatar: 3, depan: 0 };
    case 'reaksi':
      return { kam: k(1.38 + t * 0.08, dengar.x, dengar.y), putarY: arah * (2 + t * 2), putarX: 0, blurLatar: 3, depan: 0 };
    case 'bahu':
      // kamera di balik pendengar: pendengar besar & kabur di sisi depan, speaker tajam
      return { kam: k(1.36 + t * 0.06, bicara.x + arah * 90, bicara.y + 30), putarY: -arah * 5, putarX: 0, blurLatar: 2.5, depan: 0, bahu: c.iPendengar };
    case 'rendah':
      // dari bawah: latar condong menjauh, tokoh terlihat lebih "besar"
      return { kam: k(1.16 + t * 0.06, c.tengah.x + (bicara.x - c.tengah.x) * 0.5, c.tengah.y + 70), putarY: (t - 0.5) * 6, putarX: 7, blurLatar: 1, depan: 0.6 };
    case 'dorong': {
      // dolly-in pelan ke speaker / rombongan
      const e = Easing.inOut(Easing.cubic)(t);
      return { kam: k(1.02 + e * 0.32, c.tengah.x + (bicara.x - c.tengah.x) * e, 540 + (bicara.y - 540) * e), putarY: 0, putarX: 0, blurLatar: e * 2, depan: 1 - e };
    }
    case 'orbit':
      // kamera mengitari rombongan: latar berputar, lapisan depan menyapu cepat
      return { kam: k(1.12, c.tengah.x - 120 + t * 240, 560), putarY: 9 - t * 18, putarX: 1.5, blurLatar: 0.5, depan: 1 };
    case 'geser':
      return { kam: k(1.18, c.tengah.x - 170 + t * 340, 560), putarY: 4 - t * 8, putarX: 0, blurLatar: 0, depan: 1 };
    case 'sedang':
      return {
        kam: k(1.1 + t * 0.1, 960 + (bicara.x - 960) * (0.4 + t * 0.3), 560 + (bicara.y - 560) * 0.4),
        putarY: -arah * 2,
        putarX: 0,
        blurLatar: 1,
        depan: 0.5,
      };
    default:
      return { kam: k(1.03 + t * 0.07, 960, 540), putarY: (t - 0.5) * 5, putarX: 0, blurLatar: 0, depan: 1 };
  }
}

/** Lama minimal satu shot (detik). Shorts lebih cepat berganti, tapi tetap tenang untuk anak. */
const DETIK_SHOT = { standard: 3.6, short: 2.6 };

/**
 * Rencana shot satu scenes: adegan panjang dipecah jadi beberapa shot (establishing, close-up
 * speaker, reaksi pendengar, dari balik bahu, sudut bawah, orbit, dolly) supaya terasa hidup.
 */
function rencanaShot(
  data: AdeganData,
  indeks: number,
  durasi: number,
  fps: number,
  vertikal: boolean,
  c: { adaKarakter: boolean; adaPembicara: boolean; adaPendengar: boolean; latarBaru: boolean },
): { shot: Shot; mulai: number; durasi: number }[] {
  // shot dekat (wajah) bergantian dengan shot bergerak (memperlihatkan ruang)
  let dekat: Shot[];
  let gerak: Shot[];
  if (data.type === 'prayer' && data.prayer) dekat = gerak = ['lebar'];
  else if (!c.adaKarakter) [dekat, gerak] = [['dorong', 'lebar'], ['geser', 'orbit']];
  else if (data.type === 'question') [dekat, gerak] = [['dorong', 'dekat'], ['sedang', 'rendah']];
  else if (c.adaPembicara && c.adaPendengar)
    // layar vertikal terlalu sempit untuk shot dari balik bahu
    [dekat, gerak] = [vertikal ? ['dekat', 'reaksi'] : ['dekat', 'bahu', 'reaksi'], ['sedang', 'rendah', 'dorong', 'orbit']];
  else if (c.adaPembicara) [dekat, gerak] = [['dekat', 'rendah'], ['sedang', 'dorong', 'geser']];
  else [dekat, gerak] = [['sedang', 'rendah', 'dorong'], ['geser', 'orbit', 'lebar']];

  const per = Math.round(fps * DETIK_SHOT[vertikal ? 'short' : 'standard']);
  const jumlah = data.type === 'prayer' && data.prayer ? 1 : Math.max(1, Math.min(6, Math.floor(durasi / per)));
  const shots = Array.from({ length: jumlah }, (_, i) => {
    const k = indeks + Math.floor(i / 2);
    return i % 2 === 0 ? dekat[k % dekat.length] : gerak[k % gerak.length];
  });
  // tempat baru dibuka dengan shot lebar supaya penonton tahu sedang di mana
  // (Shorts langsung ke wajah: layar sempit & tiap detik berharga)
  if (c.latarBaru && c.adaKarakter && jumlah > 1 && !vertikal) shots.unshift('lebar'), shots.pop();
  const panjang = Math.floor(durasi / jumlah);
  return shots.map((shot, i) => ({ shot, mulai: i * panjang, durasi: i === jumlah - 1 ? durasi - i * panjang : panjang }));
}

// ---------------------------------------------------------------- text

const WARNA_PEMBICARA: Record<string, { nama: string; warna: string }> = {
  mother: { nama: 'Ibu', warna: '#E0709A' },
  mamas: { nama: 'Mamas', warna: '#3E6E9E' },
};

/** Subtitle ala karaoke: kata muncul satu per satu sesuai perkiraan waktu bicara. */
const Subtitle: React.FC<{ text: string; durasi: number; speaker: string; mulai: number }> = ({ text, durasi, speaker, mulai }) => {
  const { fps, width, height } = useVideoConfig();
  const vertikal = height > width;
  const frame = useCurrentFrame() - mulai;
  if (frame < 0) return null;
  const potongan = potong(text, vertikal ? 6 : 8);
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
  const label = WARNA_PEMBICARA[speaker];

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

const TeksLayar: React.FC<{ text: string; gelap: boolean; besar?: boolean }> = ({ text, gelap, besar }) => {
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
        {text}
      </div>
    </div>
  );
};

const KartuDoa: React.FC<{ prayer: NonNullable<AdeganData['prayer']>; title?: string }> = ({ prayer, title }) => {
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
        {title ? (
          <div style={{ fontFamily: fontJudul, fontSize: 52, fontWeight: 700, color: '#2F6F5E', marginBottom: 20 }}>{title}</div>
        ) : null}
        <div dir="rtl" style={{ fontFamily: fontArab, fontSize: vertikal ? 64 : 76, lineHeight: 1.7, color: warna.teksGelap, fontWeight: 700 }}>
          {prayer.arabic}
        </div>
        <div style={{ fontFamily: fontTeks, fontStyle: 'italic', fontSize: 40, color: '#5A5470', marginTop: 18 }}>{prayer.latin}</div>
        <div style={{ fontFamily: fontTeks, fontWeight: 700, fontSize: 40, color: '#2F6F5E', marginTop: 18 }}>“{prayer.meaning}”</div>
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

// ---------------------------------------------------------------- gerak tokoh

/**
 * Gerak tubuh tambahan supaya tokoh tidak kaku: speaker condong & sedikit maju saat menekankan
 * kata, pendengar mengangguk & condong ke speaker, Mochi berjalan-jalan kecil sambil melompat.
 */
function gerakHidup(
  id: KarakterId,
  i: number,
  frame: number,
  s: { bicara: boolean; mendengar: boolean; lihatX: number; beraksi: boolean },
): { x: number; y: number; miring: number; skala: number; lihatX?: number } {
  const f = frame + i * 53;
  // tokoh yang sedang tidur/membaca/bermain tetap di tempatnya
  if (s.beraksi) return { x: 0, y: 0, miring: id === 'mochi' ? 0 : Math.sin(f / 60) * 0.8, skala: 1 };
  if (id === 'mochi') {
    // berjalan bolak-balik pelan; melompat-lompat kecil saat berpindah
    const x = noiseS(f / 110, 9 + i) * 110;
    const v = noiseS((f + 1) / 110, 9 + i) * 110 - x;
    const jalan = Math.min(1, Math.abs(v) * 2.5);
    return { x, y: -Math.abs(Math.sin(f / 5)) * 14 * jalan, miring: Math.sin(f / 5) * 3 * jalan, skala: 1, lihatX: jalan > 0.3 ? Math.sign(v) : undefined };
  }
  if (s.bicara) {
    // tekanan kalimat: condong & maju sedikit ke kamera, lalu kembali
    const tekan = Math.max(0, noiseS(f / 22, 5 + i));
    return { x: 0, y: 0, miring: Math.sin(f / 45) * 1.6 + tekan * 1.2, skala: 1 + tekan * 0.035 };
  }
  if (s.mendengar) {
    // mengangguk tiap ±2 detik & condong ke arah speaker
    const p = (f % 62) / 62;
    const angguk = p < 0.25 ? Math.sin((p / 0.25) * Math.PI * 2) : 0;
    return { x: 0, y: Math.max(0, angguk) * 6, miring: s.lihatX * 2.2 + angguk * 0.8, skala: 1 };
  }
  return { x: 0, y: 0, miring: Math.sin(f / 60) * 1, skala: 1 };
}

/** Tokoh pendengar besar & kabur di tepi depan layar (shot dari balik bahu). */
const BahuDepan: React.FC<{ id: KarakterId; kiri: boolean; expression: AdeganData['expression']; fw: number; fh: number }> = ({ id, kiri, expression, fw, fh }) => {
  const tinggi = fh * (id === 'mochi' ? 0.8 : 1.25);
  const lebar = (tinggi * 240) / 400;
  return (
    <div
      style={{
        position: 'absolute',
        top: fh - tinggi * 0.42,
        left: kiri ? -lebar * 0.5 : fw - lebar * 0.5,
        // siluet gelap & kabur: terbaca sebagai kepala/bahu orang di depan kamera
        filter: 'blur(9px) brightness(0.45) saturate(0.6)',
        // dilihat dari belakang: dicerminkan & menghadap ke dalam
        transform: `scaleX(${kiri ? 1 : -1})`,
      }}
    >
      <CharacterFigure id={id} expression={expression} bicara={false} tinggi={tinggi} lihatX={1} masuk="ada" />
    </div>
  );
};

// ---------------------------------------------------------------- adegan

export const SceneView: React.FC<{
  data: AdeganData;
  /** total frame sequence, termasuk transisi */
  durasi: number;
  denganSubtitle: boolean;
  indeks?: number;
  /** karakter di adegan sebelumnya (yang baru muncul akan berjalan masuk) */
  sebelumnya?: KarakterId[];
  /** frame awal yang tumpang-tindih dengan adegan sebelumnya */
  transisi?: number;
  /** tempat berbeda dari adegan sebelumnya → dibuka dengan shot lebar */
  latarBaru?: boolean;
}> = ({ data, durasi, denganSubtitle, indeks = 0, sebelumnya = [], transisi = 0, latarBaru = true }) => {
  const frame = useCurrentFrame();
  const { fps, width: fw, height: fh } = useVideoConfig();
  const vertikal = fh > fw;
  // di Shorts karakter berdiri sedikit lebih tinggi supaya subtitle di bawah tidak menutupi badan
  const lantai = vertikal ? 820 : LANTAI;
  const gelap = LATAR_GELAP.includes(data.background);
  const isDoa = data.type === 'prayer' && data.prayer;
  const durasiIsi = durasi - transisi;

  // abaikan id karakter lama yang sudah tidak ada (misal dari episode sebelum konsep berubah)
  const urut = isDoa ? [] : data.characters.filter((id) => id in SKALA);
  const xs = posisiX(urut.length, vertikal);
  const iPembicara = urut.findIndex((id) => id === data.speaker);
  const tinggiDari = (id: KarakterId) => (vertikal ? 470 : TINGGI_DASAR) * SKALA[id];

  // titik wajah tiap karakter & tengah rombongan, untuk membidik kamera
  const wajah = urut.map((id, i) => ({ x: xs[i], y: lantai - tinggiDari(id) * 0.62 }));
  const tinggiMaks = urut.length ? Math.max(...urut.map(tinggiDari)) : 0;
  const tengah = urut.length ? { x: xs.reduce((a, b) => a + b, 0) / xs.length, y: lantai - tinggiMaks * 0.55 } : { x: 960, y: 560 };
  // pendengar: tokoh manusia selain speaker (Mochi kalau hanya dia)
  const lain = urut.map((_, i) => i).filter((i) => i !== iPembicara);
  const iPendengar = iPembicara >= 0 ? (lain.find((i) => urut[i] !== 'mochi') ?? lain[0] ?? -1) : -1;
  const adaYangBaru = urut.some((id) => !sebelumnya.includes(id));

  const rencana = rencanaShot(data, indeks, durasi, fps, vertikal, {
    adaKarakter: urut.length > 0,
    adaPembicara: iPembicara >= 0,
    adaPendengar: iPendengar >= 0,
    latarBaru,
  });
  // karakter yang baru berjalan masuk harus terlihat: jangan buka dengan close-up
  if (adaYangBaru && ['dekat', 'reaksi', 'bahu'].includes(rencana[0].shot)) rencana[0].shot = 'sedang';
  const iShot = Math.max(0, rencana.findLastIndex((r) => frame >= r.mulai));
  const sekarang = rencana[iShot];
  const t = interpolate(frame - sekarang.mulai, [0, sekarang.durasi], [0, 1], { extrapolateRight: 'clamp', easing: Easing.inOut(Easing.sin) });
  const lensa = hitungLensa(sekarang.shot, t, { wajah, tengah, iPembicara, iPendengar }, frame, fw, fh);
  const kam = lensa.kam;
  // hentakan kecil saat pindah shot (cut), supaya potongan terasa hidup tapi tidak mengagetkan
  const hentak = iShot > 0 ? 1 + 0.025 * Math.max(0, 1 - (frame - sekarang.mulai) / 8) : 1;

  // latar bergerak lebih sedikit dari karakter → kesan kedalaman (parallax)
  const zDasar = Math.max(fw / W, fh / H);
  const zRel = kam.z / zDasar;
  const kamLatar = jepit({ z: 1 + (zRel - 1) * 0.75, x: 960 + (kam.x - 960) * 0.75, y: 540 + (kam.y - 540) * 0.75 }, fw, fh);
  // jepit() memperhalus zoom di frame vertikal; latar tidak perlu dihaluskan dua kali
  if (zDasar > 1) kamLatar.z = Math.max(zDasar, kamLatar.z);
  // lapisan depan bergerak lebih cepat dari karakter
  const kamDepan = { z: kam.z * 1.12, x: 960 + (kam.x - 960) * 1.35, y: kam.y };

  const pTransisi = transisi > 0 ? interpolate(frame, [0, transisi], [0, 1], { extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) }) : 1;

  const propertiAdegan = (lapisan: 'bawah' | 'belakang') =>
    isDoa ? null : (
      <PropertiAdegan
        props={data.props ?? []}
        actions={data.actions ?? []}
        urut={urut}
        xs={xs}
        lantai={lantai}
        skala={((vertikal ? 470 : TINGGI_DASAR) / 400) * 1.15}
        vertikal={vertikal}
        lapisan={lapisan}
      />
    );

  // siapa yang diberi efek expression: speaker, atau tokoh manusia pertama
  const iEfek = iPembicara >= 0 ? iPembicara : urut.findIndex((id) => id !== 'mochi');

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden', ...gayaTransisi(indeks, pTransisi) }}>
      <AbsoluteFill style={{ transform: `scale(${hentak})` }}>
        {/* background: bidang belakang yang ikut berputar sedikit & kabur saat close-up (2.5D) */}
        <AbsoluteFill
          style={{
            transform: bidangLatar(lensa),
            filter: lensa.blurLatar > 0.2 && !isDoa ? `blur(${lensa.blurLatar}px)` : undefined,
          }}
        >
          <div style={gayaPanggung(kamLatar, fw, fh)}>
            <Backdrop id={data.background} />
          </div>
        </AbsoluteFill>

        {isDoa ? <AbsoluteFill style={{ backgroundColor: 'rgba(20,20,40,0.35)' }} /> : null}

        <div style={gayaPanggung(kam, fw, fh)}>
          {propertiAdegan('bawah')}
          {propertiAdegan('belakang')}
          {urut.map((id: KarakterId, i) => {
            const tinggi = tinggiDari(id);
            const lebar = (tinggi * 240) / 400;
            // yang mendengarkan menoleh ke speaker; speaker menatap penonton
            let lihatX = iPembicara >= 0 && iPembicara !== i ? Math.sign(xs[iPembicara] - xs[i]) : 0;
            // di Shorts karakter langsung muncul (berjalan masuk terlalu lama untuk video < 60 detik)
            const masuk: CaraMasuk = sebelumnya.includes(id) ? 'ada' : vertikal || xs[i] === 960 ? 'muncul' : xs[i] < 960 ? 'kiri' : 'kanan';
            const aksiIni = data.actions?.find((a) => a.character === id);
            const gaya = gerakHidup(id, i, frame, { bicara: data.speaker === id, mendengar: i !== iPembicara && iPembicara >= 0, lihatX, beraksi: !!aksiIni });
            if (gaya.lihatX !== undefined) lihatX = gaya.lihatX;
            return (
              <div
                key={id}
                style={{
                  position: 'absolute',
                  left: xs[i] - lebar / 2,
                  top: lantai - tinggi,
                  transformOrigin: '50% 100%',
                  transform: `translate(${gaya.x}px, ${gaya.y}px) rotate(${gaya.miring}deg) scale(${gaya.skala})`,
                  // shot dari balik bahu: pendengar sudah tampil di lapisan depan
                  opacity: lensa.bahu === i ? 0 : 1,
                }}
              >
                <CharacterFigure
                  id={id}
                  expression={data.expression}
                  bicara={data.speaker === id}
                  tinggi={tinggi}
                  offset={i * 37}
                  lihatX={lihatX}
                  masuk={masuk}
                  action={aksiIni?.action}
                  heldItem={aksiIni?.heldItem}
                />
              </div>
            );
          })}
          {iEfek >= 0 && data.type !== 'question' ? (
            <EfekEkspresi
              expression={data.expression}
              x={xs[iEfek] + tinggiDari(urut[iEfek]) * 0.22}
              y={lantai - tinggiDari(urut[iEfek]) * 1.02}
              mulai={transisi + 6}
            />
          ) : null}
        </div>

        {/* lapisan depan: perabot/tanaman kabur yang menyapu cepat saat kamera bergerak */}
        {lensa.depan > 0.05 && !isDoa ? (
          <div style={{ ...gayaPanggung(jepit(kamDepan, fw, fh), fw, fh), opacity: lensa.depan, filter: 'blur(5px)' }}>
            <LatarDepan id={data.background} />
          </div>
        ) : null}

        {/* dari balik bahu: pendengar tampil besar & kabur di tepi depan */}
        {lensa.bahu !== undefined && lensa.bahu >= 0 ? (
          <BahuDepan id={urut[lensa.bahu]} kiri={xs[lensa.bahu] < (xs[iPembicara] ?? 960)} expression={data.expression} fw={fw} fh={fh} />
        ) : null}
      </AbsoluteFill>

      {/* vinyet lembut: mata tertuju ke tengah, menambah kesan kedalaman */}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(20,15,40,0.28) 100%)', pointerEvents: 'none' }} />

      {isDoa ? <KartuDoa prayer={data.prayer!} title={data.screenText} /> : null}

      {!isDoa && data.screenText ? (
        <TeksLayar text={data.screenText} gelap={gelap} besar={data.type === 'question' || urut.length === 0} />
      ) : null}

      {data.type === 'question' ? <TitikBerpikir mulai={durasi - fps * 3} gelap={gelap} /> : null}

      {denganSubtitle && !isDoa ? <Subtitle text={data.narration} durasi={durasiIsi} speaker={data.speaker} mulai={transisi} /> : null}
    </AbsoluteFill>
  );
};
