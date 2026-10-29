import Link from 'next/link';
import { FASE, listEpisodes, loadConfig, sedangSibuk, STATUS_SIBUK } from '@kantor/shared';
import { mulaiRiset } from './actions';
import { AutoRefresh } from '@/components/AutoRefresh';
import { Badge } from '@/components/Badge';

export const dynamic = 'force-dynamic';

export default function PapanKerja() {
  const episodes = listEpisodes();
  const cfg = loadConfig();
  const risetJalan = sedangSibuk('riset');
  const adaYangSibuk = risetJalan || episodes.some((e) => STATUS_SIBUK.includes(e.status));
  const butuhKamu = episodes.filter((e) =>
    ['needs_script_approval', 'needs_audio', 'needs_video_approval', 'error'].includes(e.status),
  );
  const namaSeri = (id: string) => cfg.seri.find((s) => s.id === id)?.nama ?? id;

  return (
    <div className="stack">
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
        <button type="submit" disabled={risetJalan}>
          {risetJalan ? 'Riset sedang berjalan…' : '🔎 Cari ide baru'}
        </button>
      </form>

      <div className="board">
        {FASE.map((fase) => {
          const isi = episodes.filter((e) => fase.status.includes(e.status));
          return (
            <section key={fase.judul} className="kolom">
              <h3>
                {fase.judul} <span>{isi.length}</span>
              </h3>
              {isi.map((e) => (
                <Link key={e.id} href={`/episode/${e.id}`} className="kartu">
                  <div className="judul">{e.naskah?.judul ?? e.ide.judul}</div>
                  <div className="kecil muted" style={{ marginBottom: 6 }}>
                    {e.ide.format === 'short' ? '📱 Shorts · ' : ''}
                    {e.pasangan ? '🔗 ' : ''}
                    {namaSeri(e.ide.seri)} · usia {e.ide.usia}
                  </div>
                  <Badge status={e.status} />
                </Link>
              ))}
              {isi.length === 0 ? <div className="kecil muted">—</div> : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
