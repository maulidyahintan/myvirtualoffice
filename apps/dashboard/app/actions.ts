'use server';

import fs from 'node:fs';
import path from 'node:path';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  addLog,
  createEpisodeFromIdea,
  getEpisode,
  loadConfig,
  paths,
  saveConfig,
  setStatus,
  updateEpisode,
  MUSIC_TYPES,
  MAX_PITCH,
  CHARACTER_PITCH_LIMITS,
  SPEAKERS,
  SHORTS_LIMIT_SECONDS,
  contentDuration,
  FORMATS,
  FORMAT_LABEL,
  autoShortsCount,
  MIN_SCHEDULE_GAP_MINUTES,
  FORMAT_CHOICES,
  publishPlan,
  type PublishSlot,
  AGE_GROUPS,
  type FormatChoice,
  type MusicType,
  type RecordingMode,
  type Script,
  type AgeGroup,
} from '@kantor/shared';
import { runOfficeCommand, localToIso } from '@/lib/runner';

const teks = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

function segarkan(id?: string) {
  revalidatePath('/');
  revalidatePath('/board');
  if (id) revalidatePath(`/episode/${id}`);
}

export async function startResearch(form: FormData) {
  const arahan = teks(form, 'arahan');
  runOfficeCommand(arahan ? ['riset', arahan] : ['riset']);
  segarkan();
}

export async function requestReport() {
  runOfficeCommand(['laporan']);
  revalidatePath('/reports');
}

function bacaFormat(form: FormData): FormatChoice {
  const f = teks(form, 'format') as FormatChoice;
  return FORMAT_CHOICES.includes(f) ? f : 'standard';
}

/**
 * Terapkan pilihan format ke episode. 'both' → episode ini jadi video biasa dan
 * dibuatkan kembaran Shorts dari ide yang sama; keduanya saling tertaut.
 * Kembalikan id semua episode yang perlu dikerjakan.
 */
function terapkanFormat(id: string, pilihan: FormatChoice): string[] {
  if (pilihan !== 'both') {
    updateEpisode(id, (e) => {
      e.idea.format = pilihan;
    });
    return [id];
  }
  const ep = getEpisode(id);
  const short = createEpisodeFromIdea({ ...ep.idea, format: 'short' }, 'pemilik');
  updateEpisode(short.id, (e) => {
    e.twin = id;
    e.log.push({ time: new Date().toISOString(), by: 'pemilik', message: `Kembaran Shorts dari episode ${id}` });
  });
  updateEpisode(id, (e) => {
    e.idea.format = 'standard';
    e.twin = short.id;
    e.log.push({ time: new Date().toISOString(), by: 'pemilik', message: `Dibuat juga versi Shorts: ${short.id}` });
  });
  return [id, short.id];
}

/** Mulai pekerjaan pertama: ambil teks surat (memorization) atau tugaskan penulis (story). */
function mulaiTulis(id: string, oleh: string) {
  if (getEpisode(id).idea.type === 'memorization') {
    setStatus(id, 'writing', oleh, 'Mengambil teks surat');
    runOfficeCommand(['memorization', id], id);
  } else {
    setStatus(id, 'writing', oleh, 'Penulis mulai bekerja');
    runOfficeCommand(['tulis', id], id);
  }
}

/** Ganti format selama naskah belum ditulis. */
export async function createMemorization(form: FormData) {
  const nomor = Number(teks(form, 'surat'));
  if (!Number.isInteger(nomor) || nomor < 1 || nomor > 114) throw new Error('Nomor surat harus 1–114');
  const res = await fetch(`https://equran.id/api/v2/surat/${nomor}`);
  if (!res.ok) throw new Error('Gagal mengambil info surat dari equran.id');
  const s = (await res.json()).data as { namaLatin: string; arti: string; jumlahAyat: number };
  const dari = Math.min(s.jumlahAyat, Math.max(1, Number(teks(form, 'ayatDari')) || 1));
  const sampai = Math.min(s.jumlahAyat, Math.max(dari, Number(teks(form, 'ayatSampai')) || s.jumlahAyat));
  const ulang = Math.min(10, Math.max(1, Number(teks(form, 'ulang')) || 1));
  const usia = teks(form, 'usia') as AgeGroup;
  const rentang = dari === 1 && sampai === s.jumlahAyat ? '' : ` ayat ${dari}–${sampai}`;
  const ep = createEpisodeFromIdea(
    {
      title: `Hafalan Surat ${s.namaLatin}${rentang}`,
      series: 'memorization',
      age: AGE_GROUPS.includes(usia) ? usia : '1-10',
      moralMessage: `Menghafal Surat ${s.namaLatin} (${s.arti})${ulang > 1 ? `, tiap ayat diulang ${ulang}x` : ''}`,
      type: 'memorization',
      memorization: { surah: nomor, surahName: s.namaLatin, verseFrom: dari, verseTo: sampai, repetitions: ulang, basmalah: form.get('basmalah') === 'on' },
      reason: 'Ide hafalan dari pemilik channel',
      references: [],
    },
    'pemilik',
  );
  for (const id of terapkanFormat(ep.id, bacaFormat(form))) mulaiTulis(id, 'pemilik');
  segarkan();
  redirect(`/episode/${ep.id}`);
}

