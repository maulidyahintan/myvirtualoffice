// Orchestrator: office workflow from idea to publication.
// Each function = one "work shift" triggered from dashboard or CLI.
import {
  addLog,
  createEpisodeFromIdea,
  getEpisode,
  isoToLocal,
  latestFile,
  listEpisodes,
  loadConfig,
  paths,
  normalizeMetadata,
  saveConfig,
  setStatus,
  updateEpisode,
  writeDated,
  type Scene,
  type MemorizationVerse,
  type Episode,
} from '@kantor/shared';
import { fetchSurah, BASMALAH } from './quran.ts';
import { runAgent } from './run-agent.ts';
import {
  IllustratorSchema,
  ReportSchema,
  MetadataSchema,
  ScriptSchema,
  PublishPlanSchema,
  ReviewSchema,
  researchSchema,
  DirectorSchema,
} from './schemas.ts';
import { kantorTools, TOOL_LAPORAN, TOOL_RISET } from './youtube/tools.ts';
import { renderEpisode } from './render.ts';
import { makePrivate, uploadEpisode } from './youtube/upload.ts';
import { removeFromPlaylist, addToPlaylist } from './youtube/playlist.ts';

const log = (id: string | undefined, by: string) => (message: string) => {
  console.log(`[${by}] ${message}`);
  if (id) {
    try {
      addLog(id, by, message);
    } catch {
      /* ignore */
    }
  }
};

/** Format instructions for agents, so script/scenes/metadata adapt to Shorts or standard video. */
function formatInfo(ep: Episode): string {
  return (ep.idea.format ?? 'standard') === 'short'
    ? 'FORMAT: YouTube Shorts (vertical video 9:16, total < 60 seconds). Follow "Shorts Format" rules in your role.'
    : 'FORMAT: Standard video (16:9, 3–5 minutes).';
}

function seriesList() {
  return loadConfig()
    .series.map((s) => `- ${s.id}: ${s.name} (age ${s.age})`)
    .join('\n');
}

// ---------------------------------------------------------------- RESEARCH
export async function research(guidance?: string, minIdeas = 3) {
  const oldReport = latestFile(paths.laporan())?.isi;
  const result = await runAgent({
    peran: 'riset',
    schema: researchSchema(minIdeas),
    tools: ['WebSearch', 'WebFetch'],
    mcpServers: { kantor: kantorTools },
    mcpTools: TOOL_RISET,
    maxTurns: 40,
    onProgress: log(undefined, 'riset'),
    prompt: [
      `Tanggal hari ini: ${new Date().toISOString().slice(0, 10)}.`,
      `Seri yang tersedia:\n${seriesList()}`,
      oldReport ? `Laporan performa terakhir dari Channel Manager:\n${oldReport}` : '',
      guidance ? `Arahan khusus dari pemilik channel: ${guidance}` : '',
      `Lakukan riset dan usulkan minimal ${minIdeas} ide episode.`,
    ]
      .filter(Boolean)
      .join('\n\n'),
  });
  const file = writeDated(paths.riset(), 'riset', result.report);
  const episodes = result.ideas.map((idea) => createEpisodeFromIdea(idea));
  console.log(`✅ Laporan riset: ${file}\n✅ ${episodes.length} ide baru dibuat`);
  return { file, episodes };
}

