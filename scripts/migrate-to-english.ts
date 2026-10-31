#!/usr/bin/env node
/**
 * Phase 1 migration: Indonesian→English field names in persisted data.
 * Idempotent: running twice is a no-op.
 * Usage: node --import tsx scripts/migrate-to-english.ts [--dry-run]
 */
import fs from 'node:fs';
import path from 'node:path';

const DRY_RUN = process.argv.includes('--dry-run');
const ROOT = process.cwd();

type AnyObject = Record<string, unknown>;

// Field mapping helpers
function migrateIdea(old: AnyObject): AnyObject {
  if ('title' in old) return old; // Already migrated
  return {
    title: old.judul,
    series: old.seri,
    age: old.usia,
    moralMessage: old.pesanMoral,
    ...(old.format && { format: old.format === 'biasa' ? 'standard' : old.format }),
    ...(old.jenis && { type: old.jenis === 'cerita' ? 'story' : old.jenis === 'hafalan' ? 'memorization' : old.jenis }),
    ...(old.hafalan && { memorization: migrateMemorizationInfo(old.hafalan as AnyObject) }),
    reason: old.alasan,
    references: old.referensi,
  };
}

function migrateMemorizationInfo(old: AnyObject): AnyObject {
  if ('surah' in old) return old;
  return {
    surah: old.surat,
    surahName: old.namaSurat,
    verseFrom: old.ayatDari,
    verseTo: old.ayatSampai,
    repetitions: old.ulang,
    basmalah: old.basmalah,
  };
}

function migrateMemorizationVerse(old: AnyObject): AnyObject {
  if ('number' in old) return old;
  return {
    number: old.nomor,
    arabic: old.arab,
    latin: old.latin,
    meaning: old.arti,
    background: migrateEnumValue('background', old.latar as string),
    moods: (old.suasana as string[])?.map((s) => migrateEnumValue('mood', s)) || [],
  };
}

function migrateEvidence(old: AnyObject): AnyObject {
  if ('type' in old) return old;
  return {
    type: old.jenis,
    ...(old.teksArab && { arabicText: old.teksArab }),
    ...(old.latin && { latin: old.latin }),
    translation: old.terjemah,
    source: old.sumber,
  };
}

function migrateScriptScene(old: AnyObject): AnyObject {
  if ('narration' in old) return old;
  return {
    type: migrateEnumValue('sceneType', old.jenis as string),
    speaker: migrateEnumValue('speaker', old.pembicara as string),
    narration: old.narasi,
    visualDirection: old.petunjukVisual,
  };
}

function migrateScript(old: AnyObject): AnyObject {
  if ('scenes' in old) return old;
  return {
    title: old.judul,
    summary: old.ringkasan,
    scenes: (old.adegan as AnyObject[])?.map(migrateScriptScene) || [],
    evidences: (old.dalil as AnyObject[])?.map(migrateEvidence) || [],
  };
}

function migrateReview(old: AnyObject): AnyObject {
  if ('decision' in old) return old;
  return {
    decision: old.keputusan === 'lolos' ? 'approved' : 'needs_revision',
    score: old.skor,
    notes: old.catatan,
    humanCheck: old.cekManusia,
  };
}

function migrateCharacterAction(old: AnyObject): AnyObject {
  if ('character' in old) return old;
  return {
    character: migrateEnumValue('character', old.karakter as string),
    action: migrateEnumValue('action', old.aksi as string),
    ...(old.benda && { heldItem: migrateEnumValue('heldItem', old.benda as string) }),
  };
}

function migrateScene(old: AnyObject): AnyObject {
  if ('narration' in old) return old;
  return {
    type: migrateEnumValue('sceneType', old.jenis as string),
    speaker: migrateEnumValue('speaker', old.pembicara as string),
    narration: old.narasi,
    background: migrateEnumValue('background', old.latar as string),
    characters: (old.karakter as string[])?.map((k) => migrateEnumValue('character', k)) || [],
    expression: migrateEnumValue('expression', old.ekspresi as string),
    ...(old.teksLayar && { screenText: old.teksLayar }),
    ...(old.doa && { prayer: { arabic: (old.doa as AnyObject).arab, latin: (old.doa as AnyObject).latin, meaning: (old.doa as AnyObject).arti } }),
    ...(old.properti && { props: (old.properti as string[]).map((p) => migrateEnumValue('prop', p)) }),
    ...(old.aksi && { actions: (old.aksi as AnyObject[]).map(migrateCharacterAction) }),
  };
}

