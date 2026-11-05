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
  allowedBackgrounds,
  type Background,
  paths,
  normalizeMetadata,
  saveConfig,
  setStatus,
  updateEpisode,
  writeDated,
  type Scene,
  type MemorizationVerse,
  type Episode,
  SCRIPT_WORD_LIMIT,
  scriptWordCount,
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
  const { min, max } = SCRIPT_WORD_LIMIT[ep.idea.format ?? 'standard'];
  return (ep.idea.format ?? 'standard') === 'short'
    ? `FORMAT: YouTube Shorts (video vertikal 9:16, total < 60 detik, naskah ${min}–${max} kata). Ikuti aturan bagian "Format Shorts" di peranmu.`
    : `FORMAT: Video biasa (16:9, MAKSIMAL 5 menit, naskah ${min}–${max} kata). Langsung ke inti cerita, tidak bertele-tele.`;
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

    // too long → back to the writer to tighten it before spending a review on it
    const limit = SCRIPT_WORD_LIMIT[ep.idea.format ?? 'standard'];
    const words = scriptWordCount(script);
    // a revision of an already-recorded script must not be condensed: that would change narration that is reused
    if (words > limit.max && round < cfg.maxAutoRevisions && !ep.previousRecordings?.length) {
      log(id, 'penulis')(`Naskah ${words} kata, melebihi batas ${limit.max} kata — dipadatkan`);
      feedback = `Naskah terlalu panjang: ${words} kata, maksimal ${limit.max} kata (target ${limit.min}–${limit.max}). Padatkan: langsung ke inti cerita, buang pengantar, pengulangan, dan dialog yang tidak memajukan cerita. Pertahankan pesan moral, dalil, momen lucu, dan pertanyaan untuk penonton.`;
      continue;
    }
    if (words > limit.max) log(id, 'penulis')(`Naskah masih ${words} kata (batas ${limit.max}) setelah revisi otomatis — mohon dicek pemilik channel`);

    setStatus(id, 'reviewing', 'reviewer', 'Memeriksa naskah');
    const review = await runAgent({
      peran: 'reviewer',
      schema: ReviewSchema,
      maxTurns: 4,
      onProgress: log(id, 'reviewer'),
      prompt: `${formatInfo(ep)}\nUsia target: ${ep.idea.age}\nPanjang naskah: ${words} kata (batas ${limit.min}–${limit.max}).\n\nNaskah:\n${JSON.stringify(script, null, 2)}\n\nPeriksa naskah ini.`,
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
  const pick = backgroundPicker();
  const verses = memorization.verses.map((v, i) => {
    const vis = illustration.visuals.find((x) => x.number === v.number) ?? illustration.visuals[i];
    return { ...v, ...(vis ? { background: vis.background, moods: vis.moods } : {}), background: pick(vis?.background ?? v.background) };
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
    e.directionFeedback = undefined;
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
      prompt: [
        formatInfo(ep),
        `Naskah yang sudah disetujui:\n${JSON.stringify(ep.script, null, 2)}`,
        // notes for the scenes left by the owner (e.g. together with a script revision)
        ep.directionFeedback ? `Catatan dari pemilik channel untuk adegan (WAJIB diikuti):\n${ep.directionFeedback}` : '',
        'Susun adegannya.',
      ]
        .filter(Boolean)
        .join('\n\n'),
    }),
    requestMetadata(ep),
  ]);

  const scenes = alignWithScript(ep, direction.scenes);
  const reuse = reuseRecordings(ep, scenes);
  updateEpisode(id, (e) => {
    e.scenes = scenes;
    e.metadata = metadata;
    if (reuse) {
      e.recordingMode = 'per-scene';
      e.audioPerScene = reuse.files;
      e.sceneOffsets = reuse.offsets;
      e.previousRecordings = undefined;
    }
  });
  if (reuse) {
    log(id, 'sutradara')(
      reuse.missing.length
        ? `${reuse.files.length - reuse.missing.length} dari ${reuse.files.length} adegan memakai rekaman lama; rekam ulang adegan ${reuse.missing.map((i) => i + 1).join(', ')}`
        : 'Semua adegan memakai rekaman lama (narasi tidak berubah)',
    );
  }
  setStatus(
    id,
    'needs_audio',
    'orchestrator',
    reuse?.missing.length ? `Rekam adegan ${reuse.missing.map((i) => i + 1).join(', ')} (lainnya memakai rekaman lama)` : 'Siap direkam: bacakan narasi adegan secara berurutan',
  );
}