// ---------------------------------------------------------------- SCRIPT + REVIEW
export async function writeScript(id: string) {
  const cfg = loadConfig();
  let ep = getEpisode(id);
  let feedback = ep.humanFeedback
    ? `Feedback dari pemilik channel (WAJIB diikuti):\n${ep.humanFeedback}`
    : '';

  for (let round = 0; round <= cfg.maxAutoRevisions; round++) {
    setStatus(id, 'writing', 'penulis', round === 0 ? 'Mulai menulis naskah' : `Revisi otomatis ke-${round}`);
    const script = await runAgent({
      peran: 'penulis',
      schema: ScriptSchema,
      maxTurns: 4,
      onProgress: log(id, 'penulis'),
      prompt: [
        formatInfo(ep),
        `Ide episode:\n${JSON.stringify(ep.idea, null, 2)}`,
        `Seri yang tersedia:\n${seriesList()}`,
        ep.script ? `Naskah sebelumnya:\n${JSON.stringify(ep.script, null, 2)}` : '',
        feedback,
        'Tulis naskah lengkap.',
      ]
        .filter(Boolean)
        .join('\n\n'),
    });
    ep = updateEpisode(id, (e) => {
      e.script = script;
    });

    setStatus(id, 'reviewing', 'reviewer', 'Memeriksa naskah');
    const review = await runAgent({
      peran: 'reviewer',
      schema: ReviewSchema,
      maxTurns: 4,
      onProgress: log(id, 'reviewer'),
      prompt: `${formatInfo(ep)}\nUsia target: ${ep.idea.age}\n\nNaskah:\n${JSON.stringify(script, null, 2)}\n\nPeriksa naskah ini.`,
    });
    ep = updateEpisode(id, (e) => {
      e.review = review;
    });

    if (review.decision === 'approved') break;
    feedback = `Catatan reviewer (perbaiki semua):\n- ${review.notes.join('\n- ')}`;
    if (round === cfg.maxAutoRevisions) {
      log(id, 'reviewer')('Batas revisi otomatis tercapai — diserahkan ke manusia dengan catatan.');
    }
  }

  updateEpisode(id, (e) => {
    e.humanFeedback = undefined;
    e.revisionCount += 1;
  });
  setStatus(id, 'needs_script_approval', 'orchestrator', 'Naskah siap diperiksa pemilik channel');
}

// ---------------------------------------------------------------- MEMORIZATION
/** Fetch surah text from official source & compose "script" for owner review. No AI writer/reviewer. */
export async function prepareMemorization(id: string) {
  const ep = getEpisode(id);
  const info = ep.idea.memorization;
  if (!info) throw new Error('Episode ini bukan hafalan');
  setStatus(id, 'writing', 'orchestrator', `Mengambil teks Surat ${info.surahName} dari equran.id`);
  const surah = await fetchSurah(info.surah);
  const from = Math.max(1, info.verseFrom);
  const to = Math.min(surah.jumlahAyat, info.verseTo);
  const verses: MemorizationVerse[] = surah.ayat
    .filter((a) => a.nomorAyat >= from && a.nomorAyat <= to)
    .map((a) => ({ number: a.nomorAyat, arabic: a.teksArab, latin: a.teksLatin, meaning: a.teksIndonesia, background: 'night-sky', moods: [] }));
  // Al-Fatihah: basmalah is verse 1. At-Taubah: no basmalah.
  if (info.basmalah && surah.nomor !== 1 && surah.nomor !== 9) {
    verses.unshift({ number: 0, ...BASMALAH, background: 'night-sky', moods: [] });
  }
  const range = from === 1 && to === surah.jumlahAyat ? '' : ` (ayat ${from}–${to})`;
  updateEpisode(id, (e) => {
    e.memorization = { surahName: surah.namaLatin, surahMeaning: surah.arti, verses };
    e.script = {
      title: `Hafalan Surat ${surah.namaLatin}${range}`,
      summary: `Surat ke-${surah.nomor} (${surah.arti}), ${surah.jumlahAyat} ayat. Tiap ayat dibaca ${info.repetitions}x.`,
      scenes: verses.map((v) => ({
        type: 'prayer',
        speaker: 'narrator',
        narration: v.latin,
        visualDirection: v.meaning,
      })),
      evidences: verses.map((v) => ({
        type: 'ayat',
        arabicText: v.arabic,
        latin: v.latin,
        translation: v.meaning,
        source: v.number === 0 ? 'Basmalah' : `QS. ${surah.namaLatin}: ${v.number}`,
      })),
    };
    e.review = {
      decision: 'approved',
      score: 10,
      notes: ['Teks diambil otomatis dari equran.id (Kemenag RI), tidak ditulis AI.'],
      humanCheck: ['Cocokkan teks Arab & harakat dengan mushaf kamu.', 'Pastikan rentang ayat sesuai yang ingin dihafalkan.'],
    };
  });
  setStatus(id, 'needs_script_approval', 'orchestrator', 'Teks surat siap dicek pemilik channel');
}

