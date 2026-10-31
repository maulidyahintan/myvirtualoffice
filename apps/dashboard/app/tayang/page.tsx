import Link from 'next/link';
import { FORMAT_LABEL, listEpisodes, loadConfig, playlistName, isBusy, type Episode } from '@kantor/shared';
import { masukkanSemuaKePlaylist } from '../actions';
import { AutoRefresh } from '@/components/AutoRefresh';
import { Tombol } from '@/components/Tombol';

export const dynamic = 'force-dynamic';

// Arsip video yang sudah diupload ke YouTube: cari judul, filter tipe/status/kelengkapan,
// urutkan by waktu tayang atau nama. Filter lewat query string (form GET), tanpa JavaScript.

const URUT = { baru: 'Terbaru tayang', lama: 'Terlama tayang', az: 'Judul A–Z', za: 'Judul Z–A' } as const;
const STATUS = { tayang: 'Sudah tayang', terjadwal: 'Terjadwal (belum tayang)', semua: 'Semua yang diupload' } as const;
const TIPE = { semua: 'Semua tipe', standard: 'Video biasa', short: 'Shorts' } as const;
const LENGKAP = { semua: 'Semua', lengkap: 'Punya video & Shorts', satu: 'Hanya satu format' } as const;

type Kunci<T> = keyof T & string;
const pilih = <T extends object>(daftar: T, nilai: string | string[] | undefined, bawaan: Kunci<T>): Kunci<T> =>
  typeof nilai === 'string' && nilai in daftar ? (nilai as Kunci<T>) : bawaan;

const judulDari = (e: Episode) => e.metadata?.title ?? e.script?.title ?? e.idea.title;

/** Waktu tayang: jadwal YouTube, atau waktu upload untuk video yang diupload tanpa jadwal. */
function waktuTayang(e: Episode): string {
  if (e.youtube?.publishTime) return e.youtube.publishTime;
  const upload = [...e.log].reverse().find((l) => /terupload|terjadwal/i.test(l.message));
  return upload?.time ?? e.modified;
}

/** Episode kerabat: kembaran format lain, video asal potongan Shorts, dan Shorts turunannya. */
function kerabat(e: Episode, semua: Map<string, Episode>): Episode[] {
  const id = [e.twin, e.source?.id, ...(e.derivatives ?? [])].filter((x): x is string => !!x);
  return [...new Set(id)].flatMap((x) => (semua.has(x) ? [semua.get(x)!] : []));
}

