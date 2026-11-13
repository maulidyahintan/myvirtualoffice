import { describe, expect, it } from 'vitest';
import { actionBeat, beatShots, moodBeat } from './beatShots';

const MIN = 36;
const FILL = 90;

describe('actionBeat and moodBeat', () => {
  it('treats walking, falling and leaping as moves that hold the wide shot', () => {
    expect(actionBeat('approaching', 10, 'mochi')).toMatchObject({ kind: 'move', holdFrames: 120 });
    expect(actionBeat('falling', 10, 'mochi').kind).toBe('move');
  });

  it('treats a fright as a reaction and other actions as acting', () => {
    expect(actionBeat('startled', 10, 'mamas').kind).toBe('react');
    expect(actionBeat('shouting', 10, 'mamas').kind).toBe('act');
    expect(moodBeat('surprised', 10, 'mother').kind).toBe('react');
    expect(moodBeat('calm', 10, 'mother').kind).toBe('act');
  });
});

describe('beatShots', () => {
  it('opens wide and cuts at every beat', () => {
    const shots = beatShots([actionBeat('startled', 100, 'mamas'), actionBeat('shouting', 200, 'mamas')], 300, MIN, FILL);
    expect(shots.map((s) => s.shot)).toEqual(['lebar', 'kejut', 'fokus']);
    expect(shots[1]).toMatchObject({ mulai: 100, durasi: 100, focus: 'mamas' });
  });

  it('covers the whole scene without gaps', () => {
    const shots = beatShots([actionBeat('startled', 100, 'mamas')], 400, MIN, FILL);
    shots.forEach((shot, i) => expect(shot.mulai).toBe(i === 0 ? 0 : shots[i - 1].mulai + shots[i - 1].durasi));
    const last = shots.at(-1)!;
    expect(last.mulai + last.durasi).toBe(400);
  });

  it('keeps a move in a wide shot until it is over', () => {
    const shots = beatShots([actionBeat('approaching', 100, 'mochi'), actionBeat('shouting', 150, 'mamas')], 400, MIN, FILL);
    expect(shots.map((s) => s.shot)).toEqual(['lebar', 'lebar']);
  });

  it('turns a shot wide when a move starts right after it', () => {
    const shots = beatShots([actionBeat('startled', 100, 'mamas'), actionBeat('falling', 110, 'mochi')], 300, MIN, FILL);
    expect(shots[1].shot).toBe('lebar');
  });

  it('breaks a long close shot with medium shots', () => {
    const shots = beatShots([actionBeat('shouting', 50, 'mamas')], 400, MIN, FILL);
    expect(shots.map((s) => s.shot)).toEqual(['lebar', 'fokus', 'sedang', 'sedang', 'sedang']);
  });
});
