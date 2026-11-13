import { describe, expect, it } from 'vitest';
import { activeActions, didEarlier, hasTimedActions, phraseFrame, phraseStart, timeActions } from './sceneTimeline.ts';
import type { CharacterAction } from './types.ts';

const STORM =
  'Mamas berteriak ke arah jendela. Tapi… duar! Guruh malah terdengar lagi. Mamas cepat-cepat menyelam ke bawah selimut. Mochi ikut kaget, lalu… gedebuk! Mochi jatuh dari kasur, tertimpa bantal.';
/** Pauses measured in the AI voice of this narration (seconds into 26.5 s of speech). */
const SPOKEN_AT = { duar: 6.15, menyelam: 12.6, kaget: 17.3, gedebuk: 20.18 };
const SPEECH_SECONDS = 26.49;
const MAX_ERROR_SECONDS = 0.8;

describe('phraseStart', () => {
  it('lands within a second of where the voice actually says each cue', () => {
    for (const [phrase, seconds] of Object.entries(SPOKEN_AT)) {
      const estimate = (phraseStart(STORM, phrase) ?? -1) * SPEECH_SECONDS;
      expect(Math.abs(estimate - seconds)).toBeLessThan(MAX_ERROR_SECONDS);
    }
  });

  it('starts the first words at 0 and ignores case', () => {
    expect(phraseStart(STORM, 'mamas BERTERIAK')).toBe(0);
  });

  it('is undefined for a phrase that is not in the narration', () => {
    expect(phraseStart(STORM, 'pelangi')).toBeUndefined();
    expect(phraseStart(STORM, '  ')).toBeUndefined();
  });
});

describe('phraseFrame', () => {
  it('maps the phrase into the speech window of the scene', () => {
    expect(phraseFrame('satu lima', 'satu', 10, 100)).toBe(10);
    expect(phraseFrame('satu lima', 'lima', 10, 100)).toBe(60);
  });
});

describe('timeActions and activeActions', () => {
  const actions: CharacterAction[] = [
    { character: 'mamas', action: 'shouting' },
    { character: 'mamas', action: 'hiding-under-blanket', at: 'menyelam' },
    { character: 'mochi', action: 'approaching', at: 'selimut' },
    { character: 'mochi', action: 'falling', at: 'pelangi' },
  ];
  const timed = timeActions(actions, STORM, 0, 800);
  const hideFrame = timed[1].startFrame;

  it('starts actions without a cue (or with an unknown cue) with the scene', () => {
    expect(timed[0].startFrame).toBe(0);
    expect(timed[3].startFrame).toBe(0);
  });

  it('switches a character to its next action at the cue', () => {
    const mamasAt = (frame: number) => activeActions(timed, frame).find((a) => a.character === 'mamas')?.action;
    expect(mamasAt(hideFrame - 1)).toBe('shouting');
    expect(mamasAt(hideFrame)).toBe('hiding-under-blanket');
  });

  it('remembers what a character did earlier in the scene', () => {
    const later = timeActions(
      [
        { character: 'mochi', action: 'approaching', at: 'selimut' },
        { character: 'mochi', action: 'startled', at: 'kaget' },
      ],
      STORM,
      0,
      800,
    );
    const startled = later[1].startFrame;
    expect(didEarlier(later, 'mochi', 'approaching', startled)).toBe(true);
    expect(didEarlier(later, 'mochi', 'approaching', startled - 1)).toBe(false);
  });

  it('knows when a scene has timed actions', () => {
    expect(hasTimedActions(actions)).toBe(true);
    expect(hasTimedActions([{ character: 'mamas', action: 'shouting' }])).toBe(false);
    expect(hasTimedActions(undefined)).toBe(false);
  });
});
