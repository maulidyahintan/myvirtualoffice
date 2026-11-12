import { AGE_GROUPS, STATUS_LABEL, basePlaylistName, compilationSources, loadConfig } from '@kantor/shared';
import { createCompilation } from '../../actions';
import { SubmitButton } from '@/components/SubmitButton';
import { CompilationPicker, type PilihanVideo } from '@/components/CompilationPicker';

export const dynamic = 'force-dynamic';

export default async function KompilasiBaru() {
  const cfg = loadConfig();
  const videos: PilihanVideo[] = compilationSources().map((e) => ({
    id: e.id,
    title: e.metadata?.title ?? e.script?.title ?? e.idea.title,
    group: basePlaylistName(e, cfg),
    seconds: Math.round(e.render?.scenes?.length ? e.render.scenes.at(-1)!.start + e.render.scenes.at(-1)!.duration : 0),
    status: STATUS_LABEL[e.status],
  }));

  return (
    <div className="stack">
      <div>
        <h1>🎞️ Kompilasi baru</h1>
        <div className="muted">
          Gabungkan beberapa video yang sudah jadi menjadi satu video panjang (20–60 menit), misalnya &quot;Kumpulan Hafalan Juz 30&quot; atau
          &quot;5 Kisah Sebelum Tidur&quot;. Tidak perlu rekam atau render ulang: videonya disambung berurutan, lalu judul, deskripsi dengan
          daftar isi (bab), dan thumbnail dibuat otomatis. Kompilasi masuk playlist <b>Kompilasi</b>.
        </div>
      </div>
      {videos.length < 2 ? (
        <div className="panel muted">Belum cukup video yang sudah jadi. Kompilasi butuh minimal 2 video biasa yang sudah dirender dengan suara.</div>
      ) : (
        <form action={createCompilation} className="stack">
          <div className="panel form-lebar enam">
            <label className="lebar-4">
              Judul kompilasi
              <input type="text" name="judul" required maxLength={100} placeholder="contoh: Kumpulan Cerita Mamas Sebelum Tidur" />
            </label>
            <label className="lebar-2">
              Usia target
              <select name="usia" defaultValue="1-10">
                {AGE_GROUPS.map((u) => (
                  <option key={u} value={u}>
                    {u} tahun
                  </option>
                ))}
              </select>
            </label>
          </div>
          <CompilationPicker videos={videos} />
          <div>
            <SubmitButton type="submit" teksProses="Membuat kompilasi…">
              🎞️ Buat kompilasi
            </SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}
