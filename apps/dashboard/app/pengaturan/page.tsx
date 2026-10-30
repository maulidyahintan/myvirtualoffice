import fs from 'node:fs';
import {
  BATAS_NADA_KARAKTER,
  JENIS_MUSIK,
  loadConfig,
  PEMBICARA,
  SPEK_FORMAT,
  SUARA_HAFALAN_BAWAAN,
  SUARA_KARAKTER_BAWAAN,
  bacaOtomatis,
  filePenjadwalHarian,
  listEpisodes,
  playlistSeri,
  risetHarian,
  sedangSibuk,
  suaraHafalan,
  suaraPembicara,
} from '@kantor/shared';
import { hapusMusik, masukkanSemuaKePlaylist, simpanMusik, simpanPlaylist, simpanRisetHarian, simpanSuaraKarakter } from '../actions';
import { Tombol } from '@/components/Tombol';

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
                <Tombol className="bahaya" teksProses="Menghapus…">Hapus musik {jenis}</Tombol>
              </form>
            </>
          ) : (
            <p className="muted kecil">Belum ada, {INFO[jenis].bagian} tanpa musik.</p>
          )}
          <form action={`/api/musik/${jenis}`} method="post" encType="multipart/form-data" className="stack">
            <input type="file" name="musik" accept=".mp3,.m4a,.wav,.aac,.ogg" required />
            <Tombol className="sekunder">{musik?.[jenis] ? 'Ganti' : 'Upload'} musik {jenis}</Tombol>
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
        <Tombol teksProses="Menyimpan…">Simpan</Tombol>
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
        <Tombol teksProses="Menyimpan…">Simpan pengaturan suara</Tombol>
      </form>

      <PengaturanPlaylist />

      <PengaturanRisetHarian />
    </div>
  );
}

/** Playlist YouTube tujuan tiap seri. Video otomatis dimasukkan saat diupload. */
function PengaturanPlaylist() {
  const cfg = loadConfig();
  const tanpaSetelan = { ...cfg, seri: cfg.seri.map(({ playlist: _, ...s }) => s) };
  const belum = listEpisodes().filter((e) => e.youtube && !e.youtube.playlist).length;
  const sibuk = sedangSibuk('playlist');
  const dipakai = [...new Set(cfg.seri.map((s) => playlistSeri(s.id, cfg)))];
  return (
    <section className="panel stack">
      <h2>📂 Playlist YouTube</h2>
      <p className="muted kecil" style={{ margin: 0 }}>
        Setiap video yang diupload langsung dimasukkan ke playlist sesuai seri/tipenya (video biasa & Shorts). Playlist dicari berdasarkan
        nama di channel; kalau belum ada, dibuat otomatis (publik). Kosongkan untuk memakai bawaan.
      </p>
      <form action={simpanPlaylist} className="stack" style={{ gap: 8 }}>
        {cfg.seri.map((s) => (
          <label key={s.id} className="kecil">
            {s.nama}
            <input type="text" name={`playlist-${s.id}`} defaultValue={s.playlist ?? ''} placeholder={playlistSeri(s.id, tanpaSetelan)} />
          </label>
        ))}
        <Tombol className="sekunder" teksProses="Menyimpan…">Simpan playlist</Tombol>
      </form>
      <div className="kecil">
        {dipakai.map((nama) => {
          const id = cfg.playlistYoutube?.[nama];
          return (
            <div key={nama}>
              {nama}:{' '}
              {id ? (
                <a href={`https://www.youtube.com/playlist?list=${id}`} target="_blank" rel="noreferrer">
                  buka playlist ↗
                </a>
              ) : (
                <span className="muted">dibuat saat video pertama diupload</span>
              )}
            </div>
          );
        })}
      </div>
      {sibuk ? (
        <p className="kecil">⏳ Memasukkan video ke playlist…</p>
      ) : belum ? (
        <form action={masukkanSemuaKePlaylist}>
          <Tombol className="sekunder" teksProses="Memproses…">📂 Masukkan {belum} video yang sudah diupload ke playlist</Tombol>
        </form>
      ) : (
        <p className="kecil muted" style={{ margin: 0 }}>
          Semua video yang sudah diupload sudah masuk playlist.
        </p>
      )}
    </section>
  );
}

/** Content Research mencari ide sendiri setiap hari. */
function PengaturanRisetHarian() {
  const cfg = loadConfig();
  const atur = risetHarian(cfg);
  const terpasang = fs.existsSync(filePenjadwalHarian());
  const c = bacaOtomatis();
  const HASIL = { ok: '✅ berhasil', gagal: '❌ gagal', jalan: '⏳ sedang berjalan' } as const;
  return (
    <form action={simpanRisetHarian} className="panel stack">
      <h2>🔎 Riset ide otomatis</h2>
      <p className="muted kecil" style={{ margin: 0 }}>
        Content Research mencari ide sendiri setiap hari, pertama kali setelah jam yang diatur. Ide baru muncul di kolom Ide di Papan Kerja.
        Kalau komputer sedang tidur pada jam itu, riset jalan begitu komputer menyala lagi (sekali per hari). Komputer harus menyala dan
        login supaya riset bisa jalan.
      </p>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="checkbox" name="aktif" defaultChecked={atur.aktif && terpasang} /> Aktif
      </label>
      <div className="row" style={{ gap: 12 }}>
        <label className="kecil">
          Jam ({cfg.zonaWaktu})
          <input type="time" name="jam" defaultValue={atur.jam} style={{ width: 120 }} />
        </label>
        <label className="kecil">
          Minimal ide per hari
          <input type="number" name="jumlahIde" min={1} max={8} defaultValue={atur.jumlahIde} style={{ width: 80 }} />
        </label>
      </div>
      <div className="kecil">
        Penjadwal: {terpasang ? '🟢 terpasang' : '⚪ belum terpasang (centang Aktif lalu Simpan)'}
        {c.tanggal ? (
          <div className="muted">
            Riset otomatis terakhir: {c.tanggal} · {c.hasil ? HASIL[c.hasil] : ''}
            {c.pesan ? ` · ${c.pesan}` : ''}
          </div>
        ) : null}
      </div>
      <Tombol className="sekunder" teksProses="Menyimpan…">Simpan riset otomatis</Tombol>
    </form>
  );
}
