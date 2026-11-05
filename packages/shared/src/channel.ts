// Channel content settings the owner edits in Settings: character names/personalities/colors and which
// backgrounds the Director may use. Everything falls back to the original defaults.
import {
  BACKGROUNDS,
  BACKGROUND_LABEL,
  CHARACTERS,
  DEFAULT_CHARACTER_LOOKS,
  DEFAULT_CHARACTER_PROFILES,
  SPEAKERS,
} from './constants.ts';
import type { AppConfig, Background, CharacterLooks, CharacterProfile, Episode, Scene, Speaker, VisualStyle } from './types.ts';

export function characterProfile(cfg: AppConfig, id: Speaker): CharacterProfile {
  const own = cfg.characters?.[id];
  const base = DEFAULT_CHARACTER_PROFILES[id];
  return { name: own?.name?.trim() || base.name, description: own?.description?.trim() || base.description };
}

/** Display name per speaker, e.g. { mamas: 'Mamas', mother: 'Ibu', … }. */
export function speakerNames(cfg: AppConfig): Record<Speaker, string> {
  return Object.fromEntries(SPEAKERS.map((id) => [id, characterProfile(cfg, id).name])) as Record<Speaker, string>;
}

/** Character colors with the owner's overrides applied on top of the defaults. */
export function characterLooks(cfg: AppConfig): Required<{ [K in keyof CharacterLooks]-?: Required<NonNullable<CharacterLooks[K]>> }> {
  const own = cfg.characterLooks ?? {};
  return {
    mamas: { ...DEFAULT_CHARACTER_LOOKS.mamas, ...own.mamas },
    mother: { ...DEFAULT_CHARACTER_LOOKS.mother, ...own.mother },
    mochi: { ...DEFAULT_CHARACTER_LOOKS.mochi, ...own.mochi },
  };
}

export function backgroundLabel(cfg: AppConfig, bg: Background): string {
  return cfg.backgroundLabels?.[bg]?.trim() || BACKGROUND_LABEL[bg];
}

/** Backgrounds the Director may use (never empty: if all are disabled, all are allowed). */
export function allowedBackgrounds(cfg: AppConfig): Background[] {
  const off = new Set(cfg.disabledBackgrounds ?? []);
  const on = BACKGROUNDS.filter((b) => !off.has(b));
  return on.length ? on : [...BACKGROUNDS];
}

/** Section about the characters & backgrounds appended to every agent's system prompt. */
export function characterGuide(cfg: AppConfig): string {
  const line = (id: Speaker) => {
    const p = characterProfile(cfg, id);
    return `- **${p.name}** (id \`${id}\`) — ${p.description}`;
  };
  const renamed = SPEAKERS.filter((id) => characterProfile(cfg, id).name !== DEFAULT_CHARACTER_PROFILES[id].name);
  const drawn = CHARACTERS.map((id) => characterProfile(cfg, id).name).join(', ');
  return [
    '## Karakter tetap (orisinal, milik channel)',
    ...CHARACTERS.map(line),
    line('narrator'),
    `- Hanya ${drawn} yang digambar. Tokoh lain boleh disebut di NARASI, tapi tidak digambar dan tidak diberi dialog langsung.`,
    renamed.length
      ? `- Catatan nama: ${renamed.map((id) => `"${DEFAULT_CHARACTER_PROFILES[id].name}" di instruksi lain berarti tokoh \`${id}\`, yang sekarang bernama **${characterProfile(cfg, id).name}**`).join('; ')}. Selalu pakai nama baru di naskah, judul, dan metadata.`
      : undefined,
    '',
    '## Latar yang boleh dipakai',
    allowedBackgrounds(cfg)
      .map((b) => `\`${b}\` (${backgroundLabel(cfg, b)})`)
      .join(', ') + '. Latar lain TIDAK boleh dipakai.',
  ]
    .filter((l) => l !== undefined)
    .join('\n');
}

/** Arabic script, or transliteration marks (ā, ḥ, ṣ, …). */
const ARABIC_MARKS = /[\u0600-\u06FF]|[āīūḥṣḍṭẓʿʾ]/i;

/** Common words of Arabic recitations written in plain Latin letters (no special marks). */
const ARABIC_WORDS =
  /\b(allahumma|bismillah\w*|alhamdulillah\w+|subhana\w*|astaghfiru\w*|innallaha|inna|laa|illaa|ilaaha|rabbi|rabbana|rabbil|rabbin|qul|a'uu?dzu|wa(?:la|lam|hdin\w*)|hasbunallah\w*|ni'mal|wakiil|aamiin|ihdinas|shiraat\w*|yaa?\s+ayyuha|lillaahi|ta'aala|tamsyi|mukhtaal\w*|fakhuur)\b/gi;

/** Indonesian words that never appear inside an Arabic recitation (so "Ya Allah" or "wa" don't count). */
const INDONESIAN_WORDS =
  /\b(yuk|ayo|mari|artinya|supaya|agar|kita|kami|adik|berdoa|baca|bacalah|kata|yang|dan|untuk|aku|kamu|tunjukilah|lindungilah|ampunilah|berilah|jangan|dengan|tidak|ini|itu|sebelum|sesudah|setelah|mamas|ibu)\b/gi;

function hasArabicRecitation(text: string): boolean {
  return ARABIC_MARKS.test(text) || (text.match(ARABIC_WORDS)?.length ?? 0) >= 2;
}

/**
 * Scenes the AI voice must NOT read: prayers and anything with an Arabic recitation (script, marked or
 * plain transliteration), because TTS gets makhraj & tajwid wrong. These stay for the owner to record.
 */
export function needsHumanVoice(scene: Pick<Scene, 'type' | 'narration'> & { prayer?: unknown }): boolean {
  return scene.type === 'prayer' || Boolean(scene.prayer) || hasArabicRecitation(scene.narration);
}

/**
 * A scene that mixes an Arabic recitation with Indonesian sentences (intro or meaning). Every recitation
 * must be a scene of its own, so it can be recorded/uploaded separately and the AI voice can read the rest.
 */
export function mixesArabicAndIndonesian(scene: Pick<Scene, 'type' | 'narration'>): boolean {
  if (!(scene.type === 'prayer' || hasArabicRecitation(scene.narration))) return false;
  return (scene.narration.match(INDONESIAN_WORDS)?.length ?? 0) >= 3;
}

/** Visual style used when rendering this episode (episode choice, else the channel default). */
export function visualStyle(ep: Episode, cfg: AppConfig): VisualStyle {
  return ep.idea.type === 'memorization' ? 'animation' : (ep.visualStyle ?? cfg.visualStyle ?? 'animation');
}
