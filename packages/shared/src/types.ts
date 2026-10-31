import type {
  EXPRESSIONS,
  EpisodeStatus,
  CHAT_AGENTS,
  ACTIONS,
  HELD_ITEMS,
  SCENE_PROPS,
  FORMATS,
  CONTENT_TYPES,
  MOODS,
  SCENE_TYPES,
  CHARACTERS,
  BACKGROUNDS,
  AGE_GROUPS,
} from './constants.ts';

export type { EpisodeStatus };
export type Background = (typeof BACKGROUNDS)[number];
export type Character = (typeof CHARACTERS)[number];
export type Expression = (typeof EXPRESSIONS)[number];
export type SceneType = (typeof SCENE_TYPES)[number];
export type AgeGroup = (typeof AGE_GROUPS)[number];
export type Format = (typeof FORMATS)[number];
export type HeldItem = (typeof HELD_ITEMS)[number];
export type SceneProp = (typeof SCENE_PROPS)[number];
export type Action = (typeof ACTIONS)[number];
export type ContentType = (typeof CONTENT_TYPES)[number];
export type ChatAgent = (typeof CHAT_AGENTS)[number];

/** Single message in the channel owner ↔ agent conversation. */
export interface ChatMessage {
  time: string;
  from: 'owner' | 'agent';
  text: string;
  /** Episode being discussed (optional) */
  episodeId?: string;
}
export type Mood = (typeof MOODS)[number];

/** Settings for Quranic memorization video. */
export interface MemorizationInfo {
  /** Surah number 1–114 */
  surah: number;
  surahName: string;
  verseFrom: number;
  verseTo: number;
  /** How many times each verse is repeated in the recording */
  repetitions: number;
  /** Basmalah read at beginning (not for Al-Fatihah & At-Taubah) */
  basmalah: boolean;
}

/** Single verse (or basmalah, number 0) with its background visuals. */
export interface MemorizationVerse {
  number: number;
  arabic: string;
  latin: string;
  meaning: string;
  background: Background;
  moods: Mood[];
}

/** Memorization video data sent to Remotion. */
export interface MemorizationVideo {
  surahName: string;
  surahMeaning: string;
  verses: MemorizationVerse[];
  repetitions: number;
  /** Second where each segment starts in the recording (pause detection result); empty = evenly divided */
  segmentStarts?: number[];
}

export interface Idea {
  title: string;
  series: string;
  age: AgeGroup;
  moralMessage: string;
  /** Empty = 'standard' (old episodes before format choice existed). */
  format?: Format;
  /** Empty = 'story'. */
  type?: ContentType;
  memorization?: MemorizationInfo;
  reason: string;
  references: string[];
}

export interface Evidence {
  type: 'ayat' | 'hadits' | 'doa' | 'atsar';
  arabicText?: string;
  latin?: string;
  translation: string;
  /** Example: "QS. Al-Baqarah: 286" or "HR. Bukhari no. 6114" */
  source: string;
}

export interface ScriptScene {
  type: SceneType;
  speaker: Character | 'narrator';
  /** Text that is READ during voice recording. */
  narration: string;
  /** Brief visual direction for Director. */
  visualDirection: string;
}

export interface Script {
  title: string;
  summary: string;
  scenes: ScriptScene[];
  evidences: Evidence[];
}

export interface Review {
  decision: 'approved' | 'needs_revision';
  score: number;
  notes: string[];
  /** Items that MUST be checked by human before approval (evidence, historical facts, etc). */
  humanCheck: string[];
}

/** Scene that has been "directed" and is ready to render. */
export interface Scene {
  type: SceneType;
  speaker: Character | 'narrator';
  narration: string;
  background: Background;
  characters: Character[];
  expression: Expression;
  /** Large on-screen text (optional), e.g. prayer name. */
  screenText?: string;
  /** For prayer scenes: Arabic text + latin + meaning. */
  prayer?: { arabic: string; latin: string; meaning: string };
  /** Supporting props around characters (max 3). */
  props?: SceneProp[];
  /** What specific characters are doing (holding items, reading Quran, sleeping, ...). */
  actions?: CharacterAction[];
}

export interface CharacterAction {
  character: Character;
  action: Action;
  /** Item being held/eaten/played with */
  heldItem?: HeldItem;
}

export interface YouTubeMetadata {
  title: string;
  description: string;
  tags: string[];
  thumbnailText: string;
}

export interface LogEntry {
  time: string;
  by: string;
  message: string;
}

