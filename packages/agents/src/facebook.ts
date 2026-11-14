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

  // Page video (16:9) with the episode thumbnail, sent in chunks: a long video is too big for one request
  const endpoint = `https://graph-video.facebook.com/${GRAPH_VERSION}/${conn.pageId}/videos`;
  const post = (form: FormData) => {
    form.set('access_token', conn.pageToken);
    return graphFetch<UploadResponse>(endpoint, { method: 'POST', body: form });
  };
  const finish = new FormData();
  finish.set('title', title);
  finish.set('description', description);
  if (unix) {
    finish.set('published', 'false');
    finish.set('scheduled_publish_time', unix);
  }
  if (ep.render.thumbnail) {
    const thumb = path.join(paths.renders(), ep.render.thumbnail);
    if (fs.existsSync(thumb)) finish.set('thumb', await fs.openAsBlob(thumb, { type: 'image/png' }), path.basename(thumb));
  }
  const videoId = await resumableUpload(post, await fs.openAsBlob(file, { type: 'video/mp4' }), finish);
  return { videoId, url: `https://www.facebook.com/${conn.pageId}/videos/${videoId}`, kind: 'video', publishTime: when, pageId: conn.pageId };
}

/** What the Page videos endpoint answers during a resumable upload. */
export interface UploadResponse {
  upload_session_id?: string;
  video_id?: string;
  start_offset?: string;
  end_offset?: string;
  success?: boolean;
}

/** Safety cap so a misbehaving answer can never loop forever (a 2 GB video in 4 MB chunks needs ~500). */
const MAX_UPLOAD_CHUNKS = 2000;

/**
 * Resumable upload to the Page videos endpoint: start a session for the file size, send the bytes Facebook
 * asks for chunk by chunk (it answers with the next offsets), then finish with the post's fields. `post`
 * sends one form (with the token) and returns Facebook's answer.
 */
export async function resumableUpload(post: (form: FormData) => Promise<UploadResponse>, video: Blob, finishFields: FormData): Promise<string> {
  const startForm = new FormData();
  startForm.set('upload_phase', 'start');
  startForm.set('file_size', String(video.size));
  const started = await post(startForm);
  const session = started.upload_session_id;
  const videoId = started.video_id;
  if (!session || !videoId) throw new Error('Facebook tidak memulai sesi upload');
  let start = Number(started.start_offset ?? 0);
  let end = Number(started.end_offset ?? video.size);
  for (let chunk = 0; start < end; chunk++) {
    if (chunk >= MAX_UPLOAD_CHUNKS) throw new Error('Upload ke Facebook tidak selesai (terlalu banyak potongan)');
    const transfer = new FormData();
    transfer.set('upload_phase', 'transfer');
    transfer.set('upload_session_id', session);
    transfer.set('start_offset', String(start));
    transfer.set('video_file_chunk', video.slice(start, end), 'chunk');
    const next = await post(transfer);
    const nextStart = Number(next.start_offset);
    const nextEnd = Number(next.end_offset);
    if (!Number.isFinite(nextStart) || !Number.isFinite(nextEnd) || nextStart <= start) throw new Error('Facebook tidak melanjutkan upload');
    start = nextStart;
    end = nextEnd;
  }
  finishFields.set('upload_phase', 'finish');
  finishFields.set('upload_session_id', session);
  const finished = await post(finishFields);
  if (finished.success === false) throw new Error('Facebook menolak menyelesaikan upload');
  return videoId;
}

/** Delete a Facebook video/Reel (used for a scheduled post of an older version that has not gone live yet). */
export async function deleteFacebookVideo(videoId: string) {
  const conn = facebookConnection();
  if (!conn) throw new Error('Page Facebook belum dihubungkan');
  await graphFetch(`${GRAPH}/${videoId}?${new URLSearchParams({ access_token: conn.pageToken })}`, { method: 'DELETE' });
}
