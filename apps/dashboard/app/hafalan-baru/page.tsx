import { FORMAT_CHOICES, FORMAT_CHOICE_LABEL, AGE_GROUPS } from '@kantor/shared';
import { buatHafalan } from '../actions';
import { Tombol } from '@/components/Tombol';

export const dynamic = 'force-dynamic';

interface Surat {
  nomor: number;
  namaLatin: string;
  arti: string;
  jumlahAyat: number;
}

async function daftarSurat(): Promise<Surat[]> {
  try {
    const res = await fetch('https://equran.id/api/v2/surat', { next: { revalidate: 86400 } });
    if (!res.ok) return [];
    return ((await res.json()) as { data: Surat[] }).data;
  } catch {
    return [];
  }
}

export default async function HafalanBaru() {
  const surat = await daftarSurat();
  return (
    <div className="stack">
      <div>
        <h1>📖 Video hafalan surat</h1>
        <div className="muted">
          Tidak ada cerita: video menampilkan ayat demi ayat (Arab, latin, arti) mengikuti rekaman bacaanmu, dengan latar yang dipilih sesuai
          arti ayat. Teks diambil otomatis dari equran.id (Kemenag RI).
        </div>
      </div>
      <form action={buatHafalan} className="panel form-lebar enam">
        <label className="penuh">
          Surat
          {surat.length ? (
            <select name="surat" defaultValue="112">
              {surat.map((s) => (
                <option key={s.number} value={s.number}>
                  {s.number}. {s.namaLatin} ({s.arti}) · {s.jumlahAyat} ayat
                </option>
              ))}
            </select>
          ) : (
            <input type="number" name="surat" min={1} max={114} defaultValue={112} required />
          )}
        </label>
        <label className="lebar-3">
          Dari ayat
          <input type="number" name="ayatDari" min={1} defaultValue={1} />
        </label>
        <label className="lebar-3">
          Sampai ayat (kosong = sampai akhir)
          <input type="number" name="ayatSampai" min={1} placeholder="akhir surat" />
        </label>
        <label className="lebar-2">
          Tiap ayat dibaca berapa kali di rekaman?
          <select name="ulang" defaultValue="3">
            <option value="1">1x (bacaan biasa)</option>
            <option value="2">2x</option>
            <option value="3">3x (disarankan untuk hafalan)</option>
            <option value="5">5x</option>
          </select>
        </label>
        <label className="lebar-2">
          Format video
          <select name="format" defaultValue="standard">
            {FORMAT_CHOICES.map((f) => (
              <option key={f} value={f}>
                {FORMAT_CHOICE_LABEL[f]}
              </option>
            ))}
          </select>
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
        <label className="penuh centang">
          <input type="checkbox" name="basmalah" defaultChecked />
          Diawali basmalah (otomatis dilewati untuk Al-Fatihah & At-Taubah)
        </label>
        <div className="penuh">
          <Tombol type="submit">Buat & ambil teks surat</Tombol>
        </div>
      </form>
    </div>
  );
}
