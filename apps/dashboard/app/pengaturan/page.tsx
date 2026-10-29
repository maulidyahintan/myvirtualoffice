import { JENIS_MUSIK, loadConfig, SPEK_FORMAT } from '@kantor/shared';
import { hapusMusik, simpanMusik } from '../actions';

export const dynamic = 'force-dynamic';

const INFO = {
  pembuka: { judul: '🎵 Musik pembuka', bagian: 'intro' },
  penutup: { judul: '🎶 Musik penutup', bagian: 'outro' },
} as const;

export default function Pengaturan() {
  const cfg = loadConfig();
  const musik = cfg.musik;
  const { biasa, short } = SPEK_FORMAT;
  return (
    <div className="stack" style={{ maxWidth: 640 }}>
      <h1>⚙️ Pengaturan video</h1>
      <p className="muted kecil">
        Musik pembuka diputar di intro, musik penutup di outro, untuk semua video baru (termasuk hafalan). Intro/outro
        otomatis memanjang mengikuti musik, maksimal {biasa.introMaksDetik}/{biasa.outroMaksDetik} detik untuk video biasa
        dan {short.introMaksDetik}/{short.outroMaksDetik} detik untuk Shorts; musik yang lebih panjang dipudarkan di akhir.
        Pakai musik buatan sendiri atau yang lisensinya jelas boleh dipakai di YouTube. Video yang sudah dirender tidak
        berubah; render ulang kalau ingin memakai musik baru.
      </p>

      {JENIS_MUSIK.map((jenis) => (
        <section key={jenis} className="panel stack">
          <h2>{INFO[jenis].judul}</h2>
          {musik?.[jenis] ? (
            <>
              <audio controls src={`/api/musik/${jenis}?v=${encodeURIComponent(musik[jenis]!)}`} style={{ width: '100%' }} />
              <form action={hapusMusik}>
                <input type="hidden" name="jenis" value={jenis} />
                <button className="bahaya">Hapus musik {jenis}</button>
              </form>
            </>
          ) : (
            <p className="muted kecil">Belum ada, {INFO[jenis].bagian} tanpa musik.</p>
          )}
          <form action={`/api/musik/${jenis}`} method="post" encType="multipart/form-data" className="stack">
            <input type="file" name="musik" accept=".mp3,.m4a,.wav,.aac,.ogg" required />
            <button className="sekunder">{musik?.[jenis] ? 'Ganti' : 'Upload'} musik {jenis}</button>
          </form>
        </section>
      ))}

      <form action={simpanMusik} className="panel stack">
        <h2>🔊 Volume & format</h2>
        <label>
          Volume musik ({Math.round((musik?.volume ?? 0.7) * 100)}%)
          <input type="range" name="volume" min={0} max={100} step={5} defaultValue={Math.round((musik?.volume ?? 0.7) * 100)} />
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" name="diShorts" defaultChecked={musik?.diShorts ?? true} />
          Pakai juga di Shorts
        </label>
        <button>Simpan</button>
      </form>
    </div>
  );
}
