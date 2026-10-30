import {
  BATAS_NADA_KARAKTER,
  JENIS_MUSIK,
  loadConfig,
  PEMBICARA,
  SPEK_FORMAT,
  SUARA_HAFALAN_BAWAAN,
  SUARA_KARAKTER_BAWAAN,
  suaraHafalan,
  suaraPembicara,
} from '@kantor/shared';
import { hapusMusik, simpanMusik, simpanSuaraKarakter } from '../actions';

const NAMA_PEMBICARA = { narator: '📖 Narator', ibu: '🧕 Ibu', mamas: '👦 Mamas', mochi: '🐱 Mochi', hafalan: '🕌 Bacaan hafalan' } as const;

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

      <form action={simpanSuaraKarakter} className="panel stack">
        <h2>🎭 Suara karakter & hafalan</h2>
        <p className="muted kecil" style={{ margin: 0 }}>
          Cerita yang direkam <b>per adegan</b> (Studio Rekam): tiap adegan diberi efek sesuai pembicaranya. Video <b>hafalan</b>: seluruh
          bacaan diberi efek suara anak-anak, lebih pelan (otomatis, bisa dimatikan per episode di Studio). <b>Nada</b> dalam semiton: +
          terdengar lebih kecil seperti anak-anak, − lebih berat. <b>Tempo</b> 100% = kecepatan bicaramu, di bawah 100% lebih pelan.
        </p>
        {[...PEMBICARA, 'hafalan' as const].map((p) => {
          const s = p === 'hafalan' ? suaraHafalan(cfg) : suaraPembicara(p, cfg);
          const ket = p === 'hafalan' ? SUARA_HAFALAN_BAWAAN.ket : SUARA_KARAKTER_BAWAAN[p].ket;
          return (
            <div key={p} className="row" style={{ flexWrap: 'wrap', gap: 12, alignItems: 'end' }}>
              <div style={{ minWidth: 150 }}>
                <b>{NAMA_PEMBICARA[p]}</b>
                <div className="kecil muted">bawaan: {ket}</div>
              </div>
              <label className="kecil">
                Nada
                <input
                  type="number"
                  name={`${p}-nada`}
                  min={BATAS_NADA_KARAKTER.min}
                  max={BATAS_NADA_KARAKTER.maks}
                  step={0.5}
                  defaultValue={s.nada}
                  style={{ width: 80 }}
                />
              </label>
              <label className="kecil">
                Tempo (%)
                <input type="number" name={`${p}-tempo`} min={70} max={140} step={1} defaultValue={Math.round(s.tempo * 100)} style={{ width: 80 }} />
              </label>
              <label className="kecil" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="checkbox" name={`${p}-reset`} /> kembalikan ke bawaan
              </label>
            </div>
          );
        })}
        <button>Simpan pengaturan suara</button>
      </form>
    </div>
  );
}
