import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, paths, type Episode } from '@kantor/shared';
import { youtubeWrite } from './client.ts';

export interface OpsiUpload {
  /** ISO datetime. Kosong = disimpan private (tidak tayang) */
  jadwalTayang?: string;
}

/** Jadikan video private (jadwal tayang ikut batal). Video tidak dihapus. */
export async function privatkanVideo(videoId: string) {
  await youtubeWrite().videos.update({
    part: ['status'],
    requestBody: {
      id: videoId,
      // status ditimpa seluruhnya → setelan Made for Kids & embed ikut dikirim lagi
      status: { privacyStatus: 'private', selfDeclaredMadeForKids: true, embeddable: true },
    },
  });
}

export async function uploadEpisode(ep: Episode, opsi: OpsiUpload) {
  if (!ep.render?.video || !ep.metadata) throw new Error('Episode belum dirender / belum punya metadata');
  const yt = youtubeWrite();
  const file = path.join(paths.renders(), ep.render.video);
  // Shorts dikenali otomatis dari video vertikal < 3 menit; tagar #Shorts membantu penemuan
  const short = ep.ide.format === 'short';
  const deskripsi =
    short && !/#shorts/i.test(`${ep.metadata.judul} ${ep.metadata.deskripsi}`) ? `${ep.metadata.deskripsi}\n\n#Shorts` : ep.metadata.deskripsi;

  const res = await yt.videos.insert({
    part: ['snippet', 'status'],
    notifySubscribers: true,
    requestBody: {
      snippet: {
        title: ep.metadata.judul.slice(0, 100),
        description: deskripsi,
        tags: ep.metadata.tags,
        categoryId: '27', // Education
        defaultLanguage: 'id',
        defaultAudioLanguage: 'id',
      },
      status: {
        privacyStatus: 'private', // jadwal tayang wajib private + publishAt
        publishAt: opsi.jadwalTayang,
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
  const peringatan: string[] = [];

  if (ep.render.thumbnail) {
    try {
      await yt.thumbnails.set({
        videoId,
        media: { mimeType: 'image/png', body: fs.createReadStream(path.join(paths.renders(), ep.render.thumbnail)) },
      });
    } catch (e) {
      peringatan.push(
        `Thumbnail gagal diupload (channel perlu verifikasi nomor HP di YouTube untuk thumbnail kustom): ${(e as Error).message}`,
      );
    }
  }

  const playlistId = loadConfig().seri.find((s) => s.id === ep.ide.seri)?.playlistId;
  if (playlistId) {
    try {
      await yt.playlistItems.insert({
        part: ['snippet'],
        requestBody: { snippet: { playlistId, resourceId: { kind: 'youtube#video', videoId } } },
      });
    } catch (e) {
      peringatan.push(`Gagal menambah ke playlist: ${(e as Error).message}`);
    }
  }

  return { videoId, url: `https://www.youtube.com/watch?v=${videoId}`, peringatan };
}
