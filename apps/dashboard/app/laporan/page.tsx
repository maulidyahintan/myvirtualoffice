import { latestFile, paths, sedangSibuk } from '@kantor/shared';
import { buatLaporan } from '../actions';
import { AutoRefresh } from '@/components/AutoRefresh';
import { Tombol } from '@/components/Tombol';

export const dynamic = 'force-dynamic';

export default function HalamanLaporan() {
  const riset = latestFile(paths.riset());
  const laporan = latestFile(paths.laporan());
  const sibuk = sedangSibuk('laporan') || sedangSibuk('riset');
  const tanggal = (f?: string) => f?.match(/(\d{4}-\d{2}-\d{2})/)?.[1] ?? '';

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>Riset & Laporan</h1>
        <AutoRefresh aktif={sibuk} detik={6} />
      </div>
      <div className="grid2">
        <div className="panel">
          <h2>Riset terakhir {riset ? <span className="muted kecil">({tanggal(riset.file)})</span> : null}</h2>
          {riset ? <pre className="md">{riset.isi}</pre> : <p className="muted">Belum ada. Klik “Cari ide baru” di papan kerja.</p>}
        </div>
        <div className="panel stack">
          <h2>Laporan performa {laporan ? <span className="muted kecil">({tanggal(laporan.file)})</span> : null}</h2>
          <form action={buatLaporan}>
            <Tombol type="submit" disabled={sedangSibuk('laporan')} teksProses="Meminta laporan…">
              📊 Minta laporan dari Channel Manager
            </Tombol>
          </form>
          {laporan ? (
            <pre className="md">{laporan.isi}</pre>
          ) : (
            <p className="muted">Belum ada laporan. Butuh channel terhubung (npm run auth:youtube).</p>
          )}
        </div>
      </div>
    </div>
  );
}
