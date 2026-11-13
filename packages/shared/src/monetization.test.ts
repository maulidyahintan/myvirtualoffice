import { describe, expect, it } from 'vitest';
import {
  FACEBOOK_MONETIZATION,
  combineForecasts,
  dailyGrowth,
  earliestForecast,
  facebookPaths,
  forecast,
  meetsGoal,
  monetizationOverview,
  pathForecast,
  platformForecast,
  platformProgress,
  requiredDailyRate,
  youtubePaths,
  type MetricsSnapshot,
  type YouTubeMetrics,
} from './monetization.ts';

const TODAY = new Date('2026-11-13T00:00:00Z');

const youtube = (overrides: Partial<YouTubeMetrics> = {}): YouTubeMetrics => ({
  subscribers: 100,
  watchHours365: 400,
  shortsViews90: 50_000,
  recent: { subscribersNet: 28, watchHours: 280, shortsViews: 28_000 },
  splitByContentType: true,
  ...overrides,
});

const snapshot = (date: string, followers: number, activeVideos = 1): MetricsSnapshot => ({
  date,
  takenAt: `${date}T01:00:00Z`,
  facebook: { followers, videoViews: 0, activeVideos, minutesViewed60: null },
});

describe('forecast', () => {
  it('reports a target already reached', () => {
    expect(forecast(1_200, 1_000, 0, TODAY)).toEqual({ status: 'reached' });
  });

  it('counts the days at the current pace and gives the date', () => {
    expect(forecast(100, 1_000, 10, TODAY)).toEqual({ status: 'on-pace', days: 90, date: '2027-02-11' });
  });

  it('rounds partial days up', () => {
    expect(forecast(0, 10, 3, TODAY)).toMatchObject({ days: 4 });
  });

  it('says stalled when nothing grows', () => {
    expect(forecast(100, 1_000, 0, TODAY)).toEqual({ status: 'stalled' });
    expect(forecast(100, 1_000, -2, TODAY)).toEqual({ status: 'stalled' });
  });

  it('says unknown without a value or a pace', () => {
    expect(forecast(null, 1_000, 5, TODAY)).toEqual({ status: 'unknown' });
    expect(forecast(100, 1_000, null, TODAY)).toEqual({ status: 'unknown' });
  });
});

describe('requiredDailyRate', () => {
  it('spreads what is missing over the days left', () => {
    expect(requiredDailyRate(100, 1_000, '2027-02-11', TODAY)).toBeCloseTo(10);
  });

  it('needs nothing once reached', () => {
    expect(requiredDailyRate(1_000, 1_000, '2027-02-11', TODAY)).toBe(0);
  });

  it('cannot plan for a deadline in the past', () => {
    expect(requiredDailyRate(100, 1_000, '2026-01-01', TODAY)).toBeNull();
  });
});

describe('combineForecasts and earliestForecast', () => {
  const soon = { status: 'on-pace', days: 10, date: '2026-11-23' } as const;
  const late = { status: 'on-pace', days: 50, date: '2027-01-02' } as const;

  it('waits for the slowest requirement of a path', () => {
    expect(combineForecasts([soon, late, { status: 'reached' }])).toEqual(late);
  });

  it('cannot finish a path with a stalled requirement', () => {
    expect(combineForecasts([soon, { status: 'stalled' }])).toEqual({ status: 'stalled' });
  });

  it('picks the earliest of the alternative paths', () => {
    expect(earliestForecast([late, soon])).toEqual(soon);
    expect(earliestForecast([{ status: 'stalled' }, late])).toEqual(late);
    expect(earliestForecast([late, { status: 'reached' }])).toEqual({ status: 'reached' });
  });
});

describe('dailyGrowth', () => {
  it('measures growth per day across the snapshots', () => {
    const history = [snapshot('2026-11-01', 10), snapshot('2026-11-06', 20), snapshot('2026-11-11', 40)];
    expect(dailyGrowth(history, (s) => s.facebook?.followers)).toBeCloseTo(3);
  });

  it('only looks at the recent window', () => {
    const history = [snapshot('2026-01-01', 0), snapshot('2026-11-01', 100), snapshot('2026-11-11', 120)];
    expect(dailyGrowth(history, (s) => s.facebook?.followers, 28)).toBeCloseTo(2);
  });

  it('needs two snapshots at least a day apart', () => {
    expect(dailyGrowth([snapshot('2026-11-11', 40)], (s) => s.facebook?.followers)).toBeNull();
    expect(dailyGrowth([], (s) => s.facebook?.followers)).toBeNull();
  });
});

