// Thumbnail plan: every playlist has its own look (label, accent color, kind of places), and episodes
// within a playlist vary (background from the episode's own places, layout side, expression) so the
// channel page doesn't show the same cover over and over.
import { playlistName } from './store.ts';
import { visualStyle } from './channel.ts';
import type { AppConfig, Background, Character, Episode, Expression, KnownKeys, ThumbnailProps } from './types.ts';

interface PlaylistLook {
  badge: string;
  accent: string;
  /** Preferred places, in order of preference */
  backgrounds: Background[];
}

const LOOKS: Record<string, PlaylistLook> = {
  'Asbabun Nuzul': { badge: '🕋 ASBABUN NUZUL', accent: '#C98A1E', backgrounds: ['desert', 'mountain', 'night-sky', 'dawn', 'ocean'] },
  'Obrolan Islami Anak': {
    badge: '💬 OBROLAN ISLAMI',
    accent: '#2F8F6B',
    backgrounds: ['garden', 'living-room', 'playground', 'yard', 'kitchen', 'market', 'store', 'school', 'library'],
  },
  Hafalan: { badge: '📖 HAFALAN', accent: '#2F6FB0', backgrounds: ['inside-mosque', 'mosque', 'dawn', 'night-sky', 'garden'] },
};

/** Looks for playlists added later: picked from these by name, so each still gets a stable own color. */
const EXTRA_ACCENTS = ['#B5487A', '#6A5ACD', '#D9673B', '#2A8C9E'];

/** Small stable hash, so the same episode always gets the same choices. */
function hash(text: string): number {
  let h = 0;
  for (const c of text) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

function lookFor(playlist: string): PlaylistLook {
  return (
    LOOKS[playlist] ?? {
      badge: playlist.toUpperCase(),
      accent: EXTRA_ACCENTS[hash(playlist) % EXTRA_ACCENTS.length],
      backgrounds: ['garden', 'living-room', 'dawn', 'mosque'],
    }
  );
}

/** Expression that fits the title: a question → thinking, an exclamation → surprised, otherwise happy. */
function expressionFor(title: string): Expression {
  if (/\?\s*$|^(kenapa|mengapa|apa|bagaimana|siapa)\b/i.test(title)) return 'thinking';
  if (/!/.test(title)) return 'surprised';
  return 'happy';
}

export function thumbnailPlan(ep: Episode, text: string, cfg: AppConfig): Omit<KnownKeys<ThumbnailProps>, 'characterLooks'> {
  const playlist = playlistName(ep, cfg);
  const look = lookFor(playlist);
  const h = hash(ep.id);
  const scenes = ep.scenes ?? [];

  // the playlist's kind of places, those that appear in this episode first; a cover doesn't have to show the
  // exact scene, and drawing from the whole list keeps covers of similar episodes from looking alike.
  // The bedroom at night is left out: it looks the same in every bedtime story.
  const used = new Set(scenes.map((s) => s.background));
  const pool = [...look.backgrounds.filter((b) => used.has(b)), ...look.backgrounds.filter((b) => !used.has(b))].filter(
    (b) => b !== 'bedroom-night',
  );
  const background = pool[h % pool.length];

  // an AI picture of what happens makes the cover clearly different from the others
  const pictures = visualStyle(ep, cfg) === 'ai-illustration' ? scenes.map((s) => s.illustration?.image).filter((x): x is string => Boolean(x)) : [];
  const illustration = pictures.length ? pictures[h % pictures.length] : undefined;

  const withCharacters = scenes.find((s) => s.background === background && s.characters.length) ?? scenes.find((s) => s.characters.length);
  const characters: Character[] = withCharacters?.characters.length ? withCharacters.characters : ['mother', 'mamas'];

  return {
    text,
    background,
    characters,
    expression: expressionFor(ep.script?.title ?? ep.idea.title),
    illustration,
    badge: look.badge,
    accent: look.accent,
    mirror: h % 2 === 1,
    ...(ep.idea.type === 'memorization' ? { subtitle: 'Hafalan Surat' } : {}),
  };
}
