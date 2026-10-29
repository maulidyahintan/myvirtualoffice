'use server';

import fs from 'node:fs';
import path from 'node:path';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  createEpisodeFromIdea,
  getEpisode,
  loadConfig,
  paths,
  saveConfig,
  setStatus,
  updateEpisode,
  JENIS_MUSIK,
  NADA_MAKS,
  PILIHAN_FORMAT,
  USIA,
  type PilihanFormat,
  type JenisMusik,
  type ModeRekam,
  type Naskah,
  type Usia,
} from '@kantor/shared';
import { jalankanKantor, lokalKeIso } from '@/lib/jalankan';

const teks = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

function segarkan(id?: string) {
  revalidatePath('/');
  if (id) revalidatePath(`/episode/${id}`);
}

export async function mulaiRiset(form: FormData) {
  const arahan = teks(form, 'arahan');
  jalankanKantor(arahan ? ['riset', arahan] : ['riset']);
  segarkan();
}

export async function buatLaporan() {
  jalankanKantor(['laporan']);
  revalidatePath('/laporan');
}

function bacaFormat(form: FormData): PilihanFormat {
  const f = teks(form, 'format') as PilihanFormat;
  return PILIHAN_FORMAT.includes(f) ? f : 'biasa';
}

/**
 * Terapkan pilihan format ke episode. 'keduanya' → episode ini jadi video biasa dan
 * dibuatkan kembaran Shorts dari ide yang sama; keduanya saling tertaut.
 * Kembalikan id semua episode yang perlu dikerjakan.
 */
function terapkanFormat(id: string, pilihan: PilihanFormat): string[] {
  if (pilihan !== 'keduanya') {
    updateEpisode(id, (e) => {
      e.ide.format = pilihan;
    });
    return [id];
  }
  const ep = getEpisode(id);
  const short = createEpisodeFromIdea({ ...ep.ide, format: 'short' }, 'pemilik');
  updateEpisode(short.id, (e) => {
    e.pasangan = id;
    e.log.push({ waktu: new Date().toISOString(), oleh: 'pemilik', pesan: `Kembaran Shorts dari episode ${id}` });
  });
  updateEpisode(id, (e) => {
    e.ide.format = 'biasa';
    e.pasangan = short.id;
    e.log.push({ waktu: new Date().toISOString(), oleh: 'pemilik', pesan: `Dibuat juga versi Shorts: ${short.id}` });
  });
  return [id, short.id];
}

/** Mulai pekerjaan pertama: ambil teks surat (hafalan) atau tugaskan penulis (cerita). */
function mulaiTulis(id: string, oleh: string) {
  if (getEpisode(id).ide.jenis === 'hafalan') {
    setStatus(id, 'writing', oleh, 'Mengambil teks surat');
    jalankanKantor(['hafalan', id], id);
  } else {
    setStatus(id, 'writing', oleh, 'Penulis mulai bekerja');
    jalankanKantor(['tulis', id], id);
  }
}

/** Ganti format selama naskah belum ditulis. */
export async function buatHafalan(form: FormData) {
  const nomor = Number(teks(form, 'surat'));
  if (!Number.isInteger(nomor) || nomor < 1 || nomor > 114) throw new Error('Nomor surat harus 1–114');
  const res = await fetch(`https://equran.id/api/v2/surat/${nomor}`);
  if (!res.ok) throw new Error('Gagal mengambil info surat dari equran.id');
  const s = (await res.json()).data as { namaLatin: string; arti: string; jumlahAyat: number };
  const dari = Math.min(s.jumlahAyat, Math.max(1, Number(teks(form, 'ayatDari')) || 1));
  const sampai = Math.min(s.jumlahAyat, Math.max(dari, Number(teks(form, 'ayatSampai')) || s.jumlahAyat));
  const ulang = Math.min(10, Math.max(1, Number(teks(form, 'ulang')) || 1));
  const usia = teks(form, 'usia') as Usia;
  const rentang = dari === 1 && sampai === s.jumlahAyat ? '' : ` ayat ${dari}–${sampai}`;
  const ep = createEpisodeFromIdea(
    {
      judul: `Hafalan Surat ${s.namaLatin}${rentang}`,
      seri: 'hafalan',
      usia: USIA.includes(usia) ? usia : '1-10',
      pesanMoral: `Menghafal Surat ${s.namaLatin} (${s.arti})${ulang > 1 ? `, tiap ayat diulang ${ulang}x` : ''}`,
      jenis: 'hafalan',
      hafalan: { surat: nomor, namaSurat: s.namaLatin, ayatDari: dari, ayatSampai: sampai, ulang, basmalah: form.get('basmalah') === 'on' },
      alasan: 'Ide hafalan dari pemilik channel',
      referensi: [],
    },
    'pemilik',
  );
  for (const id of terapkanFormat(ep.id, bacaFormat(form))) mulaiTulis(id, 'pemilik');
  segarkan();
  redirect(`/episode/${ep.id}`);
}

