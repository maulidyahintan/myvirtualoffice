import Link from 'next/link';
import { PHASES, listEpisodes, loadConfig, isBusy, deleteBlockers, BUSY_STATUSES, WAITING_STATUSES } from '@kantor/shared';
import { startResearch } from '../actions';
import { AutoRefresh } from '@/components/AutoRefresh';
import { ArchiveDeleteButton } from '@/components/ArchiveDeleteButton';
import { Badge } from '@/components/Badge';
import { SubmitButton } from '@/components/SubmitButton';

export const dynamic = 'force-dynamic';

const FILTER_FORMAT = { all: 'Semua', standard: '🎬 Video', short: '📱 Shorts' } as const;
type FilterFormat = keyof typeof FILTER_FORMAT;

export default async function PapanKerja({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const filter: FilterFormat = sp.format === 'standard' || sp.format === 'short' ? sp.format : 'all';
  const semua = listEpisodes();
  const episodes = filter === 'all' ? semua : semua.filter((e) => (e.idea.format ?? 'standard') === filter);
  const aktif = episodes.filter((e) => !e.draftedAt);
  const draft = episodes.filter((e) => e.draftedAt);
  const cfg = loadConfig();
  const risetJalan = isBusy('riset');
  const adaYangSibuk = risetJalan || semua.some((e) => BUSY_STATUSES.includes(e.status));
  const butuhKamu = aktif.filter((e) => WAITING_STATUSES.includes(e.status));
  const namaSeri = (id: string) => cfg.series.find((s) => s.id === id)?.name ?? id;
  const jumlahFormat = (f: FilterFormat) => (f === 'all' ? semua.length : semua.filter((e) => (e.idea.format ?? 'standard') === f).length);
  // kolom: fase kerja (tanpa draft), lalu Draft sebelum Arsip
  // Tayang, Draft & Arsip are folded into narrow strips by default so the work columns get the room
  const open = new Set(String(sp.open ?? '').split(',').filter(Boolean));
  const kolom = [
    ...PHASES.filter((f) => f.title !== 'Arsip').map((f) =>
      f.title === 'Tayang'
        ? { key: 'tayang', title: '📺 Tayang', isi: aktif.filter((e) => f.statuses.includes(e.status)), lipat: true }
        : { key: f.title, title: f.title, isi: aktif.filter((e) => f.statuses.includes(e.status)), lipat: false },
    ),
    { key: 'draft', title: '📥 Draft', isi: draft, lipat: true },
    ...PHASES.filter((f) => f.title === 'Arsip').map((f) => ({ key: 'arsip', title: '🗄️ Arsip', isi: aktif.filter((e) => f.statuses.includes(e.status)), lipat: true })),
  ];
  const tutup = (k: { key: string; lipat: boolean }) => k.lipat && !open.has(k.key);
  const url = (opsi: { format?: FilterFormat; open?: Set<string> }) => {
    const q = new URLSearchParams();
    const f = opsi.format ?? filter;
    const o = [...(opsi.open ?? open)];
    if (f !== 'all') q.set('format', f);
    if (o.length) q.set('open', o.join(','));
    return q.size ? `/board?${q}` : '/board';
  };
  const alihkan = (key: string) => {
    const o = new Set(open);
    if (o.has(key)) o.delete(key);
    else o.add(key);
    return url({ open: o });
  };

  return (
    <div className="stack halaman-papan">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1>Papan Kerja</h1>
          <div className="muted">
            {episodes.length} episode · {butuhKamu.length} menunggu kamu{draft.length ? ` · ${draft.length} di draft` : ''}
          </div>
        </div>
        <div className="row">
          <AutoRefresh aktif={adaYangSibuk} />
          <nav className="pilih-tampilan" aria-label="Filter format">
            {(Object.keys(FILTER_FORMAT) as FilterFormat[]).map((f) => (
              <Link key={f} href={url({ format: f })} className={filter === f ? 'aktif' : ''}>
                {FILTER_FORMAT[f]} <span className="hitung">{jumlahFormat(f)}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <form action={startResearch} className="panel row">
        <div style={{ flex: 1, minWidth: 260 }}>
          <label>
            Arahan untuk Content Research (opsional)
            <input type="text" name="arahan" placeholder="contoh: fokus persiapan Ramadhan untuk usia 4-6" />
          </label>
        </div>
        <SubmitButton type="submit" disabled={risetJalan}>
          {risetJalan ? 'Riset sedang berjalan…' : '🔎 Cari ide baru'}
        </SubmitButton>
      </form>

      <div className="board" style={{ gridTemplateColumns: kolom.map((k) => (tutup(k) ? '46px' : 'minmax(158px, 1fr)')).join(' ') }}>
        {kolom.map((k) =>
          tutup(k) ? (
            // kolom terlipat: strip tipis, klik untuk membuka
            <Link key={k.key} href={alihkan(k.key)} className={`kolom-lipat ${k.key === 'draft' ? 'kolom-draft' : ''}`} title={`Tampilkan ${k.title}`}>
              <span className="kolom-lipat-jumlah">{k.isi.length}</span>
              <span className="kolom-lipat-judul">{k.title}</span>
            </Link>
          ) : (
            <section key={k.key} className={`kolom ${k.key === 'draft' ? 'kolom-draft' : ''}`}>
              <h3>
                {k.title} <span>{k.isi.length}</span>
                {k.lipat ? (
                  <Link href={alihkan(k.key)} className="kolom-tutup" title={`Sembunyikan ${k.title}`}>
                    ✕
                  </Link>
                ) : null}
              </h3>
              {/* tiap kolom bergulir sendiri, papan tetap setinggi layar */}
              <div className="kolom-isi">
                {k.key === 'draft' && k.isi.length === 0 ? (
                  <div className="kecil muted">Episode yang belum mau ditayangkan. Pindahkan lewat tombol “📥 Simpan ke Draft” di halaman episode.</div>
                ) : null}
                {k.isi.map((e) => {
                  const judul = e.script?.title ?? e.idea.title;
                  const keterangan = (
                    <div className="kecil muted" style={{ marginBottom: 6 }}>
                      {e.idea.format === 'short' ? '📱 Shorts · ' : ''}
                      {e.twin ? '🔗 ' : ''}
                      {e.source ? '✂️ ' : ''}
                      {namaSeri(e.idea.series)} · usia {e.idea.age}
                    </div>
                  );
                  if (k.key !== 'arsip') {
                    return (
                      <Link key={e.id} href={`/episode/${e.id}`} className="kartu">
                        <div className="judul">{judul}</div>
                        {keterangan}
                        <Badge status={e.status} />
                      </Link>
                    );
                  }
                  // archive: the title link stretches over the whole card; the status row (with the delete
                  // icon next to the badge) sits above it, so clicking the icon doesn't open the episode
                  return (
                    <div key={e.id} className="kartu kartu-arsip">
                      <Link href={`/episode/${e.id}`} className="judul kartu-tautan">
                        {judul}
                      </Link>
                      {keterangan}
                      <ArchiveDeleteButton
                        id={e.id}
                        title={judul}
                        blocked={deleteBlockers(e, semua).join('; ') || undefined}
                        back={url({})}
                      >
                        <Badge status={e.status} />
                      </ArchiveDeleteButton>
                    </div>
                  );
                })}
                {k.key !== 'draft' && k.isi.length === 0 ? <div className="kecil muted">—</div> : null}
              </div>
            </section>
          ),
        )}
      </div>
    </div>
  );
}
