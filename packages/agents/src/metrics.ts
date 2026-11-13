// Collect today's YouTube and Facebook numbers into a snapshot (data/metrics/<date>.json).
import { facebookConnection, isoToLocal, latestMetrics, loadConfig, saveMetricsSnapshot, type MetricsSnapshot } from '@kantor/shared';
import { facebookMetrics } from './facebookStats.ts';
import { youtubeMetrics } from './youtube/data.ts';

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Today's date in the channel's time zone (YYYY-MM-DD). */
export function localToday(now = new Date()): string {
  return isoToLocal(now.toISOString(), loadConfig().timeZone).slice(0, 10);
}

/** Take and save a snapshot; one platform failing does not stop the other. */
export async function collectMetrics(): Promise<MetricsSnapshot> {
  const snapshot: MetricsSnapshot = { date: localToday(), takenAt: new Date().toISOString() };
  const [youtube, facebook] = await Promise.allSettled([
    youtubeMetrics(),
    facebookConnection() ? facebookMetrics() : Promise.reject(new Error('Page Facebook belum dihubungkan')),
  ]);
  if (youtube.status === 'fulfilled') snapshot.youtube = youtube.value;
  else snapshot.youtubeError = message(youtube.reason);
  if (facebook.status === 'fulfilled') snapshot.facebook = facebook.value;
  else snapshot.facebookError = message(facebook.reason);
  saveMetricsSnapshot(snapshot);
  console.log(`✅ Metrik ${snapshot.date}: YouTube ${snapshot.youtubeError ?? 'ok'}, Facebook ${snapshot.facebookError ?? 'ok'}`);
  return snapshot;
}

/** Collect once a day (called by the daily scheduler every 30 minutes). */
export async function collectMetricsIfDue(): Promise<void> {
  if (latestMetrics()?.date === localToday()) return;
  try {
    await collectMetrics();
  } catch (e) {
    // the daily research must still run when the metrics fail
    console.error(`Metrik harian gagal: ${message(e)}`);
  }
}