/** Match recordings kept aside during a script revision to the new scenes by identical narration. */
function reuseRecordings(ep: Episode, scenes: Scene[]) {
  if (!ep.previousRecordings?.length) return undefined;
  const norm = (t: string) => t.replace(/\s+/g, ' ').trim();
  const pool = ep.previousRecordings.filter((r) => r.file);
  const files: (string | null)[] = [];
  const offsets: (number | null)[] = [];
  const missing: number[] = [];
  scenes.forEach((s, i) => {
    const k = pool.findIndex((r) => norm(r.narration) === norm(s.narration));
    if (k >= 0) {
      const [r] = pool.splice(k, 1);
      files.push(r.file);
      offsets.push(r.offset);
    } else {
      files.push(null);
      offsets.push(null);
      missing.push(i);
    }
  });
  return { files, offsets, missing };
}

/**
 * Redo the scenes/visuals of an episode from the owner's notes (`directionFeedback`) without touching
 * the narration, so existing recordings stay valid; re-renders right away when recordings exist.
 */
export async function reviseDirection(id: string) {
  const ep = getEpisode(id);
  if (!ep.script || !ep.scenes) throw new Error('Episode belum punya adegan');
  const feedback = ep.directionFeedback ?? '';
  setStatus(id, 'directing', 'sutradara', `Merevisi adegan: ${feedback.slice(0, 80)}`);
  const direction = await runAgent({
    peran: 'sutradara',
    schema: DirectorSchema,
    maxTurns: 4,
    onProgress: log(id, 'sutradara'),
    prompt: [
      formatInfo(ep),
      `Naskah yang sudah disetujui (narasi TIDAK boleh diubah, sudah direkam):\n${JSON.stringify(ep.script, null, 2)}`,
      `Adegan saat ini:\n${JSON.stringify(ep.scenes, null, 2)}`,
      `Catatan revisi dari pemilik channel (WAJIB diikuti, pertahankan bagian lain yang sudah bagus):\n${feedback}`,
      'Susun ulang adegannya.',
    ].join('\n\n'),
  });
  updateEpisode(id, (e) => {
    e.scenes = alignWithScript(ep, direction.scenes);
    e.directionFeedback = undefined;
  });
  const hasAudio = Boolean(ep.audioFile) || Boolean(ep.audioParts?.length) || Boolean(ep.audioPerScene?.some(Boolean));
  if (hasAudio) return render(id);
  setStatus(id, 'needs_audio', 'orchestrator', 'Adegan direvisi; siap direkam');
}

/** Director output aligned to the approved script: narration, speaker & type are copied verbatim. */
function alignWithScript(ep: Episode, scenes: Scene[]): Scene[] {
  // Safety: narration must match script exactly (because it's already/will be recorded)
  const scriptScenes = ep.script!.scenes;
  const pick = backgroundPicker();
  return scriptScenes.map((n, i) => {
    const s = scenes[i] ?? scenes.at(-1)!;
    const characters = s.characters.slice();
    if (n.speaker !== 'narrator' && !characters.includes(n.speaker)) characters.push(n.speaker);
    // actions only for characters present, and sensible (Mochi: sleep/play; Mamas/Mother: anything except sleep)
    const actions = s.actions?.filter(
      (x) => characters.includes(x.character) && (x.character === 'mochi' ? x.action === 'sleeping' || x.action === 'playing' : x.action !== 'sleeping'),
    );
    return {
      ...s,
      background: pick(s.background),
      type: n.type,
      speaker: n.speaker,
      narration: n.narration,
      characters,
      actions: actions?.length ? actions : undefined,
    };
  });
}

/**
 * Keeps agent-chosen backgrounds within the ones enabled in Settings: a disabled one is replaced by the
 * previous allowed background (so the place doesn't jump around), or the first allowed one.
 */
function backgroundPicker() {
  const allowed = allowedBackgrounds(loadConfig());
  let last: Background | undefined;
  return (bg: Background): Background => {
    const chosen = allowed.includes(bg) ? bg : (last ?? allowed[0]);
    last = chosen;
    return chosen;
  };
}

// ---------------------------------------------------------------- RENDER
export async function render(id: string) {
  const ep = getEpisode(id);
  // per-scene recordings are merged during the render, so they count as audio too
  const hasAudio = Boolean(ep.audioFile) || Boolean(ep.audioParts?.length) || Boolean(ep.audioPerScene?.some(Boolean));
  setStatus(id, 'rendering', 'video-creator', hasAudio ? 'Render dengan rekaman suara' : 'Render pratinjau tanpa suara');
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
      cfg.publishPlan ? `Rencana saat ini:\n${JSON.stringify({ ...cfg.publishPlan, reason: undefined }, null, 2)}` : '',
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
