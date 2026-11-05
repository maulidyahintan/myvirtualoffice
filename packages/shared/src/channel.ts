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
import type { AppConfig, Background, CharacterLooks, CharacterProfile, Speaker } from './types.ts';

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
