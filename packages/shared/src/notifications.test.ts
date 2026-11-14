import { describe, expect, it } from 'vitest';
import { markedRead, unreadCount, withNotification, type AppNotification } from './notifications.ts';

const note = (id: string, minute: number, extra: Partial<AppNotification> = {}): AppNotification => ({
  id,
  time: `2026-11-14T10:${String(minute).padStart(2, '0')}:00.000Z`,
  kind: 'error',
  title: 'Gagal mengirim ke Facebook',
  message: 'HTTP 413',
  read: false,
  ...extra,
});

describe('withNotification', () => {
  it('puts the newest first', () => {
    const list = withNotification([note('a', 0, { message: 'lain' })], note('b', 30));
    expect(list.map((n) => n.id)).toEqual(['b', 'a']);
  });

  it('keeps one notification when the same failure repeats soon after', () => {
    const list = withNotification([note('a', 0)], note('b', 5));
    expect(list.map((n) => n.id)).toEqual(['b']);
  });

  it('keeps a repeat that comes much later or after the first was read', () => {
    expect(withNotification([note('a', 0)], note('b', 30))).toHaveLength(2);
    expect(withNotification([note('a', 0, { read: true })], note('b', 5))).toHaveLength(2);
  });

  it('keeps only the latest ones', () => {
    const list = withNotification([note('a', 0, { message: 'x' }), note('b', 1, { message: 'y' })], note('c', 2), 2);
    expect(list.map((n) => n.id)).toEqual(['c', 'a']);
  });
});

describe('markedRead and unreadCount', () => {
  const list = [note('a', 0), note('b', 1, { message: 'lain' })];

  it('marks one notification read', () => {
    const after = markedRead(list, 'a');
    expect(after.find((n) => n.id === 'a')?.read).toBe(true);
    expect(unreadCount(after)).toBe(1);
  });

  it('marks all read without an id', () => {
    expect(unreadCount(markedRead(list))).toBe(0);
  });
});
