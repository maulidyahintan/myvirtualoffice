// Visual vocabulary understood by Remotion template.
// When adding new backgrounds/characters in packages/video, add them here too
// so Director agent can use them.

export const BACKGROUNDS = [
  'bedroom-night',
  'living-room',
  'garden',
  'mosque',
  'kitchen',
  'night-sky',
  'desert',
  'ocean',
  'mountain',
  'dawn',
  'school',
  'yard',
  'library',
  'ablution',
  'inside-mosque',
  'playground',
  'market',
  'store',
] as const;

/** Additional mood animations on top of background (used in memorization videos). */
export const MOODS = ['rain', 'stars', 'birds', 'light', 'leaves', 'butterflies'] as const;

/** Agents that can be chatted with on Chat page (id same as Kantor 3D employees). */
export const CHAT_AGENTS = ['manajer', 'riset', 'penulis', 'reviewer', 'sutradara', 'channel'] as const;

/** Content type: story (script + characters) or memorization (Quranic recitation). */
export const CONTENT_TYPES = ['story', 'memorization'] as const;

export const CHARACTERS = ['mamas', 'mother', 'mochi'] as const;

export const EXPRESSIONS = ['happy', 'sad', 'thinking', 'surprised', 'calm'] as const;

/** Small items that characters can hold (can also be placed in scene). */
export const HELD_ITEMS = ['quran', 'apple', 'banana', 'date', 'cake', 'milk-glass', 'ball', 'toy-car', 'doll', 'book', 'flower'] as const;

/** Supporting props in scene (placed on floor/small table around characters). */
export const SCENE_PROPS = [
  ...HELD_ITEMS,
  'fruit-plate',
  'rice-plate',
  'fruit-basket',
  'building-blocks',
  'toy-box',
  'potted-tree',
  'prayer-mat',
  'quran-stand',
  'pillow',
] as const;

/**
 * Character action in one scene. Mamas/Mother: holding (item), reading-quran, praying, eating (item),
 * playing (ball/toy). Mochi: sleeping, playing (yarn ball).
 */
export const ACTIONS = ['holding', 'reading-quran', 'praying', 'eating', 'playing', 'sleeping'] as const;

export const SCENE_TYPES = ['story', 'prayer', 'question'] as const;

export const AGE_GROUPS = ['1-3', '4-6', '7-10', '1-10'] as const;

/** Video format: standard (16:9, 3–5 minutes) or YouTube Shorts (9:16, < 60 seconds). */
export const FORMATS = ['standard', 'short'] as const;

export const FORMAT_LABEL = { standard: 'Video biasa', short: 'YouTube Shorts' } as const;

/** Choice when approving material: 'both' splits one idea into two episodes (standard video + Shorts). */
export const FORMAT_CHOICES = [...FORMATS, 'both'] as const;
export type FormatChoice = (typeof FORMAT_CHOICES)[number];
export const FORMAT_CHOICE_LABEL: Record<FormatChoice, string> = { ...FORMAT_LABEL, both: 'Keduanya (Video + Shorts)' };

/** Size & intro/outro duration per format. */
export const FORMAT_SPEC = {
  standard: { width: 1920, height: 1080, introSeconds: 3, outroSeconds: 4, maxIntroSeconds: 10, maxOutroSeconds: 12 },
  short: { width: 1080, height: 1920, introSeconds: 1.5, outroSeconds: 2, maxIntroSeconds: 3, maxOutroSeconds: 4 },
} as const;

/** Voice pitch shift limit (semitones). Beyond this voice starts sounding unnatural. */
export const MAX_PITCH = 4;

/**
 * FFmpeg voice transformation filter. `pitch` (semitones) shifts pitch and timbre
 * (+ sounds younger/childlike, − heavier); `tempo` 1 = original speech speed.
 */
export function voiceFilter({ pitch = 0, tempo = 1 }: { pitch?: number; tempo?: number }): string | undefined {
  const st = Math.round(pitch * 2) / 2;
  const tp = Math.max(0.7, Math.min(1.4, tempo));
  if (!st && Math.abs(tp - 1) < 0.005) return undefined;
  const f = 2 ** (st / 12);
  return `aresample=48000,asetrate=${(48000 * f).toFixed(0)},aresample=48000,atempo=${(tp / f).toFixed(5)}`;
}

