import { describe, expect, it } from 'vitest';
import { DEFAULT_CHARACTER_VOICE, DEFAULT_MEMORIZATION_VOICE, SPEAKING_TEMPO_LIMITS, voiceFilter } from './constants.ts';
import { speakerVoice } from './store.ts';
import { MAX_AI_WORDS_PER_SECOND, childFriendlyTempo, sceneVoice, sceneVoiceFilter } from './voice.ts';
import type { AppConfig, Episode, Scene } from './types.ts';

const cfg = {} as AppConfig;
const memorizationSettings = { pitch: DEFAULT_MEMORIZATION_VOICE.pitch, tempo: DEFAULT_MEMORIZATION_VOICE.tempo };

const scene = (speaker: Scene['speaker'], narration: string, extra: Partial<Scene> = {}): Scene =>
  ({ type: 'story', speaker, narration, background: 'living-room', characters: [], expression: 'calm', ...extra }) as Scene;

const story = (scenes: Scene[], extra: Partial<Episode> = {}): Episode =>
  ({ id: 'test', idea: { type: 'story' }, scenes, ...extra }) as unknown as Episode;

const RECITATION = "Wa yusabbiḥur-ra‘du biḥamdihī wal-malā'ikatu min khīfatih.";
const INDONESIAN = 'Tadi Mamas berteriak, tapi petirnya tetap datang, kan? Dekati Ibu, lalu ingat Allah.';

describe('sceneVoice', () => {
  it('gives an Arabic recitation in a story the memorization voice', () => {
    expect(sceneVoice(story([scene('mamas', RECITATION)]), 0, cfg)).toEqual({ kind: 'recitation', ...memorizationSettings });
  });

  it('uses the memorization voice even when Mother recites', () => {
    expect(sceneVoice(story([scene('mother', RECITATION)]), 0, cfg)?.kind).toBe('recitation');
  });

  it('keeps the character voice for Indonesian narration', () => {
    const { pitch, tempo } = DEFAULT_CHARACTER_VOICE.mother;
    expect(sceneVoice(story([scene('mother', INDONESIAN)]), 0, cfg)).toEqual({ kind: 'speaker', pitch, tempo });
  });

  it('leaves AI voices unchanged', () => {
    expect(sceneVoice(story([scene('mamas', RECITATION)], { aiVoiceScenes: [true] }), 0, cfg)).toBeUndefined();
  });

  it('leaves every recording unchanged when voice effects are off', () => {
    expect(sceneVoice(story([scene('mamas', RECITATION)], { characterEffects: false }), 0, cfg)).toBeUndefined();
  });

  it('uses the memorization voice for every verse of a memorization video', () => {
    const memorization = { id: 'test', idea: { type: 'memorization' } } as unknown as Episode;
    expect(sceneVoice(memorization, 3, cfg)).toEqual({ kind: 'recitation', ...memorizationSettings });
  });

  it('follows the owner settings for the memorization voice', () => {
    const own = { memorizationVoice: { pitch: 1, tempo: 0.9 } } as AppConfig;
    expect(sceneVoice(story([scene('mamas', RECITATION)]), 0, own)).toEqual({ kind: 'recitation', pitch: 1, tempo: 0.9 });
  });
});

describe('sceneVoiceFilter', () => {
  it('builds the same filter as a memorization video for a recitation', () => {
    expect(sceneVoiceFilter(story([scene('mamas', RECITATION)]), 0, cfg)).toBe(voiceFilter(memorizationSettings));
  });

  it('returns no filter for a missing scene', () => {
    expect(sceneVoiceFilter(story([]), 5, cfg)).toBeUndefined();
  });
});

describe('speaking tempo', () => {
  it('never speeds speech up, even with an older faster setting', () => {
    const fast = { characterVoices: { mamas: { pitch: 4, tempo: 1.1 } } } as AppConfig;
    expect(speakerVoice('mamas', fast).tempo).toBe(1);
    expect(voiceFilter({ pitch: 0, tempo: 1.2 })).toBeUndefined();
  });

  it('keeps every default character voice at or below the original speed', () => {
    for (const voice of Object.values(DEFAULT_CHARACTER_VOICE)) expect(voice.tempo).toBeLessThanOrEqual(1);
  });
});

describe('childFriendlyTempo', () => {
  const TEN_WORDS = 'satu dua tiga empat lima enam tujuh delapan sembilan sepuluh';

  it('leaves a voice that is already slow enough unchanged', () => {
    expect(childFriendlyTempo(TEN_WORDS, 10 / MAX_AI_WORDS_PER_SECOND)).toBe(1);
  });

  it('slows a fast voice down to the child-friendly pace', () => {
    const seconds = 10 / 1.68;
    expect(childFriendlyTempo(TEN_WORDS, seconds)).toBeCloseTo(MAX_AI_WORDS_PER_SECOND / 1.68);
  });

  it('does not drag a very fast voice below the tempo limit', () => {
    expect(childFriendlyTempo(TEN_WORDS, 2)).toBe(SPEAKING_TEMPO_LIMITS.min);
  });

  it('keeps the tempo for empty text or audio', () => {
    expect(childFriendlyTempo('', 3)).toBe(1);
    expect(childFriendlyTempo(TEN_WORDS, 0)).toBe(1);
  });
});