export interface Episode {
  id: string;
  created: string;
  modified: string;
  status: EpisodeStatus;
  statusNote?: string;
  idea: Idea;
  /** Twin episode from same idea with different format (standard video ↔ Shorts). */
  twin?: string;
  /** Clip shorts: source episode & source scene indices used. */
  source?: { id: string; scenes: number[] };
  /** Shorts clipped from this episode. */
  derivatives?: string[];
  script?: Script;
  review?: Review;
  revisionCount: number;
  humanFeedback?: string;
  scenes?: Scene[];
  metadata?: YouTubeMetadata;
  /** Verse text + visuals (only for memorization type) */
  memorization?: {
    surahName: string;
    surahMeaning: string;
    verses: MemorizationVerse[];
    segmentStarts?: number[];
    /** Audio effect filter active when segmentStarts was calculated; changes → re-detect (tempo shifts timing). */
    segmentEffect?: string;
  };
  /** Path relative to packages/video/public, example "audio/abc.mp3" */
  audioFile?: string;
  /** Recordings sent in parts (sequential); merged into audioFile during render. */
  audioParts?: string[];
  /** 'sequential' (default): one recording/part sequentially. 'per-scene': one file per scene (memorization: per verse). */
  recordingMode?: RecordingMode;
  /** Per-scene/verse recordings, matching scene (story) or verse (memorization) index. */
  audioPerScene?: (string | null)[];
  /** Seconds into per-scene recording when video starts (Studio records from countdown). */
  sceneOffsets?: (number | null)[];
  render?: {
    video: string;
    thumbnail?: string;
    time: string;
    /** Start second & duration of each scene (memorization: each verse) in rendered video, for Recording Studio. */
    scenes?: { start: number; duration: number }[];
  };
  /** Shift recording pitch (semitones, + higher, − lower); speech speed stays same. */
  voicePitch?: number;
  /** false = no voice effects (story: character effects per scene, memorization: children's voice). Default: use effects. */
  characterEffects?: boolean;
  youtube?: { videoId: string; url: string; publishTime?: string; playlist?: { name: string; id: string } };
  /** Publish time selected when video was approved (ISO); holds slot during upload. */
  selectedSchedule?: string;
  /**
   * Previous upload replaced because video was re-edited. Old video made private
   * (`withdrawn` = time made private), not deleted.
   */
  youtubeHistory?: { videoId: string; url: string; publishTime?: string; withdrawn?: string; playlist?: { name: string; id: string } }[];
  log: LogEntry[];
}

/** Props sent to Remotion composition. */
export interface EpisodeVideoProps {
  [key: string]: unknown;
  channelName: string;
  title: string;
  seriesName: string;
  scenes: Scene[];
  audioFile?: string;
  /** Start second of each scene in audioFile (per-scene recording); scene duration matches exactly. */
  sceneStarts?: number[];
  format?: Format;
  /** Filled for memorization video; story scenes ignored. */
  memorization?: MemorizationVideo;
  /** Intro & outro music from channel settings. */
  music?: VideoMusic;
  /** Filled automatically by calculateMetadata. */
  sceneFrames?: number[];
  introFrame?: number;
  outroFrame?: number;
}

export type RecordingMode = 'sequential' | 'per-scene';

export interface VideoMusic {
  /** path in packages/video/public, e.g. musik/pembuka.mp3 */
  intro?: string;
  outro?: string;
  /** 0..1 */
  volume: number;
}

export interface ThumbnailProps {
  [key: string]: unknown;
  text: string;
  /** Small label above text, e.g. "Surah Memorization" */
  subtitle?: string;
  background: Background;
  characters: Character[];
  expression: Expression;
}

/** Single publish time in a day, for specific format or all. */
export interface PublishSlot {
  /** "HH:mm" in channel timezone */
  time: string;
  format: Format | 'all';
}

export interface PublishPlan {
  /** Maximum videos published per day (all formats) */
  videosPerDay: number;
  /** Publish days, 0 = Sunday … 6 = Saturday */
  days: number[];
  slots: PublishSlot[];
  /** Channel Manager explanation (Markdown) */
  reason?: string;
  by: 'channel-manager' | 'owner';
  modified: string;
}

export interface DailyResearch {
  active: boolean;
  /** "HH:mm" in channel timezone; research runs first time after this hour */
  time: string;
  /** Minimum ideas per day */
  ideaCount: number;
}

export interface AppConfig {
  channelName: string;
  language: string;
  series: {
    id: string;
    name: string;
    age: AgeGroup;
    /** Direct YouTube playlist ID (legacy); if empty uses `playlist` (name). */
    playlistId?: string;
    /** Target playlist name; empty = default (see playlistName). */
    playlist?: string;
  }[];
  /** Cache playlist name → YouTube playlist ID (filled automatically when playlist found/created). */
  youtubePlaylists?: Record<string, string>;
  maxAutoRevisions: number;
  defaultPublishTime: string;
  timeZone: string;
  /** Content Research finds ideas itself every day (see `npm run kantor -- harian`). */
  dailyResearch?: DailyResearch;
  /** Publish schedule plan from Channel Manager (owner can edit); basis for default schedule when approving video. */
  publishPlan?: PublishPlan;
  /** Voice effect per speaker (overrides DEFAULT_CHARACTER_VOICE). */
  characterVoices?: Partial<Record<'narrator' | 'mother' | 'mamas' | 'mochi', { pitch: number; tempo: number }>>;
  /** Voice effect for memorization video recitation (overrides DEFAULT_MEMORIZATION_VOICE). */
  memorizationVoice?: { pitch: number; tempo: number };
  music?: VideoMusic & {
    /** Also used in Shorts (Shorts intro/outro limited to keep < 60 seconds) */
    inShorts: boolean;
  };
}
