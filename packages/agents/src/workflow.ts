// Orchestrator: alur kerja kantor dari ide sampai tayang.
// Setiap fungsi = satu "shift kerja" yang dipicu dari dashboard atau CLI.
import {
  addLog,
  createEpisodeFromIdea,
  getEpisode,
  isoKeLokal,
  latestFile,
  listEpisodes,
  loadConfig,
  paths,
  rapikanMetadata,
  saveConfig,
  setStatus,
  updateEpisode,
  writeDated,
  type Adegan,
  type AyatHafalan,
  type Episode,
} from '@kantor/shared';
import { ambilSurat, BASMALAH } from './quran.ts';
import { runAgent } from './run-agent.ts';
import {
  IlustratorSchema,
  LaporanSchema,
  MetadataSchema,
  NaskahSchema,
  RencanaTayangSchema,
  ReviewSchema,
  RisetSchema,
  SutradaraSchema,
} from './schemas.ts';
import { kantorTools, TOOL_LAPORAN, TOOL_RISET } from './youtube/tools.ts';
import { renderEpisode } from './render.ts';
import { privatkanVideo, uploadEpisode } from './youtube/upload.ts';

const log = (id: string | undefined, oleh: string) => (pesan: string) => {
  console.log(`[${oleh}] ${pesan}`);
  if (id) {
    try {
      addLog(id, oleh, pesan);
    } catch {
      /* abaikan */
    }
  }
};

/** Instruksi format untuk agen, supaya naskah/adegan/metadata menyesuaikan Shorts atau video biasa. */
function infoFormat(ep: Episode): string {
  return (ep.ide.format ?? 'biasa') === 'short'
    ? 'FORMAT: YouTube Shorts (video vertikal 9:16, total < 60 detik). Ikuti aturan bagian "Format Shorts" di peranmu.'
    : 'FORMAT: Video biasa (16:9, 3–5 menit).';
}

function daftarSeri() {
  return loadConfig()
    .seri.map((s) => `- ${s.id}: ${s.nama} (usia ${s.usia})`)
    .join('\n');
}

// ---------------------------------------------------------------- RISET
export async function riset(arahan?: string) {
  const laporanLama = latestFile(paths.laporan())?.isi;
  const hasil = await runAgent({
    peran: 'riset',
    schema: RisetSchema,
    tools: ['WebSearch', 'WebFetch'],
    mcpServers: { kantor: kantorTools },
    mcpTools: TOOL_RISET,
    maxTurns: 40,
    onProgress: log(undefined, 'riset'),
    prompt: [
      `Tanggal hari ini: ${new Date().toISOString().slice(0, 10)}.`,
      `Seri yang tersedia:\n${daftarSeri()}`,
      laporanLama ? `Laporan performa terakhir dari Channel Manager:\n${laporanLama}` : '',
      arahan ? `Arahan khusus dari pemilik channel: ${arahan}` : '',
      'Lakukan riset dan usulkan ide episode.',
    ]
      .filter(Boolean)
      .join('\n\n'),
  });
  const file = writeDated(paths.riset(), 'riset', hasil.laporan);
  const episodes = hasil.ide.map((ide) => createEpisodeFromIdea(ide));
  console.log(`✅ Laporan riset: ${file}\n✅ ${episodes.length} ide baru dibuat`);
  return { file, episodes };
}

