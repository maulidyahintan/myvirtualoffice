import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Action, Scene as AdeganData, Character as KarakterId } from '@kantor/shared/types';
import { Backdrop, DARK_BACKGROUNDS, STORM_BACKGROUNDS } from './backgrounds/Backdrop';
import { LightningCuesProvider, lightningAt } from './backgrounds/LightningCues';
import { activeActions, didEarlier, expressionAt, hasTimedActions, phraseFrame, timeActions } from '@kantor/shared/sceneTimeline';
import { MochiFall } from './characters/MochiFall';
import { HugArms } from './characters/HugArm';
import { isSadLike } from './characters/emotion';
import { MOTHER_KNEEL_DROP } from './characters/Mother';
import { approach, bedClimbY, hugArmAims } from './characters/interactions';
import { drawOrder, mochiLeavesRow, rowAtStart, stageInteractions } from './characters/staging';
import { FRONT_DOOR, FrontDoor } from './backgrounds/HouseFront';
import { DOOR_STANCE_X, doorOpen, doorReach, placeAroundDoor } from './backgrounds/door';
import { Foreground } from './backgrounds/Foreground';
import { ScenePropsLayer } from './props/SceneProps';
import { CharacterFigure, CHARACTER_SCALE, type Entrance } from './characters/CharacterFigure';
import { noiseS } from './characters/motion';
import { ExpressionEffect } from './Effects';
import { arabicFont, titleFont, textFont, warna } from './theme';

const W = 1920;
const H = 1080;
const LANTAI = 890;
const TINGGI_DASAR = 560;

/** Seconds Mochi sleeps before the pillow drops (action 'falling'). */
const FALL_DELAY_SECONDS = 1.2;
/** A child hugging its knees sits this far left of the bed's foot, on the mattress. */
const BED_SEAT_OFFSET = { x: -270, y: 15 };
/** Mother's hug: the child stands this far to her right, in front of her. */
const HUG_OFFSET_X = 130;
/** Mochi stops this far beside the character it walks up to (further from a child wrapped in a blanket). */
const APPROACH_GAP_X = 170;
const BLANKET_APPROACH_GAP_X = 300;
/** Frames into the scene before Mochi starts walking. */
const APPROACH_DELAY_FRAMES = 12;
/** The voice ends this long before the scene does (the breath after each scene). */
const BREATH_SECONDS = 1;
/** A child diving from the floor onto the bed: frames in the air and height of the leap. */
const DIVE_FRAMES = 14;
const DIVE_ARC_HEIGHT = 150;
/** The right-hand end of the bed, measured from the spot where Mochi sleeps at its foot. */
const BED_END_OFFSET_X = 130;
/** Frames into the scene before the front door is opened. */
const DOOR_DELAY_FRAMES = 8;
/** Strongest white-out of the whole frame during a lightning flash. */
const LIGHTNING_OVERLAY_OPACITY = 0.28;

/** Ujung kasur (tengah-bawah tempat Mochi berbaring) di latar yang punya tempat tidur. */
const UJUNG_KASUR: Partial<Record<AdeganData['background'], { x: number; y: number }>> = {
  'bedroom-night': { x: 790, y: 640 },
  'bedroom-storm': { x: 790, y: 640 },
};

/**
 * Mochi berjalan memutari kaki tokoh (±7 detik sekali putaran): di depan kaki ia lebih besar & lebih
 * rendah, di belakang lebih kecil & tertutup tokoh; berbalik badan di kedua sisi.
 */
function putaranMochi(frame: number) {
  const sudut = Math.PI / 4 + (frame / 210) * Math.PI * 2;
  const s = Math.sin(sudut);
  return { dx: Math.cos(sudut) * 170, dy: s * 18, skala: 1 + s * 0.06, depan: s > 0, hadap: Math.max(-1, Math.min(1, s * 4)) };
}

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
export function clampCamera(k: Kamera, fw = W, fh = H): Kamera {
  const zMin = Math.max(fw / W, fh / H);
  const z = zMin * (zMin > 1 ? Math.pow(Math.max(1, k.z), 0.35) : Math.max(1, k.z));
  const bx = fw / 2 / z;
  const by = fh / 2 / z;
  return { z, x: Math.min(W - bx, Math.max(bx, k.x)), y: Math.min(H - by, Math.max(by, k.y)) };
}

