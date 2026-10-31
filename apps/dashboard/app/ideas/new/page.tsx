import { loadConfig, FORMAT_CHOICES, FORMAT_CHOICE_LABEL, AGE_GROUPS } from '@kantor/shared';
import { createManualIdea } from '../../actions';
import { SubmitButton } from '@/components/SubmitButton';

export default function IdeBaru() {
  const cfg = loadConfig();
  return (
    <div className="stack">
      <div>
        <h1>💡 Ide episode dari kamu</h1>
        <div className="muted">Ide langsung masuk ke kolom Ide di Papan Kerja, lalu bisa ditugaskan ke Penulis.</div>
      </div>
      <form action={createManualIdea} className="panel form-lebar">
        <label className="penuh">
          Judul / topik
          <input type="text" name="judul" required placeholder="contoh: Mamas belajar antre di masjid" />
        </label>
        <label>
          Format video
          <select name="format" defaultValue="standard">
            {FORMAT_CHOICES.map((f) => (
              <option key={f} value={f}>
                {FORMAT_CHOICE_LABEL[f]} {f === 'short' ? '(vertikal, < 60 detik)' : f === 'standard' ? '(16:9, 3–5 menit)' : '(jadi 2 episode)'}
              </option>
            ))}
          </select>
        </label>
        <label>
          Seri
          <select name="seri" defaultValue={cfg.series[0]?.id}>
            {cfg.series.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Usia target
          <select name="usia" defaultValue="4-6">
            {AGE_GROUPS.map((u) => (
              <option key={u} value={u}>
                {u} tahun
              </option>
            ))}
          </select>
        </label>
        <label className="penuh">
          Pesan moral
          <textarea name="pesanMoral" required placeholder="contoh: sabar menunggu giliran itu disukai Allah" />
        </label>
        <div className="penuh">
          <SubmitButton type="submit" teksProses="Menyimpan…">
            Simpan ide
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
