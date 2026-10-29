import type { Ekspresi } from '@kantor/shared/types';

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
  ekspresi: Ekspresi;
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
}
