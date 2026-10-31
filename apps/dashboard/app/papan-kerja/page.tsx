import Link from 'next/link';
import { PHASES, listEpisodes, loadConfig, isBusy, BUSY_STATUSES } from '@kantor/shared';
import { mulaiRiset } from '../actions';
import { AutoRefresh } from '@/components/AutoRefresh';
import { Badge } from '@/components/Badge';
import { Tombol } from '@/components/Tombol';

export const dynamic = 'force-dynamic';

export default function PapanKerja() {
  const episodes = listEpisodes();
  const cfg = loadConfig();
  const risetJalan = isBusy('riset');
  const adaYangSibuk = risetJalan || episodes.some((e) => BUSY_STATUSES.includes(e.status));
  const butuhKamu = episodes.filter((e) =>
    ['needs_script_approval', 'needs_audio', 'needs_video_approval', 'error'].includes(e.status),
  );
  const namaSeri = (id: string) => cfg.series.find((s) => s.id === id)?.name ?? id;

  return (
    <div className="stack halaman-papan">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1>Papan Kerja</h1>
          <div className="muted">
            {episodes.length} episode · {butuhKamu.length} menunggu kamu
          </div>
        </div>
        <AutoRefresh aktif={adaYangSibuk} />
      </div>

      <form action={mulaiRiset} className="panel row">
        <div style={{ flex: 1, minWidth: 260 }}>
          <label>
            Arahan untuk Content Research (opsional)
            <input type="text" name="arahan" placeholder="contoh: fokus persiapan Ramadhan untuk usia 4-6" />
          </label>
        </div>
        <Tombol type="submit" disabled={risetJalan}>
          {risetJalan ? 'Riset sedang berjalan…' : '🔎 Cari ide baru'}
        </Tombol>
      </form>

      <div className="board">
        {PHASES.map((fase) => {
          const isi = episodes.filter((e) => fase.statuses.includes(e.status));
          return (
            <section key={fase.title} className="kolom">
              <h3>
                {fase.title} <span>{isi.length}</span>
              </h3>
              {/* tiap kolom bergulir sendiri, papan tetap setinggi layar */}
              <div className="kolom-isi">
                {isi.map((e) => (
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
                {isi.length === 0 ? <div className="kecil muted">—</div> : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