/** Simpan waktu mulai tiap bacaan hafalan (koreksi manual) lalu render ulang. */
export async function saveMemorizationTiming(form: FormData) {
  const id = teks(form, 'id');
  const angka = teks(form, 'waktu')
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map(Number);
  if (angka.some((n) => !Number.isFinite(n) || n < 0)) throw new Error('Isi waktu dalam detik, dipisah koma');
  updateEpisode(id, (e) => {
    if (e.memorization) e.memorization.segmentStarts = angka.length ? [...angka].sort((a, b) => a - b) : undefined;
  });
  setStatus(id, 'rendering', 'pemilik', angka.length ? 'Waktu bacaan dikoreksi manual' : 'Deteksi jeda otomatis diulang');
  runOfficeCommand(['render', id], id);
  segarkan(id);
}

export async function createManualIdea(form: FormData) {
  const usia = teks(form, 'usia') as AgeGroup;
  const ep = createEpisodeFromIdea(
    {
      title: teks(form, 'judul'),
      series: teks(form, 'seri'),
      age: AGE_GROUPS.includes(usia) ? usia : '4-6',
      moralMessage: teks(form, 'pesanMoral'),
      reason: 'Ide dari pemilik channel',
      references: [],
    },
    'pemilik',
  );
  terapkanFormat(ep.id, bacaFormat(form));
  segarkan();
  redirect(`/episode/${ep.id}`);
}

export async function writeScript(form: FormData) {
  const id = teks(form, 'id');
  const ids = form.has('format') ? terapkanFormat(id, bacaFormat(form)) : [id];
  for (const i of ids) mulaiTulis(i, 'dashboard');
  segarkan(id);
}

export async function requestRevision(form: FormData) {
  const id = teks(form, 'id');
  const feedback = teks(form, 'feedback');
  if (!feedback) return;
  updateEpisode(id, (e) => {
    e.humanFeedback = feedback;
  });
  setStatus(id, 'writing', 'pemilik', `Minta revisi: ${feedback.slice(0, 80)}`);
  runOfficeCommand(['tulis', id], id);
  segarkan(id);
}

export async function saveManualScript(form: FormData) {
  const id = teks(form, 'id');
  const naskah = JSON.parse(teks(form, 'naskah')) as Script;
  if (!Array.isArray(naskah.scenes) || !Array.isArray(naskah.evidences)) throw new Error('Format naskah tidak valid');
  updateEpisode(id, (e) => {
    e.script = naskah;
    e.log.push({ time: new Date().toISOString(), by: 'pemilik', message: 'Naskah diedit manual' });
  });
  segarkan(id);
}

export async function approveScript(form: FormData) {
  const id = teks(form, 'id');
  if (form.get('dalilDicek') !== 'on') throw new Error('Centang konfirmasi pengecekan dalil dulu');
  setStatus(id, 'directing', 'pemilik', 'Naskah disetujui (dalil sudah dicek pemilik)');
  runOfficeCommand(['sutradara', id], id);
  segarkan(id);
}

export async function renderVideo(form: FormData) {
  const id = teks(form, 'id');
  setStatus(id, 'rendering', 'pemilik', 'Mulai render');
  runOfficeCommand(['render', id], id);
  segarkan(id);
}

export async function approveVideo(form: FormData) {
  const id = teks(form, 'id');
  const jadwal = teks(form, 'jadwal');
  const args = ['upload', id];
  let iso: string | undefined;
  if (jadwal) {
    iso = localToIso(jadwal, loadConfig().timeZone);
    if (new Date(iso).getTime() < Date.now() + MIN_SCHEDULE_GAP_MINUTES * 60_000) {
      throw new Error(`Jadwal tayang minimal ${MIN_SCHEDULE_GAP_MINUTES} menit dari sekarang`);
    }
    args.push(iso);
  }
  // tahan slot ini selama upload berjalan, supaya rekomendasi video berikutnya tidak bentrok
  updateEpisode(id, (e) => {
    e.selectedSchedule = iso;
  });
  setStatus(id, 'uploading', 'pemilik', iso ? `Video disetujui, tayang ${jadwal.replace('T', ' ')}` : 'Video disetujui');
  runOfficeCommand(args, id);
  segarkan(id);
}