function migrateYouTubeMetadata(old: AnyObject): AnyObject {
  if ('title' in old) return old;
  return {
    title: old.judul,
    description: old.deskripsi,
    tags: old.tags,
    thumbnailText: old.teksThumbnail,
  };
}

function migrateLogEntry(old: AnyObject): AnyObject {
  if ('time' in old) return old;
  return {
    time: old.waktu,
    by: old.oleh,
    message: old.pesan,
  };
}

function migrateEpisode(old: AnyObject): AnyObject {
  if ('idea' in old) return old; // Already migrated

  return {
    id: old.id,
    created: old.dibuat,
    modified: old.diubah,
    status: old.status,
    ...(old.catatanStatus && { statusNote: old.catatanStatus }),
    idea: migrateIdea(old.ide as AnyObject),
    ...(old.pasangan && { twin: old.pasangan }),
    ...(old.asal && { source: { id: (old.asal as AnyObject).id, scenes: (old.asal as AnyObject).adegan } }),
    ...(old.turunan && { derivatives: old.turunan }),
    ...(old.naskah && { script: migrateScript(old.naskah as AnyObject) }),
    ...(old.review && { review: migrateReview(old.review as AnyObject) }),
    revisionCount: old.jumlahRevisi,
    ...(old.feedbackManusia && { humanFeedback: old.feedbackManusia }),
    ...(old.adegan && { scenes: (old.adegan as AnyObject[]).map(migrateScene) }),
    ...(old.metadata && { metadata: migrateYouTubeMetadata(old.metadata as AnyObject) }),
    ...(old.hafalan && {
      memorization: {
        surahName: (old.hafalan as AnyObject).namaSurat,
        surahMeaning: (old.hafalan as AnyObject).artiSurat,
        verses: ((old.hafalan as AnyObject).ayat as AnyObject[]).map(migrateMemorizationVerse),
        ...((old.hafalan as AnyObject).mulaiSegmen && { segmentStarts: (old.hafalan as AnyObject).mulaiSegmen }),
        ...((old.hafalan as AnyObject).efekSegmen && { segmentEffect: (old.hafalan as AnyObject).efekSegmen }),
      },
    }),
    ...(old.fileAudio && { audioFile: old.fileAudio }),
    ...(old.bagianAudio && { audioParts: old.bagianAudio }),
    ...(old.modeRekam && { recordingMode: old.modeRekam === 'urut' ? 'sequential' : 'per-scene' }),
    ...(old.audioPerAdegan && { audioPerScene: old.audioPerAdegan }),
    ...(old.offsetAdegan && { sceneOffsets: old.offsetAdegan }),
    ...(old.render && {
      render: {
        video: (old.render as AnyObject).video,
        ...((old.render as AnyObject).thumbnail && { thumbnail: (old.render as AnyObject).thumbnail }),
        time: (old.render as AnyObject).waktu,
        ...((old.render as AnyObject).adegan && {
          scenes: ((old.render as AnyObject).adegan as AnyObject[]).map((s) => ({ start: s.mulai, duration: s.durasi })),
        }),
      },
    }),
    ...(old.nadaSuara !== undefined && { voicePitch: old.nadaSuara }),
    ...(old.efekKarakter !== undefined && { characterEffects: old.efekKarakter }),
    ...(old.youtube && {
      youtube: {
        videoId: (old.youtube as AnyObject).videoId,
        url: (old.youtube as AnyObject).url,
        ...((old.youtube as AnyObject).jadwalTayang && { publishTime: (old.youtube as AnyObject).jadwalTayang }),
        ...((old.youtube as AnyObject).playlist && {
          playlist: { name: ((old.youtube as AnyObject).playlist as AnyObject).nama, id: ((old.youtube as AnyObject).playlist as AnyObject).id },
        }),
      },
    }),
    ...(old.jadwalDipilih && { selectedSchedule: old.jadwalDipilih }),
    ...(old.youtubeLama && {
      youtubeHistory: (old.youtubeLama as AnyObject[]).map((y) => ({
        videoId: y.videoId,
        url: y.url,
        ...(y.jadwalTayang && { publishTime: y.jadwalTayang }),
        ...(y.ditarik && { withdrawn: y.ditarik }),
        ...(y.playlist && { playlist: { name: (y.playlist as AnyObject).nama, id: (y.playlist as AnyObject).id } }),
      })),
    }),
    log: (old.log as AnyObject[]).map(migrateLogEntry),
  };
}