/** Simpan waktu mulai tiap bacaan hafalan (koreksi manual) lalu render ulang. */
export async function simpanWaktuHafalan(form: FormData) {
  const id = teks(form, 'id');
  const angka = teks(form, 'waktu')
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map(Number);
  if (angka.some((n) => !Number.isFinite(n) || n < 0)) throw new Error('Isi waktu dalam detik, dipisah koma');
  updateEpisode(id, (e) => {
    if (e.hafalan) e.hafalan.mulaiSegmen = angka.length ? [...angka].sort((a, b) => a - b) : undefined;
  });
  setStatus(id, 'rendering', 'pemilik', angka.length ? 'Waktu bacaan dikoreksi manual' : 'Deteksi jeda otomatis diulang');
  jalankanKantor(['render', id], id);
  segarkan(id);
}

export async function buatIdeManual(form: FormData) {
  const usia = teks(form, 'usia') as Usia;
  const ep = createEpisodeFromIdea(
    {
      judul: teks(form, 'judul'),
      seri: teks(form, 'seri'),
      usia: USIA.includes(usia) ? usia : '4-6',
      pesanMoral: teks(form, 'pesanMoral'),
      alasan: 'Ide dari pemilik channel',
      referensi: [],
    },
    'pemilik',
  );
  terapkanFormat(ep.id, bacaFormat(form));
  segarkan();
  redirect(`/episode/${ep.id}`);
}

export async function tulisNaskah(form: FormData) {
  const id = teks(form, 'id');
  const ids = form.has('format') ? terapkanFormat(id, bacaFormat(form)) : [id];
  for (const i of ids) mulaiTulis(i, 'dashboard');
  segarkan(id);
}

export async function mintaRevisi(form: FormData) {
  const id = teks(form, 'id');
  const feedback = teks(form, 'feedback');
  if (!feedback) return;
  updateEpisode(id, (e) => {
    e.feedbackManusia = feedback;
  });
  setStatus(id, 'writing', 'pemilik', `Minta revisi: ${feedback.slice(0, 80)}`);
  jalankanKantor(['tulis', id], id);
  segarkan(id);
}

export async function simpanNaskahManual(form: FormData) {
  const id = teks(form, 'id');
  const naskah = JSON.parse(teks(form, 'naskah')) as Naskah;
  if (!Array.isArray(naskah.adegan) || !Array.isArray(naskah.dalil)) throw new Error('Format naskah tidak valid');
  updateEpisode(id, (e) => {
    e.naskah = naskah;
    e.log.push({ waktu: new Date().toISOString(), oleh: 'pemilik', pesan: 'Naskah diedit manual' });
  });
  segarkan(id);
}

export async function setujuiNaskah(form: FormData) {
  const id = teks(form, 'id');
  if (form.get('dalilDicek') !== 'on') throw new Error('Centang konfirmasi pengecekan dalil dulu');
  setStatus(id, 'directing', 'pemilik', 'Naskah disetujui (dalil sudah dicek pemilik)');
  jalankanKantor(['sutradara', id], id);
  segarkan(id);
}