describe('youtubePaths', () => {
  it('offers the watch-hours and the Shorts path, both needing subscribers', () => {
    const paths = youtubePaths(youtube());
    expect(paths.map((p) => p.requirements.map((r) => r.key))).toEqual([
      ['subscribers', 'watchHours365'],
      ['subscribers', 'shortsViews90'],
    ]);
  });

  it('uses the last 28 days as the pace', () => {
    const [longVideos] = youtubePaths(youtube());
    expect(longVideos.requirements.map((r) => r.dailyRate)).toEqual([1, 10]);
  });

  it('forecasts the earliest path at the current pace', () => {
    // subscribers: 900 left at 1/day = 900 days; watch hours: 3,600 left at 10/day = 360 days
    expect(platformForecast(youtubePaths(youtube()), TODAY)).toMatchObject({ status: 'on-pace', days: 900 });
  });

  it('is reached when subscribers and watch hours are both met', () => {
    const paths = youtubePaths(youtube({ subscribers: 1_000, watchHours365: 4_000 }));
    expect(platformForecast(paths, TODAY)).toEqual({ status: 'reached' });
  });
});

describe('facebookPaths', () => {
  it('cannot forecast minutes viewed without the insights permission', () => {
    const metrics = { followers: 10, videoViews: 0, activeVideos: 6, minutesViewed60: null };
    const [path] = facebookPaths(metrics, [snapshot('2026-11-01', 0), snapshot('2026-11-11', 10)]);
    expect(path.requirements.find((r) => r.key === 'minutesViewed60')?.current).toBeNull();
    expect(pathForecast(path, TODAY)).toEqual({ status: 'unknown' });
  });

  it('forecasts from follower growth when all data is there', () => {
    const metrics = { followers: 4_000, videoViews: 0, activeVideos: 6, minutesViewed60: FACEBOOK_MONETIZATION.minutesViewed60 };
    const history = [snapshot('2026-11-03', 3_900, 6), snapshot('2026-11-13', 4_000, 6)];
    expect(pathForecast(facebookPaths(metrics, history)[0], TODAY)).toMatchObject({ status: 'on-pace', days: 100 });
  });
});

describe('meetsGoal', () => {
  it('is on track when the forecast date is not after the goal', () => {
    expect(meetsGoal({ status: 'on-pace', days: 10, date: '2027-01-01' }, '2027-01-01')).toBe(true);
    expect(meetsGoal({ status: 'on-pace', days: 10, date: '2027-01-02' }, '2027-01-01')).toBe(false);
  });

  it('handles reached, stalled, unknown and missing goals', () => {
    expect(meetsGoal({ status: 'reached' }, '2027-01-01')).toBe(true);
    expect(meetsGoal({ status: 'stalled' }, '2027-01-01')).toBe(false);
    expect(meetsGoal({ status: 'unknown' }, '2027-01-01')).toBeNull();
    expect(meetsGoal({ status: 'reached' }, undefined)).toBeNull();
  });
});

describe('platformProgress', () => {
  it('adds the pace each requirement needs to meet the goal', () => {
    const progress = platformProgress(youtubePaths(youtube()), '2027-02-11', TODAY);
    const subscribers = progress.paths[0].requirements[0];
    expect(subscribers.neededPerDay).toBeCloseTo(10);
    expect(subscribers.forecast).toMatchObject({ status: 'on-pace', days: 900 });
    expect(progress.onTrack).toBe(false);
  });

  it('has no needed pace without a goal', () => {
    const progress = platformProgress(youtubePaths(youtube()), undefined, TODAY);
    expect(progress.paths[0].requirements[0].neededPerDay).toBeNull();
    expect(progress.onTrack).toBeNull();
  });
});

describe('monetizationOverview', () => {
  it('is empty before the first snapshot', () => {
    expect(monetizationOverview([], undefined, TODAY)).toEqual({ snapshot: undefined, youtube: undefined, facebook: undefined });
  });

  it('covers every platform the latest snapshot has, with its goal', () => {
    const latest: MetricsSnapshot = { ...snapshot('2026-11-13', 10), youtube: youtube() };
    const overview = monetizationOverview([snapshot('2026-11-03', 0), latest], { youtube: '2027-06-01' }, TODAY);
    expect(overview.snapshot).toBe(latest);
    expect(overview.youtube?.goal).toBe('2027-06-01');
    expect(overview.facebook?.paths[0].requirements[0].dailyRate).toBeCloseTo(1);
  });
});
