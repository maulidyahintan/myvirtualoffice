import 'server-only';
import { PHASES, listEpisodes, isBusy, STATUS_LABEL, type Episode, type EpisodeStatus } from '@kantor/shared';
import { STAFF, type Activity, type OfficeData, type StaffId, type StaffStatus } from '@/components/office/staff';

const WAITING_STATUSES: EpisodeStatus[] = ['needs_script_approval', 'needs_audio', 'needs_video_approval', 'error'];

const episodeTitle = (e: Episode) => e.script?.title ?? e.idea.title;
const truncate = (s: string, n = 34) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Ubah status episode + penanda proses menjadi "apa yang sedang dikerjakan tiap pegawai". */
export function officeStatus(): OfficeData {
  const eps = listEpisodes();
  const dengan = (s: EpisodeStatus) => eps.filter((e) => e.status === s);

  const kerja: Partial<Record<StaffId, { message: string; episodeId?: string }>> = {};
  const set = (id: StaffId, message: string, episodeId?: string) => {
    if (!kerja[id]) kerja[id] = { message, episodeId };
  };

  if (isBusy('riset')) set('riset', 'Mencari tren & ide episode');
  for (const e of dengan('writing')) set('penulis', `Menulis "${truncate(episodeTitle(e), 26)}"`, e.id);
  for (const e of dengan('reviewing')) set('reviewer', `Memeriksa "${truncate(episodeTitle(e), 24)}"`, e.id);
  for (const e of dengan('directing')) {
    set('sutradara', `Menyusun adegan "${truncate(episodeTitle(e), 20)}"`, e.id);
    set('channel', 'Menyiapkan judul & deskripsi', e.id);
  }
  for (const e of dengan('rendering')) set('sutradara', `Merender "${truncate(episodeTitle(e), 26)}"`, e.id);
  for (const e of dengan('uploading')) set('channel', 'Upload ke YouTube', e.id);
  if (isBusy('laporan')) set('channel', 'Menyusun laporan performa');

  const menungguKamu = eps
    .filter((e) => WAITING_STATUSES.includes(e.status))
    .map((e) => ({ id: e.id, title: episodeTitle(e), label: STATUS_LABEL[e.status] }));

  // riwayat aktivitas per pegawai dari log semua episode
  const semuaLog = eps
    .flatMap((e) => e.log.map((l) => ({ ...l, episodeId: e.id, title: episodeTitle(e) })))
    .sort((a, b) => b.time.localeCompare(a.time));

  const adaYangKerja = Object.keys(kerja).length > 0;

  const pegawai: StaffStatus[] = STAFF.map((p) => {
    const aktivitas: Activity[] = semuaLog
      .filter((l) => p.logOleh.includes(l.by))
      .slice(0, 6)
      .map((l) => ({ time: l.time, message: l.message, episodeId: l.episodeId, title: l.title }));

    if (p.id === 'manajer') {
      if (menungguKamu.length) {
        return {
          id: p.id,
          keadaan: 'tunggu',
          message: `${menungguKamu.length} pekerjaan menunggu persetujuanmu`,
          episodeId: menungguKamu[0].id,
          aktivitas,
        };
      }
      return {
        id: p.id,
        keadaan: adaYangKerja ? 'kerja' : 'santai',
        message: adaYangKerja ? 'Menyampaikan arahan ke tim' : 'Semua pekerjaan beres',
        aktivitas,
      };
    }

    const k = kerja[p.id];
    if (k) return { id: p.id, keadaan: 'kerja', message: k.message, episodeId: k.episodeId, aktivitas };
    return {
      id: p.id,
      keadaan: 'santai',
      message: aktivitas[0] ? `Istirahat · terakhir: ${truncate(aktivitas[0].message, 22)}` : 'Menunggu tugas',
      aktivitas,
    };
  });

  return {
    pegawai,
    fase: PHASES.map((f) => ({ title: f.title, jumlah: eps.filter((e) => f.statuses.includes(e.status)).length })),
    menungguKamu,
    diperbarui: new Date().toISOString(),
  };
}
