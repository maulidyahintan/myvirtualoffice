import fs from 'node:fs';
import path from 'node:path';
import { paths, normalizeMetadata, type Episode } from '@kantor/shared';
import { youtubeWrite } from './client.ts';
import { addToPlaylist } from './playlist.ts';

export interface UploadOptions {
  /** ISO datetime. Empty = stored private (not published) */
  publishTime?: string;
}

/** Jadikan video private (jadwal tayang ikut batal). Video tidak dihapus. */
export async function makePrivate(videoId: string) {
  await youtubeWrite().videos.update({
    part: ['status'],
    requestBody: {
      id: videoId,
      // status ditimpa seluruhnya → setelan Made for Kids & embed ikut dikirim lagi
      status: { privacyStatus: 'private', selfDeclaredMadeForKids: true, embeddable: true },
    },
  });
}

export async function uploadEpisode(ep: Episode, opsi: UploadOptions) {
  if (!ep.render?.video || !ep.metadata) throw new Error('Episode belum dirender / belum punya metadata');
  const yt = youtubeWrite();
  const file = path.join(paths.renders(), ep.render.video);
  // Shorts dikenali otomatis dari video vertikal < 3 menit; tagar #Shorts membantu penemuan.
  // Video biasa dibersihkan dari #Shorts (misal metadata tersalin dari versi Shorts-nya).
  const meta = normalizeMetadata(ep.metadata, ep.idea.format);

  const res = await yt.videos.insert({
    part: ['snippet', 'status'],
    notifySubscribers: true,
    requestBody: {
      snippet: {
        title: meta.title,
        description: meta.description,
        tags: meta.tags,
        categoryId: '27', // Education
        defaultLanguage: 'id',
        defaultAudioLanguage: 'id',
      },
      status: {
        privacyStatus: 'private', // jadwal tayang wajib private + publishAt
        publishAt: opsi.publishTime,
        selfDeclaredMadeForKids: true, // konten untuk anak (COPPA)
        // Animasi kartun bukan "konten sintetis realistis", jadi tidak wajib label AI.
        // Ubah ke true kalau suatu saat memakai visual/suara AI yang realistis.
        containsSyntheticMedia: false,
        embeddable: true,
      },
    },
    media: { body: fs.createReadStream(file) },
  });

  const videoId = res.data.id!;
  const warnings: string[] = [];

  if (ep.render.thumbnail) {
    try {
      await yt.thumbnails.set({
        videoId,
        media: { mimeType: 'image/png', body: fs.createReadStream(path.join(paths.renders(), ep.render.thumbnail)) },
      });
    } catch (e) {
      warnings.push(
        `Thumbnail gagal diupload (channel perlu verifikasi nomor HP di YouTube untuk thumbnail kustom): ${(e as Error).message}`,
      );
    }
  }

  let playlist: { name: string; id: string } | undefined;
  try {
    const result = await addToPlaylist(ep, videoId);
    playlist = { name: result.name, id: result.id };
    warnings.push(result.message);
  } catch (e) {
    warnings.push(`Gagal memasukkan ke playlist: ${(e as Error).message}`);
  }

  return { videoId, url: `https://www.youtube.com/watch?v=${videoId}`, warnings, playlist };
}
