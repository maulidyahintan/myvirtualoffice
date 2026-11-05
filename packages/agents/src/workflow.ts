// Orchestrator: office workflow from idea to publication.
// Each function = one "work shift" triggered from dashboard or CLI.
import fs from 'node:fs';
import path from 'node:path';
import {
  addLog,
  createEpisodeFromIdea,
  getEpisode,
  isoToLocal,
  latestFile,
  listEpisodes,
  loadConfig,
  allowedBackgrounds,
  visualStyle,
  needsHumanVoice,
  ensureDir,
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
import { AiVoiceUnavailable, speak } from './tts.ts';
import { IllustrationUnavailable, drawPicture, illustrationReady } from './illustrate.ts';
import {
  IllustratorSchema,
  SceneIllustrationSchema,
  SingleSceneSchema,
  IllustrationPromptSchema,
  ReportSchema,
  MetadataSchema,
  ScriptSchema,
  PublishPlanSchema,
  ReviewSchema,
  researchSchema,
  DirectorSchema,
} from './schemas.ts';
import { kantorTools, TOOL_LAPORAN, TOOL_RISET } from './youtube/tools.ts';
import { renderEpisode, renderScenePreview } from './render.ts';
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
      e.aiVoiceScenes = reuse.ai.some(Boolean) ? reuse.ai : undefined;
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
  const ai: boolean[] = [];
  const missing: number[] = [];
  scenes.forEach((s, i) => {
    const k = pool.findIndex((r) => norm(r.narration) === norm(s.narration));
    if (k >= 0) {
      const [r] = pool.splice(k, 1);
      files.push(r.file);
      offsets.push(r.offset);
      ai.push(Boolean(r.ai));
    } else {
      files.push(null);
      offsets.push(null);
      ai.push(false);
      missing.push(i);
    }
  });
  return { files, offsets, ai, missing };
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
  const pick = backgroundPicker();
  return ep.script!.scenes.map((n, i) => normalizeScene(n, scenes[i] ?? scenes.at(-1)!, pick));
}

