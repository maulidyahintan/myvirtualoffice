// Progress towards monetization on YouTube and Facebook, and when it can be reached at the current pace.
// Pure functions over metrics snapshots (collected daily by the office), so they can be unit-tested.

const MS_PER_DAY = 86_400_000;
/** Recent window used to measure the growth pace. */
export const PACE_WINDOW_DAYS = 28;

/** YouTube Partner Program, ad revenue: 1,000 subscribers plus 4,000 long-form watch hours or 10M Shorts views. */
export const YOUTUBE_PARTNER_PROGRAM = { subscribers: 1_000, watchHours365: 4_000, shortsViews90: 10_000_000 } as const;
/**
 * Facebook Content Monetization: thresholds differ per country and change often, so these are the commonly
 * reported ones (followers, minutes viewed in 60 days, active videos). The Professional Dashboard has the real ones.
 */
export const FACEBOOK_MONETIZATION = { followers: 5_000, minutesViewed60: 60_000, activeVideos: 5 } as const;

export interface YouTubeMetrics {
  subscribers: number;
  /** Public long-form (non-Shorts) watch hours in the last 365 days. */
  watchHours365: number;
  /** Shorts views in the last 90 days. */
  shortsViews90: number;
  /** Growth in the last 28 days. */
  recent: { subscribersNet: number; watchHours: number; shortsViews: number };
  /** false = YouTube could not split Shorts from long videos, so watch hours include Shorts. */
  splitByContentType: boolean;
}

export interface FacebookMetrics {
  followers: number;
  /** Views of all published Page videos and Reels. */
  videoViews: number;
  /** Published Page videos and Reels. */
  activeVideos: number;
  /** Minutes viewed in the last 60 days; null when the token lacks the read_insights permission. */
  minutesViewed60: number | null;
}

export interface MetricsSnapshot {
  /** Local date (YYYY-MM-DD) the snapshot belongs to; one snapshot per day. */
  date: string;
  takenAt: string;
  youtube?: YouTubeMetrics;
  youtubeError?: string;
  facebook?: FacebookMetrics;
  facebookError?: string;
}

export interface Requirement {
  key: string;
  label: string;
  current: number | null;
  target: number;
  unit: string;
  /** Growth per day at the current pace; null = unknown. */
  dailyRate: number | null;
}

export type Forecast =
  | { status: 'reached' }
  | { status: 'on-pace'; days: number; date: string }
  | { status: 'stalled' }
  | { status: 'unknown' };

const addDays = (from: Date, days: number) => new Date(from.getTime() + days * MS_PER_DAY).toISOString().slice(0, 10);

/** When `current` reaches `target` growing `dailyRate` per day. */
export function forecast(current: number | null, target: number, dailyRate: number | null, today: Date): Forecast {
  if (current === null) return { status: 'unknown' };
  if (current >= target) return { status: 'reached' };
  if (dailyRate === null) return { status: 'unknown' };
  if (dailyRate <= 0) return { status: 'stalled' };
  const days = Math.ceil((target - current) / dailyRate);
  return { status: 'on-pace', days, date: addDays(today, days) };
}

/** Growth per day needed to reach `target` by `deadline` (YYYY-MM-DD); null when the deadline has passed. */
export function requiredDailyRate(current: number, target: number, deadline: string, today: Date): number | null {
  if (current >= target) return 0;
  const days = (new Date(`${deadline}T00:00:00Z`).getTime() - today.getTime()) / MS_PER_DAY;
  return days > 0 ? (target - current) / days : null;
}

/** A path is reached when all its requirements are; otherwise it is as late as its slowest requirement. */
export function combineForecasts(forecasts: Forecast[]): Forecast {
  if (forecasts.every((f) => f.status === 'reached')) return { status: 'reached' };
  if (forecasts.some((f) => f.status === 'unknown')) return { status: 'unknown' };
  if (forecasts.some((f) => f.status === 'stalled')) return { status: 'stalled' };
  const pending = forecasts.filter((f): f is Extract<Forecast, { status: 'on-pace' }> => f.status === 'on-pace');
  return pending.reduce((latest, f) => (f.days > latest.days ? f : latest));
}

const RANK: Record<Forecast['status'], number> = { reached: 0, 'on-pace': 1, stalled: 2, unknown: 3 };

/** The earliest of several alternative paths (e.g. watch hours or Shorts views). */
export function earliestForecast(forecasts: Forecast[]): Forecast {
  return forecasts.reduce((best, f) => {
    if (RANK[f.status] !== RANK[best.status]) return RANK[f.status] < RANK[best.status] ? f : best;
    return f.status === 'on-pace' && best.status === 'on-pace' && f.days < best.days ? f : best;
  });
}

/**
 * Growth per day of a value across the snapshots of the last `windowDays` days (oldest to newest).
 * Null when there are not yet two snapshots at least a day apart.
 */
export function dailyGrowth(history: MetricsSnapshot[], pick: (s: MetricsSnapshot) => number | undefined, windowDays = PACE_WINDOW_DAYS): number | null {
  const points = history
    .map((s) => ({ time: new Date(`${s.date}T00:00:00Z`).getTime(), value: pick(s) }))
    .filter((p): p is { time: number; value: number } => typeof p.value === 'number')
    .sort((a, b) => a.time - b.time);
  const latest = points.at(-1);
  if (!latest) return null;
  const oldest = points.find((p) => latest.time - p.time <= windowDays * MS_PER_DAY);
  const days = oldest ? (latest.time - oldest.time) / MS_PER_DAY : 0;
  return oldest && days >= 1 ? (latest.value - oldest.value) / days : null;
}