function migrateAppConfig(old: AnyObject): AnyObject {
  if ('channelName' in old) return old; // Already migrated

  return {
    channelName: old.namaChannel,
    language: old.bahasa,
    series: (old.seri as AnyObject[]).map((s) => ({
      id: s.id,
      name: s.nama,
      age: s.usia,
      ...(s.playlistId && { playlistId: s.playlistId }),
      ...(s.playlist && { playlist: s.playlist }),
    })),
    ...(old.playlistYoutube && { youtubePlaylists: old.playlistYoutube }),
    maxAutoRevisions: old.maksRevisiOtomatis,
    defaultPublishTime: old.jamTayangDefault,
    timeZone: old.zonaWaktu,
    ...(old.risetHarian && {
      dailyResearch: {
        active: (old.risetHarian as AnyObject).aktif,
        time: (old.risetHarian as AnyObject).jam,
        ideaCount: (old.risetHarian as AnyObject).jumlahIde,
      },
    }),
    ...(old.rencanaTayang && {
      publishPlan: {
        videosPerDay: (old.rencanaTayang as AnyObject).videoPerHari,
        days: (old.rencanaTayang as AnyObject).hari,
        slots: ((old.rencanaTayang as AnyObject).slot as AnyObject[]).map((s) => ({
          time: s.jam,
          format: s.format === 'biasa' ? 'standard' : s.format === 'semua' ? 'all' : s.format,
        })),
        ...((old.rencanaTayang as AnyObject).alasan && { reason: (old.rencanaTayang as AnyObject).alasan }),
        by: (old.rencanaTayang as AnyObject).oleh,
        modified: (old.rencanaTayang as AnyObject).diubah,
      },
    }),
    ...(old.suaraKarakter && {
      characterVoices: Object.fromEntries(
        Object.entries(old.suaraKarakter as AnyObject).map(([k, v]) => [
          migrateEnumValue('speaker', k),
          { pitch: (v as AnyObject).nada, tempo: (v as AnyObject).tempo },
        ]),
      ),
    }),
    ...(old.suaraHafalan && {
      memorizationVoice: { pitch: (old.suaraHafalan as AnyObject).nada, tempo: (old.suaraHafalan as AnyObject).tempo },
    }),
    ...(old.musik && {
      music: {
        ...(old.musik.pembuka && { intro: old.musik.pembuka }),
        ...(old.musik.penutup && { outro: old.musik.penutup }),
        volume: old.musik.volume,
        inShorts: old.musik.diShorts,
      },
    }),
  };
}

function migrateChatMessage(old: AnyObject): AnyObject {
  if ('time' in old) return old;
  return {
    time: old.waktu,
    from: old.dari === 'saya' ? 'owner' : 'agent',
    text: old.teks,
    ...(old.episodeId && { episodeId: old.episodeId }),
  };
}

function migrateAutomationState(old: AnyObject): AnyObject {
  if ('date' in old) return old;
  return {
    ...(old.tanggal && { date: old.tanggal }),
    ...(old.percobaan && { attempts: old.percobaan }),
    ...(old.hasil && { result: old.hasil === 'jalan' ? 'running' : old.hasil }),
    ...(old.pesan && { message: old.pesan }),
    ...(old.waktu && { time: old.waktu }),
  };
}

// Enum value migration
function migrateEnumValue(type: string, value: string): string {
  const maps: Record<string, Record<string, string>> = {
    background: {
      'kamar-malam': 'bedroom-night',
      'ruang-tamu': 'living-room',
      taman: 'garden',
      masjid: 'mosque',
      dapur: 'kitchen',
      'langit-malam': 'night-sky',
      gurun: 'desert',
      laut: 'ocean',
      gunung: 'mountain',
      fajar: 'dawn',
      sekolah: 'school',
      'halaman-rumah': 'yard',
      perpustakaan: 'library',
      'tempat-wudhu': 'ablution',
      'dalam-masjid': 'inside-mosque',
      'taman-bermain': 'playground',
      pasar: 'market',
      toko: 'store',
    },
    mood: {
      hujan: 'rain',
      bintang: 'stars',
      burung: 'birds',
      cahaya: 'light',
      daun: 'leaves',
      kupu: 'butterflies',
    },
    character: {
      mamas: 'mamas',
      ibu: 'mother',
      mochi: 'mochi',
    },
    speaker: {
      mamas: 'mamas',
      ibu: 'mother',
      mochi: 'mochi',
      narator: 'narrator',
    },
    expression: {
      senang: 'happy',
      sedih: 'sad',
      berpikir: 'thinking',
      kaget: 'surprised',
      tenang: 'calm',
    },
    sceneType: {
      cerita: 'story',
      doa: 'prayer',
      pertanyaan: 'question',
    },
    action: {
      memegang: 'holding',
      'membaca-quran': 'reading-quran',
      berdoa: 'praying',
      makan: 'eating',
      bermain: 'playing',
      tidur: 'sleeping',
    },
    heldItem: {
      quran: 'quran',
      apel: 'apple',
      pisang: 'banana',
      kurma: 'date',
      kue: 'cake',
      'gelas-susu': 'milk-glass',
      bola: 'ball',
      'mobil-mainan': 'toy-car',
      boneka: 'doll',
      buku: 'book',
      bunga: 'flower',
    },
    prop: {
      quran: 'quran',
      apel: 'apple',
      pisang: 'banana',
      kurma: 'date',
      kue: 'cake',
      'gelas-susu': 'milk-glass',
      bola: 'ball',
      'mobil-mainan': 'toy-car',
      boneka: 'doll',
      buku: 'book',
      bunga: 'flower',
      'piring-buah': 'fruit-plate',
      'piring-nasi': 'rice-plate',
      'keranjang-buah': 'fruit-basket',
      'balok-mainan': 'building-blocks',
      'kotak-mainan': 'toy-box',
      'pohon-pot': 'potted-tree',
      sajadah: 'prayer-mat',
      'rehal-quran': 'quran-stand',
      bantal: 'pillow',
    },
  };

  return maps[type]?.[value] ?? value;
}