/** Shift pitch of entire episode recording without changing tempo (0 = no filter). */
export function pitchFilter(semitones: number): string | undefined {
  return voiceFilter({ pitch: Math.max(-MAX_PITCH, Math.min(MAX_PITCH, semitones)) });
}

/** Voice per speaker in per-scene recording. Can be changed in Settings page. */
export const SPEAKERS = ['narrator', 'mother', 'mamas', 'mochi'] as const;
export const DEFAULT_CHARACTER_VOICE: Record<(typeof SPEAKERS)[number], { pitch: number; tempo: number; note: string }> = {
  narrator: { pitch: 0, tempo: 1, note: 'suara asli' },
  // Small pitch shifts only: too much shift sounds like robot/chipmunk
  mother: { pitch: -1.5, tempo: 0.96, note: 'sedikit lebih berat, kalem & pelan' },
  mamas: { pitch: 2.5, tempo: 1.04, note: 'lebih muda & ceria, tetap natural' },
  mochi: { pitch: 4, tempo: 1.05, note: 'kecil & menggemaskan' },
};
export const CHARACTER_PITCH_LIMITS = { min: -6, max: 9 };
/** Memorization video recitation voice: higher like children & slower for easy following. */
export const DEFAULT_MEMORIZATION_VOICE = { pitch: 3, tempo: 0.85, note: 'seperti anak-anak, lebih pelan' };

export const MUSIC_TYPES = ['intro', 'outro'] as const;
export type MusicType = (typeof MUSIC_TYPES)[number];

export const STATUS_LABEL = {
  idea: 'Ide',
  writing: 'Penulis sedang menulis…',
  reviewing: 'Reviewer sedang memeriksa…',
  needs_script_approval: 'Menunggu persetujuan naskah',
  directing: 'Sutradara & Channel Manager bekerja…',
  needs_audio: 'Menunggu rekaman suara',
  rendering: 'Video sedang dirender…',
  needs_video_approval: 'Menunggu persetujuan video',
  uploading: 'Sedang diupload…',
  scheduled: 'Terjadwal tayang',
  published: 'Tayang',
  rejected: 'Ditolak',
  error: 'Error',
} as const;

export type EpisodeStatus = keyof typeof STATUS_LABEL;

/** Statuses when an agent is working (dashboard will auto-refresh). */
export const BUSY_STATUSES: EpisodeStatus[] = [
  'writing',
  'reviewing',
  'directing',
  'rendering',
  'uploading',
];

/** Dashboard board columns. */
export const PHASES: { title: string; statuses: EpisodeStatus[] }[] = [
  { title: 'Ide', statuses: ['idea'] },
  { title: 'Naskah', statuses: ['writing', 'reviewing', 'needs_script_approval'] },
  { title: 'Rekam Suara', statuses: ['directing', 'needs_audio'] },
  { title: 'Video', statuses: ['rendering', 'needs_video_approval', 'uploading'] },
  { title: 'Tayang', statuses: ['scheduled', 'published'] },
  { title: 'Arsip', statuses: ['rejected', 'error'] },
];

export const FPS = 30;

/** Indonesian display labels for code-level enum values (the UI stays Indonesian). */
export const SPEAKER_LABEL: Record<(typeof SPEAKERS)[number], string> = { narrator: 'Narator', mother: 'Ibu', mamas: 'Mamas', mochi: 'Mochi' };
export const SCENE_TYPE_LABEL: Record<(typeof SCENE_TYPES)[number], string> = { story: 'cerita', prayer: 'doa', question: 'pertanyaan' };
export const EXPRESSION_LABEL: Record<(typeof EXPRESSIONS)[number], string> = {
  happy: 'senang',
  sad: 'sedih',
  thinking: 'berpikir',
  surprised: 'kaget',
  calm: 'tenang',
};
export const BACKGROUND_LABEL: Record<(typeof BACKGROUNDS)[number], string> = {
  'bedroom-night': 'kamar malam',
  'living-room': 'ruang tamu',
  garden: 'taman',
  mosque: 'masjid',
  kitchen: 'dapur',
  'night-sky': 'langit malam',
  desert: 'gurun',
  ocean: 'laut',
  mountain: 'gunung',
  dawn: 'fajar',
  school: 'sekolah',
  yard: 'halaman rumah',
  library: 'perpustakaan',
  ablution: 'tempat wudhu',
  'inside-mosque': 'dalam masjid',
  playground: 'taman bermain',
  market: 'pasar',
  store: 'toko',
};