export async function renderVideo(form: FormData) {
  const id = teks(form, 'id');
  setStatus(id, 'rendering', 'pemilik', 'Mulai render');
  jalankanKantor(['render', id], id);
  segarkan(id);
}

export async function setujuiVideo(form: FormData) {
  const id = teks(form, 'id');
  const jadwal = teks(form, 'jadwal');
  const args = ['upload', id];
  if (jadwal) {
    const iso = lokalKeIso(jadwal, loadConfig().zonaWaktu);
    if (new Date(iso).getTime() < Date.now() + 15 * 60_000) {
      throw new Error('Jadwal tayang minimal 15 menit dari sekarang');
    }
    args.push(iso);
  }
  setStatus(id, 'uploading', 'pemilik', 'Video disetujui');
  jalankanKantor(args, id);
  segarkan(id);
}

export async function tolak(form: FormData) {
  const id = teks(form, 'id');
  setStatus(id, 'rejected', 'pemilik', teks(form, 'alasan') || 'Ditolak pemilik');
  segarkan(id);
}

/** Pulihkan episode yang error / ditolak ke langkah yang masuk akal. */
export async function pulihkan(form: FormData) {
  const id = teks(form, 'id');
  const ep = getEpisode(id);
  const status = ep.render ? 'needs_video_approval' : ep.adegan ? 'needs_audio' : ep.naskah ? 'needs_script_approval' : 'idea';
  setStatus(id, status, 'pemilik', 'Dipulihkan');
  segarkan(id);
}

export async function simpanMusik(form: FormData) {
  const cfg = loadConfig();
  const volume = Math.min(100, Math.max(0, Number(teks(form, 'volume')) || 0)) / 100;
  cfg.musik = { ...cfg.musik, volume, diShorts: form.get('diShorts') === 'on' };
  saveConfig(cfg);
  revalidatePath('/pengaturan');
}

export async function hapusMusik(form: FormData) {
  const jenis = teks(form, 'jenis') as JenisMusik;
  const cfg = loadConfig();
  const file = JENIS_MUSIK.includes(jenis) ? cfg.musik?.[jenis] : undefined;
  if (!cfg.musik || !file) return;
  fs.rmSync(path.join(paths.videoPkg(), 'public', file), { force: true });
  delete cfg.musik[jenis];
  saveConfig(cfg);
  revalidatePath('/pengaturan');
}

export async function simpanNada(id: string, semiton: number) {
  updateEpisode(id, (e) => {
    e.nadaSuara = Math.max(-NADA_MAKS, Math.min(NADA_MAKS, Math.round(semiton * 2) / 2)) || undefined;
  });
  segarkan(id);
}

export async function ubahModeRekam(form: FormData) {
  const id = teks(form, 'id');
  const mode: ModeRekam = teks(form, 'mode') === 'per-adegan' ? 'per-adegan' : 'urut';
  updateEpisode(id, (e) => {
    e.modeRekam = mode;
    // file gabungan lama tidak berlaku lagi; dibuat ulang saat render
    e.fileAudio = mode === 'urut' && e.bagianAudio?.length === 1 ? e.bagianAudio[0] : undefined;
    if (e.hafalan) e.hafalan.mulaiSegmen = undefined;
  });
  segarkan(id);
}

export async function hapusRekaman(form: FormData) {
  const id = teks(form, 'id');
  const ep = getEpisode(id);
  const pub = path.join(paths.videoPkg(), 'public');
  for (const f of [...(ep.bagianAudio ?? []), ...(ep.audioPerAdegan ?? []), ep.fileAudio]) if (f) fs.rmSync(path.join(pub, f), { force: true });
  updateEpisode(id, (e) => {
    e.bagianAudio = undefined;
    e.audioPerAdegan = undefined;
    e.offsetAdegan = undefined;
    e.fileAudio = undefined;
    if (e.hafalan) e.hafalan.mulaiSegmen = undefined;
  });
  segarkan(id);
}
