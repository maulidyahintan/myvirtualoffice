import { describe, expect, it } from 'vitest';
import { DEFAULT_CHARACTER_VOICE, DEFAULT_MEMORIZATION_VOICE, voiceFilter } from './constants.ts';
import { sceneVoice, sceneVoiceFilter } from './voice.ts';
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
