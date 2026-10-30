import { PILIHAN_FORMAT, PILIHAN_FORMAT_LABEL, USIA } from '@kantor/shared';
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
    <form action={buatHafalan} className="panel stack" style={{ maxWidth: 640 }}>
      <h1>📖 Video hafalan surat</h1>
      <p className="muted kecil">
        Tidak ada cerita: video menampilkan ayat demi ayat (Arab, latin, arti) mengikuti rekaman bacaanmu, dengan latar yang
        dipilih sesuai arti ayat. Teks diambil otomatis dari equran.id (Kemenag RI).
      </p>
      <label>
        Surat
        {surat.length ? (
          <select name="surat" defaultValue="112">
            {surat.map((s) => (
              <option key={s.nomor} value={s.nomor}>
                {s.nomor}. {s.namaLatin} ({s.arti}) · {s.jumlahAyat} ayat
              </option>
            ))}
          </select>
        ) : (
          <input type="number" name="surat" min={1} max={114} defaultValue={112} required />
        )}
      </label>
      <div className="row">
        <label style={{ flex: 1 }}>
          Dari ayat
          <input type="number" name="ayatDari" min={1} defaultValue={1} />
        </label>
        <label style={{ flex: 1 }}>
          Sampai ayat (kosong = sampai akhir)
          <input type="number" name="ayatSampai" min={1} placeholder="akhir surat" />
        </label>
      </div>
      <label>
        Tiap ayat dibaca berapa kali di rekaman?
        <select name="ulang" defaultValue="3">
          <option value="1">1x (bacaan biasa)</option>
          <option value="2">2x</option>
          <option value="3">3x (disarankan untuk hafalan)</option>
          <option value="5">5x</option>
        </select>
      </label>
      <label className="row" style={{ fontWeight: 600 }}>
        <input type="checkbox" name="basmalah" defaultChecked />
        Diawali basmalah (otomatis dilewati untuk Al-Fatihah & At-Taubah)
      </label>
      <label>
        Format video
        <select name="format" defaultValue="biasa">
          {PILIHAN_FORMAT.map((f) => (
            <option key={f} value={f}>
              {PILIHAN_FORMAT_LABEL[f]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Usia target
        <select name="usia" defaultValue="1-10">
          {USIA.map((u) => (
            <option key={u} value={u}>
              {u} tahun
            </option>
          ))}
        </select>
      </label>
      <Tombol type="submit">Buat & ambil teks surat</Tombol>
    </form>
  );
}
