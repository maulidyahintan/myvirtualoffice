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
  JENIS_MUSIK,
  NADA_MAKS,
  BATAS_NADA_KARAKTER,
  PEMBICARA,
  FORMAT,
  FORMAT_LABEL,
  JEDA_MINIMAL_MENIT,
  PILIHAN_FORMAT,
  rencanaTayang,
  type SlotTayang,
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
  revalidatePath('/papan-kerja');
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
  let iso: string | undefined;
  if (jadwal) {
    iso = lokalKeIso(jadwal, loadConfig().zonaWaktu);
    if (new Date(iso).getTime() < Date.now() + JEDA_MINIMAL_MENIT * 60_000) {
      throw new Error(`Jadwal tayang minimal ${JEDA_MINIMAL_MENIT} menit dari sekarang`);
    }
    args.push(iso);
  }
  // tahan slot ini selama upload berjalan, supaya rekomendasi video berikutnya tidak bentrok
  updateEpisode(id, (e) => {
    e.jadwalDipilih = iso;
  });
  setStatus(id, 'uploading', 'pemilik', iso ? `Video disetujui, tayang ${jadwal.replace('T', ' ')}` : 'Video disetujui');
  jalankanKantor(args, id);
  segarkan(id);
}

export async function tolak(form: FormData) {
  const id = teks(form, 'id');
  setStatus(id, 'rejected', 'pemilik', teks(form, 'alasan') || 'Ditolak pemilik');
  segarkan(id);
}

/**
 * Edit ulang episode yang sudah terjadwal/tayang. Upload lama dipindah ke `youtubeLama`
 * (versi baru nanti diupload sebagai video baru, karena YouTube tidak bisa mengganti file video).
 * tujuan=video  → kembali ke persetujuan video (rekam ulang / render ulang)
 * tujuan=naskah → penulis merevisi naskah sesuai catatan
 * tarik=on      → video lama langsung dijadikan private (jadwal tayang batal); kalau tidak,
 *                 ditarik otomatis setelah versi baru diupload.
 */
export async function editUlang(form: FormData) {
  const id = teks(form, 'id');
  const naskah = teks(form, 'tujuan') === 'naskah';
  const feedback = teks(form, 'feedback');
  if (naskah && !feedback) throw new Error('Tulis dulu apa yang perlu direvisi');
  const lama = getEpisode(id).youtube;
  updateEpisode(id, (e) => {
    if (e.youtube) e.youtubeLama = [...(e.youtubeLama ?? []), e.youtube];
    e.youtube = undefined;
    if (naskah) e.feedbackManusia = feedback;
  });
  if (naskah) {
    setStatus(id, 'writing', 'pemilik', `Edit ulang, minta revisi naskah: ${feedback.slice(0, 80)}`);
    jalankanKantor(['tulis', id], id);
  } else {
    setStatus(id, 'needs_video_approval', 'pemilik', 'Edit ulang video');
  }
  if (lama && form.get('tarik') === 'on') jalankanKantor(['tarik', id], `${id}-tarik`);
  segarkan(id);
}

/**
 * Buat versi format lain (Shorts ↔ video biasa) dari episode yang sudah jadi: naskah, adegan,
 * metadata, dan rekaman yang sama, langsung dirender. File rekaman disalin supaya episode
 * kembaran bisa direkam ulang/dihapus tanpa mengganggu aslinya.
 */
export async function buatVersiLain(form: FormData) {
  const id = teks(form, 'id');
  const ep = getEpisode(id);
  if (!ep.adegan || !ep.render) throw new Error('Episode belum punya video yang jadi');
  const format = (ep.ide.format ?? 'biasa') === 'short' ? 'biasa' : 'short';
  const baru = createEpisodeFromIdea({ ...ep.ide, format }, 'pemilik');

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
    e.pasangan = id;
    e.naskah = asal.naskah;
    e.review = asal.review;
    e.adegan = asal.adegan;
    // metadata TIDAK disalin: Shorts & video biasa beda judul/deskripsi/tagar (dibuat ulang sebelum render)
    e.hafalan = asal.hafalan;
    e.modeRekam = asal.modeRekam;
    e.fileAudio = salin(asal.fileAudio);
    e.bagianAudio = asal.bagianAudio?.map((f) => salin(f)!);
    e.audioPerAdegan = asal.audioPerAdegan?.map((f) => salin(f) ?? null);
    e.offsetAdegan = asal.offsetAdegan;
    e.nadaSuara = asal.nadaSuara;
    e.efekKarakter = asal.efekKarakter;
    e.log.push({ waktu: new Date().toISOString(), oleh: 'pemilik', pesan: `Versi ${FORMAT_LABEL[format]} dari episode ${id} (materi & rekaman sama)` });
  });
  updateEpisode(id, (e) => {
    e.pasangan = baru.id;
    e.log.push({ waktu: new Date().toISOString(), oleh: 'pemilik', pesan: `Dibuat versi ${FORMAT_LABEL[format]}: ${baru.id}` });
  });
  setStatus(baru.id, 'rendering', 'pemilik', `Metadata & render versi ${FORMAT_LABEL[format]}`);
  jalankanKantor(['metadata', baru.id, 'render'], baru.id);
  segarkan(id);
  redirect(`/episode/${baru.id}`);
}

