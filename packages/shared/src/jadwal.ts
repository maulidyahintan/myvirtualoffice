// Rencana jadwal tayang: Channel Manager menentukan berapa video per hari, hari, dan jam tayang
// per format. Dari rencana itu dihitung slot kosong berikutnya untuk tiap video yang siap tayang.
import type { Episode, KantorConfig, RencanaTayang } from './types.ts';

export const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const;

/** Video yang dijadwalkan kurang dari ini dari sekarang ditolak (YouTube butuh waktu memproses). */
export const JEDA_MINIMAL_MENIT = 15;
/** Slot rekomendasi minimal sejauh ini dari sekarang, supaya sempat diupload. */
const JEDA_SLOT_MENIT = 45;
/** Dua video dianggap di slot yang sama kalau jarak tayangnya kurang dari ini. */
const JARAK_SLOT_MENIT = 60;
const HARI_DICARI = 90;

/** Rencana bawaan sebelum Channel Manager menyusun rencana: 1 video/hari di jam tayang bawaan. */
export function rencanaTayang(cfg: KantorConfig): RencanaTayang {
  return (
    cfg.rencanaTayang ?? {
      videoPerHari: 1,
      hari: [0, 1, 2, 3, 4, 5, 6],
      slot: [{ jam: cfg.jamTayangDefault, format: 'semua' }],
      oleh: 'pemilik',
      diubah: '',
    }
  );
}

/** "2026-11-01T16:30" (jam lokal di zona tertentu) → ISO UTC */
export function lokalKeIso(lokal: string, zona: string): string {
  const kiraUtc = new Date(`${lokal}:00Z`);
  const offsetTeks =
    new Intl.DateTimeFormat('en-US', { timeZone: zona, timeZoneName: 'longOffset' })
      .formatToParts(kiraUtc)
      .find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  const m = offsetTeks.match(/GMT([+-])(\d{2}):(\d{2})/);
  const menit = m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
  return new Date(kiraUtc.getTime() - menit * 60_000).toISOString();
}

/** ISO UTC → "2026-11-01T16:30" di zona tertentu (format input datetime-local). */
export function isoKeLokal(iso: string, zona: string): string {
  const b = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: zona,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return `${b.year}-${b.month}-${b.day}T${b.hour}:${b.minute}`;
}

/** Tanggal "YYYY-MM-DD" ditambah n hari, beserta hari dalam seminggu (0 = Minggu). */
export function tambahHari(tanggal: string, n: number): { tanggal: string; hari: number } {
  const [y, m, d] = tanggal.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return { tanggal: t.toISOString().slice(0, 10), hari: t.getUTCDay() };
}

/** Jadwal tayang episode (ISO) yang sudah pasti: terjadwal di YouTube atau sedang diupload dengan jadwal. */
export function jadwalEpisode(ep: Episode): string | undefined {
  if (ep.status === 'scheduled' || ep.status === 'published') return ep.youtube?.jadwalTayang;
  if (ep.status === 'uploading') return ep.jadwalDipilih;
  return undefined;
}

export interface SlotRekomendasi {
  /** "YYYY-MM-DDTHH:mm" lokal, siap dipakai sebagai nilai input datetime-local */
  lokal: string;
  iso: string;
}

/**
 * Rekomendasi jadwal untuk video yang menunggu persetujuan, mengikuti rencana Channel Manager.
 * Antrean diisi berurutan (yang paling lama siap lebih dulu) ke slot kosong berikutnya:
 * hari tayang yang dipilih, belum penuh (videoPerHari), slot cocok formatnya, dan belum terisi.
 */
export function rekomendasiJadwal(episodes: Episode[], cfg: KantorConfig, sekarang = new Date()): Map<string, SlotRekomendasi> {
  const rencana = rencanaTayang(cfg);
  const zona = cfg.zonaWaktu;
  const terisi = episodes.flatMap((e) => {
    const iso = jadwalEpisode(e);
    return iso && new Date(iso) > sekarang ? [{ iso, lokal: isoKeLokal(iso, zona) }] : [];
  });
  const antrean = episodes
    .filter((e) => e.status === 'needs_video_approval')
    .sort((a, b) => (a.render?.waktu ?? a.diubah).localeCompare(b.render?.waktu ?? b.diubah));

  const hasil = new Map<string, SlotRekomendasi>();
  const hariIni = isoKeLokal(sekarang.toISOString(), zona).slice(0, 10);
  const batas = sekarang.getTime() + JEDA_SLOT_MENIT * 60_000;
  const slot = [...rencana.slot].sort((a, b) => a.jam.localeCompare(b.jam));

  for (const ep of antrean) {
    const format = ep.ide.format ?? 'biasa';
    cari: for (let n = 0; n < HARI_DICARI; n++) {
      const { tanggal, hari } = tambahHari(hariIni, n);
      if (!rencana.hari.includes(hari)) continue;
      if (terisi.filter((t) => t.lokal.startsWith(tanggal)).length >= rencana.videoPerHari) continue;
      for (const s of slot) {
        if (s.format !== 'semua' && s.format !== format) continue;
        const lokal = `${tanggal}T${s.jam}`;
        const iso = lokalKeIso(lokal, zona);
        const waktu = new Date(iso).getTime();
        if (waktu < batas) continue;
        if (terisi.some((t) => Math.abs(new Date(t.iso).getTime() - waktu) < JARAK_SLOT_MENIT * 60_000)) continue;
        hasil.set(ep.id, { lokal, iso });
        terisi.push({ iso, lokal });
        break cari;
      }
    }
  }
  return hasil;
}