async function directMemorization(ep: Episode) {
  const id = ep.id;
  const memorization = ep.memorization!;
  const [illustration, metadata] = await Promise.all([
    runAgent({
      peran: 'ilustrator',
      schema: IllustratorSchema,
      maxTurns: 4,
      onProgress: log(id, 'sutradara'),
      prompt: `Surat ${memorization.surahName} (${memorization.surahMeaning}). Pilih visual untuk ayat-ayat ini:\n${JSON.stringify(
        memorization.verses.map((v) => ({ nomor: v.number, arti: v.meaning })),
        null,
        2,
      )}`,
    }),
    requestMetadata(ep),
  ]);
  const verses = memorization.verses.map((v, i) => {
    const vis = illustration.visuals.find((x) => x.number === v.number) ?? illustration.visuals[i];
    return vis ? { ...v, background: vis.background, moods: vis.moods } : v;
  });
  // scenes used by dashboard & render checking; for memorization they mirror verses
  const scenes: Scene[] = verses.map((v) => ({
    type: 'prayer',
    speaker: 'narrator',
    narration: v.latin,
    background: v.background,
    characters: [],
    expression: 'calm',
    prayer: { arabic: v.arabic, latin: v.latin, meaning: v.meaning },
  }));
  updateEpisode(id, (e) => {
    e.memorization = { ...memorization, verses };
    e.scenes = scenes;
    e.metadata = metadata;
  });
  const reps = ep.idea.memorization?.repetitions ?? 1;
  setStatus(
    id,
    'needs_audio',
    'orchestrator',
    `Siap direkam: baca surat ${reps > 1 ? `dengan tiap ayat diulang ${reps}x` : 'ayat demi ayat'}, jeda ±1 detik antar bacaan`,
  );
}

// ---------------------------------------------------------------- METADATA
/** Metadata YouTube dari Channel Manager, sesuai format episode (Shorts / video biasa). */
async function requestMetadata(ep: Episode) {
  const format = ep.idea.format ?? 'standard';
  const isi = ep.memorization
    ? `JENIS: video hafalan surat.\nSurat ${ep.memorization.surahName} (${ep.memorization.surahMeaning}), ${ep.memorization.verses.filter((a) => a.number > 0).length} ayat, tiap ayat diulang ${ep.idea.memorization?.repetitions ?? 1}x.`
    : `Seri: ${ep.idea.series}\n\nNaskah:\n${JSON.stringify(ep.script, null, 2)}`;
  const metadata = await runAgent({
    peran: 'channel-manager',
    schema: MetadataSchema,
    maxTurns: 4,
    onProgress: log(ep.id, 'channel-manager'),
    prompt: `${formatInfo(ep)}\nNama channel: ${loadConfig().channelName}\nUsia: ${ep.idea.age}\n${isi}\n\nBuat metadata YouTube untuk ${format === 'short' ? 'Shorts' : 'video biasa'} ini, sesuai aturan format ${format === 'short' ? 'Shorts' : 'video biasa'} di peranmu.`,
  });
  return normalizeMetadata(metadata, format);
}

/** Regenerate metadata (title, description, tags) according to episode format, e.g. for twin format version. */
export async function regenerateMetadata(id: string) {
  const ep = getEpisode(id);
  if (!ep.script && !ep.memorization) throw new Error('Episode belum punya naskah');
  log(id, 'channel-manager')(`Menyusun metadata ${ep.idea.format === 'short' ? 'Shorts' : 'video biasa'}`);
  const metadata = await requestMetadata(ep);
  updateEpisode(id, (e) => {
    e.metadata = metadata;
  });
  log(id, 'channel-manager')(`Metadata baru: "${metadata.title}"`);
}

