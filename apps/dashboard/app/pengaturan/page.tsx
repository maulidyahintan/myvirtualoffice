import fs from 'node:fs';
import {
  CHARACTER_PITCH_LIMITS,
  MUSIC_TYPES,
  loadConfig,
  SPEAKERS,
  FORMAT_SPEC,
  DEFAULT_MEMORIZATION_VOICE,
  DEFAULT_CHARACTER_VOICE,
  readAutomationState,
  dailySchedulerFile,
  listEpisodes,
  seriesPlaylist,
  dailyResearchSettings,
  isBusy,
  memorizationVoice,
  speakerVoice,
  type MusicType,
} from '@kantor/shared';
import { hapusMusik, masukkanSemuaKePlaylist, simpanMusik, simpanPlaylist, simpanRisetHarian, simpanSuaraKarakter } from '../actions';
import { BagianLipat } from '@/components/BagianLipat';
import { Tombol } from '@/components/Tombol';

const NAMA_SPEAKERS = { narrator: '📖 Narator', mother: '🧕 Ibu', mamas: '👦 Mamas', mochi: '🐱 Mochi', memorization: '🕌 Bacaan hafalan' } as const;

export const dynamic = 'force-dynamic';

const INFO: Record<MusicType, { title: string; part: string }> = {
  intro: { title: '🎵 Musik pembuka', part: 'intro' },
  outro: { title: '🎶 Musik penutup', part: 'outro' },
} as const;

export default function Pengaturan() {
  return (
    <div className="stack">
      <div>
        <h1>⚙️ Pengaturan</h1>
        <div className="muted">Klik judul bagian untuk membuka atau menutupnya.</div>
      </div>
      <div className="stack daftar-page">
        {MUSIC_TYPES.map((jenis) => (
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
function PengaturanMusik({ jenis }: { jenis: (typeof MUSIC_TYPES)[number] }) {
  const musik = loadConfig().music;
  const { standard: biasa, short } = FORMAT_SPEC;
  const file = musik?.[jenis];
  return (
    <BagianLipat id={`musik-${jenis}`} judul={INFO[jenis].title} ringkasan={file ? '✅ terpasang' : 'belum ada'}>
      <p className="muted kecil" style={{ margin: 0 }}>
        Diputar di {INFO[jenis].part} semua video baru (termasuk hafalan). {INFO[jenis].part === 'intro' ? 'Intro' : 'Outro'} otomatis
        memanjang mengikuti musik, maksimal {jenis === 'intro' ? biasa.maxIntroSeconds : biasa.maxOutroSeconds} detik untuk video biasa dan{' '}
        {jenis === 'intro' ? short.maxIntroSeconds : short.maxOutroSeconds} detik untuk Shorts; musik yang lebih panjang dipudarkan. Pakai musik
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
          Belum ada, {INFO[jenis].part} tanpa musik.
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
  const musik = loadConfig().music;
  const volume = Math.round((musik?.volume ?? 0.7) * 100);
  const diShorts = musik?.inShorts ?? true;
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
  const diubah = SPEAKERS.filter((p) => cfg.characterVoices?.[p]).length + (cfg.memorizationVoice ? 1 : 0);
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
        {[...SPEAKERS, 'memorization' as const].map((p) => {
          const s = p === 'memorization' ? memorizationVoice(cfg) : speakerVoice(p, cfg);
          const ket = p === 'memorization' ? DEFAULT_MEMORIZATION_VOICE.note : DEFAULT_CHARACTER_VOICE[p].note;
          return (
            <div key={p} className="baris-suara">
              <div>
                <b>{NAMA_SPEAKERS[p]}</b>
                <div className="kecil muted">bawaan: {ket}</div>
              </div>
              <div className="row" style={{ gap: 10, alignItems: 'end' }}>
                <label className="kecil">
                  Nada
                  <input
                    type="number"
                    name={`${p}-nada`}
                    min={CHARACTER_PITCH_LIMITS.min}
                    max={CHARACTER_PITCH_LIMITS.max}
                    step={0.5}
                    defaultValue={s.pitch}
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
        <Tombol teksProses="Menyimpan…">Simpan page suara</Tombol>
      </form>
    </BagianLipat>
  );
}

/** Playlist YouTube tujuan tiap seri. Video otomatis dimasukkan saat diupload. */
function PengaturanPlaylist() {
  const cfg = loadConfig();
  const tanpaSetelan = { ...cfg, seri: cfg.series.map(({ playlist: _, ...s }) => s) };
  const belum = listEpisodes().filter((e) => e.youtube && !e.youtube.playlist).length;
  const sibuk = isBusy('playlist');
  const dipakai = [...new Set(cfg.series.map((s) => seriesPlaylist(s.id, cfg)))];
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
        {cfg.series.map((s) => (
          <label key={s.id} className="kecil">
            {s.name}
            <input type="text" name={`playlist-${s.id}`} defaultValue={s.playlist ?? ''} placeholder={seriesPlaylist(s.id, tanpaSetelan)} />
          </label>
        ))}
        <Tombol className="sekunder" teksProses="Menyimpan…">Simpan playlist</Tombol>
      </form>
      <div className="kecil">
        {dipakai.map((nama) => {
          const id = cfg.youtubePlaylists?.[nama];
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
  const atur = dailyResearchSettings(cfg);
  const terpasang = fs.existsSync(dailySchedulerFile());
  const c = readAutomationState();
  const HASIL = { ok: '✅ berhasil', failed: '❌ gagal', running: '⏳ sedang berjalan' } as const;
  return (
    <BagianLipat
      id="riset-harian"
      judul="🔎 Riset ide otomatis"
      ringkasan={atur.active && terpasang ? `Aktif · ${atur.time} · min. ${atur.ideaCount} ide` : 'Nonaktif'}
    >
      <form action={simpanRisetHarian} className="stack">
        <p className="muted kecil" style={{ margin: 0 }}>
          Content Research mencari ide sendiri setiap hari, pertama kali setelah jam yang diatur. Ide baru muncul di kolom Ide di Papan Kerja.
          Kalau komputer sedang tidur pada jam itu, riset jalan begitu komputer menyala lagi (sekali per hari). Komputer harus menyala dan
          login supaya riset bisa jalan.
        </p>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" name="aktif" defaultChecked={atur.active && terpasang} /> Aktif
        </label>
        <div className="row" style={{ gap: 12 }}>
          <label className="kecil">
            Jam ({cfg.timeZone})
            <input type="time" name="jam" defaultValue={atur.time} style={{ width: 120 }} />
          </label>
          <label className="kecil">
            Minimal ide per hari
            <input type="number" name="jumlahIde" min={1} max={8} defaultValue={atur.ideaCount} style={{ width: 80 }} />
          </label>
        </div>
        <div className="kecil">
          Penjadwal: {terpasang ? '🟢 terpasang' : '⚪ belum terpasang (centang Aktif lalu Simpan)'}
          {c.date ? (
            <div className="muted">
              Riset otomatis terakhir: {c.date} · {c.result ? HASIL[c.result] : ''}
              {c.message ? ` · ${c.message}` : ''}
            </div>
          ) : null}
        </div>
        <Tombol className="sekunder" teksProses="Menyimpan…">Simpan riset otomatis</Tombol>
      </form>
    </BagianLipat>
  );
}
