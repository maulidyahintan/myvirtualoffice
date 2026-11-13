import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kantor-scene-job-'));
process.env.KANTOR_ROOT = root;
const store = await import('./store.ts');

describe('scene job progress', () => {
  beforeAll(() => vi.useFakeTimers({ now: new Date('2026-11-14T10:00:00Z') }));
  afterAll(() => {
    vi.useRealTimers();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('shows the scene being fixed right after the button is clicked', () => {
    store.setSceneRevisionProgress('ep-1', 4);
    expect(store.sceneRevisionInProgress('ep-1')).toBe(4);
  });

  it('keeps the AI voice and the scene revision apart', () => {
    store.setSceneRevisionProgress('ep-2', 2);
    expect(store.aiVoiceInProgress('ep-2')).toBeUndefined();
  });

  it('clears the scene once the job is done', () => {
    store.setSceneRevisionProgress('ep-3', 1);
    store.setSceneRevisionProgress('ep-3', null);
    expect(store.sceneRevisionInProgress('ep-3')).toBeUndefined();
  });

  it('ignores a progress file left behind by a worker that is no longer running', () => {
    store.setSceneRevisionProgress('ep-4', 0);
    vi.advanceTimersByTime(61_000);
    expect(store.sceneRevisionInProgress('ep-4')).toBeUndefined();
  });
});

describe('job starting marker', () => {
  beforeAll(() => vi.useFakeTimers({ now: new Date('2026-11-14T10:00:00Z') }));
  afterAll(() => vi.useRealTimers());

  it('counts a job as running from the click, before its worker is up', () => {
    store.markStarting(store.shortsSplitMarker('ep-5'));
    expect(store.isBusy(store.shortsSplitMarker('ep-5'))).toBe(true);
  });

  it('expires when the worker never starts', () => {
    store.markStarting(store.shortsSplitMarker('ep-6'));
    vi.advanceTimersByTime(61_000);
    expect(store.isBusy(store.shortsSplitMarker('ep-6'))).toBe(false);
  });

  it('is taken over by the running worker', () => {
    store.markStarting(store.shortsSplitMarker('ep-7'));
    store.markBusy(store.shortsSplitMarker('ep-7'));
    vi.advanceTimersByTime(61_000);
    expect(store.isBusy(store.shortsSplitMarker('ep-7'))).toBe(true);
  });
});