export interface MonetizationPath {
  label: string;
  requirements: Requirement[];
}

/** YouTube's two ways in: subscribers + watch hours, or subscribers + Shorts views. */
export function youtubePaths(m: YouTubeMetrics): MonetizationPath[] {
  const subscribers: Requirement = {
    key: 'subscribers',
    label: 'Subscriber',
    current: m.subscribers,
    target: YOUTUBE_PARTNER_PROGRAM.subscribers,
    unit: 'subscriber',
    dailyRate: m.recent.subscribersNet / PACE_WINDOW_DAYS,
  };
  return [
    {
      label: 'Jalur video panjang',
      requirements: [
        subscribers,
        {
          key: 'watchHours365',
          label: 'Jam tonton publik (365 hari)',
          current: m.watchHours365,
          target: YOUTUBE_PARTNER_PROGRAM.watchHours365,
          unit: 'jam',
          dailyRate: m.recent.watchHours / PACE_WINDOW_DAYS,
        },
      ],
    },
    {
      label: 'Jalur Shorts',
      requirements: [
        subscribers,
        {
          key: 'shortsViews90',
          label: 'Views Shorts (90 hari)',
          current: m.shortsViews90,
          target: YOUTUBE_PARTNER_PROGRAM.shortsViews90,
          unit: 'views',
          dailyRate: m.recent.shortsViews / PACE_WINDOW_DAYS,
        },
      ],
    },
  ];
}

/** Facebook: followers, minutes viewed and active videos; paces come from the daily snapshots. */
export function facebookPaths(m: FacebookMetrics, history: MetricsSnapshot[]): MonetizationPath[] {
  return [
    {
      label: 'Monetisasi Konten',
      requirements: [
        {
          key: 'followers',
          label: 'Pengikut Page',
          current: m.followers,
          target: FACEBOOK_MONETIZATION.followers,
          unit: 'pengikut',
          dailyRate: dailyGrowth(history, (s) => s.facebook?.followers),
        },
        {
          key: 'minutesViewed60',
          label: 'Menit ditonton (60 hari)',
          current: m.minutesViewed60,
          target: FACEBOOK_MONETIZATION.minutesViewed60,
          unit: 'menit',
          dailyRate: m.minutesViewed60 === null ? null : m.minutesViewed60 / 60,
        },
        {
          key: 'activeVideos',
          label: 'Video aktif',
          current: m.activeVideos,
          target: FACEBOOK_MONETIZATION.activeVideos,
          unit: 'video',
          dailyRate: dailyGrowth(history, (s) => s.facebook?.activeVideos),
        },
      ],
    },
  ];
}

export function pathForecast(path: MonetizationPath, today: Date): Forecast {
  return combineForecasts(path.requirements.map((r) => forecast(r.current, r.target, r.dailyRate, today)));
}

/** When the platform can be monetized: the earliest of its paths. */
export function platformForecast(paths: MonetizationPath[], today: Date): Forecast {
  return earliestForecast(paths.map((p) => pathForecast(p, today)));
}

export interface RequirementProgress extends Requirement {
  forecast: Forecast;
  /** Growth per day needed to meet the owner's target date; null without a goal or after it. */
  neededPerDay: number | null;
}

export interface PlatformProgress {
  paths: { label: string; requirements: RequirementProgress[]; forecast: Forecast }[];
  forecast: Forecast;
  /** The owner's target date (YYYY-MM-DD), if set. */
  goal?: string;
  /** Whether the current pace reaches the goal in time; null = no goal or not enough data. */
  onTrack: boolean | null;
}

/** Whether a forecast meets a target date. */
export function meetsGoal(f: Forecast, goal: string | undefined): boolean | null {
  if (!goal) return null;
  if (f.status === 'reached') return true;
  if (f.status === 'stalled') return false;
  if (f.status === 'unknown') return null;
  return f.date <= goal;
}

/** Progress of one platform: every requirement with its forecast and the pace the goal needs. */
export function platformProgress(paths: MonetizationPath[], goal: string | undefined, today: Date): PlatformProgress {
  const detailed = paths.map((p) => ({
    label: p.label,
    forecast: pathForecast(p, today),
    requirements: p.requirements.map((r) => ({
      ...r,
      forecast: forecast(r.current, r.target, r.dailyRate, today),
      neededPerDay: goal && r.current !== null ? requiredDailyRate(r.current, r.target, goal, today) : null,
    })),
  }));
  const overall = earliestForecast(detailed.map((p) => p.forecast));
  return { paths: detailed, forecast: overall, goal, onTrack: meetsGoal(overall, goal) };
}

export interface MonetizationOverview {
  snapshot?: MetricsSnapshot;
  youtube?: PlatformProgress;
  facebook?: PlatformProgress;
}

/** Progress of both platforms from the snapshot history (oldest first) and the owner's goals. */
export function monetizationOverview(history: MetricsSnapshot[], goals: { youtube?: string; facebook?: string } | undefined, today: Date): MonetizationOverview {
  const snapshot = history.at(-1);
  return {
    snapshot,
    youtube: snapshot?.youtube ? platformProgress(youtubePaths(snapshot.youtube), goals?.youtube, today) : undefined,
    facebook: snapshot?.facebook ? platformProgress(facebookPaths(snapshot.facebook, history), goals?.facebook, today) : undefined,
  };
}
