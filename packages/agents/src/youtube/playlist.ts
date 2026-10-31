// Playlist YouTube per tipe video: cari playlist channel berdasarkan nama, buat kalau belum ada,
// lalu masukkan video (tanpa dobel). ID playlist disimpan di kantor.config.json (youtubePlaylists).
import { loadConfig, playlistName, saveConfig, type Episode } from '@kantor/shared';
import { youtubeWrite } from './client.ts';

const DESKRIPSI: Record<string, string> = {
  Hafalan: 'Hafalan surat-surat pendek Al-Qur\'an untuk anak, ayat demi ayat dan diulang supaya mudah diingat.',
  'Asbabun Nuzul': 'Kisah sebab turunnya ayat Al-Qur\'an, diceritakan dengan bahasa sederhana untuk anak.',
  'Obrolan Islami Anak': 'Obrolan hangat Mamas dan Ibu tentang adab, doa harian, dan akhlak islami untuk anak.',
};

/** Playlist ID for this name: from cache, from channel playlist list, or create new. */
export async function playlistId(name: string): Promise<{ id: string; isNew: boolean }> {
  const cfg = loadConfig();
  const cached = cfg.youtubePlaylists?.[name];
  if (cached) return { id: cached, isNew: false };

  const yt = youtubeWrite();
  let id: string | undefined;
  let pageToken: string | undefined;
  do {
    const r = await yt.playlists.list({ part: ['snippet'], mine: true, maxResults: 50, pageToken });
    id = r.data.items?.find((p) => p.snippet?.title?.trim().toLowerCase() === name.toLowerCase())?.id ?? undefined;
    pageToken = r.data.nextPageToken ?? undefined;
  } while (!id && pageToken);

  let isNew = false;
  if (!id) {
    const r = await yt.playlists.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: { title: name, description: DESKRIPSI[name] ?? `Kumpulan video ${name} untuk anak.`, defaultLanguage: 'id' },
        status: { privacyStatus: 'public' },
      },
    });
    id = r.data.id!;
    isNew = true;
  }
  const latest = loadConfig();
  saveConfig({ ...latest, youtubePlaylists: { ...latest.youtubePlaylists, [name]: id } });
  return { id, isNew };
}

/**
 * Add episode video to playlist according to its type. If video already in playlist, won't add again.
 * Returns playlist name & ID, plus message for log.
 */
export async function addToPlaylist(ep: Episode, videoId: string): Promise<{ name: string; id: string; message: string }> {
  const cfg = loadConfig();
  const yt = youtubeWrite();
  // Manually filled playlist ID per series is prioritized
  const manual = cfg.series.find((s) => s.id === ep.idea.series)?.playlistId?.trim();
  const name = playlistName(ep, cfg);
  const { id, isNew } = manual ? { id: manual, isNew: false } : await playlistId(name);

  return retryOnNotFound(async () => {
    const existing = await yt.playlistItems.list({ part: ['id'], playlistId: id, videoId, maxResults: 1 });
    if (existing.data.items?.length) return { name, id, message: `Sudah ada di playlist "${name}"` };

    await yt.playlistItems.insert({
      part: ['snippet'],
      requestBody: { snippet: { playlistId: id, resourceId: { kind: 'youtube#video', videoId } } },
    });
    return { name, id, message: `Dimasukkan ke playlist "${name}"${isNew ? ' (playlist baru dibuat)' : ''}` };
  });
}

/**
 * Newly created playlist needs a few seconds before it can be used ("playlist cannot be found"),
 * so that error is retried with increasing delays (±2, 4, 6, 8, 10 seconds).
 */
async function retryOnNotFound<T>(work: () => Promise<T>): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await work();
    } catch (e) {
      const notFound = /playlistNotFound|playlist identified .* cannot be found/i.test(String((e as Error).message));
      if (!notFound || i > 5) throw e;
      await new Promise((r) => setTimeout(r, i * 2000));
    }
  }
}

/** Keluarkan video dari playlist (misal video lama yang dijadikan private setelah diedit ulang). */
export async function removeFromPlaylist(playlistId: string, videoId: string) {
  const yt = youtubeWrite();
  const r = await yt.playlistItems.list({ part: ['id'], playlistId, videoId, maxResults: 5 });
  for (const item of r.data.items ?? []) if (item.id) await yt.playlistItems.delete({ id: item.id });
}