// ---------------------------------------------------------------- SUTRADARA + METADATA
export async function direct(id: string) {
  const ep = getEpisode(id);
  if (!ep.script) throw new Error('Belum ada naskah');
  if (ep.idea.type === 'memorization') {
    setStatus(id, 'directing', 'sutradara', 'Memilih latar sesuai arti ayat & menyusun metadata');
    return directMemorization(ep);
  }
  setStatus(id, 'directing', 'sutradara', 'Menyusun adegan & metadata');

  const [direction, metadata] = await Promise.all([
    runAgent({
      peran: 'sutradara',
      schema: DirectorSchema,
      maxTurns: 4,
      onProgress: log(id, 'sutradara'),
      prompt: `${formatInfo(ep)}\n\nNaskah yang sudah disetujui:\n${JSON.stringify(ep.script, null, 2)}\n\nSusun adegannya.`,
    }),
    requestMetadata(ep),
  ]);

  // Safety: narration must match script exactly (because it's already/will be recorded)
  const scriptScenes = ep.script.scenes;
  const finalScenes = scriptScenes.map((n, i) => {
    const s = direction.scenes[i] ?? direction.scenes.at(-1)!;
    const characters = s.characters.slice();
    if (n.speaker !== 'narrator' && !characters.includes(n.speaker)) characters.push(n.speaker);
    // actions only for characters present, and sensible (Mochi: sleep/play; Mamas/Mother: anything except sleep)
    const actions = s.actions?.filter(
      (x) => characters.includes(x.character) && (x.character === 'mochi' ? x.action === 'sleeping' || x.action === 'playing' : x.action !== 'sleeping'),
    );
    return { ...s, type: n.type, speaker: n.speaker, narration: n.narration, characters, actions: actions?.length ? actions : undefined };
  });

  updateEpisode(id, (e) => {
    e.scenes = finalScenes;
    e.metadata = metadata;
  });
  setStatus(id, 'needs_audio', 'orchestrator', 'Siap direkam: bacakan narasi adegan secara berurutan');
}

// ---------------------------------------------------------------- RENDER
export async function render(id: string) {
  const ep = getEpisode(id);
  setStatus(id, 'rendering', 'video-creator', ep.audioFile ? 'Render dengan rekaman suara' : 'Render pratinjau tanpa suara');
  let last = 0;
  const result = await renderEpisode(ep, (l) => {
    // write progress to log every ~10%, not every line
    const m = l.match(/(\d+)%/);
    const percent = m ? Number(m[1]) : -1;
    if (percent >= last + 10) {
      last = percent;
      console.log(`[render] ${l}`);
    }
  });
  updateEpisode(id, (e) => {
    e.render = { ...result, time: new Date().toISOString() };
  });
  setStatus(id, 'needs_video_approval', 'video-creator', 'Video siap ditonton & disetujui');
}

// ---------------------------------------------------------------- UPLOAD
export async function upload(id: string, publishTime?: string) {
  const ep = getEpisode(id);
  setStatus(id, 'uploading', 'channel-manager', 'Upload ke YouTube');
  const result = await uploadEpisode(ep, { publishTime });
  updateEpisode(id, (e: Episode) => {
    e.youtube = { videoId: result.videoId, url: result.url, publishTime, playlist: result.playlist };
  });
  result.warnings.forEach(log(id, 'channel-manager'));
  setStatus(
    id,
    publishTime ? 'scheduled' : 'published',
    'channel-manager',
    publishTime ? `Terjadwal tayang ${publishTime}` : 'Terupload sebagai PRIVATE — atur tayang di YouTube Studio',
  );
  // new version uploaded → old uploads (before edit) are hidden
  await withdrawOldVideos(id);
}

/**
 * Masukkan video yang sudah diupload ke playlist sesuai tipenya. Tanpa id: semua video yang
 * sudah diupload tapi belum tercatat masuk playlist.
 */
export async function addToPlaylists(id?: string) {
  const daftar = id ? [getEpisode(id)] : listEpisodes().filter((e) => e.youtube && !e.youtube.playlist);
  for (const ep of daftar) {
    if (!ep.youtube) {
      log(ep.id, 'channel-manager')('Belum diupload ke YouTube, belum bisa dimasukkan ke playlist');
      continue;
    }
    try {
      const result = await addToPlaylist(ep, ep.youtube.videoId);
      updateEpisode(ep.id, (e) => {
        if (e.youtube) e.youtube.playlist = {name: result.name, id: result.id };
      });
      log(ep.id, 'channel-manager')(result.message);
    } catch (e) {
      log(ep.id, 'channel-manager')(`Gagal memasukkan ke playlist: ${(e as Error).message}`);
    }
  }
  console.log(`✅ Playlist: ${daftar.length} video diproses`);
}