// ---------------------------------------------------------------- NASKAH + REVIEW
export async function tulisNaskah(id: string) {
  const cfg = loadConfig();
  let ep = getEpisode(id);
  let feedback = ep.feedbackManusia
    ? `Feedback dari pemilik channel (WAJIB diikuti):\n${ep.feedbackManusia}`
    : '';

  for (let putaran = 0; putaran <= cfg.maksRevisiOtomatis; putaran++) {
    setStatus(id, 'writing', 'penulis', putaran === 0 ? 'Mulai menulis naskah' : `Revisi otomatis ke-${putaran}`);
    const naskah = await runAgent({
      peran: 'penulis',
      schema: NaskahSchema,
      maxTurns: 4,
      onProgress: log(id, 'penulis'),
      prompt: [
        infoFormat(ep),
        `Ide episode:\n${JSON.stringify(ep.ide, null, 2)}`,
        `Seri yang tersedia:\n${daftarSeri()}`,
        ep.naskah ? `Naskah sebelumnya:\n${JSON.stringify(ep.naskah, null, 2)}` : '',
        feedback,
        'Tulis naskah lengkap.',
      ]
        .filter(Boolean)
        .join('\n\n'),
    });
    ep = updateEpisode(id, (e) => {
      e.naskah = naskah;
    });

    setStatus(id, 'reviewing', 'reviewer', 'Memeriksa naskah');
    const review = await runAgent({
      peran: 'reviewer',
      schema: ReviewSchema,
      maxTurns: 4,
      onProgress: log(id, 'reviewer'),
      prompt: `${infoFormat(ep)}\nUsia target: ${ep.ide.usia}\n\nNaskah:\n${JSON.stringify(naskah, null, 2)}\n\nPeriksa naskah ini.`,
    });
    ep = updateEpisode(id, (e) => {
      e.review = review;
    });

    if (review.keputusan === 'lolos') break;
    feedback = `Catatan reviewer (perbaiki semua):\n- ${review.catatan.join('\n- ')}`;
    if (putaran === cfg.maksRevisiOtomatis) {
      log(id, 'reviewer')('Batas revisi otomatis tercapai — diserahkan ke manusia dengan catatan.');
    }
  }

  updateEpisode(id, (e) => {
    e.feedbackManusia = undefined;
    e.jumlahRevisi += 1;
  });
  setStatus(id, 'needs_script_approval', 'orchestrator', 'Naskah siap diperiksa pemilik channel');
}

// ---------------------------------------------------------------- HAFALAN
/** Ambil teks surat dari sumber resmi & susun "naskah" untuk diperiksa pemilik. Tanpa penulis/reviewer AI. */
export async function siapkanHafalan(id: string) {
  const ep = getEpisode(id);
  const info = ep.ide.hafalan;
  if (!info) throw new Error('Episode ini bukan hafalan');
  setStatus(id, 'writing', 'orchestrator', `Mengambil teks Surat ${info.namaSurat} dari equran.id`);
  const surat = await ambilSurat(info.surat);
  const dari = Math.max(1, info.ayatDari);
  const sampai = Math.min(surat.jumlahAyat, info.ayatSampai);
  const ayat: AyatHafalan[] = surat.ayat
    .filter((a) => a.nomorAyat >= dari && a.nomorAyat <= sampai)
    .map((a) => ({ nomor: a.nomorAyat, arab: a.teksArab, latin: a.teksLatin, arti: a.teksIndonesia, latar: 'langit-malam', suasana: [] }));
  // Al-Fatihah: basmalah adalah ayat 1. At-Taubah: tanpa basmalah.
  if (info.basmalah && surat.nomor !== 1 && surat.nomor !== 9) {
    ayat.unshift({ nomor: 0, ...BASMALAH, latar: 'langit-malam', suasana: [] });
  }
  const rentang = dari === 1 && sampai === surat.jumlahAyat ? '' : ` (ayat ${dari}–${sampai})`;
  updateEpisode(id, (e) => {
    e.hafalan = { namaSurat: surat.namaLatin, artiSurat: surat.arti, ayat };
    e.naskah = {
      judul: `Hafalan Surat ${surat.namaLatin}${rentang}`,
      ringkasan: `Surat ke-${surat.nomor} (${surat.arti}), ${surat.jumlahAyat} ayat. Tiap ayat dibaca ${info.ulang}x.`,
      adegan: ayat.map((a) => ({
        jenis: 'doa',
        pembicara: 'narator',
        narasi: a.latin,
        petunjukVisual: a.arti,
      })),
      dalil: ayat.map((a) => ({
        jenis: 'ayat',
        teksArab: a.arab,
        latin: a.latin,
        terjemah: a.arti,
        sumber: a.nomor === 0 ? 'Basmalah' : `QS. ${surat.namaLatin}: ${a.nomor}`,
      })),
    };
    e.review = {
      keputusan: 'lolos',
      skor: 10,
      catatan: ['Teks diambil otomatis dari equran.id (Kemenag RI), tidak ditulis AI.'],
      cekManusia: ['Cocokkan teks Arab & harakat dengan mushaf kamu.', 'Pastikan rentang ayat sesuai yang ingin dihafalkan.'],
    };
  });
  setStatus(id, 'needs_script_approval', 'orchestrator', 'Teks surat siap dicek pemilik channel');
}

