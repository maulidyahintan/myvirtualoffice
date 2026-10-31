import Link from 'next/link';
import {
  FORMAT_LABEL,
  isoToLocal,
  episodeSchedule,
  listEpisodes,
  loadConfig,
  DAY_NAMES,
  recommendSchedule,
  publishPlan,
  isBusy,
  addDays,
  type Episode,
  type PublishPlan,
} from '@kantor/shared';
import { requestPublishPlan, savePublishPlan } from '../actions';
import { AutoRefresh } from '@/components/AutoRefresh';
import { Collapsible } from '@/components/Collapsible';
import { SubmitButton } from '@/components/SubmitButton';

export const dynamic = 'force-dynamic';

const HARI_DAFTAR = 14;
const LABEL_SLOT = { all: 'Semua format', standard: 'Video biasa', short: 'Shorts' } as const;
/** Kalender mulai hari Senin. */
const URUTAN_HARI = [1, 2, 3, 4, 5, 6, 0];

interface Isi {
  ep: Episode;
  local: string;
  recommendation: boolean;
}

const judulDari = (e: Episode) => e.metadata?.title ?? e.script?.title ?? e.idea.title;
const tglPendek = (tanggal: string, opsi: Intl.DateTimeFormatOptions) => new Date(`${tanggal}T00:00:00Z`).toLocaleDateString('id-ID', { ...opsi, timeZone: 'UTC' });

export default async function HalamanJadwal({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const tampilan = sp.tampilan === 'daftar' ? 'daftar' : 'kalender';
  const cfg = loadConfig();
  const rencana = publishPlan(cfg);
  const episodes = listEpisodes();
  const sibuk = isBusy('rencana');
  const sekarang = new Date();
  const lokalSekarang = isoToLocal(sekarang.toISOString(), cfg.timeZone);
  const hariIni = lokalSekarang.slice(0, 10);
  const bulan = typeof sp.bulan === 'string' && /^\d{4}-\d{2}$/.test(sp.bulan) ? sp.bulan : hariIni.slice(0, 7);

  const saran = recommendSchedule(episodes, cfg, sekarang);
  // semua jadwal (termasuk yang sudah tayang, untuk kalender) + rekomendasi untuk video yang menunggu persetujuan
  const isi: Isi[] = [
    ...episodes.flatMap((ep) => {
      const iso = episodeSchedule(ep);
      return iso ? [{ ep, local: isoToLocal(iso, cfg.timeZone), recommendation: false }] : [];
    }),
    ...episodes.flatMap((ep) => {
      const s = saran.get(ep.id);
      return s ? [{ ep, local: s.local, recommendation: true }] : [];
    }),
  ].sort((a, b) => a.local.localeCompare(b.local));
  const tanpaSlot = episodes.filter((e) => e.status === 'needs_video_approval' && !saran.has(e.id));
  const tautan = (t: string, b = bulan) => `/schedule?tampilan=${t}${t === 'kalender' ? `&bulan=${b}` : ''}`;

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1>📅 Jadwal Tayang</h1>
          <div className="muted kecil">
            Saat menyetujui video, jadwalnya otomatis terisi slot kosong berikutnya dari rencana, dan tetap bisa kamu ganti tanggal & jamnya.
          </div>
        </div>
        <div className="row">
          <AutoRefresh aktif={sibuk} detik={6} />
          <nav className="pilih-tampilan" aria-label="Pilih tampilan">
            <Link href={tautan('kalender')} className={tampilan === 'kalender' ? 'aktif' : ''}>
              🗓️ Kalender
            </Link>
            <Link href={tautan('daftar')} className={tampilan === 'daftar' ? 'aktif' : ''}>
              ☰ Daftar
            </Link>
          </nav>
        </div>
      </div>

      {tanpaSlot.length ? (
        <p className="peringatan kecil" style={{ margin: 0 }}>
          {tanpaSlot.length} video siap tayang belum dapat slot (tidak ada jam tayang yang cocok dengan formatnya). Tambahkan jam untuk format
          itu di rencana.
        </p>
      ) : null}

      {tampilan === 'kalender' ? (
        <>
          <KalenderBulan bulan={bulan} hariIni={hariIni} lokalSekarang={lokalSekarang} isi={isi} rencana={rencana} tautan={tautan} />
          <div className="grid-rencana">
            <PanelRencana rencana={rencana} zona={cfg.timeZone} sibuk={sibuk} />
          </div>
        </>
      ) : (
        <div className="grid2">
          <DaftarHari hariIni={hariIni} lokalSekarang={lokalSekarang} isi={isi} rencana={rencana} />
          <div className="stack">
            <PanelRencana rencana={rencana} zona={cfg.timeZone} sibuk={sibuk} />
          </div>
        </div>
      )}
    </div>
  );
}