export async function reject(form: FormData) {
  const id = teks(form, 'id');
  setStatus(id, 'rejected', 'pemilik', teks(form, 'alasan') || 'Ditolak pemilik');
  segarkan(id);
}

/**
 * Edit ulang episode yang sudah terjadwal/tayang. Upload lama dipindah ke `youtubeHistory`
 * (versi baru nanti diupload sebagai video baru, karena YouTube tidak bisa mengganti file video).
 * tujuan=video  → kembali ke persetujuan video (rekam ulang / render ulang)
 * tujuan=naskah → penulis merevisi naskah sesuai catatan
 * tarik=on      → video lama langsung dijadikan private (jadwal tayang batal); kalau tidak,
 *                 ditarik otomatis setelah versi baru diupload.
 */
export async function reopenForEdit(form: FormData) {
  const id = teks(form, 'id');
  const naskah = teks(form, 'tujuan') === 'naskah';
  const feedback = teks(form, 'feedback');
  if (naskah && !feedback) throw new Error('Tulis dulu apa yang perlu direvisi');
  const lama = getEpisode(id).youtube;
  updateEpisode(id, (e) => {
    if (e.youtube) e.youtubeHistory = [...(e.youtubeHistory ?? []), e.youtube];
    e.youtube = undefined;
    if (naskah) e.humanFeedback = feedback;
  });
  if (naskah) {
    setStatus(id, 'writing', 'pemilik', `Edit ulang, minta revisi naskah: ${feedback.slice(0, 80)}`);
    runOfficeCommand(['tulis', id], id);
  } else {
    setStatus(id, 'needs_video_approval', 'pemilik', 'Edit ulang video');
  }
  if (lama && form.get('tarik') === 'on') runOfficeCommand(['tarik', id], `${id}-tarik`);
  segarkan(id);
}

/**
 * Buat versi format lain (Shorts ↔ video biasa) dari episode yang sudah jadi: naskah, scenes,
 * metadata, dan rekaman yang sama, langsung dirender. File rekaman disalin supaya episode
 * kembaran bisa direkam ulang/dihapus tanpa mengganggu aslinya.
 */
export async function createAlternateFormat(form: FormData) {
  const id = teks(form, 'id');
  const ep = getEpisode(id);
  if (!ep.scenes || !ep.render) throw new Error('Episode belum punya video yang jadi');
  const format = (ep.idea.format ?? 'standard') === 'short' ? 'standard' : 'short';
  // video panjang tidak disalin utuh jadi Shorts (tidak akan dianggap Shorts oleh YouTube):
  // cerita dipecah jadi beberapa Shorts dari scenes intinya
  const isi = contentDuration(ep);
  if (format === 'short' && isi !== undefined && isi > SHORTS_LIMIT_SECONDS) {
    if (ep.idea.type === 'memorization') throw new Error('Video hafalan ini terlalu panjang untuk Shorts (lebih dari 3 menit)');
    return mulaiPecahShorts(id, autoShortsCount(isi));
  }
  const baru = createEpisodeFromIdea({ ...ep.idea, format }, 'pemilik');

  const pub = path.join(paths.videoPkg(), 'public');
  const salinan = new Map<string, string>();
  const salin = (rel: string | null | undefined) => {
    if (!rel) return rel ?? undefined;
    if (!salinan.has(rel)) {
      const nama = path.basename(rel);
      const tujuan = `${path.dirname(rel)}/${nama.startsWith(id) ? baru.id + nama.slice(id.length) : `${baru.id}-${nama}`}`;
      if (fs.existsSync(path.join(pub, rel))) fs.copyFileSync(path.join(pub, rel), path.join(pub, tujuan));
      salinan.set(rel, tujuan);
    }
    return salinan.get(rel);
  };

  updateEpisode(baru.id, (e) => {
    const asal = structuredClone(ep);
    e.twin = id;
    e.script = asal.script;
    e.review = asal.review;
    e.scenes = asal.scenes;
    // metadata TIDAK disalin: Shorts & video biasa beda judul/deskripsi/tagar (dibuat ulang sebelum render)
    e.memorization = asal.memorization;
    e.recordingMode = asal.recordingMode;
    e.audioFile = salin(asal.audioFile);
    e.audioParts = asal.audioParts?.map((f) => salin(f)!);
    e.audioPerScene = asal.audioPerScene?.map((f) => salin(f) ?? null);
    e.sceneOffsets = asal.sceneOffsets;
    e.voicePitch = asal.voicePitch;
    e.characterEffects = asal.characterEffects;
    e.log.push({ time: new Date().toISOString(), by: 'pemilik', message: `Versi ${FORMAT_LABEL[format]} dari episode ${id} (materi & rekaman sama)` });
  });
  updateEpisode(id, (e) => {
    e.twin = baru.id;
    e.log.push({ time: new Date().toISOString(), by: 'pemilik', message: `Dibuat versi ${FORMAT_LABEL[format]}: ${baru.id}` });
  });
  setStatus(baru.id, 'rendering', 'pemilik', `Metadata & render versi ${FORMAT_LABEL[format]}`);
  runOfficeCommand(['metadata', baru.id, 'render'], baru.id);
  segarkan(id);
  redirect(`/episode/${baru.id}`);
}

