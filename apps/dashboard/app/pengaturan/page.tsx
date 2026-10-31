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
import { BagianLipat } from '@/components/BagianLipat';
import { Tombol } from '@/components/Tombol';

const NAMA_PEMBICARA = { narator: '📖 Narator', ibu: '🧕 Ibu', mamas: '👦 Mamas', mochi: '🐱 Mochi', hafalan: '🕌 Bacaan hafalan' } as const;

export const dynamic = 'force-dynamic';

const INFO = {
  pembuka: { judul: '🎵 Musik pembuka', bagian: 'intro' },
  penutup: { judul: '🎶 Musik penutup', bagian: 'outro' },
} as const;

export default function Pengaturan() {
  return (
    <div className="stack">
      <div>
        <h1>⚙️ Pengaturan</h1>
        <div className="muted">Klik judul bagian untuk membuka atau menutupnya.</div>
      </div>
      <div className="stack daftar-pengaturan">
        {JENIS_MUSIK.map((jenis) => (
          <PengaturanMusik key={jenis} jenis={jenis} />
        ))}
        <PengaturanVolume />
        <PengaturanSuara />
        <PengaturanPlaylist />
        <PengaturanRisetHarian />
      </div>
    </div>
  );
}

/** Musik pembuka / penutup video. */
function PengaturanMusik({ jenis }: { jenis: (typeof JENIS_MUSIK)[number] }) {
  const musik = loadConfig().musik;
  const { biasa, short } = SPEK_FORMAT;
  const file = musik?.[jenis];
  return (
    <BagianLipat id={`musik-${jenis}`} judul={INFO[jenis].judul} ringkasan={file ? '✅ terpasang' : 'belum ada'}>
      <p className="muted kecil" style={{ margin: 0 }}>
        Diputar di {INFO[jenis].bagian} semua video baru (termasuk hafalan). {INFO[jenis].bagian === 'intro' ? 'Intro' : 'Outro'} otomatis
        memanjang mengikuti musik, maksimal {jenis === 'pembuka' ? biasa.introMaksDetik : biasa.outroMaksDetik} detik untuk video biasa dan{' '}
        {jenis === 'pembuka' ? short.introMaksDetik : short.outroMaksDetik} detik untuk Shorts; musik yang lebih panjang dipudarkan. Pakai musik
        buatan sendiri atau yang lisensinya jelas. Video yang sudah dirender tidak berubah.
      </p>
      {file ? (
        <>
          <audio controls src={`/api/musik/${jenis}?v=${encodeURIComponent(file)}`} style={{ width: '100%' }} />
          <form action={hapusMusik}>
            <input type="hidden" name="jenis" value={jenis} />
            <Tombol className="bahaya" teksProses="Menghapus…">
              Hapus musik {jenis}
            </Tombol>
          </form>
        </>
      ) : (
        <p className="muted kecil" style={{ margin: 0 }}>
          Belum ada, {INFO[jenis].bagian} tanpa musik.
        </p>
      )}
      <form action={`/api/musik/${jenis}`} method="post" encType="multipart/form-data" className="stack">
        <input type="file" name="musik" accept=".mp3,.m4a,.wav,.aac,.ogg" required />
        <Tombol className="sekunder" teksProses="Mengupload…">
          {file ? 'Ganti' : 'Upload'} musik {jenis}
        </Tombol>
      </form>
    </BagianLipat>
  );
}

function PengaturanVolume() {
  const musik = loadConfig().musik;
  const volume = Math.round((musik?.volume ?? 0.7) * 100);
  const diShorts = musik?.diShorts ?? true;
  return (
    <BagianLipat id="volume" judul="🔊 Volume musik & Shorts" ringkasan={`${volume}% · ${diShorts ? 'juga di Shorts' : 'tanpa di Shorts'}`}>
      <form action={simpanMusik} className="stack">
        <label>
          Volume musik ({volume}%)
          <input type="range" name="volume" min={0} max={100} step={5} defaultValue={volume} />
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" name="diShorts" defaultChecked={diShorts} />
          Pakai juga di Shorts
        </label>
        <Tombol teksProses="Menyimpan…">Simpan</Tombol>
      </form>
    </BagianLipat>
  );
}

/** Efek suara per pembicara & bacaan hafalan. */
function PengaturanSuara() {
  const cfg = loadConfig();
  const diubah = PEMBICARA.filter((p) => cfg.suaraKarakter?.[p]).length + (cfg.suaraHafalan ? 1 : 0);
  return (
    <BagianLipat
      id="suara"
      judul="🎭 Suara karakter & hafalan"
      ringkasan={diubah ? `${diubah} suara diatur sendiri` : 'semua bawaan'}
    >
      <form action={simpanSuaraKarakter} className="stack">
        <p className="muted kecil" style={{ margin: 0 }}>
          Cerita yang direkam <b>per adegan</b> (Studio Rekam): tiap adegan diberi efek sesuai pembicaranya. Video <b>hafalan</b>: seluruh
          bacaan diberi efek suara anak-anak, lebih pelan (otomatis, bisa dimatikan per episode di Studio). <b>Nada</b> dalam semiton: +
          terdengar lebih kecil seperti anak-anak, − lebih berat. <b>Tempo</b> 100% = kecepatan bicaramu, di bawah 100% lebih pelan.
        </p>
        {[...PEMBICARA, 'hafalan' as const].map((p) => {
          const s = p === 'hafalan' ? suaraHafalan(cfg) : suaraPembicara(p, cfg);
          const ket = p === 'hafalan' ? SUARA_HAFALAN_BAWAAN.ket : SUARA_KARAKTER_BAWAAN[p].ket;
          return (
            <div key={p} className="baris-suara">
              <div>
                <b>{NAMA_PEMBICARA[p]}</b>
                <div className="kecil muted">bawaan: {ket}</div>
              </div>
              <div className="row" style={{ gap: 10, alignItems: 'end' }}>
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
            </div>
          );
        })}
        <Tombol teksProses="Menyimpan…">Simpan pengaturan suara</Tombol>
      </form>
    </BagianLipat>
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
    <BagianLipat
      id="playlist"
      judul="📂 Playlist YouTube"
      ringkasan={`${dipakai.length} playlist · ${belum ? `${belum} video belum masuk` : 'semua video sudah masuk'}`}
    >
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
    </BagianLipat>
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
    <BagianLipat
      id="riset-harian"
      judul="🔎 Riset ide otomatis"
      ringkasan={atur.aktif && terpasang ? `Aktif · ${atur.jam} · min. ${atur.jumlahIde} ide` : 'Nonaktif'}
    >
      <form action={simpanRisetHarian} className="stack">
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
    </BagianLipat>
  );
}