/** Label & gaya satu jadwal: sudah tayang, terjadwal, atau rekomendasi yang menunggu persetujuan. */
function keadaan(x: Isi, lokalSekarang: string) {
  if (x.recommendation) return { kelas: 'saran', label: 'Rekomendasi, menunggu persetujuanmu' };
  if (x.local <= lokalSekarang) return { kelas: 'tayang', label: 'Sudah tayang' };
  return { kelas: 'terjadwal', label: 'Terjadwal' };
}

/** Kalender satu bulan (Senin–Minggu): tiap tanggal berisi jadwal tayangnya. */
function KalenderBulan({
  bulan,
  hariIni,
  lokalSekarang,
  isi,
  rencana,
  tautan,
}: {
  bulan: string;
  hariIni: string;
  lokalSekarang: string;
  isi: Isi[];
  rencana: PublishPlan;
  tautan: (t: string, b?: string) => string;
}) {
  const awal = `${bulan}-01`;
  // bulan berjalan: mulai dari minggu ini, 5 minggu ke depan (melewati batas bulan) supaya jadwal mendatang terlihat
  const berjalan = bulan === hariIni.slice(0, 7);
  const titikAwal = berjalan ? hariIni : awal;
  const geser = URUTAN_HARI.indexOf(addDays(titikAwal, 0).day);
  let sel = Array.from({ length: berjalan ? 35 : 42 }, (_, n) => addDays(titikAwal, n - geser));
  // bulan lain: 6 minggu cukup; minggu terakhir yang seluruhnya bulan depan dibuang
  if (!berjalan) while (sel.length > 28 && sel.slice(-7).every((h) => !h.date.startsWith(bulan))) sel = sel.slice(0, -7);
  const judulKalender = berjalan
    ? `${tglPendek(sel[0].date, { day: 'numeric', month: 'short' })} – ${tglPendek(sel.at(-1)!.date, { day: 'numeric', month: 'short', year: 'numeric' })}`
    : tglPendek(awal, { month: 'long', year: 'numeric' });
  const [th, bl] = bulan.split('-').map(Number);
  const geserBulan = (n: number) => {
    const d = new Date(Date.UTC(th, bl - 1 + n, 1));
    return d.toISOString().slice(0, 7);
  };
  const isiTampil = isi.filter((x) => x.local >= sel[0].date && x.local.slice(0, 10) <= sel.at(-1)!.date);

  return (
    <div className="panel stack kalender-panel">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="row" style={{ gap: 8 }}>
          <Link href={tautan('kalender', geserBulan(-1))} className="tombol-kecil" aria-label="Bulan sebelumnya">
            ‹
          </Link>
          <h2 style={{ margin: 0, minWidth: 170, textAlign: 'center' }}>{judulKalender}</h2>
          <Link href={tautan('kalender', geserBulan(1))} className="tombol-kecil" aria-label="Bulan berikutnya">
            ›
          </Link>
          {berjalan ? null : (
            <Link href={tautan('kalender', hariIni.slice(0, 7))} className="kecil">
              Kembali ke minggu ini
            </Link>
          )}
        </div>
        <div className="legenda kecil">
          <span>
            <i className="tayang" /> Sudah tayang
          </span>
          <span>
            <i className="terjadwal" /> Terjadwal
          </span>
          <span>
            <i className="saran" /> Rekomendasi
          </span>
          <span className="muted">{isiTampil.filter((x) => !x.recommendation).length} video terjadwal/tayang di sini</span>
        </div>
      </div>

      <div className="kalender">
        {URUTAN_HARI.map((h) => (
          <div key={h} className="kalender-hari">
            {DAY_NAMES[h]}
          </div>
        ))}
        {sel.map(({ date: tanggal, day: hari }) => {
          const hariItu = isi.filter((x) => x.local.startsWith(tanggal));
          const luar = !berjalan && !tanggal.startsWith(bulan);
          const libur = !rencana.days.includes(hari);
          const kelas = ['kalender-sel', luar && 'luar', tanggal === hariIni && 'hari-ini', tanggal < hariIni && 'lewat', libur && 'libur']
            .filter(Boolean)
            .join(' ');
          return (
            <div key={tanggal} className={kelas}>
              <div className="kalender-tgl">
                <span className="kalender-nama-hari">{DAY_NAMES[hari]}, </span>
                <b>{tanggal.endsWith('-01') ? tglPendek(tanggal, { day: 'numeric', month: 'short' }) : Number(tanggal.slice(8))}</b>
                {tanggal === hariIni ? <span className="kalender-label">hari ini</span> : null}
                {!luar && !libur && tanggal >= hariIni ? (
                  <span className="kalender-kuota">
                    {hariItu.length}/{rencana.videosPerDay}
                  </span>
                ) : null}
              </div>
              {hariItu.map((x) => {
                const k = keadaan(x, lokalSekarang);
                return (
                  <Link key={x.ep.id} href={`/episode/${x.ep.id}`} className={`jadwal-chip ${k.kelas}`} title={`${judulDari(x.ep)} · ${k.label}`}>
                    <span className="jadwal-jam">
                      {x.local.slice(11)} {x.ep.idea.format === 'short' ? '📱' : '🎬'}
                    </span>
                    <span className="jadwal-judul">{judulDari(x.ep)}</span>
                  </Link>
                );
              })}
              {libur && !luar ? <span className="kalender-libur kecil">tidak tayang</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Daftar per hari, 14 hari ke depan. */
function DaftarHari({ hariIni, lokalSekarang, isi, rencana }: { hariIni: string; lokalSekarang: string; isi: Isi[]; rencana: PublishPlan }) {
  return (
    <div className="panel stack">
      <h2>{HARI_DAFTAR} hari ke depan</h2>
      {Array.from({ length: HARI_DAFTAR }, (_, n) => addDays(hariIni, n)).map(({ date: tanggal, day: hari }) => {
        const hariItu = isi.filter((x) => x.local.startsWith(tanggal));
        const libur = !rencana.days.includes(hari);
        return (
          <div key={tanggal} style={{ borderBottom: '1px solid var(--line)', paddingBottom: 8 }}>
            <div className="kecil">
              <b>
                {DAY_NAMES[hari]}, {tglPendek(tanggal, { day: 'numeric', month: 'short' })}
              </b>{' '}
              <span className="muted">{libur ? '· tidak tayang' : `· ${hariItu.length}/${rencana.videosPerDay} video`}</span>
            </div>
            {hariItu.map((x) => {
              const k = keadaan(x, lokalSekarang);
              return (
                <div key={x.ep.id} className="row kecil" style={{ gap: 8, marginTop: 4 }}>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{x.local.slice(11)}</span>
                  <span>{x.ep.idea.format === 'short' ? '📱' : '🎬'}</span>
                  <Link href={`/episode/${x.ep.id}`}>{judulDari(x.ep)}</Link>
                  {x.recommendation ? <span className="muted">(rekomendasi, menunggu persetujuanmu)</span> : <span className={`badge ${k.kelas === 'tayang' ? 'selesai' : 'tunggu'}`}>{k.label}</span>}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/** Rencana dari Channel Manager + ubah sendiri (panel buka-tutup). */
function PanelRencana({ rencana, zona, sibuk }: { rencana: PublishPlan; zona: string; sibuk: boolean }) {
  const baris = [...rencana.slots, { time: '', format: 'all' as const }, { time: '', format: 'all' as const }];
  return (
    <>
      <Collapsible
        id="jadwal-rencana"
        judul="📋 Rencana saat ini"
        ringkasan={rencana.by === 'channel-manager' ? 'dari Channel Manager' : rencana.modified ? 'diatur sendiri' : 'bawaan'}
        bawaanBuka
      >
        <div className="kecil">
          <div>
            <b>{rencana.videosPerDay} video per hari</b> · {rencana.days.length === 7 ? 'setiap hari' : rencana.days.map((h) => DAY_NAMES[h]).join(', ')}
          </div>
          <ul style={{ margin: '6px 0', paddingLeft: 18 }}>
            {rencana.slots.map((s) => (
              <li key={`${s.time}-${s.format}`}>
                {s.time} · {s.format === 'all' ? 'semua format' : FORMAT_LABEL[s.format]}
              </li>
            ))}
          </ul>
          <div className="muted">
            {rencana.modified
              ? `Disusun ${rencana.by === 'channel-manager' ? 'Channel Manager' : 'oleh kamu'} · ${new Date(rencana.modified).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: zona })}`
              : 'Rencana bawaan (belum disusun Channel Manager).'}
          </div>
        </div>
        {rencana.reason ? (
          <details open={rencana.by === 'channel-manager'}>
            <summary className="kecil">Alasan Channel Manager</summary>
            <pre className="md kecil">{rencana.reason}</pre>
          </details>
        ) : null}
        {sibuk ? (
          <p className="kecil">⏳ Channel Manager sedang menyusun rencana dari statistik channel & stok video…</p>
        ) : (
          <form action={requestPublishPlan} className="stack" style={{ gap: 8 }}>
            <textarea name="arahan" rows={2} placeholder="Arahan (opsional), misal: fokus Shorts dulu, Jumat libur" />
            <SubmitButton type="submit">🧑‍💼 Minta Channel Manager menyusun rencana</SubmitButton>
          </form>
        )}
      </Collapsible>

      <Collapsible
        id="jadwal-ubah"
        judul="✏️ Ubah rencana sendiri"
        ringkasan={`${rencana.videosPerDay} video/hari · ${rencana.slots.length} jam tayang`}
      >
        <form action={savePublishPlan} className="stack">
          <label className="kecil">
            Maksimal video per hari
            <input type="number" name="videoPerHari" min={1} max={6} defaultValue={rencana.videosPerDay} style={{ width: 80 }} />
          </label>
          <div className="row kecil" style={{ gap: 10 }}>
            {DAY_NAMES.map((h, i) => (
              <label key={h} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <input type="checkbox" name="hari" value={i} defaultChecked={rencana.days.includes(i)} /> {h}
              </label>
            ))}
          </div>
          <div className="stack" style={{ gap: 6 }}>
            <span className="kecil">Jam tayang ({zona}); kosongkan untuk menghapus</span>
            {baris.map((s, i) => (
              <div key={i} className="row" style={{ gap: 8 }}>
                <input type="time" name="jam" defaultValue={s.time} style={{ width: 120 }} />
                <select name="formatSlot" defaultValue={s.format}>
                  {(['all', 'standard', 'short'] as const).map((f) => (
                    <option key={f} value={f}>
                      {LABEL_SLOT[f]}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <SubmitButton className="sekunder" teksProses="Menyimpan…">Simpan rencana</SubmitButton>
        </form>
      </Collapsible>
    </>
  );
}
