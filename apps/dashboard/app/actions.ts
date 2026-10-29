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
  FORMAT,
  JENIS_MUSIK,
  USIA,
  type Format,
  type JenisMusik,
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

function bacaFormat(form: FormData): Format {
  const f = teks(form, 'format') as Format;
  return FORMAT.includes(f) ? f : 'biasa';
}

/** Ganti format selama naskah belum ditulis. */
export async function ubahFormat(form: FormData) {
  const id = teks(form, 'id');
  const format = bacaFormat(form);
  updateEpisode(id, (e) => {
    e.ide.format = format;
    e.log.push({ waktu: new Date().toISOString(), oleh: 'pemilik', pesan: `Format diubah ke ${format}` });
  });
  segarkan(id);
}

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
      format: bacaFormat(form),
      jenis: 'hafalan',
      hafalan: { surat: nomor, namaSurat: s.namaLatin, ayatDari: dari, ayatSampai: sampai, ulang, basmalah: form.get('basmalah') === 'on' },
      alasan: 'Ide hafalan dari pemilik channel',
      referensi: [],
    },
    'pemilik',
  );
  setStatus(ep.id, 'writing', 'pemilik', 'Mengambil teks surat');
  jalankanKantor(['hafalan', ep.id], ep.id);
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
      format: bacaFormat(form),
      alasan: 'Ide dari pemilik channel',
      referensi: [],
    },
    'pemilik',
  );
  segarkan();
  redirect(`/episode/${ep.id}`);
}

export async function tulisNaskah(form: FormData) {
  const id = teks(form, 'id');
  if (getEpisode(id).ide.jenis === 'hafalan') {
    setStatus(id, 'writing', 'dashboard', 'Mengambil teks surat');
    jalankanKantor(['hafalan', id], id);
    return segarkan(id);
  }
  setStatus(id, 'writing', 'dashboard', 'Penulis mulai bekerja');
  jalankanKantor(['tulis', id], id);
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