/** Pecah video biasa yang sudah jadi menjadi beberapa Shorts dari scenes pentingnya. */
export async function splitIntoShorts(form: FormData) {
  const id = teks(form, 'id');
  // 'otomatis' (atau kosong) = sesuai panjang video
  const jumlah = Math.min(5, Math.max(1, Number(teks(form, 'jumlah')) || autoShortsCount(contentDuration(getEpisode(id)))));
  mulaiPecahShorts(id, jumlah, teks(form, 'arahan'));
}

function mulaiPecahShorts(id: string, jumlah: number, arahan = '') {
  addLog(id, 'pemilik', `Minta ${jumlah} Shorts dari inti video${arahan ? `: ${arahan.slice(0, 80)}` : ''}`);
  runOfficeCommand(['shorts', id, String(jumlah), ...(arahan ? [arahan] : [])], `${id}-shorts`);
  segarkan(id);
}

/** Channel Manager membuat ulang judul, deskripsi & tags sesuai format episode. */
export async function regenerateMetadata(form: FormData) {
  const id = teks(form, 'id');
  runOfficeCommand(['metadata', id], `${id}-metadata`);
  segarkan(id);
}

/** Minta Channel Manager menyusun rencana jadwal tayang. */
export async function requestPublishPlan(form: FormData) {
  const arahan = teks(form, 'arahan');
  runOfficeCommand(arahan ? ['rencana', arahan] : ['rencana']);
  revalidatePath('/schedule');
}

/** Pemilik mengubah rencana jadwal tayang secara manual. */
export async function savePublishPlan(form: FormData) {
  const cfg = loadConfig();
  const lama = publishPlan(cfg);
  const slot = form
    .getAll('jam')
    .map((j, i) => ({ time: String(j).trim(), format: String(form.getAll('formatSlot')[i] ?? 'all') }))
    .filter((s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s.time) && ['all', ...FORMATS].includes(s.format)) as PublishSlot[];
  const hari = form
    .getAll('hari')
    .map(Number)
    .filter((h) => h >= 0 && h <= 6);
  if (!slot.length) throw new Error('Isi minimal satu jam tayang');
  if (!hari.length) throw new Error('Pilih minimal satu hari tayang');
  cfg.publishPlan = {
    videosPerDay: Math.min(6, Math.max(1, Number(teks(form, 'videoPerHari')) || 1)),
    days: hari.sort(),
    slots: [...new Map(slot.map((s) => [`${s.time}-${s.format}`, s])).values()].sort((a, b) => a.time.localeCompare(b.time)),
    reason: lama.reason,
    by: 'owner',
    modified: new Date().toISOString(),
  };
  saveConfig(cfg);
  revalidatePath('/schedule');
  revalidatePath('/episode/[id]', 'page');
}

/** Nama playlist tujuan per seri (kosong = bawaan). */
export async function savePlaylists(form: FormData) {
  const cfg = loadConfig();
  cfg.series = cfg.series.map((s) => {
    const nama = teks(form, `playlist-${s.id}`);
    const { playlist: _, ...lain } = s;
    return nama ? { ...lain, playlist: nama } : lain;
  });
  saveConfig(cfg);
  revalidatePath('/settings');
}

/** Masukkan video yang sudah diupload tapi belum masuk playlist. */
export async function addAllToPlaylists() {
  runOfficeCommand(['playlist']);
  revalidatePath('/published');
  revalidatePath('/settings');
}