/** One Director scene made safe: narration, speaker & type copied verbatim, sensible actions, allowed background. */
function normalizeScene(n: Pick<Scene, 'type' | 'speaker' | 'narration'>, s: Scene, pick: (bg: Background) => Background): Scene {
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

// ---------------------------------------------------------------- AI VOICE
/**
 * Fill the empty scenes with the free AI voice. Scenes with Arabic (prayers, verses, transliteration) are
 * skipped for the owner to record; when the free quota runs out, the rest is left to record by hand.
 */
export async function fillAiVoices(id: string) {
  const ep = getEpisode(id);
  const say = log(id, 'pengisi-suara');
  // optional helper: when it can't run, only note why — the episode keeps waiting for the owner's recording
  const reason =
    ep.idea.type === 'memorization'
      ? "Video hafalan direkam sendiri (bacaan Al-Qur'an)"
      : !ep.scenes?.length
        ? 'Episode belum punya adegan'
        : ep.recordingMode !== 'per-scene' && (ep.audioFile || ep.audioParts?.length)
          ? 'Episode ini sudah punya rekaman utuh; pilih mode rekam per adegan dulu supaya suara AI bisa mengisi adegan yang kosong'
          : !process.env.GEMINI_API_KEY?.trim()
            ? 'Suara AI belum disiapkan: isi GEMINI_API_KEY di .env (API key Google AI Studio dari proyek tanpa akun penagihan)'
            : undefined;
  if (reason) {
    say(`Suara AI tidak dipakai: ${reason}`);
    return;
  }
  const scenes = ep.scenes!;
  const filled = (i: number) => Boolean(getEpisode(id).audioPerScene?.[i]);
  const targets = scenes.map((_, i) => i).filter((i) => !filled(i) && !needsHumanVoice(scenes[i]));
  const human = scenes.map((_, i) => i).filter((i) => !filled(i) && needsHumanVoice(scenes[i]));
  if (!targets.length) {
    say(human.length ? `Tidak ada adegan untuk suara AI; adegan ${human.map((i) => i + 1).join(', ')} berisi bacaan Arab, rekam sendiri` : 'Semua adegan sudah ada suaranya');
    return;
  }
  say(`Mengisi ${targets.length} adegan dengan suara AI gratis${human.length ? ` (adegan ${human.map((i) => i + 1).join(', ')} berisi bacaan Arab, rekam sendiri)` : ''}`);

  const dir = ensureDir(paths.audio());
  const done: number[] = [];
  let stopped: string | undefined;
  for (const i of targets) {
    let audio: Buffer;
    try {
      audio = await speak(scenes[i].narration, scenes[i].speaker);
    } catch (e) {
      if (!(e instanceof AiVoiceUnavailable)) throw e;
      stopped = e.message;
      break;
    }
    const name = `${id}-adegan-${i + 1}-ai-${Date.now().toString(36)}.wav`;
    // re-read inside the update so recordings uploaded meanwhile are kept (and no unused file is left)
    updateEpisode(id, (e) => {
      const n = e.scenes?.length ?? 0;
      if (e.audioPerScene?.[i]) return;
      fs.writeFileSync(path.join(dir, name), audio);
      e.audioPerScene = Array.from({ length: n }, (_, k) => e.audioPerScene?.[k] ?? null);
      e.audioPerScene[i] = `audio/${name}`;
      e.sceneOffsets = Array.from({ length: n }, (_, k) => e.sceneOffsets?.[k] ?? null);
      e.aiVoiceScenes = Array.from({ length: n }, (_, k) => e.aiVoiceScenes?.[k] ?? false);
      e.aiVoiceScenes[i] = true;
      e.recordingMode = 'per-scene';
    });
    done.push(i);
    say(`Adegan ${i + 1} diisi suara AI (${done.length}/${targets.length})`);
  }
  const left = [...targets.filter((i) => !done.includes(i)), ...human].sort((a, b) => a - b);
  say(
    [
      `${done.length} adegan diisi suara AI`,
      stopped ? `berhenti: ${stopped}` : '',
      left.length ? `rekam sendiri adegan ${left.map((i) => i + 1).join(', ')}` : 'semua adegan sudah ada suaranya, dengarkan lalu render',
    ]
      .filter(Boolean)
      .join(' · '),
  );
}

// ---------------------------------------------------------------- REVISE ONE SCENE
/**
 * Fix one scene (1-based) from the owner's note, narration unchanged: an AI-illustration scene gets a new
 * picture, any other scene is redone by the Director. Then only that scene is rendered as a preview.
 */
export async function reviseScene(id: string, sceneNo: number, note: string) {
  const ep = getEpisode(id);
  const i = sceneNo - 1;
  const scene = ep.scenes?.[i];
  if (!scene) throw new Error(`Adegan ${sceneNo} tidak ada`);
  const cfg = loadConfig();
  const pictured = visualStyle(ep, cfg) === 'ai-illustration' && scene.illustration;

  if (pictured) {
    const say = log(id, 'ilustrator');
    say(`Merevisi gambar adegan ${sceneNo}: ${note.slice(0, 80)}`);
    const { prompt } = await runAgent({
      peran: 'ilustrator-adegan',
      schema: IllustrationPromptSchema,
      maxTurns: 3,
      onProgress: say,
      prompt: [
        `Tulis ulang deskripsi gambar untuk SATU adegan ini.`,
        `Narasi adegan ${sceneNo}: ${scene.narration}`,
        `Deskripsi gambar sebelumnya: ${scene.illustration!.prompt}`,
        `Catatan pemilik channel (WAJIB diikuti, tetap patuhi aturan gambar): ${note}`,
      ].join('\n\n'),
    });
    let jpg: Buffer;
    try {
      jpg = await drawPicture(prompt);
    } catch (e) {
      if (e instanceof IllustrationUnavailable) {
        say(`Gambar adegan ${sceneNo} belum bisa dibuat: ${e.message}`);
        return;
      }
      throw e;
    }
    const name = `ilustrasi/${id}-${sceneNo}-${Date.now().toString(36)}.jpg`;
    fs.writeFileSync(path.join(ensureDir(path.join(paths.videoPkg(), 'public', 'ilustrasi')), path.basename(name)), jpg);
    updateEpisode(id, (e) => {
      const old = e.scenes![i].illustration?.image;
      if (old) fs.rmSync(path.join(paths.videoPkg(), 'public', old), { force: true });
      e.scenes![i].illustration = { prompt: prompt.trim(), image: name };
    });
  } else {
    const say = log(id, 'sutradara');
    say(`Merevisi adegan ${sceneNo}: ${note.slice(0, 80)}`);
    const result = await runAgent({
      peran: 'sutradara',
      schema: SingleSceneSchema,
      maxTurns: 4,
      onProgress: say,
      prompt: [
        formatInfo(ep),
        `Semua adegan saat ini (untuk konteks):\n${JSON.stringify(ep.scenes!.map(({ illustration: _, ...s }) => s), null, 1)}`,
        `Revisi HANYA adegan ${sceneNo}. Narasi, speaker, dan type TIDAK boleh diubah (sudah direkam).`,
        `Catatan pemilik channel untuk adegan ini (WAJIB diikuti, pertahankan yang sudah bagus):\n${note}`,
        'Kembalikan adegan itu saja.',
      ].join('\n\n'),
    });
    updateEpisode(id, (e) => {
      const before = e.scenes![i];
      e.scenes![i] = { ...normalizeScene(before, result.scene, backgroundPicker()), illustration: before.illustration };
    });
  }

  const say = log(id, 'video-creator');
  say(`Merender pratinjau adegan ${sceneNo}`);
  const file = await renderScenePreview(getEpisode(id), i);
  if (!file) {
    say(`Adegan ${sceneNo} sudah direvisi. Pratinjau belum bisa dibuat (belum ada render penuh yang cocok); render ulang untuk melihatnya.`);
    return;
  }
  updateEpisode(id, (e) => {
    e.scenePreviews = { ...e.scenePreviews, [i]: file };
  });
  say(`Pratinjau adegan ${sceneNo} siap. Kalau sudah cocok, render ulang video lengkap.`);
}

// ---------------------------------------------------------------- AI ILLUSTRATION
/**
 * AI pictures of what happens in key scenes (free Cloudflare quota). Without a scene number: the scene
 * illustrator picks the scenes (once) and every picture still missing is drawn. With a scene number
 * (1-based): only that picture is drawn again. When the quota runs out the rest stays animated.
 */
export async function illustrateEpisode(id: string, sceneNo?: number) {
  const ep = getEpisode(id);
  const say = log(id, 'ilustrator');
  const reason =
    ep.idea.type === 'memorization'
      ? 'video hafalan memakai latar biasa'
      : !ep.scenes?.length
        ? 'episode belum punya adegan'
        : !illustrationReady()
          ? 'isi CLOUDFLARE_ACCOUNT_ID dan CLOUDFLARE_API_TOKEN di .env (akun Cloudflare paket Free)'
          : undefined;
  if (reason) {
    say(`Ilustrasi AI tidak dibuat: ${reason}`);
    return;
  }
  const scenes = ep.scenes!;

  if (!sceneNo && !scenes.some((s) => s.illustration)) {
    say('Memilih adegan yang perlu digambar');
    const result = await runAgent({
      peran: 'ilustrator-adegan',
      schema: SceneIllustrationSchema,
      maxTurns: 3,
      onProgress: say,
      prompt: `Judul: ${ep.script?.title ?? ep.idea.title}\n\nAdegan:\n${scenes
        .map((s, i) => `${i + 1}. [${s.type}, ${s.speaker}, tokoh: ${s.characters.join(', ') || '-'}] ${s.narration}`)
        .join('\n')}`,
    });
    const chosen = result.illustrations.filter((x) => {
      const s = scenes[x.scene - 1];
      // prayers show the prayer card and questions show the thinking dots: keep those animated
      return s && s.type === 'story' && !s.prayer && x.prompt.trim();
    });
    updateEpisode(id, (e) => {
      for (const x of chosen) e.scenes![x.scene - 1].illustration = { prompt: x.prompt.trim() };
      e.visualStyle = 'ai-illustration';
    });
    say(`Adegan yang digambar: ${chosen.map((x) => x.scene).join(', ') || '-'}`);
  }

  const current = getEpisode(id).scenes!;
  const todo = current
    .map((s, i) => ({ s, i }))
    .filter(({ s, i }) => s.illustration && (sceneNo ? i === sceneNo - 1 : !s.illustration.image));
  if (!todo.length) {
    say(sceneNo ? `Adegan ${sceneNo} tidak punya deskripsi ilustrasi` : 'Semua ilustrasi sudah ada');
    return;
  }
  const dir = ensureDir(path.join(paths.videoPkg(), 'public', 'ilustrasi'));
  let done = 0;
  for (const { s, i } of todo) {
    let jpg: Buffer;
    try {
      jpg = await drawPicture(s.illustration!.prompt);
    } catch (e) {
      if (!(e instanceof IllustrationUnavailable)) throw e;
      say(`Berhenti: ${e.message}. Adegan tanpa gambar tetap memakai animasi biasa.`);
      break;
    }
    const name = `ilustrasi/${id}-${i + 1}-${Date.now().toString(36)}.jpg`;
    fs.writeFileSync(path.join(dir, path.basename(name)), jpg);
    updateEpisode(id, (e) => {
      const ill = e.scenes?.[i]?.illustration;
      if (!ill) return;
      if (ill.image) fs.rmSync(path.join(paths.videoPkg(), 'public', ill.image), { force: true });
      ill.image = name;
    });
    done++;
    say(`Ilustrasi adegan ${i + 1} selesai (${done}/${todo.length})`);
  }
  if (done) say(`${done} ilustrasi siap. Cek di halaman episode, lalu render ulang supaya masuk ke video.`);
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
    // the full render now contains every revised scene
    for (const f of Object.values(e.scenePreviews ?? {})) fs.rmSync(path.join(paths.renders(), f), { force: true });
    e.scenePreviews = undefined;
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
