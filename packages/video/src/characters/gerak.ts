import type { Action, HeldItem, Expression } from '@kantor/shared/types';

// Alat bantu animasi karakter. Semua fungsi deterministik (bergantung frame saja),
// jadi hasil render selalu sama dan aman dirender paralel oleh Remotion.

/** Angka acak 0..1 yang selalu sama untuk n yang sama. */
export function acak(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Noise halus 0..1 (interpolasi smoothstep antar titik acak). */
export function noise(t: number, seed = 0): number {
  const i = Math.floor(t);
  const fr = t - i;
  const a = acak(i + seed * 1013);
  const b = acak(i + 1 + seed * 1013);
  const s = fr * fr * (3 - 2 * fr);
  return a + (b - a) * s;
}

/** Noise halus -1..1. */
export const noiseS = (t: number, seed = 0) => noise(t, seed) * 2 - 1;

/**
 * Kelopak mata: 0 = terbuka, 1 = tertutup. Kedip tidak beraturan (±2,5–5 detik),
 * kadang kedip dua kali. Frame awal tiap siklus tidak pernah kedip supaya
 * thumbnail (frame 0) selalu bermata terbuka.
 */
export function kelopak(f: number, seed: number): number {
  const siklus = 120;
  const k = Math.floor(f / siklus);
  const t = f - k * siklus;
  const mulai = 20 + acak(k + seed * 7) * 80;
  const ganda = acak(k + seed * 13) > 0.75;
  const satu = (m: number) => {
    const d = t - m;
    if (d < 0 || d > 6) return 0;
    return d < 2 ? d / 2 : d < 3 ? 1 : 1 - (d - 3) / 3;
  };
  return Math.max(satu(mulai), ganda ? satu(mulai + 9) : 0);
}

export interface Mulut {
  /** 0..1 seberapa terbuka */
  buka: number;
  /** 0 = lebar ("a/e"), 1 = bulat ("o/u") */
  bulat: number;
}

/** Gerak mulut saat bicara: suku kata naik-turun + jeda antar frasa. */
export function mulutBicara(f: number, seed: number): Mulut {
  const jeda = noise(f / 26, seed + 3) < 0.22;
  if (jeda) return { buka: 0, bulat: 0 };
  const sukuKata = Math.max(0, Math.sin(f * 0.85 + noise(f / 9, seed) * 4));
  const kuat = 0.45 + 0.55 * noise(f / 6, seed + 1);
  return { buka: sukuKata * kuat, bulat: noise(f / 5, seed + 2) > 0.65 ? 1 : 0 };
}

/** Sudut lengan (derajat). bahu: 0 = lurus ke bawah, positif = menjauh dari badan. siku: positif = lengan bawah berputar lebih jauh dari badan. */
export interface PoseLengan {
  bahu: number;
  siku: number;
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Data animasi yang sama untuk semua karakter, dihitung sekali per frame di Karakter.tsx. */
export interface PropsRig {
  expression: Expression;
  bicara: boolean;
  lambai: boolean;
  /** frame lokal + offset */
  f: number;
  tutup: number;
  mulut: Mulut;
  /** arah pandang -1 (kiri layar) .. 1 (kanan layar) */
  lihatX: number;
  seed: number;
  /** fase langkah saat berjalan masuk; null = berdiri */
  jalan: number | null;
  /** sedang melakukan apa (memegang benda, membaca Al-Qur'an, tidur, ...) */
  action?: Action;
  heldItem?: HeldItem;
}

/**
 * Fase gerak makan 0..1 (0 = benda di depan dada, 1 = di mulut). Siklus ±2,4 detik:
 * mengangkat, menggigit sebentar, menurunkan, lalu mengunyah.
 */
export function faseMakan(f: number): number {
  const p = (f % 72) / 72;
  if (p < 0.25) return Math.sin((p / 0.25) * (Math.PI / 2));
  if (p < 0.4) return 1;
  if (p < 0.6) return Math.cos(((p - 0.4) / 0.2) * (Math.PI / 2));
  return 0;
}

/** Tinggi pantulan bola saat dipantulkan (0 = di lantai, 1 = di tangan), siklus ±1 detik. */
export const pantulBola = (f: number) => Math.abs(Math.cos((f / 30) * Math.PI));

/** Pose lengan antara dua pose. */
export const campurPose = (a: PoseLengan, b: PoseLengan, t: number): PoseLengan => ({ bahu: lerp(a.bahu, b.bahu, t), siku: lerp(a.siku, b.siku, t) });
