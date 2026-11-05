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
  BACKGROUNDS,
  BACKGROUND_LABEL,
  CHARACTERS,
  CHARACTER_LOOK_LABEL,
  DEFAULT_CHARACTER_PROFILES,
  EDITABLE_PROMPTS,
  allowedBackgrounds,
  backgroundLabel,
  characterLooks,
  characterProfile,
  paths,
} from '@kantor/shared';
import {
  deleteMusic,
  addAllToPlaylists,
  saveMusicSettings,
  savePlaylists,
  saveDailyResearch,
  saveCharacterVoices,
  saveAgentPrompt,
  saveCharacters,
  saveBackgrounds,
  saveVisualStyle,
} from '../actions';
import path from 'node:path';
import { Collapsible } from '@/components/Collapsible';
import { SubmitButton } from '@/components/SubmitButton';

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
        <PengaturanNiche />
        <PengaturanKarakter />
        <PengaturanLatar />
        <PengaturanGayaVisual />
        {MUSIC_TYPES.map((jenis) => (
          <PengaturanMusik key={jenis} jenis={jenis} />
        ))}
        <PengaturanVolume />
        <PengaturanSuara />
        <PengaturanPlaylist />
        <PengaturanRisetHarian />
        <PengaturanInstruksi />
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
    <Collapsible id={`musik-${jenis}`} judul={INFO[jenis].title} ringkasan={file ? '✅ terpasang' : 'belum ada'}>
      <p className="muted kecil" style={{ margin: 0 }}>
        Diputar di {INFO[jenis].part} semua video baru (termasuk hafalan). {INFO[jenis].part === 'intro' ? 'Intro' : 'Outro'} otomatis
        memanjang mengikuti musik, maksimal {jenis === 'intro' ? biasa.maxIntroSeconds : biasa.maxOutroSeconds} detik untuk video biasa dan{' '}
        {jenis === 'intro' ? short.maxIntroSeconds : short.maxOutroSeconds} detik untuk Shorts; musik yang lebih panjang dipudarkan. Pakai musik
        buatan sendiri atau yang lisensinya jelas. Video yang sudah dirender tidak berubah.
      </p>
      {file ? (
        <>
          <audio controls src={`/api/music/${jenis}?v=${encodeURIComponent(file)}`} style={{ width: '100%' }} />
          <form action={deleteMusic}>
            <input type="hidden" name="jenis" value={jenis} />
            <SubmitButton className="bahaya" teksProses="Menghapus…">
              Hapus musik {jenis}
            </SubmitButton>
          </form>
        </>
      ) : (
        <p className="muted kecil" style={{ margin: 0 }}>
          Belum ada, {INFO[jenis].part} tanpa musik.
        </p>
      )}
      <form action={`/api/music/${jenis}`} method="post" encType="multipart/form-data" className="stack">
        <input type="file" name="musik" accept=".mp3,.m4a,.wav,.aac,.ogg" required />
        <SubmitButton className="sekunder" teksProses="Mengupload…">
          {file ? 'Ganti' : 'Upload'} musik {jenis}
        </SubmitButton>
      </form>
    </Collapsible>
  );
}

function PengaturanVolume() {
  const musik = loadConfig().music;
  const volume = Math.round((musik?.volume ?? 0.7) * 100);
  const diShorts = musik?.inShorts ?? true;
  return (
    <Collapsible id="volume" judul="🔊 Volume musik & Shorts" ringkasan={`${volume}% · ${diShorts ? 'juga di Shorts' : 'tanpa di Shorts'}`}>
      <form action={saveMusicSettings} className="stack">
        <label>
          Volume musik ({volume}%)
          <input type="range" name="volume" min={0} max={100} step={5} defaultValue={volume} />
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" name="diShorts" defaultChecked={diShorts} />
          Pakai juga di Shorts
        </label>
        <SubmitButton teksProses="Menyimpan…">Simpan</SubmitButton>
      </form>
    </Collapsible>
  );
}

