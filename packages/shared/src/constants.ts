// Visual vocabulary understood by Remotion template.
// When adding new backgrounds/characters in packages/video, add them here too
// so Director agent can use them.

export const BACKGROUNDS = [
  'bedroom-night',
  'bedroom-storm',
  'house-front',
  'night-storm',
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
  'school-gate',
  'school-yard',
  'school-canteen',
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
export const CONTENT_TYPES = ['story', 'memorization', 'compilation'] as const;

export const CHARACTERS = ['mamas', 'mother', 'mochi', 'friend'] as const;

export const EXPRESSIONS = ['happy', 'sad', 'thinking', 'surprised', 'calm', 'crying'] as const;

/** Small items that characters can hold (can also be placed in scene). */
export const HELD_ITEMS = ['quran', 'apple', 'banana', 'date', 'cake', 'chocolate-cake', 'milk-glass', 'ball', 'toy-car', 'toy-elephant', 'doll', 'book', 'flower'] as const;

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
 * playing (ball/toy). Mochi: sleeping (at the foot of the bed in bedroom-night), playing (yarn, or ball),
 * circling (walks around the legs of Mamas, or Mother when Mamas isn't shown), falling (sleeping at the foot
 * of the bed, a pillow drops on it and it tumbles to the floor, dizzy; bedroom backgrounds only).
 * approaching (Mochi walks slowly up to Mamas, or the friend; a child or Mother walks up to the first other person in
 * the scene), licking (licks the cheek of the child carrying it).
 * Children only: wearing-backpack (school bag on the back; arms stay free), hugging-knees (sits hugging the
 * knees, on the bed in the bedrooms), carrying-cat (holds Mochi in the arms). Mother only: hugging (hugs the child).
 * Anyone but Mochi: opening-door (opens the front door of the house; house-front only).
 * Children only: craving (+ heldItem food, default chocolate-cake): amazed by a treat in front of them and
 * eager to eat it: star eyes, hands under the chin, little hops, licking the lips.
 * Children only: hiding-under-blanket (sits wrapped in a blanket from head to toe, only the eyes peeking out;
 * on the bed in the bedrooms).
 * Anyone but Mochi: shouting (hands cupped around the wide-open mouth, calling out towards the window).
 * Everyone: startled (jumps with fright, then trembles), e.g. at a thunderclap.
 */
export const ACTIONS = [
  'holding',
  'reading-quran',
  'praying',
  'eating',
  'playing',
  'sleeping',
  'circling',
  'falling',
  'approaching',
  'licking',
  'wearing-backpack',
  'hugging-knees',
  'carrying-cat',
  'hugging',
  'opening-door',
  'craving',
  'hiding-under-blanket',
  'shouting',
  'startled',
] as const;

export const SCENE_TYPES = ['story', 'prayer', 'question'] as const;

export const AGE_GROUPS = ['1-3', '4-6', '7-10', '1-10'] as const;

/** Video format: standard (16:9, 5–8 minutes) or YouTube Shorts (9:16, < 60 seconds). */
export const FORMATS = ['standard', 'short'] as const;

export const FORMAT_LABEL = { standard: 'Video biasa', short: 'YouTube Shorts' } as const;

/** Choice when approving material: 'both' splits one idea into two episodes (standard video + Shorts). */
export const FORMAT_CHOICES = [...FORMATS, 'both'] as const;
export type FormatChoice = (typeof FORMAT_CHOICES)[number];
export const FORMAT_CHOICE_LABEL: Record<FormatChoice, string> = { ...FORMAT_LABEL, both: 'Keduanya (Video + Shorts)' };

/**
 * Extra gain for the opening music on top of the music volume setting: intro tracks are mixed quieter than
 * the narration (about 6 dB here). +30%, then another +25% at the owner's request (1.3 × 1.25); the current
 * track still peaks at about 0.64, well below clipping. Rendering may go above 1.
 */
export const INTRO_MUSIC_GAIN = 1.625;

/** Size & intro/outro duration per format. */

export const FORMAT_SPEC = {
  // the opening stays short (at most 5 s, longer intro music fades out) so children reach the story quickly
  standard: { width: 1920, height: 1080, introSeconds: 3, outroSeconds: 4, maxIntroSeconds: 5, maxOutroSeconds: 12 },
  short: { width: 1080, height: 1920, introSeconds: 1.5, outroSeconds: 2, maxIntroSeconds: 3, maxOutroSeconds: 4 },
} as const;

/** Voice pitch shift limit (semitones). Beyond this voice starts sounding unnatural. */
export const MAX_PITCH = 4;

/**
 * Speech tempo range for voice effects. This is children's education: speech may be slowed down to be
 * easier to follow, but never sped up beyond how it was spoken.
 */
export const SPEAKING_TEMPO_LIMITS = { min: 0.7, max: 1 } as const;

/** Tempo clamped to SPEAKING_TEMPO_LIMITS. */
export function clampSpeakingTempo(tempo: number): number {
  return Math.max(SPEAKING_TEMPO_LIMITS.min, Math.min(SPEAKING_TEMPO_LIMITS.max, tempo));
}

/**
 * FFmpeg voice transformation filter. `pitch` (semitones) shifts pitch and timbre
 * (+ sounds younger/childlike, − heavier); `tempo` 1 = original speech speed (never faster, see above).
 */
export function voiceFilter({ pitch = 0, tempo = 1 }: { pitch?: number; tempo?: number }): string | undefined {
  const st = Math.round(pitch * 2) / 2;
  const tp = clampSpeakingTempo(tempo);
  if (!st && Math.abs(tp - 1) < 0.005) return undefined;
  const f = 2 ** (st / 12);
  return `aresample=48000,asetrate=${(48000 * f).toFixed(0)},aresample=48000,atempo=${(tp / f).toFixed(5)}`;
}

/** Shift pitch of entire episode recording without changing tempo (0 = no filter). */
export function pitchFilter(semitones: number): string | undefined {
  return voiceFilter({ pitch: Math.max(-MAX_PITCH, Math.min(MAX_PITCH, semitones)) });
}

/** Voice per speaker in per-scene recording. Can be changed in Settings page. */
export const SPEAKERS = ['narrator', 'mother', 'mamas', 'mochi', 'friend'] as const;
export const DEFAULT_CHARACTER_VOICE: Record<(typeof SPEAKERS)[number], { pitch: number; tempo: number; note: string }> = {
  narrator: { pitch: 0, tempo: 1, note: 'suara asli' },
  // Small pitch shifts only: too much shift sounds like robot/chipmunk
  mother: { pitch: -1.5, tempo: 0.96, note: 'sedikit lebih berat, kalem & pelan' },
  mamas: { pitch: 2.5, tempo: 1, note: 'lebih muda & ceria, tetap natural' },
  mochi: { pitch: 4, tempo: 1, note: 'kecil & menggemaskan' },
  friend: { pitch: 3.5, tempo: 1, note: 'anak-anak, sedikit beda dari Mamas' },
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

/** Statuses waiting for the channel owner's action. */
export const WAITING_STATUSES: EpisodeStatus[] = ['needs_script_approval', 'needs_audio', 'needs_video_approval', 'error'];

/** Statuses that can't be moved to Draft (already on YouTube or being uploaded). */
export const NO_DRAFT_STATUSES: EpisodeStatus[] = ['uploading', 'scheduled', 'published'];

export const FPS = 30;

/** Indonesian display labels for code-level enum values (the UI stays Indonesian). */
export const SPEAKER_LABEL: Record<(typeof SPEAKERS)[number], string> = { narrator: 'Narator', mother: 'Ibu', mamas: 'Mamas', mochi: 'Mochi', friend: 'Ali' };
export const SCENE_TYPE_LABEL: Record<(typeof SCENE_TYPES)[number], string> = { story: 'cerita', prayer: 'doa', question: 'pertanyaan' };
export const EXPRESSION_LABEL: Record<(typeof EXPRESSIONS)[number], string> = {
  happy: 'senang',
  sad: 'sedih',
  thinking: 'berpikir',
  surprised: 'kaget',
  calm: 'tenang',
  crying: 'menangis',
};
export const BACKGROUND_LABEL: Record<(typeof BACKGROUNDS)[number], string> = {
  'bedroom-night': 'kamar malam',
  'bedroom-storm': 'kamar malam saat hujan petir',
  'house-front': 'depan pintu rumah (teras)',
  'night-storm': 'malam hujan petir (luar rumah)',
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
  'school-gate': 'gerbang sekolah',
  'school-yard': 'halaman sekolah',
  'school-canteen': 'kantin sekolah',
  yard: 'halaman rumah',
  library: 'perpustakaan',
  ablution: 'tempat wudhu',
  'inside-mosque': 'dalam masjid',
  playground: 'taman bermain',
  market: 'pasar',
  store: 'toko',
};

/** Default name & personality per speaker (owner can change them in Settings → Karakter). */
export const DEFAULT_CHARACTER_PROFILES: Record<(typeof SPEAKERS)[number], { name: string; description: string }> = {
  mamas: {
    name: 'Mamas',
    description:
      'Anak laki-laki, 4 tahun. Peci rajut biru, baju koko putih berkerah abu-abu. Ceria, polos, penasaran, suka bertanya "kenapa?". Ibu memanggilnya "Mas" / "Mamas".',
  },
  mother: {
    name: 'Ibu',
    description:
      'Ibunda Mamas. Kerudung pink panjang, abaya navy. Lembut, sabar, menjelaskan dengan bahasa sederhana dan contoh sehari-hari. Mamas memanggilnya "Ibu".',
  },
  mochi: { name: 'Mochi', description: 'Kucing oranye milik keluarga. Tidak bicara, hanya bereaksi lucu.' },
  friend: {
    name: 'Ali',
    description:
      'Teman sebaya Mamas di sekolah dan tetangga, anak laki-laki 5 tahun. Rambut hitam pendek, kaos hijau bergaris, celana biru. Ramah, aktif, suka bermain bola; kadang berbeda pendapat dengan Mamas, lalu mereka belajar saling mengalah.',
  },
  narrator: { name: 'Narator', description: 'Suara hangat yang bercerita sebelum tidur.' },
};

/** Default base colors of the drawn characters (matching the original artwork). */
export const DEFAULT_CHARACTER_LOOKS = {
  mamas: { skin: '#F6CBAE', cap: '#3E6E9E', shirt: '#F8F7F2', pants: '#4B5468' },
  mother: { skin: '#F7CFB4', hijab: '#F3A9C2', dress: '#24305E' },
  mochi: { fur: '#F0A04B', belly: '#FCE3C4' },
  friend: { skin: '#E3AD87', hair: '#2A1E1A', shirt: '#3FA27A', pants: '#3E5A8C' },
} as const;

/** Indonesian labels of the editable color parts, for the Settings form. */
export const CHARACTER_LOOK_LABEL: Record<string, string> = {
  skin: 'Kulit',
  cap: 'Peci',
  shirt: 'Baju',
  pants: 'Celana',
  hijab: 'Kerudung',
  dress: 'Abaya / gamis',
  fur: 'Bulu',
  hair: 'Rambut',
  belly: 'Perut',
};

/** Prompt files the owner may edit in Settings (file name in packages/agents/prompts → label). */
export const EDITABLE_PROMPTS = {
  'pedoman-channel': '📜 Pedoman channel (dibaca semua pegawai)',
  riset: '🔎 Miku · Content Research',
  penulis: '✍️ Chimi · Penulis naskah',
  reviewer: '🛡️ Choki · Kids & Syariah Reviewer',
  sutradara: '🎬 Momo · Sutradara',
  ilustrator: '🖼️ Ilustrator hafalan',
  'channel-manager': '📈 Lulu · Channel Manager',
  manajer: '🧭 Mochi · Manajer',
} as const;

/**
 * Free AI voice (Gemini TTS through a Google AI Studio key without billing): prebuilt voice and speaking
 * style per speaker. The style is spoken as an instruction, not read aloud.
 */
/**
 * Free AI voice per speaker (Gemini TTS prebuilt voice + speaking style). Gemini has no child voices, so a
 * child is a cheerful male voice with `pitch` (semitones) raised; the shift is baked into the generated file.
 */
/** Pace every AI voice keeps: the audience are young children who must follow every word. */
const CHILD_PACE = 'dengan tempo pelan dan jelas yang mudah dipahami anak kecil, tidak terburu-buru, dan beri jeda di setiap koma dan titik';

export const AI_VOICES: Record<(typeof SPEAKERS)[number], { voice: string; style: string; pitch?: number }> = {
  narrator: { voice: 'Sulafat', style: `Bacakan dengan hangat, tenang, dan pelan seperti mendongeng sebelum tidur untuk anak-anak, ${CHILD_PACE}` },
  mother: { voice: 'Vindemiatrix', style: `Ucapkan dengan lembut, sabar, dan penuh kasih seperti seorang ibu berbicara kepada anaknya, ${CHILD_PACE}` },
  mamas: { voice: 'Achird', style: `Ucapkan dengan ceria dan polos seperti anak laki-laki berumur empat tahun, ${CHILD_PACE}`, pitch: 4 },
  mochi: { voice: 'Puck', style: `Ucapkan dengan lucu dan riang, ${CHILD_PACE}` },
  friend: { voice: 'Fenrir', style: `Ucapkan dengan riang seperti anak laki-laki berumur lima tahun, ${CHILD_PACE}`, pitch: 4 },
};
