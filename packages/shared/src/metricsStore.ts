// Daily channel metrics snapshots in data/metrics/<date>.json, kept so growth can be measured over time.
import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, paths, writeJsonAtomic } from './store.ts';
import type { MetricsSnapshot } from './monetization.ts';

const SNAPSHOT_FILE = /^\d{4}-\d{2}-\d{2}\.json$/;

/** Save today's snapshot (replaces an earlier one of the same day). */
export function saveMetricsSnapshot(snapshot: MetricsSnapshot): void {
  ensureDir(paths.metrics());
  writeJsonAtomic(path.join(paths.metrics(), `${snapshot.date}.json`), snapshot);
}

/** All snapshots, oldest first. Unreadable files are skipped. */
export function metricsHistory(): MetricsSnapshot[] {
  if (!fs.existsSync(paths.metrics())) return [];
  return fs
    .readdirSync(paths.metrics())
    .filter((f) => SNAPSHOT_FILE.test(f))
    .sort()
    .flatMap((f) => {
      try {
        return [JSON.parse(fs.readFileSync(path.join(paths.metrics(), f), 'utf8')) as MetricsSnapshot];
      } catch {
        // a half-written or hand-edited file must not break the dashboard
        return [];
      }
    });
}

export function latestMetrics(): MetricsSnapshot | undefined {
  return metricsHistory().at(-1);
}