/** Efek suara per pembicara & bacaan hafalan. */
function PengaturanSuara() {
  const cfg = loadConfig();
  const diubah = SPEAKERS.filter((p) => cfg.characterVoices?.[p]).length + (cfg.memorizationVoice ? 1 : 0);
  return (
    <Collapsible
      id="suara"
      judul="🎭 Suara karakter & hafalan"
      ringkasan={diubah ? `${diubah} suara diatur sendiri` : 'semua bawaan'}
    >
      <form action={saveCharacterVoices} className="stack">
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
        <SubmitButton teksProses="Menyimpan…">Simpan page suara</SubmitButton>
      </form>
    </Collapsible>
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
    <Collapsible
      id="playlist"
      judul="📂 Playlist YouTube"
      ringkasan={`${dipakai.length} playlist · ${belum ? `${belum} video belum masuk` : 'semua video sudah masuk'}`}
    >
      <p className="muted kecil" style={{ margin: 0 }}>
        Setiap video yang diupload langsung dimasukkan ke playlist sesuai seri/tipenya (video biasa & Shorts). Playlist dicari berdasarkan
        nama di channel; kalau belum ada, dibuat otomatis (publik). Kosongkan untuk memakai bawaan.
      </p>
      <form action={savePlaylists} className="stack" style={{ gap: 8 }}>
        {cfg.series.map((s) => (
          <label key={s.id} className="kecil">
            {s.name}
            <input type="text" name={`playlist-${s.id}`} defaultValue={s.playlist ?? ''} placeholder={seriesPlaylist(s.id, tanpaSetelan)} />
          </label>
        ))}
        <SubmitButton className="sekunder" teksProses="Menyimpan…">Simpan playlist</SubmitButton>
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
        <form action={addAllToPlaylists}>
          <SubmitButton className="sekunder" teksProses="Memproses…">📂 Masukkan {belum} video yang sudah diupload ke playlist</SubmitButton>
        </form>
      ) : (
        <p className="kecil muted" style={{ margin: 0 }}>
          Semua video yang sudah diupload sudah masuk playlist.
        </p>
      )}
    </Collapsible>
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
    <Collapsible
      id="riset-harian"
      judul="🔎 Riset ide otomatis"
      ringkasan={atur.active && terpasang ? `Aktif · ${atur.time} · min. ${atur.ideaCount} ide` : 'Nonaktif'}
    >
      <form action={saveDailyResearch} className="stack">
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
        <SubmitButton className="sekunder" teksProses="Menyimpan…">Simpan riset otomatis</SubmitButton>
      </form>
    </Collapsible>
  );
}

type PromptName = keyof typeof EDITABLE_PROMPTS;

function bacaPrompt(nama: PromptName): string {
  try {
    return fs.readFileSync(path.join(paths.prompts(), `${nama}.md`), 'utf8');
  } catch {
    return '';
  }
}

/** Satu form untuk mengedit file instruksi agen. */
function FormPrompt({ nama, baris = 18 }: { nama: PromptName; baris?: number }) {
  return (
    <form action={saveAgentPrompt} className="stack">
      <input type="hidden" name="nama" value={nama} />
      <textarea name="isi" defaultValue={bacaPrompt(nama)} rows={baris} required minLength={20} className="teks-prompt" />
      <SubmitButton type="submit" teksProses="Menyimpan…">
        💾 Simpan
      </SubmitButton>
    </form>
  );
}