async function sutradaraiHafalan(ep: Episode) {
  const id = ep.id;
  const hafalan = ep.hafalan!;
  const [ilustrasi, metadata] = await Promise.all([
    runAgent({
      peran: 'ilustrator',
      schema: IlustratorSchema,
      maxTurns: 4,
      onProgress: log(id, 'sutradara'),
      prompt: `Surat ${hafalan.namaSurat} (${hafalan.artiSurat}). Pilih visual untuk ayat-ayat ini:\n${JSON.stringify(
        hafalan.ayat.map((a) => ({ nomor: a.nomor, arti: a.arti })),
        null,
        2,
      )}`,
    }),
    mintaMetadata(ep),
  ]);
  const ayat = hafalan.ayat.map((a, i) => {
    const v = ilustrasi.visual.find((x) => x.nomor === a.nomor) ?? ilustrasi.visual[i];
    return v ? { ...a, latar: v.latar, suasana: v.suasana } : a;
  });
  // adegan dipakai dashboard & pengecekan render; untuk hafalan isinya cerminan ayat
  const adegan: Adegan[] = ayat.map((a) => ({
    jenis: 'doa',
    pembicara: 'narator',
    narasi: a.latin,
    latar: a.latar,
    karakter: [],
    ekspresi: 'tenang',
    doa: { arab: a.arab, latin: a.latin, arti: a.arti },
  }));
  updateEpisode(id, (e) => {
    e.hafalan = { ...hafalan, ayat };
    e.adegan = adegan;
    e.metadata = metadata;
  });
  const ulang = ep.ide.hafalan?.ulang ?? 1;
  setStatus(
    id,
    'needs_audio',
    'orchestrator',
    `Siap direkam: baca surat ${ulang > 1 ? `dengan tiap ayat diulang ${ulang}x` : 'ayat demi ayat'}, jeda ±1 detik antar bacaan`,
  );
}

// ---------------------------------------------------------------- METADATA
/** Metadata YouTube dari Channel Manager, sesuai format episode (Shorts / video biasa). */
async function mintaMetadata(ep: Episode) {
  const format = ep.ide.format ?? 'biasa';
  const isi = ep.hafalan
    ? `JENIS: video hafalan surat.\nSurat ${ep.hafalan.namaSurat} (${ep.hafalan.artiSurat}), ${ep.hafalan.ayat.filter((a) => a.nomor > 0).length} ayat, tiap ayat diulang ${ep.ide.hafalan?.ulang ?? 1}x.`
    : `Seri: ${ep.ide.seri}\n\nNaskah:\n${JSON.stringify(ep.naskah, null, 2)}`;
  const metadata = await runAgent({
    peran: 'channel-manager',
    schema: MetadataSchema,
    maxTurns: 4,
    onProgress: log(ep.id, 'channel-manager'),
    prompt: `${infoFormat(ep)}\nNama channel: ${loadConfig().namaChannel}\nUsia: ${ep.ide.usia}\n${isi}\n\nBuat metadata YouTube untuk ${format === 'short' ? 'Shorts' : 'video biasa'} ini, sesuai aturan format ${format === 'short' ? 'Shorts' : 'video biasa'} di peranmu.`,
  });
  return rapikanMetadata(metadata, format);
}

/** Buat ulang metadata (judul, deskripsi, tags) sesuai format episode, misal untuk episode versi format lain. */
export async function buatUlangMetadata(id: string) {
  const ep = getEpisode(id);
  if (!ep.naskah && !ep.hafalan) throw new Error('Episode belum punya naskah');
  log(id, 'channel-manager')(`Menyusun metadata ${ep.ide.format === 'short' ? 'Shorts' : 'video biasa'}`);
  const metadata = await mintaMetadata(ep);
  updateEpisode(id, (e) => {
    e.metadata = metadata;
  });
  log(id, 'channel-manager')(`Metadata baru: "${metadata.judul}"`);
}