// File processing
function migrateFile(filePath: string, migrator: (data: AnyObject) => AnyObject): { changed: boolean } {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content) as AnyObject;
    const migrated = migrator(data);

    const newContent = JSON.stringify(migrated, null, 2) + '\n';
    if (newContent === content) {
      return { changed: false };
    }

    if (!DRY_RUN) {
      fs.writeFileSync(filePath, newContent);
    }
    return { changed: true };
  } catch (err) {
    console.error(`  ✗ Error processing ${filePath}:`, err);
    return { changed: false };
  }
}

// Main
function main() {
  console.log(`\n🔄 Phase 1 Migration: Indonesian → English field names`);
  console.log(DRY_RUN ? '   (DRY RUN - no files will be modified)\n' : '\n');

  let totalChanged = 0;
  let totalSkipped = 0;

  // Migrate episodes
  const episodesDir = path.join(ROOT, 'data/episodes');
  if (fs.existsSync(episodesDir)) {
    const files = fs.readdirSync(episodesDir).filter((f) => f.endsWith('.json'));
    console.log(`📁 Episodes (${files.length} files):`);
    for (const file of files) {
      const { changed } = migrateFile(path.join(episodesDir, file), migrateEpisode);
      if (changed) {
        console.log(`  ✓ ${file}`);
        totalChanged++;
      } else {
        totalSkipped++;
      }
    }
  }

  // Migrate config
  const configPath = path.join(ROOT, 'kantor.config.json');
  if (fs.existsSync(configPath)) {
    console.log(`\n📁 Configuration:`);
    const { changed } = migrateFile(configPath, migrateAppConfig);
    console.log(`  ${changed ? '✓' : '○'} kantor.config.json`);
    if (changed) totalChanged++;
    else totalSkipped++;
  }

  // Migrate chat
  const chatDir = path.join(ROOT, 'data/chat');
  if (fs.existsSync(chatDir)) {
    const files = fs.readdirSync(chatDir).filter((f) => f.endsWith('.json'));
    if (files.length > 0) {
      console.log(`\n📁 Chat (${files.length} files):`);
      for (const file of files) {
        const { changed } = migrateFile(path.join(chatDir, file), (data) => {
          if (Array.isArray(data) && data.length > 0 && 'time' in data[0]) return data; // Already migrated
          return (data as AnyObject[]).map(migrateChatMessage);
        });
        if (changed) {
          console.log(`  ✓ ${file}`);
          totalChanged++;
        } else {
          totalSkipped++;
        }
      }
    }
  }

  // Migrate automation state
  const automationPath = path.join(ROOT, 'data/otomatis.json');
  if (fs.existsSync(automationPath)) {
    console.log(`\n📁 Automation state:`);
    const { changed } = migrateFile(automationPath, migrateAutomationState);
    console.log(`  ${changed ? '✓' : '○'} otomatis.json`);
    if (changed) totalChanged++;
    else totalSkipped++;
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ${totalChanged} files migrated`);
  console.log(`   ${totalSkipped} files already up-to-date`);

  if (DRY_RUN && totalChanged > 0) {
    console.log(`\n   Run without --dry-run to apply changes.\n`);
  } else if (totalChanged > 0) {
    console.log(`\n✅ Migration complete!\n`);
  } else {
    console.log(`\n✅ All files already migrated.\n`);
  }
}

main();