/** Pecah video biasa yang sudah jadi menjadi beberapa Shorts dari adegan-adegan pentingnya. */
export async function pecahShorts(form: FormData) {
  const id = teks(form, 'id');
  const jumlah = Math.min(5, Math.max(1, Number(teks(form, 'jumlah')) || 3));
  const arahan = teks(form, 'arahan');
  addLog(id, 'pemilik', `Minta ${jumlah} Shorts dari adegan penting${arahan ? `: ${arahan.slice(0, 80)}` : ''}`);
  jalankanKantor(['shorts', id, String(jumlah), ...(arahan ? [arahan] : [])], `${id}-shorts`);
  segarkan(id);
}

/** Channel Manager membuat ulang judul, deskripsi & tags sesuai format episode. */
export async function buatUlangMetadata(form: FormData) {
  const id = teks(form, 'id');
  jalankanKantor(['metadata', id], `${id}-metadata`);
  segarkan(id);
}

/** Minta Channel Manager menyusun rencana jadwal tayang. */
export async function mintaRencanaTayang(form: FormData) {
  const arahan = teks(form, 'arahan');
  jalankanKantor(arahan ? ['rencana', arahan] : ['rencana']);
  revalidatePath('/jadwal');
}

/** Pemilik mengubah rencana jadwal tayang secara manual. */
export async function simpanRencanaTayang(form: FormData) {
  const cfg = loadConfig();
  const lama = rencanaTayang(cfg);
  const slot = form
    .getAll('jam')
    .map((j, i) => ({ jam: String(j).trim(), format: String(form.getAll('formatSlot')[i] ?? 'semua') }))
    .filter((s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s.jam) && ['semua', ...FORMAT].includes(s.format)) as SlotTayang[];
  const hari = form
    .getAll('hari')
    .map(Number)
    .filter((h) => h >= 0 && h <= 6);
  if (!slot.length) throw new Error('Isi minimal satu jam tayang');
  if (!hari.length) throw new Error('Pilih minimal satu hari tayang');
  cfg.rencanaTayang = {
    videoPerHari: Math.min(6, Math.max(1, Number(teks(form, 'videoPerHari')) || 1)),
    hari: hari.sort(),
    slot: [...new Map(slot.map((s) => [`${s.jam}-${s.format}`, s])).values()].sort((a, b) => a.jam.localeCompare(b.jam)),
    alasan: lama.alasan,
    oleh: 'pemilik',
    diubah: new Date().toISOString(),
  };
  saveConfig(cfg);
  revalidatePath('/jadwal');
  revalidatePath('/episode/[id]', 'page');
}

/** Nama playlist tujuan per seri (kosong = bawaan). */
export async function simpanPlaylist(form: FormData) {
  const cfg = loadConfig();
  cfg.seri = cfg.seri.map((s) => {
    const nama = teks(form, `playlist-${s.id}`);
    const { playlist: _, ...lain } = s;
    return nama ? { ...lain, playlist: nama } : lain;
  });
  saveConfig(cfg);
  revalidatePath('/pengaturan');
}

/** Masukkan video yang sudah diupload tapi belum masuk playlist. */
export async function masukkanSemuaKePlaylist() {
  jalankanKantor(['playlist']);
  revalidatePath('/tayang');
  revalidatePath('/pengaturan');
}

/** Pengaturan riset harian otomatis + pasang/lepas penjadwal macOS. */
export async function simpanRisetHarian(form: FormData) {
  const cfg = loadConfig();
  const aktif = form.get('aktif') === 'on';
  const jam = /^([01]\d|2[0-3]):[0-5]\d$/.test(teks(form, 'jam')) ? teks(form, 'jam') : '07:00';
  const jumlahIde = Math.min(8, Math.max(1, Number(teks(form, 'jumlahIde')) || 4));
  cfg.risetHarian = { aktif, jam, jumlahIde };
  saveConfig(cfg);
  // penjadwal ikut dipasang/dilepas, supaya cukup satu tombol
  jalankanKantor([aktif ? 'harian-pasang' : 'harian-lepas']);
  revalidatePath('/pengaturan');
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

export async function simpanEfekKarakter(id: string, aktif: boolean) {
  updateEpisode(id, (e) => {
    e.efekKarakter = aktif ? undefined : false;
  });
  segarkan(id);
}

export async function simpanSuaraKarakter(form: FormData) {
  const cfg = loadConfig();
  const baca = (p: string) =>
    form.get(`${p}-reset`) === 'on'
      ? undefined
      : {
          nada: Math.max(BATAS_NADA_KARAKTER.min, Math.min(BATAS_NADA_KARAKTER.maks, Number(teks(form, `${p}-nada`)) || 0)),
          tempo: Math.max(70, Math.min(140, Number(teks(form, `${p}-tempo`)) || 100)) / 100,
        };
  const suara: NonNullable<typeof cfg.suaraKarakter> = {};
  for (const p of PEMBICARA) {
    const s = baca(p);
    if (s) suara[p] = s;
  }
  cfg.suaraKarakter = suara;
  cfg.suaraHafalan = baca('hafalan');
  saveConfig(cfg);
  revalidatePath('/pengaturan');
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
