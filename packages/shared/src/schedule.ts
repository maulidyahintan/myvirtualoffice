// Publish schedule plan: Channel Manager determines how many videos per day, days, and publish times
// per format. From that plan, next available slots are calculated for each ready-to-publish video.
import type { Episode, AppConfig, Format, PublishPlan } from './types.ts';

export const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const;

/** Videos scheduled less than this from now are rejected (YouTube needs processing time). */
export const MIN_SCHEDULE_GAP_MINUTES = 15;
/** Recommended slots at least this far from now, to have time for upload. */
const SLOT_GAP_MINUTES = 45;
/** Two videos considered in same slot if their publish times are closer than this. */
const SLOT_DISTANCE_MINUTES = 60;
const SEARCH_DAYS = 90;

/** Default plan before Channel Manager creates plan: 1 video/day at default publish time. */
export function publishPlan(cfg: AppConfig): PublishPlan {
  return (
    cfg.publishPlan ?? {
      videosPerDay: 1,
      days: [0, 1, 2, 3, 4, 5, 6],
      slots: [{ time: cfg.defaultPublishTime, format: 'all' }],
      by: 'owner',
      modified: '',
    }
  );
}

/** "2026-11-01T16:30" (local time in specific zone) → ISO UTC */
export function localToIso(local: string, zone: string): string {
  const approxUtc = new Date(`${local}:00Z`);
  const offsetText =
    new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longOffset' })
      .formatToParts(approxUtc)
      .find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  const m = offsetText.match(/GMT([+-])(\d{2}):(\d{2})/);
  const minutes = m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
  return new Date(approxUtc.getTime() - minutes * 60_000).toISOString();
}

/** ISO UTC → "2026-11-01T16:30" in specific zone (datetime-local input format). */
export function isoToLocal(iso: string, zone: string): string {
  const b = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return `${b.year}-${b.month}-${b.day}T${b.hour}:${b.minute}`;
}

/** Date "YYYY-MM-DD" plus n days, with day of week (0 = Sunday). */
export function addDays(date: string, n: number): { date: string; day: number } {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return { date: t.toISOString().slice(0, 10), day: t.getUTCDay() };
}

/** Episode publish time (ISO) that is confirmed: scheduled on YouTube or currently uploading with schedule. */
export function episodeSchedule(ep: Episode): string | undefined {
  if (ep.status === 'scheduled' || ep.status === 'published') return ep.youtube?.publishTime;
  if (ep.status === 'uploading') return ep.selectedSchedule;
  return undefined;
}

export interface RecommendedSlot {
  /** "YYYY-MM-DDTHH:mm" local, ready to use as datetime-local input value */
  local: string;
  iso: string;
}

/** Upcoming publish times that are already taken (scheduled on YouTube or uploading with a schedule). */
function takenSlots(episodes: Episode[], zone: string, now: Date): { iso: string; local: string }[] {
  return episodes.flatMap((e) => {
    const iso = episodeSchedule(e);
    return iso && new Date(iso) > now ? [{ iso, local: isoToLocal(iso, zone) }] : [];
  });
}

/** Earliest free slot in the plan for a format, given the slots already taken. */
function firstFreeSlot(format: Format, taken: { iso: string; local: string }[], cfg: AppConfig, now: Date): RecommendedSlot | undefined {
  const plan = publishPlan(cfg);
  const zone = cfg.timeZone;
  const today = isoToLocal(now.toISOString(), zone).slice(0, 10);
  const threshold = now.getTime() + SLOT_GAP_MINUTES * 60_000;
  const slots = [...plan.slots].sort((a, b) => a.time.localeCompare(b.time));
  for (let n = 0; n < SEARCH_DAYS; n++) {
    const { date, day } = addDays(today, n);
    if (!plan.days.includes(day)) continue;
    if (taken.filter((t) => t.local.startsWith(date)).length >= plan.videosPerDay) continue;
    for (const s of slots) {
      if (s.format !== 'all' && s.format !== format) continue;
      const local = `${date}T${s.time}`;
      const iso = localToIso(local, zone);
      const time = new Date(iso).getTime();
      if (time < threshold) continue;
      if (taken.some((t) => Math.abs(new Date(t.iso).getTime() - time) < SLOT_DISTANCE_MINUTES * 60_000)) continue;
      return { local, iso };
    }
  }
  return undefined;
}

/**
 * Default publish time when approving this episode: the EARLIEST empty slot for its format, counting only
 * videos that are actually scheduled — not the tentative recommendations of other unapproved videos — so
 * today's/tomorrow's empty slots get filled first.
 */
export function nextFreeSlot(ep: Episode, episodes: Episode[], cfg: AppConfig, now = new Date()): RecommendedSlot | undefined {
  return firstFreeSlot(ep.idea.format ?? 'standard', takenSlots(episodes, cfg.timeZone, now), cfg, now);
}

/**
 * Preview of the approval queue for the calendar: videos awaiting approval (oldest ready first, drafts
 * excluded) are placed one after another into the free slots. Recomputed on every load, so it shifts by
 * itself as videos get scheduled.
 */
export function recommendSchedule(episodes: Episode[], cfg: AppConfig, now = new Date()): Map<string, RecommendedSlot> {
  const taken = takenSlots(episodes, cfg.timeZone, now);
  const queue = episodes
    .filter((e) => e.status === 'needs_video_approval' && !e.draftedAt)
    .sort((a, b) => (a.render?.time ?? a.modified).localeCompare(b.render?.time ?? b.modified));
  const result = new Map<string, RecommendedSlot>();
  for (const ep of queue) {
    const slot = firstFreeSlot(ep.idea.format ?? 'standard', taken, cfg, now);
    if (!slot) continue;
    result.set(ep.id, slot);
    taken.push(slot);
  }
  return result;
}
