import 'server-only';
import { FASE, listEpisodes, sedangSibuk, STATUS_LABEL, type Episode, type EpisodeStatus } from '@kantor/shared';
import { PEGAWAI, type Aktivitas, type DataKantor, type PegawaiId, type StatusPegawai } from '@/components/kantor/pegawai';

const MENUNGGU: EpisodeStatus[] = ['needs_script_approval', 'needs_audio', 'needs_video_approval', 'error'];

const judulEp = (e: Episode) => e.naskah?.judul ?? e.ide.judul;
const pendek = (s: string, n = 34) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Ubah status episode + penanda proses menjadi "apa yang sedang dikerjakan tiap pegawai". */
export function statusKantor(): DataKantor {
  const eps = listEpisodes();
  const dengan = (s: EpisodeStatus) => eps.filter((e) => e.status === s);

  const kerja: Partial<Record<PegawaiId, { pesan: string; episodeId?: string }>> = {};
  const set = (id: PegawaiId, pesan: string, episodeId?: string) => {
    if (!kerja[id]) kerja[id] = { pesan, episodeId };
  };

  if (sedangSibuk('riset')) set('riset', 'Mencari tren & ide episode');
  for (const e of dengan('writing')) set('penulis', `Menulis "${pendek(judulEp(e), 26)}"`, e.id);
  for (const e of dengan('reviewing')) set('reviewer', `Memeriksa "${pendek(judulEp(e), 24)}"`, e.id);
  for (const e of dengan('directing')) {
    set('sutradara', `Menyusun adegan "${pendek(judulEp(e), 20)}"`, e.id);
    set('channel', 'Menyiapkan judul & deskripsi', e.id);
  }
  for (const e of dengan('rendering')) set('sutradara', `Merender "${pendek(judulEp(e), 26)}"`, e.id);
  for (const e of dengan('uploading')) set('channel', 'Upload ke YouTube', e.id);
  if (sedangSibuk('laporan')) set('channel', 'Menyusun laporan performa');

  const menungguKamu = eps
    .filter((e) => MENUNGGU.includes(e.status))
    .map((e) => ({ id: e.id, judul: judulEp(e), label: STATUS_LABEL[e.status] }));

  // riwayat aktivitas per pegawai dari log semua episode
  const semuaLog = eps
    .flatMap((e) => e.log.map((l) => ({ ...l, episodeId: e.id, judul: judulEp(e) })))
    .sort((a, b) => b.waktu.localeCompare(a.waktu));

  const adaYangKerja = Object.keys(kerja).length > 0;

  const pegawai: StatusPegawai[] = PEGAWAI.map((p) => {
    const aktivitas: Aktivitas[] = semuaLog
      .filter((l) => p.logOleh.includes(l.oleh))
      .slice(0, 6)
      .map((l) => ({ waktu: l.waktu, pesan: l.pesan, episodeId: l.episodeId, judul: l.judul }));

    if (p.id === 'manajer') {
      if (menungguKamu.length) {
        return {
          id: p.id,
          keadaan: 'tunggu',
          pesan: `${menungguKamu.length} pekerjaan menunggu persetujuanmu`,
          episodeId: menungguKamu[0].id,
          aktivitas,
        };
      }
      return {
        id: p.id,
        keadaan: adaYangKerja ? 'kerja' : 'santai',
        pesan: adaYangKerja ? 'Menyampaikan arahan ke tim' : 'Semua pekerjaan beres',
        aktivitas,
      };
    }

    const k = kerja[p.id];
    if (k) return { id: p.id, keadaan: 'kerja', pesan: k.pesan, episodeId: k.episodeId, aktivitas };
    return {
      id: p.id,
      keadaan: 'santai',
      pesan: aktivitas[0] ? `Istirahat · terakhir: ${pendek(aktivitas[0].pesan, 22)}` : 'Menunggu tugas',
      aktivitas,
    };
  });

  return {
    pegawai,
    fase: FASE.map((f) => ({ judul: f.judul, jumlah: eps.filter((e) => f.status.includes(e.status)).length })),
    menungguKamu,
    diperbarui: new Date().toISOString(),
  };
}
