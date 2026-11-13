// Fungsi baca data YouTube (riset & analytics). Semua gratis, hanya memakai kuota harian.
import { PACE_WINDOW_DAYS, type YouTubeMetrics } from '@kantor/shared';
import { analytics, youtubeRead } from './client.ts';

function durasiDetik(iso?: string | null) {
  const m = iso?.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

export async function cariVideo(kataKunci: string, hariTerakhir = 60, maks = 15) {
  const yt = youtubeRead();
  const publishedAfter = new Date(Date.now() - hariTerakhir * 86400_000).toISOString();
  const search = await yt.search.list({
    part: ['snippet'],
    q: kataKunci,
    type: ['video'],
    regionCode: 'ID',
    relevanceLanguage: 'id',
    order: 'viewCount',
    publishedAfter,
    maxResults: Math.min(maks, 25),
  });
  const ids = (search.data.items ?? []).map((i) => i.id?.videoId).filter(Boolean) as string[];
  if (ids.length === 0) return [];
  const detail = await yt.videos.list({ part: ['snippet', 'statistics', 'contentDetails', 'status'], id: ids });
  return (detail.data.items ?? []).map((v) => {
    const views = Number(v.statistics?.viewCount ?? 0);
    const terbit = v.snippet?.publishedAt ?? '';
    const umurHari = Math.max(1, (Date.now() - new Date(terbit).getTime()) / 86400_000);
    return {
      judul: v.snippet?.title,
      channel: v.snippet?.channelTitle,
      url: `https://www.youtube.com/watch?v=${v.id}`,
      terbit: terbit.slice(0, 10),
      durasiMenit: Math.round(durasiDetik(v.contentDetails?.duration) / 6) / 10,
      views,
      viewsPerHari: Math.round(views / umurHari),
      likes: Number(v.statistics?.likeCount ?? 0),
      madeForKids: v.status?.madeForKids ?? null,
    };
  });
}

const tgl = (hariLalu: number) => new Date(Date.now() - hariLalu * 86400_000).toISOString().slice(0, 10);

export async function statistikChannel() {
  const ya = analytics();
  if (!ya) {
    return { terhubung: false, message: 'Channel belum terhubung (npm run auth:youtube). Lanjutkan tanpa data channel.' };
  }
  const yt = youtubeRead();
  const channel = await yt.channels.list({ part: ['statistics', 'snippet'], mine: true });
  const ch = channel.data.items?.[0];

  const perVideo = await ya.reports.query({
    ids: 'channel==MINE',
    startDate: tgl(28),
    endDate: tgl(0),
    metrics: 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained',
    dimensions: 'video',
    sort: '-views',
    maxResults: 25,
  });
  const rows = perVideo.data.rows ?? [];
  const videoIds = rows.map((r) => String(r[0]));
  const judul = new Map<string, string>();
  if (videoIds.length) {
    const v = await yt.videos.list({ part: ['snippet'], id: videoIds });
    for (const it of v.data.items ?? []) judul.set(it.id!, it.snippet?.title ?? '');
  }

  const setahun = await ya.reports.query({
    ids: 'channel==MINE',
    startDate: tgl(365),
    endDate: tgl(0),
    metrics: 'estimatedMinutesWatched,views',
  });
  const [menitSetahun = 0, viewsSetahun = 0] = (setahun.data.rows?.[0] ?? []) as number[];

  return {
    terhubung: true,
    channel: ch?.snippet?.title,
    subscriber: Number(ch?.statistics?.subscriberCount ?? 0),
    totalVideo: Number(ch?.statistics?.videoCount ?? 0),
    jamTonton365Hari: Math.round(Number(menitSetahun) / 60),
    views365Hari: Number(viewsSetahun),
    catatan:
      'Jam tonton di sini perkiraan dari YouTube Analytics (termasuk semua format). Cek syarat YPP terbaru di YouTube Studio karena syaratnya bisa berubah.',
    top28Hari: rows.map((r) => ({
      videoId: r[0],
      judul: judul.get(String(r[0])),
      views: r[1],
      menitDitonton: r[2],
      rataDurasiDetik: r[3],
      rataPersenDitonton: r[4],
      subscriberBaru: r[5],
    })),
  };
}

const SHORTS_CONTENT_TYPE = /short/i;

interface ViewsByType {
  shortsViews: number;
  longFormHours: number;
  split: boolean;
}

/** Views of Shorts and watch hours of long videos in the last `days` days (falls back to totals). */
async function viewsByContentType(days: number): Promise<ViewsByType> {
  const ya = analytics()!;
  const range = { ids: 'channel==MINE', startDate: tgl(days), endDate: tgl(0), metrics: 'views,estimatedMinutesWatched' };
  try {
    const res = await ya.reports.query({ ...range, dimensions: 'creatorContentType' });
    const rows = (res.data.rows ?? []) as [string, number, number][];
    const shorts = rows.filter(([type]) => SHORTS_CONTENT_TYPE.test(type));
    const longForm = rows.filter(([type]) => !SHORTS_CONTENT_TYPE.test(type));
    return {
      shortsViews: shorts.reduce((sum, [, views]) => sum + Number(views), 0),
      longFormHours: longForm.reduce((sum, [, , minutes]) => sum + Number(minutes), 0) / 60,
      split: true,
    };
  } catch {
    // older accounts or API changes: no content-type split, so use the channel totals
    const res = await ya.reports.query(range);
    const [views = 0, minutes = 0] = (res.data.rows?.[0] ?? []) as number[];
    return { shortsViews: Number(views), longFormHours: Number(minutes) / 60, split: false };
  }
}

/** Numbers needed for the YouTube Partner Program progress. */
export async function youtubeMetrics(): Promise<YouTubeMetrics> {
  const ya = analytics();
  if (!ya) throw new Error('Channel YouTube belum terhubung (npm run auth:youtube)');
  const channel = await youtubeRead().channels.list({ part: ['statistics'], mine: true });
  const [year, quarter, month] = await Promise.all([viewsByContentType(365), viewsByContentType(90), viewsByContentType(PACE_WINDOW_DAYS)]);
  const subs = await ya.reports.query({
    ids: 'channel==MINE',
    startDate: tgl(PACE_WINDOW_DAYS),
    endDate: tgl(0),
    metrics: 'subscribersGained,subscribersLost',
  });
  const [gained = 0, lost = 0] = (subs.data.rows?.[0] ?? []) as number[];
  return {
    subscribers: Number(channel.data.items?.[0]?.statistics?.subscriberCount ?? 0),
    watchHours365: Math.round(year.longFormHours * 10) / 10,
    shortsViews90: quarter.shortsViews,
    recent: { subscribersNet: Number(gained) - Number(lost), watchHours: Math.round(month.longFormHours * 10) / 10, shortsViews: month.shortsViews },
    splitByContentType: year.split,
  };
}
