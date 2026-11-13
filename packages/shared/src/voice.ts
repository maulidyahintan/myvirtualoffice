// Which voice effect a recording gets when the video is rendered or previewed.
import { voiceFilter } from './constants.ts';
import { speaksArabic } from './channel.ts';
import { memorizationVoice, speakerVoice } from './store.ts';
import type { AppConfig, Episode } from './types.ts';

export interface SceneVoice {
  /** 'recitation' = the children's memorization voice, 'speaker' = the character's own voice. */
  kind: 'recitation' | 'speaker';
  pitch: number;
  tempo: number;
}

/**
 * Voice effect for the owner's recording of one scene (or one verse of a memorization video).
 * Arabic recitations sound the same everywhere: in a story they get the memorization voice, like in the
 * memorization videos, instead of the speaking character's voice. AI voices and episodes with effects
 * turned off keep the recording as it is (undefined).
 */
export function sceneVoice(ep: Episode, index: number, cfg: AppConfig): SceneVoice | undefined {
  if (ep.characterEffects === false) return undefined;
  if (ep.idea.type === 'memorization') return { kind: 'recitation', ...memorizationVoice(cfg) };
  const scene = ep.scenes?.[index];
  // AI voices already sound like the character
  if (!scene || ep.aiVoiceScenes?.[index]) return undefined;
  if (speaksArabic(scene)) return { kind: 'recitation', ...memorizationVoice(cfg) };
  return { kind: 'speaker', ...speakerVoice(scene.speaker, cfg) };
}

/** FFmpeg filter for that voice effect (undefined = keep the recording unchanged). */
export function sceneVoiceFilter(ep: Episode, index: number, cfg: AppConfig): string | undefined {
  const voice = sceneVoice(ep, index, cfg);
  return voice ? voiceFilter(voice) : undefined;
}