/** Transformasi CSS untuk wadah panggung berukuran 1920x1080. */
export const transformKamera = (k: Kamera, fw = W, fh = H) => `translate(${fw / 2 - k.x * k.z}px, ${fh / 2 - k.y * k.z}px) scale(${k.z})`;

/** Wadah panggung 1920x1080 (koordinat dunia) yang dilihat lewat kamera. */
export const stageStyle = (k: Kamera, fw: number, fh: number): React.CSSProperties => ({
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
  const k = (z: number, x: number, y: number) => clampCamera({ z, x: x + gx, y: y + gy }, fw, fh);
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
  friend: { nama: 'Ali', warna: '#2F8A63' },
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
              fontFamily: titleFont,
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
            fontFamily: textFont,
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
          fontFamily: titleFont,
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
          <div style={{ fontFamily: titleFont, fontSize: 52, fontWeight: 700, color: '#2F6F5E', marginBottom: 20 }}>{title}</div>
        ) : null}
        <div dir="rtl" style={{ fontFamily: arabicFont, fontSize: vertikal ? 64 : 76, lineHeight: 1.7, color: warna.teksGelap, fontWeight: 700 }}>
          {prayer.arabic}
        </div>
        <div style={{ fontFamily: textFont, fontStyle: 'italic', fontSize: 40, color: '#5A5470', marginTop: 18 }}>{prayer.latin}</div>
        <div style={{ fontFamily: textFont, fontWeight: 700, fontSize: 40, color: '#2F6F5E', marginTop: 18 }}>“{prayer.meaning}”</div>
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
export function transitionStyle(indeks: number, p: number): React.CSSProperties {
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
  s: { bicara: boolean; mendengar: boolean; lihatX: number; beraksi: boolean; aksi?: Action },
): { x: number; y: number; miring: number; skala: number; lihatX?: number } {
  const f = frame + i * 53;
  // Mochi bermain: mengikuti mainannya ke kiri-kanan & sesekali menerkam
  if (id === 'mochi' && s.aksi === 'playing') {
    const p = (f % 80) / 80;
    const terkam = p < 0.22 ? Math.sin((p / 0.22) * Math.PI) : 0;
    return { x: Math.sin(f / 45) * 40, y: -terkam * 34, miring: -terkam * 8, skala: 1 };
  }
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

/** Mochi walking slowly up to someone and then standing beside them, facing the way it walked. */
const ApproachingMochi: React.FC<{
  fromX: number;
  toX: number;
  y: number;
  height: number;
  start: number;
  /** walking from the floor up onto the bed: the floor height and the bed end it hops over */
  climb?: { floorY: number; bedEdgeX: number };
}> = ({ fromX, toX, y, height, start, climb }) => {
  const frame = useCurrentFrame();
  const state = approach(frame - start, fromX, toX);
  const width = (height * 240) / 400;
  const feetY = climb ? bedClimbY(state.x, climb.bedEdgeX, climb.floorY, y) : y;
  return (
    <div
      style={{
        position: 'absolute',
        left: state.x - width / 2,
        top: feetY - height,
        transformOrigin: '50% 100%',
        // Mochi's tail is on its right: walking to the left needs no mirroring
        transform: `scaleX(${state.facing === 1 ? -1 : 1})`,
      }}
    >
      <CharacterFigure
        id="mochi"
        expression={state.step === null ? 'happy' : 'calm'}
        bicara={false}
        tinggi={height}
        offset={37}
        lihatX={-1}
        masuk="ada"
        langkah={state.step ?? undefined}
      />
    </div>
  );
};

/** A frightened child leaping from its spot on the floor onto the bed, before the blanket covers it. */
const DivingChild: React.FC<{ id: KarakterId; from: { x: number; y: number }; to: { x: number; y: number }; progress: number; height: number }> = ({
  id,
  from,
  to,
  progress,
  height,
}) => {
  const t = Math.min(1, Math.max(0, progress));
  const x = from.x + (to.x - from.x) * t;
  const y = from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * DIVE_ARC_HEIGHT;
  const width = (height * 240) / 400;
  return (
    <div style={{ position: 'absolute', left: x - width / 2, top: y - height, transformOrigin: '50% 60%', transform: `rotate(${-t * 20}deg)` }}>
      <CharacterFigure id={id} expression="surprised" bicara={false} tinggi={height} offset={11} lihatX={-1} masuk="ada" action="startled" actionStart={-100} />
    </div>
  );
};

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

/**
 * Adegan ilustrasi AI: gambar kejadian penuh layar dengan gerak kamera pelan (Ken Burns) yang arahnya
 * bergantian tiap adegan, supaya gambar diam tetap terasa hidup. Tokoh animasi tidak tampil di sini.
 */
const AdeganIlustrasi: React.FC<{ data: AdeganData; durasi: number; denganSubtitle: boolean; indeks: number; transisi: number }> = ({
  data,
  durasi,
  denganSubtitle,
  indeks,
  transisi,
}) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, durasi], [0, 1], { extrapolateRight: 'clamp', easing: Easing.inOut(Easing.sin) });
  const pTransisi = transisi > 0 ? interpolate(frame, [0, transisi], [0, 1], { extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) }) : 1;
  // zoom masuk / keluar dan geser kiri / kanan / naik, bergiliran per adegan
  const arah = [
    { z: [1.04, 1.16], x: [0, -2.5], y: [0, -1] },
    { z: [1.16, 1.05], x: [-2, 2], y: [0, 0] },
    { z: [1.06, 1.14], x: [2.5, 0], y: [-1.5, 1] },
    { z: [1.12, 1.04], x: [0, 0], y: [2, -1.5] },
  ][indeks % 4];
  const z = arah.z[0] + (arah.z[1] - arah.z[0]) * t;
  const x = arah.x[0] + (arah.x[1] - arah.x[0]) * t;
  const y = arah.y[0] + (arah.y[1] - arah.y[0]) * t;
  // cahaya lembut yang bernapas pelan
  const napas = 0.06 + Math.sin(frame / 40) * 0.03;
  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden', ...transitionStyle(indeks, pTransisi) }}>
      <AbsoluteFill style={{ transform: `scale(${z}) translate(${x}%, ${y}%)` }}>
        <Img src={staticFile(data.illustration!.image!)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 35% 25%, rgba(255,240,200,${napas}) 0%, transparent 60%)` }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(20,15,40,0.32) 100%)', pointerEvents: 'none' }} />
      {data.screenText ? <TeksLayar text={data.screenText} gelap={false} besar /> : null}
      {denganSubtitle ? <Subtitle text={data.narration} durasi={durasi - transisi} speaker={data.speaker} mulai={transisi} /> : null}
    </AbsoluteFill>
  );
};

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
  const gelap = DARK_BACKGROUNDS.includes(data.background);
  const isDoa = data.type === 'prayer' && data.prayer;
  const durasiIsi = durasi - transisi;
  // actions that change during the scene start at their words in the narration (`at`)
  const speechFrames = Math.max(1, durasiIsi - fps * BREATH_SECONDS);
  const timed = timeActions(data.actions ?? [], data.narration, transisi, speechFrames);
  const sequenced = hasTimedActions(data.actions);
  const nowActions = sequenced ? activeActions(timed, frame) : timed;
  const aktif: AdeganData = sequenced ? { ...data, actions: nowActions } : data;
  const startOf = (id: KarakterId) => nowActions.find((a) => a.character === id)?.startFrame ?? 0;
  // each character's own expression (moods), changing at its words; else the scene's expression
  const ekspresi = (id: KarakterId) =>
    expressionAt(data.moods, id, frame, { narration: data.narration, expression: data.expression, speechStart: transisi, speechFrames });
  const lightningCues = (data.lightningAt ?? [])
    .map((words) => phraseFrame(data.narration, words, transisi, speechFrames))
    .filter((cue): cue is number => cue !== undefined);

  if (data.illustration?.image && !isDoa) {
    return <AdeganIlustrasi data={data} durasi={durasi} denganSubtitle={denganSubtitle} indeks={indeks} transisi={transisi} />;
  }

  // Mochi bisa keluar dari barisan tokoh: tidur di ujung kasur (video biasa; di Shorts kasurnya terpotong)
  // atau berputar di kaki Mamas/Ibu
  const aksiMochi = isDoa || !data.characters.includes('mochi') ? undefined : aktif.actions?.find((a) => a.character === 'mochi')?.action;
  const bedFoot = vertikal ? undefined : UJUNG_KASUR[data.background];
  // Mochi that walked onto the bed earlier in the scene stays there, beside the child on the bed
  const mochiOnBed =
    sequenced && bedFoot && didEarlier(timed, 'mochi', 'approaching', frame)
      ? { x: bedFoot.x + BED_SEAT_OFFSET.x + BLANKET_APPROACH_GAP_X, y: bedFoot.y + 5 }
      : undefined;
  const kasur = (aksiMochi === 'sleeping' || aksiMochi === 'falling') && !vertikal ? (mochiOnBed ?? UJUNG_KASUR[data.background]) : undefined;
  // Mochi falls off the bed under a pillow: asleep for about a second (or awake on the bed, startled), then
  // lands on the floor in front of the bed
  const fall =
    kasur && aksiMochi === 'falling'
      ? { start: sequenced ? startOf('mochi') : transisi + Math.round(fps * FALL_DELAY_SECONDS), landing: { x: kasur.x - 110, y: 885 } }
      : undefined;
  const mochiStartledOnBed = aksiMochi === 'startled' && mochiOnBed ? mochiOnBed : undefined;
  const dikelilingi = aksiMochi === 'circling' ? (['mamas', 'mother'] as const).find((id) => data.characters.includes(id)) : undefined;
  // touching characters: a child on the bed, Mochi carried or walking up to someone, Mother hugging a child
  const staging = isDoa ? {} : stageInteractions(aktif, { hasBed: Boolean(bedFoot) });
  const bedSeat = staging.sitterOnBed && bedFoot ? { x: bedFoot.x + BED_SEAT_OFFSET.x, y: bedFoot.y + BED_SEAT_OFFSET.y } : undefined;
  const mochiLepas = Boolean(kasur || dikelilingi || mochiStartledOnBed || mochiLeavesRow(staging));
  // abaikan id karakter lama yang sudah tidak ada (misal dari episode sebelum konsep berubah)
  const urut = isDoa
    ? []
    : data.characters.filter((id) => id in CHARACTER_SCALE && !(mochiLepas && id === 'mochi') && id !== staging.sitterOnBed);
  const tinggiDari = (id: KarakterId) => (vertikal ? 470 : TINGGI_DASAR) * CHARACTER_SCALE[id];
  // tokoh berdiri di kanan kasur supaya Mochi yang tidur di ujungnya (atau anak yang duduk di kasur) tidak tertutup
  const kasurDipakai = kasur ?? (bedSeat ? bedFoot : undefined);
  const geserKasur = kasurDipakai && urut.length ? Math.max(0, kasurDipakai.x + 110 + (tinggiDari(urut[0]) * 240) / 400 / 2 - posisiX(urut.length, vertikal)[0]) : 0;
  const xs = posisiX(urut.length, vertikal).map((x) => x + geserKasur);
  // a scene whose actions change keeps everyone at the spot they started on
  const barisAwal = sequenced ? rowAtStart(data.characters.filter((id) => id in CHARACTER_SCALE), activeActions(timed, 0), { hasBed: Boolean(bedFoot) }) : [];
  const xsAwal = posisiX(barisAwal.length, vertikal);
  urut.forEach((id, i) => {
    const k = barisAwal.indexOf(id);
    if (k >= 0) xs[i] = xsAwal[k];
  });
  // a child diving onto the bed at its cue: in the air from its spot in the row to the seat on the bed
  const sitterStart = staging.sitterOnBed && sequenced ? startOf(staging.sitterOnBed) : 0;
  const sejakLoncat = frame - sitterStart;
  const sedangLoncat = sitterStart > 0 && sejakLoncat < DIVE_FRAMES;
  const loncatDari = staging.sitterOnBed ? xsAwal[barisAwal.indexOf(staging.sitterOnBed)] : undefined;
  const iIbu = urut.indexOf('mother');
  const iDipeluk = staging.hugged ? urut.indexOf(staging.hugged) : -1;
  // hugged: the child stands in front of Mother, at her right side
  if (iIbu >= 0 && iDipeluk >= 0) xs[iDipeluk] = xs[iIbu] + HUG_OFFSET_X;
  // opening the front door: the opener stands right of the door with the left arm on the handle
  const adaPintu = data.background === 'house-front';
  const iPembuka = adaPintu ? urut.findIndex((id) => aktif.actions?.some((a) => a.character === id && a.action === 'opening-door')) : -1;
  const jarakPintu = iPembuka >= 0 ? DOOR_STANCE_X[urut[iPembuka]] : undefined;
  if (iPembuka >= 0 && jarakPintu !== undefined) {
    xs[iPembuka] = FRONT_DOOR.handle.x + jarakPintu;
    // everyone else steps aside so nobody stands in front of the opener
    const lebarTokoh = (id: KarakterId) => (tinggiDari(id) * 240) / 400;
    const lainnya = urut.map((_, i) => i).filter((i) => i !== iPembuka);
    const tempat = placeAroundDoor({ x: xs[iPembuka], width: lebarTokoh(urut[iPembuka]) }, lainnya.map((i) => lebarTokoh(urut[i])), FRONT_DOOR.left);
    lainnya.forEach((i, k) => (xs[i] = tempat[k]));
  }
  const sejakPintu = frame - transisi - DOOR_DELAY_FRAMES;
  const bukaPintu = iPembuka >= 0 ? doorOpen(sejakPintu) : 0;
  // Mother is drawn before the child she hugs, so her arm can lie over the child
  const urutanGambar = drawOrder(urut.length, iIbu, iDipeluk);
  const iPembicara = urut.findIndex((id) => id === data.speaker);

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
  // the whole fall (and everything that happens in order) must stay in view: one wide shot for the scene
  if (fall || sequenced) rencana.splice(0, rencana.length, { shot: 'lebar', mulai: 0, durasi });
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
  const kamLatar = clampCamera({ z: 1 + (zRel - 1) * 0.75, x: 960 + (kam.x - 960) * 0.75, y: 540 + (kam.y - 540) * 0.75 }, fw, fh);
  // clampCamera() memperhalus zoom di frame vertikal; latar tidak perlu dihaluskan dua kali
  if (zDasar > 1) kamLatar.z = Math.max(zDasar, kamLatar.z);
  // lapisan depan bergerak lebih cepat dari karakter
  const kamDepan = { z: kam.z * 1.12, x: 960 + (kam.x - 960) * 1.35, y: kam.y };

  const pTransisi = transisi > 0 ? interpolate(frame, [0, transisi], [0, 1], { extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) }) : 1;

  const propertiAdegan = (lapisan: 'bawah' | 'belakang') =>
    isDoa ? null : (
      <ScenePropsLayer
        props={data.props ?? []}
        actions={aktif.actions ?? []}
        urut={urut}
        xs={xs}
        lantai={lantai}
        skala={((vertikal ? 470 : TINGGI_DASAR) / 400) * 1.15}
        vertikal={vertikal}
        lapisan={lapisan}
      />
    );

  const mochiKeliling = (xTokoh: number) => {
    const p = putaranMochi(frame);
    const tinggi = tinggiDari('mochi');
    const lebar = (tinggi * 240) / 400;
    return {
      depan: p.depan,
      el: (
        <div
          key="mochi-keliling"
          style={{
            position: 'absolute',
            left: xTokoh + p.dx - lebar / 2,
            top: lantai - tinggi + p.dy,
            transformOrigin: '50% 100%',
            // ekor Mochi di kanan badan: berjalan ke kiri = tidak dicerminkan
            transform: `scale(${p.hadap * p.skala}, ${p.skala})`,
          }}
        >
          <CharacterFigure id="mochi" expression={isSadLike(data.expression) ? 'calm' : 'happy'} bicara={false} tinggi={tinggi} offset={37} lihatX={-1} masuk="ada" langkah={frame * 0.6} />
        </div>
      ),
    };
  };

  /** Where Mother's two arms go around the hugged child (she kneels to the child's height). */
  const titikPelukan = (iMother: number, iChild: number) => {
    const motherHeight = tinggiDari('mother');
    const aims = hugArmAims({ x: xs[iMother], height: motherHeight, drop: MOTHER_KNEEL_DROP }, { x: xs[iChild], height: tinggiDari(urut[iChild]) }, lantai);
    return { ...aims, motherHeight };
  };

  // Mochi walking up to someone standing in the row: in from the side and stopping beside them
  const iTujuan = staging.approachTarget && staging.approachTarget !== staging.sitterOnBed ? urut.indexOf(staging.approachTarget) : -1;
  const sisiDatang = iTujuan >= 0 && xs[iTujuan] < W / 2 ? 1 : -1;
  const mochiMendekat =
    iTujuan >= 0 ? { fromX: xs[iTujuan] + sisiDatang * (APPROACH_GAP_X + 650), toX: xs[iTujuan] + sisiDatang * APPROACH_GAP_X } : undefined;

  // siapa yang diberi efek expression: speaker, atau tokoh manusia pertama
  const iEfek = iPembicara >= 0 ? iPembicara : urut.findIndex((id) => id !== 'mochi');

  return (
    <LightningCuesProvider cues={lightningCues}>
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden', ...transitionStyle(indeks, pTransisi) }}>
      <AbsoluteFill style={{ transform: `scale(${hentak})` }}>
        {/* background: bidang belakang yang ikut berputar sedikit & kabur saat close-up (2.5D) */}
        <AbsoluteFill
          style={{
            transform: bidangLatar(lensa),
            filter: lensa.blurLatar > 0.2 && !isDoa ? `blur(${lensa.blurLatar}px)` : undefined,
          }}
        >
          <div style={stageStyle(kamLatar, fw, fh)}>
            <Backdrop id={data.background} />
            {adaPintu ? <FrontDoor open={bukaPintu} /> : null}
            {/* Mochi di kasur ikut bidang latar, supaya tidak bergeser dari kasurnya saat kamera bergerak */}
            {fall && kasur ? (
              <MochiFall height={tinggiDari('mochi')} from={kasur} to={fall.landing} start={fall.start} awake={Boolean(mochiOnBed)} />
            ) : kasur ? (
              <div style={{ position: 'absolute', left: kasur.x - (tinggiDari('mochi') * 240) / 400 / 2, top: kasur.y - tinggiDari('mochi') }}>
                <CharacterFigure id="mochi" expression="calm" bicara={false} tinggi={tinggiDari('mochi')} offset={37} masuk="ada" action="sleeping" />
              </div>
            ) : null}
            {mochiStartledOnBed ? (
              <div style={{ position: 'absolute', left: mochiStartledOnBed.x - (tinggiDari('mochi') * 240) / 400 / 2, top: mochiStartledOnBed.y - tinggiDari('mochi') }}>
                <CharacterFigure id="mochi" expression="surprised" bicara={false} tinggi={tinggiDari('mochi')} offset={37} lihatX={1} masuk="ada" action="startled" actionStart={startOf('mochi')} />
              </div>
            ) : null}
            {bedSeat && staging.sitterOnBed && sedangLoncat && loncatDari !== undefined ? (
              <DivingChild
                id={staging.sitterOnBed}
                from={{ x: loncatDari, y: lantai }}
                to={bedSeat}
                progress={sejakLoncat / DIVE_FRAMES}
                height={tinggiDari(staging.sitterOnBed)}
              />
            ) : null}
            {bedSeat && staging.sitterOnBed && !sedangLoncat ? (
              <div style={{ position: 'absolute', left: bedSeat.x - (tinggiDari(staging.sitterOnBed) * 240) / 400 / 2, top: bedSeat.y - tinggiDari(staging.sitterOnBed) }}>
                <CharacterFigure
                  id={staging.sitterOnBed}
                  expression={ekspresi(staging.sitterOnBed)}
                  bicara={data.speaker === staging.sitterOnBed}
                  tinggi={tinggiDari(staging.sitterOnBed)}
                  offset={11}
                  masuk="ada"
                  action={aktif.actions?.find((a) => a.character === staging.sitterOnBed)?.action}
                  actionStart={sitterStart + (sitterStart > 0 ? DIVE_FRAMES : 0)}
                  carriedCat={staging.carrier === staging.sitterOnBed ? staging.carriedCat : undefined}
                />
              </div>
            ) : null}
            {bedSeat && bedFoot && staging.approachTarget === staging.sitterOnBed && staging.sitterOnBed ? (
              <ApproachingMochi
                fromX={sequenced ? (xsAwal[barisAwal.indexOf('mochi')] ?? bedFoot.x + 100) : bedFoot.x + 100}
                toX={bedSeat.x + (aktif.actions?.some((a) => a.action === 'hiding-under-blanket') ? BLANKET_APPROACH_GAP_X : APPROACH_GAP_X)}
                y={bedFoot.y + 5}
                // in a scene with cues Mochi comes from its spot on the floor and hops onto the bed
                climb={sequenced ? { floorY: lantai, bedEdgeX: bedFoot.x + BED_END_OFFSET_X } : undefined}
                height={tinggiDari('mochi')}
                start={sequenced ? startOf('mochi') : transisi + APPROACH_DELAY_FRAMES}
              />
            ) : null}
          </div>
        </AbsoluteFill>

        {isDoa ? <AbsoluteFill style={{ backgroundColor: 'rgba(20,20,40,0.35)' }} /> : null}

        <div style={stageStyle(kam, fw, fh)}>
          {propertiAdegan('bawah')}
          {propertiAdegan('belakang')}
          {urutanGambar.map((i) => {
            const id: KarakterId = urut[i];
            const keliling = dikelilingi === id ? mochiKeliling(xs[i]) : null;
            const tinggi = tinggiDari(id);
            const lebar = (tinggi * 240) / 400;
            // yang mendengarkan menoleh ke speaker; speaker menatap penonton
            let lihatX = iPembicara >= 0 && iPembicara !== i ? Math.sign(xs[iPembicara] - xs[i]) : 0;
            // di Shorts karakter langsung muncul (berjalan masuk terlalu lama untuk video < 60 detik)
            const dalamPelukan = Boolean(staging.hugged) && (id === 'mother' || id === staging.hugged);
            const masuk: Entrance = sebelumnya.includes(id) || dalamPelukan || i === iPembuka ? 'ada' : vertikal || xs[i] === 960 ? 'muncul' : xs[i] < 960 ? 'kiri' : 'kanan';
            const aksiIni = aktif.actions?.find((a) => a.character === id);
            const gaya = gerakHidup(id, i, frame, {
              bicara: data.speaker === id,
              mendengar: i !== iPembicara && iPembicara >= 0,
              lihatX,
              // the hug pair stays still, so Mother's arm stays on the child's shoulders
              beraksi: (!!aksiIni && aksiIni.action !== 'circling') || dalamPelukan,
              aksi: aksiIni?.action,
            });
            if (gaya.lihatX !== undefined) lihatX = gaya.lihatX;
            // the one opening the door looks at it; someone shouting calls out towards the window
            if (i === iPembuka) lihatX = -1;
            if (aksiIni?.action === 'shouting') lihatX = 1;
            return (
              <React.Fragment key={id}>
              {keliling && !keliling.depan ? keliling.el : null}
              <div
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
                  expression={ekspresi(id)}
                  bicara={data.speaker === id}
                  tinggi={tinggi}
                  offset={i * 37}
                  lihatX={lihatX}
                  masuk={masuk}
                  action={aksiIni?.action}
                  heldItem={aksiIni?.heldItem}
                  carriedCat={staging.carrier === id ? staging.carriedCat : undefined}
                  reach={i === iPembuka ? doorReach(sejakPintu) : undefined}
                  actionStart={startOf(id)}
                  listening={iPembicara >= 0 && i !== iPembicara}
                />
              </div>
              {id === staging.hugged && iIbu >= 0 ? <HugArms {...titikPelukan(iIbu, i)} /> : null}
              {keliling?.depan ? keliling.el : null}
              </React.Fragment>
            );
          })}
          {mochiMendekat ? <ApproachingMochi {...mochiMendekat} height={tinggiDari('mochi')} y={lantai} start={transisi + APPROACH_DELAY_FRAMES} /> : null}
          {iEfek >= 0 && data.type !== 'question' ? (
            <ExpressionEffect
              expression={ekspresi(urut[iEfek])}
              x={xs[iEfek] + tinggiDari(urut[iEfek]) * 0.22}
              y={lantai - tinggiDari(urut[iEfek]) * 1.02}
              mulai={transisi + 6}
            />
          ) : null}
        </div>

        {/* lapisan depan: perabot/tanaman kabur yang menyapu cepat saat kamera bergerak */}
        {lensa.depan > 0.05 && !isDoa ? (
          <div style={{ ...stageStyle(clampCamera(kamDepan, fw, fh), fw, fh), opacity: lensa.depan, filter: 'blur(5px)' }}>
            <Foreground id={data.background} />
          </div>
        ) : null}

        {/* dari balik bahu: pendengar tampil besar & kabur di tepi depan */}
        {lensa.bahu !== undefined && lensa.bahu >= 0 ? (
          <BahuDepan id={urut[lensa.bahu]} kiri={xs[lensa.bahu] < (xs[iPembicara] ?? 960)} expression={ekspresi(urut[lensa.bahu])} fw={fw} fh={fh} />
        ) : null}
      </AbsoluteFill>

      {/* lightning briefly lights up the whole frame (soft, never a fast strobe) */}
      {STORM_BACKGROUNDS.includes(data.background) && !isDoa ? (
        <AbsoluteFill
          style={{ backgroundColor: '#DDE5FF', opacity: lightningAt(frame, lightningCues.length ? lightningCues : undefined).strength * LIGHTNING_OVERLAY_OPACITY, pointerEvents: 'none' }}
        />
      ) : null}

      {/* vinyet lembut: mata tertuju ke tengah, menambah kesan kedalaman */}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(20,15,40,0.28) 100%)', pointerEvents: 'none' }} />

      {isDoa ? <KartuDoa prayer={data.prayer!} title={data.screenText} /> : null}

      {!isDoa && data.screenText ? (
        <TeksLayar text={data.screenText} gelap={gelap} besar={data.type === 'question' || urut.length === 0} />
      ) : null}

      {data.type === 'question' ? <TitikBerpikir mulai={durasi - fps * 3} gelap={gelap} /> : null}

      {denganSubtitle && !isDoa ? <Subtitle text={data.narration} durasi={durasiIsi} speaker={data.speaker} mulai={transisi} /> : null}
    </AbsoluteFill>
    </LightningCuesProvider>
  );
};
