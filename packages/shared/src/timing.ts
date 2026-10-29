import { FPS, SPEK_FORMAT } from './constants.ts';
import type { Adegan, AyatHafalan, Format } from './types.ts';

const KATA_PER_DETIK = 2.1; // tempo membaca cerita anak yang pelan & jelas
const JEDA_PERTANYAAN_DETIK = 3; // anak diberi waktu berpikir

export function hitungKata(teks: string): number {
  return teks.trim().split(/\s+/).filter(Boolean).length;
}

/** Bobot setiap adegan, sebanding dengan panjang narasinya. */
function bobot(a: Adegan): number {
  return Math.max(4, hitungKata(a.narasi));
}

/**
 * Hitung durasi (frame) setiap adegan.
 * - Tanpa audio: perkiraan dari jumlah kata.
 * - Dengan audio: durasi audio dibagi proporsional sesuai panjang narasi,
 *   jadi teks di layar kurang lebih ikut suara kamu.
 */
export function hitungFrameAdegan(adegan: Adegan[], durasiAudioDetik?: number): number[] {
  if (adegan.length === 0) return [];
  if (durasiAudioDetik && durasiAudioDetik > 0) {
    const total = adegan.reduce((s, a) => s + bobot(a), 0);
    const totalFrame = Math.ceil(durasiAudioDetik * FPS) + FPS; // +1 detik napas di akhir
    const hasil = adegan.map((a) => Math.max(FPS * 2, Math.round((bobot(a) / total) * totalFrame)));
    return hasil;
  }
  return adegan.map((a) => {
    const detik = hitungKata(a.narasi) / KATA_PER_DETIK + 1 + (a.jenis === 'pertanyaan' ? JEDA_PERTANYAAN_DETIK : 0);
    return Math.round(Math.max(3, detik) * FPS);
  });
}

export function totalFrame(frameAdegan: number[], format: Format = 'biasa'): number {
  const spek = SPEK_FORMAT[format];
  return spek.introDetik * FPS + frameAdegan.reduce((s, f) => s + f, 0) + spek.outroDetik * FPS;
}

/** Urutan segmen hafalan: tiap ayat diulang `ulang` kali (basmalah sekali saja). */
export function segmenHafalan(ayat: AyatHafalan[], ulang: number): { ayat: number; ulangKe: number }[] {
  const hasil: { ayat: number; ulangKe: number }[] = [];
  ayat.forEach((a, i) => {
    const n = a.nomor === 0 ? 1 : Math.max(1, ulang);
    for (let k = 1; k <= n; k++) hasil.push({ ayat: i, ulangKe: k });
  });
  return hasil;
}

/**
 * Durasi (frame) tiap segmen hafalan.
 * - Ada `mulaiSegmen` (hasil deteksi jeda di rekaman): pakai waktu itu persis.
 * - Ada durasi audio saja: dibagi sesuai panjang teks Arab.
 * - Tanpa audio: perkiraan tempo membaca pelan.
 */
export function hitungFrameHafalan(
  ayat: AyatHafalan[],
  ulang: number,
  durasiAudioDetik?: number,
  mulaiSegmen?: number[],
): number[] {
  const segmen = segmenHafalan(ayat, ulang);
  if (segmen.length === 0) return [];
  if (durasiAudioDetik && mulaiSegmen && mulaiSegmen.length === segmen.length) {
    const batas = [...mulaiSegmen.slice(1), durasiAudioDetik + 1];
    let sebelum = 0;
    return batas.map((t) => {
      const akhir = Math.round(t * FPS);
      const f = Math.max(FPS, akhir - sebelum);
      sebelum += f;
      return f;
    });
  }
  const panjang = segmen.map((s) => Math.max(8, ayat[s.ayat].arab.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\s]/g, '').length));
  if (durasiAudioDetik && durasiAudioDetik > 0) {
    const total = panjang.reduce((a, b) => a + b, 0);
    const totalF = Math.ceil(durasiAudioDetik * FPS) + FPS;
    return panjang.map((p) => Math.max(FPS * 2, Math.round((p / total) * totalF)));
  }
  // ±6 huruf per detik untuk anak menirukan, plus jeda 1,5 detik
  return panjang.map((p) => Math.round((p / 6 + 1.5) * FPS));
}
