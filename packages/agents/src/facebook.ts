// Post a finished episode to the connected Facebook Page: standard videos as Page videos, Shorts as Reels.
// Scheduled at the same time as on YouTube, so both go live together.
import fs from 'node:fs';
import path from 'node:path';
import { GRAPH, GRAPH_VERSION, facebookConnection, graphFetch, normalizeMetadata, paths, type Episode } from '@kantor/shared';

/** Meta only schedules at least 10 minutes ahead; closer than this the post goes live right away. */
const MIN_SCHEDULE_MS = 15 * 60_000;

export interface FacebookPost {
  videoId: string;
  url: string;
  kind: 'video' | 'reel';
  publishTime?: string;
  pageId: string;
}

/** Caption for Facebook: the YouTube description without YouTube-only hashtags. */
function caption(ep: Episode): { title: string; description: string } {
  const meta = normalizeMetadata(ep.metadata!, ep.idea.format);
  const description = meta.description
    .replace(/#Shorts\b/gi, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/^[ \t]+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { title: meta.title, description };
}

export async function postToFacebook(ep: Episode, publishTime?: string): Promise<FacebookPost> {
  const conn = facebookConnection();
  if (!conn) throw new Error('Page Facebook belum dihubungkan (Pengaturan → Facebook)');
  if (!ep.render?.video || !ep.metadata) throw new Error('Episode belum dirender / belum punya metadata');
  const file = path.join(paths.renders(), ep.render.video);
  const when = publishTime && new Date(publishTime).getTime() > Date.now() + MIN_SCHEDULE_MS ? publishTime : undefined;
  const unix = when ? String(Math.floor(new Date(when).getTime() / 1000)) : undefined;
  const { title, description } = caption(ep);

  if (ep.idea.format === 'short') {
    // Reels: start an upload session, send the bytes to rupload, then finish (publish or schedule)
    const start = await graphFetch<{ video_id: string; upload_url: string }>(`${GRAPH}/${conn.pageId}/video_reels`, {
      method: 'POST',
      body: new URLSearchParams({ upload_phase: 'start', access_token: conn.pageToken }),
    });
    const size = fs.statSync(file).size;
    await graphFetch(start.upload_url || `https://rupload.facebook.com/video-upload/${GRAPH_VERSION}/${start.video_id}`, {
      method: 'POST',
      headers: { Authorization: `OAuth ${conn.pageToken}`, offset: '0', file_size: String(size) },
      body: await fs.openAsBlob(file),
    });
    await graphFetch(`${GRAPH}/${conn.pageId}/video_reels`, {
      method: 'POST',
      body: new URLSearchParams({
        upload_phase: 'finish',
        video_id: start.video_id,
        video_state: unix ? 'SCHEDULED' : 'PUBLISHED',
        ...(unix ? { scheduled_publish_time: unix } : {}),
        title,
        description,
        access_token: conn.pageToken,
      }),
    });
    return { videoId: start.video_id, url: `https://www.facebook.com/reel/${start.video_id}`, kind: 'reel', publishTime: when, pageId: conn.pageId };
  }

  // Page video (16:9) with the episode thumbnail
  const form = new FormData();
  form.set('access_token', conn.pageToken);
  form.set('title', title);
  form.set('description', description);
  if (unix) {
    form.set('published', 'false');
    form.set('scheduled_publish_time', unix);
  }
  form.set('source', await fs.openAsBlob(file, { type: 'video/mp4' }), path.basename(file));
  if (ep.render.thumbnail) {
    const thumb = path.join(paths.renders(), ep.render.thumbnail);
    if (fs.existsSync(thumb)) form.set('thumb', await fs.openAsBlob(thumb, { type: 'image/png' }), path.basename(thumb));
  }
  const res = await graphFetch<{ id: string }>(`https://graph-video.facebook.com/${GRAPH_VERSION}/${conn.pageId}/videos`, { method: 'POST', body: form });
  return { videoId: res.id, url: `https://www.facebook.com/${conn.pageId}/videos/${res.id}`, kind: 'video', publishTime: when, pageId: conn.pageId };
}

/** Delete a Facebook video/Reel (used for a scheduled post of an older version that has not gone live yet). */
export async function deleteFacebookVideo(videoId: string) {
  const conn = facebookConnection();
  if (!conn) throw new Error('Page Facebook belum dihubungkan');
  await graphFetch(`${GRAPH}/${videoId}?${new URLSearchParams({ access_token: conn.pageToken })}`, { method: 'DELETE' });
}