/** Niche channel: pedoman yang dibaca semua pegawai (misi, target usia, gaya bahasa, aturan). */
function PengaturanNiche() {
  const isi = bacaPrompt('pedoman-channel');
  const misi = isi.match(/## Misi\s+([^\n]+)/)?.[1];
  return (
    <Collapsible id="niche" judul="🎯 Niche & pedoman channel" ringkasan={misi ? `${misi.slice(0, 70)}…` : 'tema, target penonton, aturan konten'}>
      <p className="muted kecil" style={{ margin: 0 }}>
        Tema dan arah channel: misi, target usia, gaya bahasa, dan aturan konten. <b>Dibaca semua pegawai</b>: Riset mencari ide sesuai
        niche ini, Penulis menulis dengan gayanya, Reviewer memeriksa aturannya. Berlaku untuk pekerjaan berikutnya; episode yang sudah
        jadi tidak berubah. Karakter & latar diatur di bagian sendiri.
      </p>
      <FormPrompt nama="pedoman-channel" baris={24} />
    </Collapsible>
  );
}

/** Nama, sifat, dan warna tokoh. */
function PengaturanKarakter() {
  const cfg = loadConfig();
  const looks = characterLooks(cfg);
  const diubah = SPEAKERS.filter((id) => cfg.characters?.[id]).length + CHARACTERS.filter((id) => cfg.characterLooks?.[id]).length;
  const nama = SPEAKERS.map((id) => characterProfile(cfg, id).name).join(', ');
  return (
    <Collapsible id="karakter" judul="🧒 Karakter" ringkasan={diubah ? `${nama} · diatur sendiri` : `${nama} · bawaan`}>
      <form action={saveCharacters} className="stack">
        <p className="muted kecil" style={{ margin: 0 }}>
          <b>Nama & sifat</b> dibaca Penulis dan Sutradara untuk naskah berikutnya. <b>Warna</b> dipakai di video & thumbnail yang dirender
          setelah ini (bayangan & kilap ikut menyesuaikan); video lama perlu dirender ulang. Bentuk gambar tokoh tetap sama.
        </p>
        {/* drawn characters first, the narrator (voice only) last */}
        {[...CHARACTERS, 'narrator' as const].map((id) => {
          const p = characterProfile(cfg, id);
          const def = DEFAULT_CHARACTER_PROFILES[id];
          const warna = (CHARACTERS as readonly string[]).includes(id) ? looks[id as (typeof CHARACTERS)[number]] : undefined;
          return (
            <fieldset key={id} className="kartu-karakter stack">
              <legend>
                <b>{NAMA_SPEAKERS[id]}</b>
              </legend>
              <label className="kecil">
                Nama
                <input type="text" name={`${id}-nama`} defaultValue={p.name} placeholder={def.name} maxLength={30} />
              </label>
              <label className="kecil">
                Penampilan & sifat
                <textarea name={`${id}-sifat`} defaultValue={p.description} placeholder={def.description} rows={3} />
              </label>
              {warna ? (
                <div className="row" style={{ gap: 14, alignItems: 'end', flexWrap: 'wrap' }}>
                  {Object.entries(warna).map(([part, value]) => (
                    <label key={part} className="kecil pilih-warna">
                      {CHARACTER_LOOK_LABEL[part] ?? part}
                      <input type="color" name={`${id}-${part}`} defaultValue={value} />
                    </label>
                  ))}
                  <label className="kecil" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input type="checkbox" name={`${id}-reset`} /> warna asli
                  </label>
                </div>
              ) : (
                <span className="kecil muted">Hanya suara, tidak digambar.</span>
              )}
            </fieldset>
          );
        })}
        <p className="muted kecil" style={{ margin: 0 }}>
          Kosongkan nama / sifat untuk kembali ke bawaan. Suara tiap tokoh diatur di bagian &quot;Suara karakter & hafalan&quot;.
        </p>
        <SubmitButton type="submit" teksProses="Menyimpan…">
          💾 Simpan karakter
        </SubmitButton>
      </form>
    </Collapsible>
  );
}

/** Latar yang boleh dipakai Sutradara + nama tampilannya. */
function PengaturanLatar() {
  const cfg = loadConfig();
  const aktif = new Set(allowedBackgrounds(cfg));
  return (
    <Collapsible id="latar" judul="🏞️ Latar animasi" ringkasan={`${aktif.size} dari ${BACKGROUNDS.length} aktif`}>
      <form action={saveBackgrounds} className="stack">
        <p className="muted kecil" style={{ margin: 0 }}>
          Sutradara hanya memakai latar yang dicentang untuk adegan berikutnya (minimal satu). Nama tampilan dipakai di dashboard dan
          dibaca Sutradara.
        </p>
        <div className="grid-latar">
          {BACKGROUNDS.map((b) => (
            <div key={b} className="baris-latar">
              <input type="checkbox" name={`aktif-${b}`} defaultChecked={aktif.has(b)} aria-label={`Aktifkan ${backgroundLabel(cfg, b)}`} />
              <input type="text" name={`nama-${b}`} defaultValue={backgroundLabel(cfg, b)} placeholder={BACKGROUND_LABEL[b]} maxLength={30} />
              <code className="kecil muted">{b}</code>
            </div>
          ))}
        </div>
        <SubmitButton type="submit" teksProses="Menyimpan…">
          💾 Simpan latar
        </SubmitButton>
      </form>
    </Collapsible>
  );
}

/** Instruksi tiap pegawai AI (lanjutan). */
function PengaturanInstruksi() {
  const nama = (Object.keys(EDITABLE_PROMPTS) as PromptName[]).filter((n) => n !== 'pedoman-channel');
  return (
    <Collapsible id="instruksi" judul="🧠 Instruksi per pegawai (lanjutan)" ringkasan={`${nama.length} pegawai`}>
      <p className="muted kecil" style={{ margin: 0 }}>
        Instruksi kerja tiap pegawai AI. Ubah kalau niche berganti dan instruksinya masih menyebut tema lama. Hati-hati: bagian yang
        menyebut nama kolom (misal <code>background</code>, <code>screenText</code>) dipakai sistem, jangan dihapus.
      </p>
      {nama.map((n) => (
        <details key={n} className="instruksi-pegawai">
          <summary>{EDITABLE_PROMPTS[n]}</summary>
          <FormPrompt nama={n} />
        </details>
      ))}
    </Collapsible>
  );
}

/** Gaya visual bawaan: animasi saja, atau ditambah ilustrasi AI untuk adegan penting. */
function PengaturanGayaVisual() {
  const gaya = loadConfig().visualStyle ?? 'animation';
  return (
    <Collapsible id="gaya-visual" judul="🎨 Gaya visual video" ringkasan={gaya === 'ai-illustration' ? 'animasi + ilustrasi AI' : 'animasi saja'}>
      <form action={saveVisualStyle} className="stack">
        <p className="muted kecil" style={{ margin: 0 }}>
          <b>Animasi saja</b>: tokoh & latar yang digambar (seperti sekarang). <b>Animasi + ilustrasi AI</b>: adegan penting (kisah yang
          diceritakan, kejadian/benda yang dibahas) diberi gambar kejadiannya, gratis lewat Cloudflare dengan jatah harian; kalau jatah
          habis, adegan itu tetap animasi. Ilustrasinya dibuat dari halaman episode dan bisa diatur per episode.
        </p>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {(['animation', 'ai-illustration'] as const).map((g) => (
            <label key={g} className="kecil" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="radio" name="gaya" value={g} defaultChecked={gaya === g} />
              {g === 'animation' ? '🎞️ Animasi saja' : '🖼️ Animasi + ilustrasi AI'}
            </label>
          ))}
        </div>
        <SubmitButton type="submit" teksProses="Menyimpan…">
          💾 Simpan gaya visual
        </SubmitButton>
      </form>
    </Collapsible>
  );
}