// ---------------------------------------------------------------- SUTRADARA + METADATA
export async function sutradarai(id: string) {
  const ep = getEpisode(id);
  if (!ep.naskah) throw new Error('Belum ada naskah');
  if (ep.ide.jenis === 'hafalan') {
    setStatus(id, 'directing', 'sutradara', 'Memilih latar sesuai arti ayat & menyusun metadata');
    return sutradaraiHafalan(ep);
  }
  setStatus(id, 'directing', 'sutradara', 'Menyusun adegan & metadata');

  const [adegan, metadata] = await Promise.all([
    runAgent({
      peran: 'sutradara',
      schema: SutradaraSchema,
      maxTurns: 4,
      onProgress: log(id, 'sutradara'),
      prompt: `${infoFormat(ep)}\n\nNaskah yang sudah disetujui:\n${JSON.stringify(ep.naskah, null, 2)}\n\nSusun adegannya.`,
    }),
    mintaMetadata(ep),
  ]);

  // Pengaman: narasi harus persis sama dengan naskah (karena sudah/akan direkam)
  const naskahAdegan = ep.naskah.adegan;
  const adeganFinal = naskahAdegan.map((n, i) => {
    const a = adegan.adegan[i] ?? adegan.adegan.at(-1)!;
    const karakter = a.karakter.slice();
    if (n.pembicara !== 'narator' && !karakter.includes(n.pembicara)) karakter.push(n.pembicara);
    return { ...a, jenis: n.jenis, pembicara: n.pembicara, narasi: n.narasi, karakter };
  });

  updateEpisode(id, (e) => {
    e.adegan = adeganFinal;
    e.metadata = metadata;
  });
  setStatus(id, 'needs_audio', 'orchestrator', 'Siap direkam: bacakan narasi adegan secara berurutan');
}

// ---------------------------------------------------------------- RENDER
export async function render(id: string) {
  const ep = getEpisode(id);
  setStatus(id, 'rendering', 'video-creator', ep.fileAudio ? 'Render dengan rekaman suara' : 'Render pratinjau tanpa suara');
  let terakhir = 0;
  const hasil = await renderEpisode(ep, (l) => {
    // tulis progres ke log tiap ~10%, jangan setiap baris
    const m = l.match(/(\d+)%/);
    const persen = m ? Number(m[1]) : -1;
    if (persen >= terakhir + 10) {
      terakhir = persen;
      console.log(`[render] ${l}`);
    }
  });
  updateEpisode(id, (e) => {
    e.render = { ...hasil, waktu: new Date().toISOString() };
  });
  setStatus(id, 'needs_video_approval', 'video-creator', 'Video siap ditonton & disetujui');
}

// ---------------------------------------------------------------- UPLOAD
export async function upload(id: string, jadwalTayang?: string) {
  const ep = getEpisode(id);
  setStatus(id, 'uploading', 'channel-manager', 'Upload ke YouTube');
  const hasil = await uploadEpisode(ep, { jadwalTayang });
  updateEpisode(id, (e: Episode) => {
    e.youtube = { videoId: hasil.videoId, url: hasil.url, jadwalTayang };
  });
  hasil.peringatan.forEach(log(id, 'channel-manager'));
  setStatus(
    id,
    jadwalTayang ? 'scheduled' : 'published',
    'channel-manager',
    jadwalTayang ? `Terjadwal tayang ${jadwalTayang}` : 'Terupload sebagai PRIVATE — atur tayang di YouTube Studio',
  );
  // versi baru sudah naik → upload lama (sebelum diedit) disembunyikan
  await tarikVideoLama(id);
}

