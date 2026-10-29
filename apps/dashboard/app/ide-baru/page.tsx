import { loadConfig, PILIHAN_FORMAT, PILIHAN_FORMAT_LABEL, USIA } from '@kantor/shared';
import { buatIdeManual } from '../actions';

export default function IdeBaru() {
  const cfg = loadConfig();
  return (
    <form action={buatIdeManual} className="panel stack" style={{ maxWidth: 640 }}>
      <h1>Ide episode dari kamu</h1>
      <label>
        Judul / topik
        <input type="text" name="judul" required placeholder="contoh: Mamas belajar antre di masjid" />
      </label>
      <label>
        Format video
        <select name="format" defaultValue="biasa">
          {PILIHAN_FORMAT.map((f) => (
            <option key={f} value={f}>
              {PILIHAN_FORMAT_LABEL[f]} {f === 'short' ? '(vertikal, < 60 detik)' : f === 'biasa' ? '(16:9, 3–5 menit)' : '(jadi 2 episode)'}
            </option>
          ))}
        </select>
      </label>
      <label>
        Seri
        <select name="seri" defaultValue={cfg.seri[0]?.id}>
          {cfg.seri.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nama}
            </option>
          ))}
        </select>
      </label>
      <label>
        Usia target
        <select name="usia" defaultValue="4-6">
          {USIA.map((u) => (
            <option key={u} value={u}>
              {u} tahun
            </option>
          ))}
        </select>
      </label>
      <label>
        Pesan moral
        <textarea name="pesanMoral" required placeholder="contoh: sabar menunggu giliran itu disukai Allah" />
      </label>
      <button type="submit">Simpan ide</button>
    </form>
  );
}
