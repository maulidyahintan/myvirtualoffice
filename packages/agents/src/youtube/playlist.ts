// Playlist YouTube per tipe video: cari playlist channel berdasarkan nama, buat kalau belum ada,
// lalu masukkan video (tanpa dobel). ID playlist disimpan di kantor.config.json (playlistYoutube).
import { loadConfig, namaPlaylist, saveConfig, type Episode } from '@kantor/shared';
import { youtubeWrite } from './client.ts';

const DESKRIPSI: Record<string, string> = {
  Hafalan: 'Hafalan surat-surat pendek Al-Qur\'an untuk anak, ayat demi ayat dan diulang supaya mudah diingat.',
  'Asbabun Nuzul': 'Kisah sebab turunnya ayat Al-Qur\'an, diceritakan dengan bahasa sederhana untuk anak.',
  'Obrolan Islami Anak': 'Obrolan hangat Mamas dan Ibu tentang adab, doa harian, dan akhlak islami untuk anak.',
};

/** ID playlist untuk nama ini: dari cache, dari daftar playlist channel, atau dibuat baru. */
export async function idPlaylist(nama: string): Promise<{ id: string; baru: boolean }> {
  const cfg = loadConfig();
  const tersimpan = cfg.playlistYoutube?.[nama];
  if (tersimpan) return { id: tersimpan, baru: false };

  const yt = youtubeWrite();
  let id: string | undefined;
  let halaman: string | undefined;
  do {
    const r = await yt.playlists.list({ part: ['snippet'], mine: true, maxResults: 50, pageToken: halaman });
    id = r.data.items?.find((p) => p.snippet?.title?.trim().toLowerCase() === nama.toLowerCase())?.id ?? undefined;
    halaman = r.data.nextPageToken ?? undefined;
  } while (!id && halaman);

  let baru = false;
  if (!id) {
    const r = await yt.playlists.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: { title: nama, description: DESKRIPSI[nama] ?? `Kumpulan video ${nama} untuk anak.`, defaultLanguage: 'id' },
        status: { privacyStatus: 'public' },
      },
    });
    id = r.data.id!;
    baru = true;
  }
  const terbaru = loadConfig();
  saveConfig({ ...terbaru, playlistYoutube: { ...terbaru.playlistYoutube, [nama]: id } });
  return { id, baru };
}

/**
 * Masukkan video episode ke playlist sesuai tipenya. Kalau video sudah ada di playlist, tidak
 * dimasukkan lagi. Mengembalikan nama & ID playlist, plus pesan untuk log.
 */
export async function masukkanKePlaylist(ep: Episode, videoId: string): Promise<{ nama: string; id: string; pesan: string }> {
  const cfg = loadConfig();
  const yt = youtubeWrite();
  // ID playlist yang diisi manual per seri tetap didahulukan
  const manual = cfg.seri.find((s) => s.id === ep.ide.seri)?.playlistId?.trim();
  const nama = namaPlaylist(ep, cfg);
  const { id, baru } = manual ? { id: manual, baru: false } : await idPlaylist(nama);

  const ada = await yt.playlistItems.list({ part: ['id'], playlistId: id, videoId, maxResults: 1 });
  if (ada.data.items?.length) return { nama, id, pesan: `Sudah ada di playlist "${nama}"` };

  await yt.playlistItems.insert({
    part: ['snippet'],
    requestBody: { snippet: { playlistId: id, resourceId: { kind: 'youtube#video', videoId } } },
  });
  return { nama, id, pesan: `Dimasukkan ke playlist "${nama}"${baru ? ' (playlist baru dibuat)' : ''}` };
}

/** Keluarkan video dari playlist (misal video lama yang dijadikan private setelah diedit ulang). */
export async function keluarkanDariPlaylist(playlistId: string, videoId: string) {
  const yt = youtubeWrite();
  const r = await yt.playlistItems.list({ part: ['id'], playlistId, videoId, maxResults: 5 });
  for (const item of r.data.items ?? []) if (item.id) await yt.playlistItems.delete({ id: item.id });
}