/** Jadikan private upload lama episode ini yang belum ditarik. Gagal → dicatat di log, tidak menghentikan proses. */
export async function tarikVideoLama(id: string) {
  for (const v of getEpisode(id).youtubeLama ?? []) {
    if (v.ditarik) continue;
    try {
      await privatkanVideo(v.videoId);
      updateEpisode(id, (e: Episode) => {
        const x = e.youtubeLama?.find((y) => y.videoId === v.videoId);
        if (x) x.ditarik = new Date().toISOString();
      });
      log(id, 'channel-manager')(`Video lama ${v.url} dijadikan private${v.jadwalTayang ? ' (jadwal tayang dibatalkan)' : ''}`);
    } catch (e) {
      log(id, 'channel-manager')(`Gagal menjadikan private video lama ${v.url}: ${(e as Error).message}. Atur manual di YouTube Studio.`);
    }
  }
}

// ---------------------------------------------------------------- RENCANA JADWAL TAYANG
export async function susunRencanaTayang(arahan?: string) {
  const cfg = loadConfig();
  const episodes = listEpisodes();
  const hitung = (f: (e: Episode) => boolean) => {
    const xs = episodes.filter(f);
    return `${xs.length} (${xs.filter((e) => e.ide.format === 'short').length} Shorts, ${xs.filter((e) => e.ide.format !== 'short').length} video biasa)`;
  };
  const terjadwal = episodes
    .filter((e) => e.status === 'scheduled' && e.youtube?.jadwalTayang)
    .map((e) => `- ${isoKeLokal(e.youtube!.jadwalTayang!, cfg.zonaWaktu)} · ${e.ide.format === 'short' ? 'Shorts' : 'video biasa'} · ${e.metadata?.judul ?? e.ide.judul}`);
  const hasil = await runAgent({
    peran: 'channel-manager',
    schema: RencanaTayangSchema,
    mcpServers: { kantor: kantorTools },
    mcpTools: TOOL_LAPORAN,
    maxTurns: 8,
    onProgress: log(undefined, 'channel-manager'),
    prompt: [
      `Sekarang: ${isoKeLokal(new Date().toISOString(), cfg.zonaWaktu)} (${cfg.zonaWaktu}).`,
      `Video siap tayang (menunggu persetujuan): ${hitung((e) => e.status === 'needs_video_approval')}`,
      `Sedang diproduksi: ${hitung((e) => !['needs_video_approval', 'scheduled', 'published', 'rejected', 'error', 'idea'].includes(e.status))}`,
      `Sudah tayang: ${hitung((e) => e.status === 'published')}`,
      terjadwal.length ? `Sudah terjadwal:\n${terjadwal.join('\n')}` : 'Belum ada video terjadwal.',
      cfg.rencanaTayang ? `Rencana saat ini:\n${JSON.stringify({ ...cfg.rencanaTayang, alasan: undefined }, null, 2)}` : '',
      arahan ? `Arahan pemilik channel: ${arahan}` : '',
      'Susun rencana jadwal tayang channel.',
    ]
      .filter(Boolean)
      .join('\n\n'),
  });
  saveConfig({
    ...loadConfig(),
    rencanaTayang: {
      videoPerHari: hasil.videoPerHari,
      hari: [...new Set(hasil.hari)].sort(),
      slot: hasil.slot,
      alasan: hasil.alasan,
      oleh: 'channel-manager',
      diubah: new Date().toISOString(),
    },
  });
  console.log(`✅ Rencana tayang: ${hasil.videoPerHari} video/hari, slot ${hasil.slot.map((s) => `${s.jam} ${s.format}`).join(', ')}`);
}

// ---------------------------------------------------------------- LAPORAN
export async function laporan() {
  const hasil = await runAgent({
    peran: 'channel-manager',
    schema: LaporanSchema,
    mcpServers: { kantor: kantorTools },
    mcpTools: TOOL_LAPORAN,
    maxTurns: 8,
    onProgress: log(undefined, 'channel-manager'),
    prompt: `Tanggal hari ini: ${new Date().toISOString().slice(0, 10)}. Buat laporan performa channel.`,
  });
  const file = writeDated(paths.laporan(), 'laporan', hasil.laporan);
  console.log(`✅ Laporan: ${file}`);
  return file;
}