/** Jadikan private upload lama episode ini yang belum ditarik. Gagal → dicatat di log, tidak menghentikan proses. */
export async function withdrawOldVideos(id: string) {
  for (const v of getEpisode(id).youtubeHistory ?? []) {
    if (v.withdrawn) continue;
    try {
      await makePrivate(v.videoId);
      updateEpisode(id, (e: Episode) => {
        const x = e.youtubeHistory?.find((y) => y.videoId === v.videoId);
        if (x) x.withdrawn = new Date().toISOString();
      });
      log(id, 'channel-manager')(`Video lama ${v.url} dijadikan private${v.publishTime ? ' (jadwal tayang dibatalkan)' : ''}`);
      if (v.playlist) {
        try {
          await removeFromPlaylist(v.playlist.id, v.videoId);
          log(id, 'channel-manager')(`Video lama dikeluarkan dari playlist "${v.playlist.name}"`);
        } catch (e) {
          log(id, 'channel-manager')(`Gagal mengeluarkan video lama dari playlist: ${(e as Error).message}`);
        }
      }
    } catch (e) {
      log(id, 'channel-manager')(`Gagal menjadikan private video lama ${v.url}: ${(e as Error).message}. Atur manual di YouTube Studio.`);
    }
  }
}

// ---------------------------------------------------------------- RENCANA JADWAL TAYANG
export async function buildPublishPlan(arahan?: string) {
  const cfg = loadConfig();
  const episodes = listEpisodes();
  const hitung = (f: (e: Episode) => boolean) => {
    const xs = episodes.filter(f);
    return `${xs.length} (${xs.filter((e) => e.idea.format === 'short').length} Shorts, ${xs.filter((e) => e.idea.format !== 'short').length} video biasa)`;
  };
  const terjadwal = episodes
    .filter((e) => e.status === 'scheduled' && e.youtube?.publishTime)
    .map((e) => `- ${isoToLocal(e.youtube!.publishTime!, cfg.timeZone)} · ${e.idea.format === 'short' ? 'Shorts' : 'video biasa'} · ${e.metadata?.title ?? e.idea.title}`);
  const result = await runAgent({
    peran: 'channel-manager',
    schema: PublishPlanSchema,
    mcpServers: { kantor: kantorTools },
    mcpTools: TOOL_LAPORAN,
    maxTurns: 8,
    onProgress: log(undefined, 'channel-manager'),
    prompt: [
      `Sekarang: ${isoToLocal(new Date().toISOString(), cfg.timeZone)} (${cfg.timeZone}).`,
      `Video siap tayang (menunggu persetujuan): ${hitung((e) => e.status === 'needs_video_approval')}`,
      `Sedang diproduksi: ${hitung((e) => !['needs_video_approval', 'scheduled', 'published', 'rejected', 'error', 'idea'].includes(e.status))}`,
      `Sudah tayang: ${hitung((e) => e.status === 'published')}`,
      terjadwal.length ? `Sudah terjadwal:\n${terjadwal.join('\n')}` : 'Belum ada video terjadwal.',
      cfg.publishPlan ? `Rencana saat ini:\n${JSON.stringify({ ...cfg.publishPlan, alasan: undefined }, null, 2)}` : '',
      arahan ? `Arahan pemilik channel: ${arahan}` : '',
      'Susun rencana jadwal tayang channel.',
    ]
      .filter(Boolean)
      .join('\n\n'),
  });
  saveConfig({
    ...loadConfig(),
    publishPlan: {
      videosPerDay: result.videosPerDay,
      days: [...new Set(result.days)].sort(),
      slots: result.slots,
      reason: result.reason,
      by: 'channel-manager',
      modified: new Date().toISOString(),
    },
  });
  console.log(`✅ Rencana tayang: ${result.videosPerDay} video/hari, slot ${result.slots.map((s) => `${s.time} ${s.format}`).join(', ')}`);
}

// ---------------------------------------------------------------- LAPORAN
export async function report() {
  const result = await runAgent({
    peran: 'channel-manager',
    schema: ReportSchema,
    mcpServers: { kantor: kantorTools },
    mcpTools: TOOL_LAPORAN,
    maxTurns: 8,
    onProgress: log(undefined, 'channel-manager'),
    prompt: `Tanggal hari ini: ${new Date().toISOString().slice(0, 10)}. Buat laporan performa channel.`,
  });
  const file = writeDated(paths.laporan(), 'laporan', result.report);
  console.log(`✅ Laporan: ${file}`);
  return file;
}
