import Link from 'next/link';
import { PHASES, listEpisodes, loadConfig, isBusy, BUSY_STATUSES, WAITING_STATUSES } from '@kantor/shared';
import { startResearch } from '../actions';
import { AutoRefresh } from '@/components/AutoRefresh';
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
  const kolom = [
    ...PHASES.filter((f) => f.title !== 'Arsip').map((f) => ({ title: f.title, isi: aktif.filter((e) => f.statuses.includes(e.status)), draft: false })),
    { title: 'Draft', isi: draft, draft: true },
    ...PHASES.filter((f) => f.title === 'Arsip').map((f) => ({ title: f.title, isi: aktif.filter((e) => f.statuses.includes(e.status)), draft: false })),
  ];

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
              <Link key={f} href={f === 'all' ? '/board' : `/board?format=${f}`} className={filter === f ? 'aktif' : ''}>
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

      <div className="board">
        {kolom.map((k) => (
          <section key={k.title} className={`kolom ${k.draft ? 'kolom-draft' : ''}`}>
            <h3>
              {k.draft ? '📥 Draft' : k.title} <span>{k.isi.length}</span>
            </h3>
            {/* tiap kolom bergulir sendiri, papan tetap setinggi layar */}
            <div className="kolom-isi">
              {k.draft && k.isi.length === 0 ? (
                <div className="kecil muted">Episode yang belum mau ditayangkan. Pindahkan lewat tombol “📥 Simpan ke Draft” di halaman episode.</div>
              ) : null}
              {k.isi.map((e) => (
                <Link key={e.id} href={`/episode/${e.id}`} className="kartu">
                  <div className="judul">{e.script?.title ?? e.idea.title}</div>
                  <div className="kecil muted" style={{ marginBottom: 6 }}>
                    {e.idea.format === 'short' ? '📱 Shorts · ' : ''}
                    {e.twin ? '🔗 ' : ''}
                    {e.source ? '✂️ ' : ''}
                    {namaSeri(e.idea.series)} · usia {e.idea.age}
                  </div>
                  <Badge status={e.status} />
                </Link>
              ))}
              {!k.draft && k.isi.length === 0 ? <div className="kecil muted">—</div> : null}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
