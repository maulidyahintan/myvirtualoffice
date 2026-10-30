import fs from 'node:fs';
import path from 'node:path';
import { paths, rapikanMetadata, type Episode } from '@kantor/shared';
import { youtubeWrite } from './client.ts';
import { masukkanKePlaylist } from './playlist.ts';

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
  // Shorts dikenali otomatis dari video vertikal < 3 menit; tagar #Shorts membantu penemuan.
  // Video biasa dibersihkan dari #Shorts (misal metadata tersalin dari versi Shorts-nya).
  const meta = rapikanMetadata(ep.metadata, ep.ide.format);

  const res = await yt.videos.insert({
    part: ['snippet', 'status'],
    notifySubscribers: true,
    requestBody: {
      snippet: {
        title: meta.judul,
        description: meta.deskripsi,
        tags: meta.tags,
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

  let playlist: { nama: string; id: string } | undefined;
  try {
    const hasil = await masukkanKePlaylist(ep, videoId);
    playlist = { nama: hasil.nama, id: hasil.id };
    peringatan.push(hasil.pesan);
  } catch (e) {
    peringatan.push(`Gagal memasukkan ke playlist: ${(e as Error).message}`);
  }

  return { videoId, url: `https://www.youtube.com/watch?v=${videoId}`, peringatan, playlist };
}