/** Pengaturan riset harian otomatis + pasang/lepas penjadwal macOS. */
export async function saveDailyResearch(form: FormData) {
  const cfg = loadConfig();
  const aktif = form.get('aktif') === 'on';
  const jam = /^([01]\d|2[0-3]):[0-5]\d$/.test(teks(form, 'jam')) ? teks(form, 'jam') : '07:00';
  const jumlahIde = Math.min(8, Math.max(1, Number(teks(form, 'jumlahIde')) || 4));
  cfg.dailyResearch = { active: aktif, time: jam, ideaCount: jumlahIde };
  saveConfig(cfg);
  // penjadwal ikut dipasang/dilepas, supaya cukup satu tombol
  runOfficeCommand([aktif ? 'harian-pasang' : 'harian-lepas']);
  revalidatePath('/settings');
}

/** Pulihkan episode yang error / ditolak ke langkah yang masuk akal. */
export async function recover(form: FormData) {
  const id = teks(form, 'id');
  const ep = getEpisode(id);
  const status = ep.render ? 'needs_video_approval' : ep.scenes ? 'needs_audio' : ep.script ? 'needs_script_approval' : 'idea';
  setStatus(id, status, 'pemilik', 'Dipulihkan');
  segarkan(id);
}

export async function saveMusicSettings(form: FormData) {
  const cfg = loadConfig();
  const volume = Math.min(100, Math.max(0, Number(teks(form, 'volume')) || 0)) / 100;
  cfg.music = { ...cfg.music, volume, inShorts: form.get('diShorts') === 'on' };
  saveConfig(cfg);
  revalidatePath('/settings');
}

export async function deleteMusic(form: FormData) {
  const jenis = teks(form, 'jenis') as MusicType;
  const cfg = loadConfig();
  const file = MUSIC_TYPES.includes(jenis) ? cfg.music?.[jenis] : undefined;
  if (!cfg.music || !file) return;
  fs.rmSync(path.join(paths.videoPkg(), 'public', file), { force: true });
  delete cfg.music[jenis];
  saveConfig(cfg);
  revalidatePath('/settings');
}

export async function savePitch(id: string, semiton: number) {
  updateEpisode(id, (e) => {
    e.voicePitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, Math.round(semiton * 2) / 2)) || undefined;
  });
  segarkan(id);
}

export async function saveCharacterEffects(id: string, aktif: boolean) {
  updateEpisode(id, (e) => {
    e.characterEffects = aktif ? undefined : false;
  });
  segarkan(id);
}

export async function saveCharacterVoices(form: FormData) {
  const cfg = loadConfig();
  const baca = (p: string) =>
    form.get(`${p}-reset`) === 'on'
      ? undefined
      : {
          pitch: Math.max(CHARACTER_PITCH_LIMITS.min, Math.min(CHARACTER_PITCH_LIMITS.max, Number(teks(form, `${p}-nada`)) || 0)),
          tempo: Math.max(70, Math.min(140, Number(teks(form, `${p}-tempo`)) || 100)) / 100,
        };
  const suara: NonNullable<typeof cfg.characterVoices> = {};
  for (const p of SPEAKERS) {
    const s = baca(p);
    if (s) suara[p] = s;
  }
  cfg.characterVoices = suara;
  cfg.memorizationVoice = baca('memorization');
  saveConfig(cfg);
  revalidatePath('/settings');
}

export async function changeRecordingMode(form: FormData) {
  const id = teks(form, 'id');
  const mode: RecordingMode = teks(form, 'mode') === 'per-scene' ? 'per-scene' : 'sequential';
  updateEpisode(id, (e) => {
    e.recordingMode = mode;
    // file gabungan lama tidak berlaku lagi; dibuat ulang saat render
    e.audioFile = mode === 'sequential' && e.audioParts?.length === 1 ? e.audioParts[0] : undefined;
    if (e.memorization) e.memorization.segmentStarts = undefined;
  });
  segarkan(id);
}

export async function deleteRecordings(form: FormData) {
  const id = teks(form, 'id');
  const ep = getEpisode(id);
  const pub = path.join(paths.videoPkg(), 'public');
  for (const f of [...(ep.audioParts ?? []), ...(ep.audioPerScene ?? []), ep.audioFile]) if (f) fs.rmSync(path.join(pub, f), { force: true });
  updateEpisode(id, (e) => {
    e.audioParts = undefined;
    e.audioPerScene = undefined;
    e.sceneOffsets = undefined;
    e.audioFile = undefined;
    if (e.memorization) e.memorization.segmentStarts = undefined;
  });
  segarkan(id);
}