export default async function HalamanTayang({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q.trim() : '';
  const urut = pilih(URUT, sp.urut, 'baru');
  const status = pilih(STATUS, sp.status, 'tayang');
  const tipe = pilih(TIPE, sp.tipe, 'semua');
  const lengkap = pilih(LENGKAP, sp.lengkap, 'semua');

  const cfg = loadConfig();
  const sekarang = Date.now();
  const semua = new Map(listEpisodes().map((e) => [e.id, e]));
  const diupload = [...semua.values()].filter((e) => e.youtube && (e.status === 'scheduled' || e.status === 'published'));
  const sudahTayang = (e: Episode) => e.status === 'published' || new Date(waktuTayang(e)).getTime() <= sekarang;
  const formatnya = (e: Episode) => e.idea.format ?? 'standard';
  // lengkap = ada versi format lain (yang juga sudah diupload / sedang dikerjakan)
  const punyaFormatLain = (e: Episode) => kerabat(e, semua).some((k) => formatnya(k) !== formatnya(e));

  const kata = q.toLowerCase();
  const hasil = diupload
    .filter((e) => (status === 'tayang' ? sudahTayang(e) : status === 'terjadwal' ? !sudahTayang(e) : true))
    .filter((e) => tipe === 'semua' || formatnya(e) === tipe)
    .filter((e) => (lengkap === 'lengkap' ? punyaFormatLain(e) : lengkap === 'satu' ? !punyaFormatLain(e) : true))
    .filter((e) => !kata || judulDari(e).toLowerCase().includes(kata) || e.idea.title.toLowerCase().includes(kata))
    .sort((a, b) => {
      if (urut === 'az' || urut === 'za') {
        const c = judulDari(a).localeCompare(judulDari(b), 'id');
        return urut === 'az' ? c : -c;
      }
      const c = waktuTayang(a).localeCompare(waktuTayang(b));
      return urut === 'lama' ? c : -c;
    });

  const ringkas = {
    tayang: diupload.filter(sudahTayang).length,
    terjadwal: diupload.filter((e) => !sudahTayang(e)).length,
    biasa: diupload.filter((e) => formatnya(e) === 'standard').length,
    short: diupload.filter((e) => formatnya(e) === 'short').length,
    lengkap: diupload.filter(punyaFormatLain).length,
  };
  const belumPlaylist = diupload.filter((e) => !e.youtube?.playlist).length;
  const namaSeri = (id: string) => cfg.series.find((s) => s.id === id)?.name ?? id;
  const tanggal = (iso: string) =>
    new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: cfg.timeZone });
  const adaFilter = q || urut !== 'baru' || status !== 'tayang' || tipe !== 'semua' || lengkap !== 'semua';

  return (
    <div className="stack">
      <div>
        <h1>🎬 Video Tayang</h1>
        <div className="muted kecil">
          {ringkas.tayang} sudah tayang · {ringkas.terjadwal} terjadwal · {ringkas.biasa} video biasa · {ringkas.short} Shorts ·{' '}
          {ringkas.lengkap} punya versi video & Shorts
        </div>
      </div>

      <form method="get" className="panel filter-tayang">
        <label className="cari">
          Cari judul
          <input type="text" name="q" defaultValue={q} placeholder="misal: doa sebelum makan" />
        </label>
        <label>
          Status
          <select name="status" defaultValue={status}>
            {Object.entries(STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipe
          <select name="tipe" defaultValue={tipe}>
            {Object.entries(TIPE).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          Kelengkapan
          <select name="lengkap" defaultValue={lengkap}>
            {Object.entries(LENGKAP).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          Urutkan
          <select name="sequential" defaultValue={urut}>
            {Object.entries(URUT).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <div className="row" style={{ alignSelf: 'end' }}>
          <Tombol type="submit" teksProses="Memuat…">Terapkan</Tombol>
          {adaFilter ? (
            <Link href="/tayang" className="kecil">
              Reset
            </Link>
          ) : null}
        </div>
      </form>

      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="muted kecil">{hasil.length} video</div>
        {isBusy('playlist') ? (
          <span className="kecil">
            ⏳ Memasukkan video ke playlist… <AutoRefresh aktif detik={6} />
          </span>
        ) : belumPlaylist ? (
          <form action={masukkanSemuaKePlaylist}>
            <Tombol className="sekunder" teksProses="Memproses…">📂 Masukkan {belumPlaylist} video ke playlist</Tombol>
          </form>
        ) : null}
      </div>

      {hasil.length === 0 ? (
        <div className="panel muted">
          {diupload.length === 0 ? 'Belum ada video yang diupload ke YouTube.' : 'Tidak ada video yang cocok dengan pencarian/filter ini.'}
        </div>
      ) : (
        <div className="daftar-tayang">
          {hasil.map((e) => {
            const short = formatnya(e) === 'short';
            const thumb = e.render?.thumbnail
              ? `/api/media/${e.render.thumbnail}?v=${e.render.time}`
              : `https://i.ytimg.com/vi/${e.youtube!.videoId}/hqdefault.jpg`;
            const terkait = kerabat(e, semua);
            const tayang = sudahTayang(e);
            return (
              <div key={e.id} className="panel kartu-tayang">
                <a href={e.youtube!.url} target="_blank" rel="noreferrer" className="sampul">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumb} alt="" />
                  <span className={`label-tipe ${short ? 'short' : ''}`}>{short ? '📱 Shorts' : '🎬 Video'}</span>
                </a>
                <div className="stack" style={{ gap: 6 }}>
                  <Link href={`/episode/${e.id}`} className="judul-tayang">
                    {judulDari(e)}
                  </Link>
                  <div className="kecil muted">
                    {namaSeri(e.idea.series)} · usia {e.idea.age}
                  </div>
                  <div className="kecil">
                    {e.youtube?.publishTime ? (tayang ? '✅ Tayang ' : '📅 Tayang ') : '🔒 Diupload private '}
                    {tanggal(waktuTayang(e))}
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    {/* status episode tetap 'scheduled' setelah jamnya lewat, jadi label dihitung dari waktu tayang */}
                    <span className={`badge ${tayang ? 'selesai' : 'tunggu'}`}>
                      {!e.youtube?.publishTime ? 'Private' : tayang ? 'Sudah tayang' : 'Terjadwal'}
                    </span>
                    <a href={e.youtube!.url} target="_blank" rel="noreferrer" className="kecil">
                      Buka di YouTube ↗
                    </a>
                  </div>
                  <div className="kecil">
                    {e.youtube?.playlist ? (
                      <>
                        📂 Playlist:{' '}
                        <a href={`https://www.youtube.com/playlist?list=${e.youtube.playlist.id}`} target="_blank" rel="noreferrer">
                          {e.youtube.playlist.name}
                        </a>
                      </>
                    ) : (
                      <span className="muted">📂 Belum masuk playlist ({playlistName(e, cfg)})</span>
                    )}
                  </div>
                  {terkait.length ? (
                    <div className="kecil terkait">
                      {terkait.map((k) => (
                        <div key={k.id}>
                          {k.id === e.source?.id ? '✂️ Dipotong dari: ' : e.derivatives?.includes(k.id) ? '✂️ Shorts potongan: ' : '🔗 Versi '}
                          {k.id === e.twin ? `${FORMAT_LABEL[formatnya(k)]}: ` : ''}
                          <Link href={`/episode/${k.id}`}>{judulDari(k)}</Link>{' '}
                          <span className="muted">({k.youtube ? (sudahTayang(k) ? 'sudah tayang' : 'terjadwal') : 'belum diupload'})</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="kecil muted">Hanya {short ? 'versi Shorts' : 'versi video biasa'}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
