// Numbers from the connected Facebook Page, for monetization progress and the agents' reports.
import { GRAPH, facebookConnection, graphFetch, type FacebookMetrics } from '@kantor/shared';

const INSIGHTS_DAYS = 60;
const MS_PER_MINUTE = 60_000;
/** The Graph API returns at most this many videos per page of results; enough for a young Page. */
const VIDEO_PAGE_SIZE = 100;

interface PageVideo {
  id: string;
  title?: string;
  description?: string;
  created_time: string;
  length?: number;
  views?: number;
  published?: boolean;
}

function connection() {
  const conn = facebookConnection();
  if (!conn) throw new Error('Page Facebook belum dihubungkan (Pengaturan → Facebook)');
  return conn;
}

const query = (token: string, params: Record<string, string>) => new URLSearchParams({ ...params, access_token: token });

/** Published videos and Reels of the Page (Reels are listed among the videos too). */
export async function pageVideos(): Promise<PageVideo[]> {
  const conn = connection();
  const { data } = await graphFetch<{ data: PageVideo[] }>(
    `${GRAPH}/${conn.pageId}/videos?${query(conn.pageToken, { fields: 'id,title,description,created_time,length,views,published', limit: String(VIDEO_PAGE_SIZE) })}`,
  );
  return data.filter((v) => v.published !== false);
}

/** Minutes viewed on the Page in the last 60 days; null when the token lacks read_insights. */
async function minutesViewed(pageId: string, token: string): Promise<number | null> {
  const since = Math.floor((Date.now() - INSIGHTS_DAYS * 86_400_000) / 1000);
  try {
    const { data } = await graphFetch<{ data: { values: { value: number }[] }[] }>(
      `${GRAPH}/${pageId}/insights?${query(token, { metric: 'page_video_view_time', period: 'day', since: String(since) })}`,
    );
    const values = data[0]?.values ?? [];
    return values.length ? values.reduce((sum, v) => sum + Number(v.value), 0) / MS_PER_MINUTE : null;
  } catch {
    // missing read_insights permission: reported as unknown instead of failing the whole snapshot
    return null;
  }
}

export async function facebookMetrics(): Promise<FacebookMetrics> {
  const conn = connection();
  const page = await graphFetch<{ followers_count?: number }>(`${GRAPH}/${conn.pageId}?${query(conn.pageToken, { fields: 'followers_count' })}`);
  const videos = await pageVideos();
  return {
    followers: Number(page.followers_count ?? 0),
    videoViews: videos.reduce((sum, v) => sum + Number(v.views ?? 0), 0),
    activeVideos: videos.length,
    minutesViewed60: await minutesViewed(conn.pageId, conn.pageToken),
  };
}

/** Summary for the research and report agents: Page numbers plus each published video's views. */
export async function facebookPageReport() {
  const conn = connection();
  const [metrics, videos] = await Promise.all([facebookMetrics(), pageVideos()]);
  return {
    page: conn.pageName,
    ...metrics,
    note:
      metrics.minutesViewed60 === null
        ? 'Menit tonton tidak tersedia: token Page belum punya izin read_insights.'
        : 'Menit tonton dari Facebook Insights (60 hari).',
    videos: videos.map((v) => ({
      title: v.title || v.description?.split('\n')[0]?.slice(0, 80),
      published: v.created_time.slice(0, 10),
      lengthSeconds: Math.round(v.length ?? 0),
      kind: (v.length ?? 0) <= 90 ? 'reel' : 'video',
      views: v.views ?? 0,
    })),
  };
}
