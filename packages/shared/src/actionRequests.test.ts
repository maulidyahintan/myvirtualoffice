import { describe, expect, it } from 'vitest';
import { actionSlug, mergeActionRequest, type ActionRequest } from './actionRequests.ts';

const NOW = '2026-11-14T10:00:00.000Z';

describe('actionSlug', () => {
  it('turns a requested name into a kebab-case action id', () => {
    expect(actionSlug('Tearing Book')).toBe('tearing-book');
    expect(actionSlug('  rolling_on_floor ')).toBe('rolling-on-floor');
  });

  it('refuses names that are not usable ids or already exist', () => {
    expect(actionSlug('')).toBeUndefined();
    expect(actionSlug('9lives')).toBeUndefined();
    expect(actionSlug('hugging')).toBeUndefined();
    expect(actionSlug('a-very-long-name-that-goes-on-and-on-forever')).toBeUndefined();
  });
});

describe('mergeActionRequest', () => {
  const incoming = { name: 'tearing-book', description: 'merobek buku', character: 'mamas' as const };

  it('starts a new request', () => {
    const request = mergeActionRequest(undefined, incoming, { episodeId: 'ep-1', scene: 3 }, NOW);
    expect(request).toMatchObject({ name: 'tearing-book', status: 'requested', characters: ['mamas'], scenes: [{ episodeId: 'ep-1', scene: 3 }] });
  });

  it('adds new scenes and characters without repeating them', () => {
    const first = mergeActionRequest(undefined, incoming, { episodeId: 'ep-1', scene: 3 }, NOW);
    const again = mergeActionRequest(first, incoming, { episodeId: 'ep-1', scene: 3 }, NOW);
    const friend = mergeActionRequest(again, { ...incoming, character: 'friend' }, { episodeId: 'ep-2', scene: 1 }, NOW);
    expect(again.scenes).toHaveLength(1);
    expect(friend.characters).toEqual(['mamas', 'friend']);
    expect(friend.scenes).toHaveLength(2);
  });

  it('asks again for a request that failed or was turned down, but keeps one being built', () => {
    const failed: ActionRequest = { ...mergeActionRequest(undefined, incoming, { episodeId: 'ep-1', scene: 3 }, NOW), status: 'failed' };
    expect(mergeActionRequest(failed, incoming, { episodeId: 'ep-3', scene: 2 }, NOW).status).toBe('requested');
    const building: ActionRequest = { ...failed, status: 'building' };
    expect(mergeActionRequest(building, incoming, { episodeId: 'ep-3', scene: 2 }, NOW).status).toBe('building');
  });
});
