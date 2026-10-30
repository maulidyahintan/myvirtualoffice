import Link from 'next/link';
import {
  FORMAT_LABEL,
  isoKeLokal,
  jadwalEpisode,
  listEpisodes,
  loadConfig,
  NAMA_HARI,
  rekomendasiJadwal,
  rencanaTayang,
  sedangSibuk,
  tambahHari,
  type Episode,
} from '@kantor/shared';
import { mintaRencanaTayang, simpanRencanaTayang } from '../actions';
import { AutoRefresh } from '@/components/AutoRefresh';
import { Badge } from '@/components/Badge';

export const dynamic = 'force-dynamic';

const HARI_KALENDER = 14;
const LABEL_SLOT = { semua: 'Semua format', biasa: 'Video biasa', short: 'Shorts' } as const;

interface Isi {
  ep: Episode;
  lokal: string;
  rekomendasi: boolean;
}

export default function HalamanJadwal() {
  const cfg = loadConfig();
  const rencana = rencanaTayang(cfg);
  const episodes = listEpisodes();
  const sibuk = sedangSibuk('rencana');
  const sekarang = new Date();
  const hariIni = isoKeLokal(sekarang.toISOString(), cfg.zonaWaktu).slice(0, 10);

  const saran = rekomendasiJadwal(episodes, cfg, sekarang);
  const isi: Isi[] = [
    ...episodes.flatMap((ep) => {
      const iso = jadwalEpisode(ep);
      return iso && new Date(iso) > sekarang ? [{ ep, lokal: isoKeLokal(iso, cfg.zonaWaktu), rekomendasi: false }] : [];
    }),
    ...episodes.flatMap((ep) => {
      const s = saran.get(ep.id);
      return s ? [{ ep, lokal: s.lokal, rekomendasi: true }] : [];
    }),
  ].sort((a, b) => a.lokal.localeCompare(b.lokal));
  const tanpaSlot = episodes.filter((e) => e.status === 'needs_video_approval' && !saran.has(e.id));
  const baris = [...rencana.slot, { jam: '', format: 'semua' as const }, { jam: '', format: 'semua' as const }];

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>📅 Jadwal Tayang</h1>
        <AutoRefresh aktif={sibuk} detik={6} />
      </div>
      <p className="muted kecil" style={{ margin: 0 }}>
        Channel Manager menyusun rencana: berapa video per hari, hari apa, dan jam berapa untuk tiap format. Saat menyetujui video,
        jadwalnya otomatis terisi slot kosong berikutnya dari rencana ini (video yang lebih dulu siap dapat slot lebih awal), dan tetap
        bisa kamu ganti tanggal & jamnya.
      </p>

      <div className="grid2">
        <div className="panel stack">
          <h2>Kalender {HARI_KALENDER} hari ke depan</h2>
          {Array.from({ length: HARI_KALENDER }, (_, n) => tambahHari(hariIni, n)).map(({ tanggal, hari }) => {
            const hariItu = isi.filter((x) => x.lokal.startsWith(tanggal));
            const libur = !rencana.hari.includes(hari);
            return (
              <div key={tanggal} style={{ borderBottom: '1px solid var(--line)', paddingBottom: 8 }}>
                <div className="kecil">
                  <b>
                    {NAMA_HARI[hari]}, {new Date(`${tanggal}T00:00:00Z`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' })}
                  </b>{' '}
                  <span className="muted">
                    {libur ? '· tidak tayang' : `· ${hariItu.length}/${rencana.videoPerHari} video`}
                  </span>
                </div>
                {hariItu.map((x) => (
                  <div key={x.ep.id} className="row kecil" style={{ gap: 8, marginTop: 4 }}>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{x.lokal.slice(11)}</span>
                    <span>{x.ep.ide.format === 'short' ? '📱' : '🎬'}</span>
                    <Link href={`/episode/${x.ep.id}`}>{x.ep.metadata?.judul ?? x.ep.naskah?.judul ?? x.ep.ide.judul}</Link>
                    {x.rekomendasi ? <span className="muted">(rekomendasi, menunggu persetujuanmu)</span> : <Badge status={x.ep.status} />}
                  </div>
                ))}
              </div>
            );
          })}
          {tanpaSlot.length ? (
            <p className="peringatan kecil" style={{ margin: 0 }}>
              {tanpaSlot.length} video siap tayang belum dapat slot (tidak ada jam tayang yang cocok dengan formatnya). Tambahkan jam untuk
              format itu di rencana.
            </p>
          ) : null}
        </div>

        <div className="stack">
          <div className="panel stack">
            <h2>Rencana saat ini</h2>
            <div className="kecil">
              <div>
                <b>{rencana.videoPerHari} video per hari</b> · {rencana.hari.length === 7 ? 'setiap hari' : rencana.hari.map((h) => NAMA_HARI[h]).join(', ')}
              </div>
              <ul style={{ margin: '6px 0', paddingLeft: 18 }}>
                {rencana.slot.map((s) => (
                  <li key={`${s.jam}-${s.format}`}>
                    {s.jam} · {s.format === 'semua' ? 'semua format' : FORMAT_LABEL[s.format]}
                  </li>
                ))}
              </ul>
              <div className="muted">
                {rencana.diubah
                  ? `Disusun ${rencana.oleh === 'channel-manager' ? 'Channel Manager' : 'oleh kamu'} · ${new Date(rencana.diubah).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: cfg.zonaWaktu })}`
                  : 'Rencana bawaan (belum disusun Channel Manager).'}
              </div>
            </div>
            {rencana.alasan ? (
              <details open={rencana.oleh === 'channel-manager'}>
                <summary className="kecil">Alasan Channel Manager</summary>
                <pre className="md kecil">{rencana.alasan}</pre>
              </details>
            ) : null}
            {sibuk ? (
              <p className="kecil">⏳ Channel Manager sedang menyusun rencana dari statistik channel & stok video…</p>
            ) : (
              <form action={mintaRencanaTayang} className="stack" style={{ gap: 8 }}>
                <textarea name="arahan" rows={2} placeholder="Arahan (opsional), misal: fokus Shorts dulu, Jumat libur" />
                <button type="submit">🧑‍💼 Minta Channel Manager menyusun rencana</button>
              </form>
            )}
          </div>

          <form action={simpanRencanaTayang} className="panel stack">
            <h2>Ubah rencana sendiri</h2>
            <label className="kecil">
              Maksimal video per hari
              <input type="number" name="videoPerHari" min={1} max={6} defaultValue={rencana.videoPerHari} style={{ width: 80 }} />
            </label>
            <div className="row kecil" style={{ gap: 10 }}>
              {NAMA_HARI.map((h, i) => (
                <label key={h} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <input type="checkbox" name="hari" value={i} defaultChecked={rencana.hari.includes(i)} /> {h}
                </label>
              ))}
            </div>
            <div className="stack" style={{ gap: 6 }}>
              <span className="kecil">Jam tayang ({cfg.zonaWaktu}); kosongkan untuk menghapus</span>
              {baris.map((s, i) => (
                <div key={i} className="row" style={{ gap: 8 }}>
                  <input type="time" name="jam" defaultValue={s.jam} style={{ width: 120 }} />
                  <select name="formatSlot" defaultValue={s.format}>
                    {(['semua', 'biasa', 'short'] as const).map((f) => (
                      <option key={f} value={f}>
                        {LABEL_SLOT[f]}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <button className="sekunder">Simpan rencana</button>
          </form>
        </div>
      </div>
    </div>
  );
}
