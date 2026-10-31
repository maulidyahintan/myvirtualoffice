import fs from 'node:fs';
import path from 'node:path';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  BACKGROUND_LABEL,
  EXPRESSION_LABEL,
  SCENE_TYPE_LABEL,
  SPEAKER_LABEL,
  SHORTS_LIMIT_SECONDS,
  checkMetadata,
  contentDuration,
  autoShortsCount,
  FORMAT_LABEL,
  getEpisode,
  listEpisodes,
  loadConfig,
  DAY_NAMES,
  playlistName,
  paths,
  recommendSchedule,
  isBusy,
  BUSY_STATUSES,
  FORMAT_CHOICES,
  FORMAT_CHOICE_LABEL,
  type Episode,
} from '@kantor/shared';
import {
  regenerateMetadata,
  createAlternateFormat,
  splitIntoShorts,
  reopenForEdit,
  deleteRecordings,
  changeRecordingMode,
  requestRevision,
  recover,
  renderVideo,
  approveScript,
  approveVideo,
  saveManualScript,
  saveMemorizationTiming,
  reject,
  writeScript,
} from '../../actions';
import { AutoRefresh } from '@/components/AutoRefresh';
import { Badge } from '@/components/Badge';
import { AskAgentButton } from '@/components/AskAgentButton';
import { SubmitButton } from '@/components/SubmitButton';

export const dynamic = 'force-dynamic';

/** Pilih cara mengirim rekaman: berurutan (1 file / beberapa bagian) atau per scene. */
function PilihModeRekam({ ep }: { ep: Episode }) {
  const mode = ep.recordingMode ?? 'sequential';
  const satuan = ep.idea.type === 'memorization' ? 'ayat' : 'adegan';
  const pilihan = [
    {
      mode: 'sequential',
      label: '📼 Berurutan',
      note: 'satu file, atau beberapa bagian (mis. per 2 menit)',
    },
    {
      mode: 'per-scene',
      label: `🎬 Per ${satuan}`,
      note: `satu file untuk tiap ${satuan}, durasi ${satuan} ikut persis`,
    },
  ] as const;
  return (
    <div className="stack" style={{ gap: 8 }}>
      <b className="kecil">Cara mengirim rekaman:</b>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {pilihan.map((p) => (
          <form key={p.mode} action={changeRecordingMode} style={{ flex: '1 1 220px' }}>
            <Id id={ep.id} />
            <input type="hidden" name="mode" value={p.mode} />
            <SubmitButton type="submit" className={mode === p.mode ? '' : 'sekunder'} style={{ width: '100%', textAlign: 'left' }}>
              {p.label}
              <br />
              <span style={{ fontWeight: 400, fontSize: 13 }}>{p.note}</span>
            </SubmitButton>
          </form>
        ))}
      </div>
    </div>
  );
}

/** Upload rekaman per scene (memorization: per verse). Bisa juga dipakai untuk merekam ulang satu scene saja. */
function RekamanPerAdegan({ ep }: { ep: Episode }) {
  const hafalan = ep.idea.type === 'memorization';
  const satuan = hafalan ? 'Ayat' : 'Adegan';
  const ulang = ep.idea.memorization?.repetitions ?? 1;
  const daftar = hafalan
    ? (ep.memorization?.verses ?? []).map((a) => ({
        title: a.number === 0 ? 'Basmalah' : `Ayat ${a.number}${ulang > 1 ? ` (baca ${ulang}x, jeda ±1 detik)` : ''}`,
        text: a.latin,
      }))
    : (ep.scenes ?? []).map((a, i) => ({
        title: `Adegan ${i + 1}${a.type === 'question' ? ' (jeda berpikir ±3 detik ditambahkan otomatis)' : ''}`,
        text: a.narration,
      }));
  const per = ep.audioPerScene ?? [];
  const sudah = daftar.filter((_, i) => per[i]).length;
  return (
    <div className="stack">
      <p className="kecil muted" style={{ margin: 0 }}>
        {sudah} dari {daftar.length} {satuan.toLowerCase()} sudah direkam. Upload satu per satu; bisa diganti kapan saja.
      </p>
      {daftar.map((d, i) => (
        <div
          key={i}
          id={`adegan-${i + 1}`}
          className="stack"
          style={{
            gap: 6,
            padding: 10,
            border: '1px solid var(--line)',
            borderRadius: 10,
          }}
        >
          <div className="kecil">
            <b>
              {per[i] ? '✅' : '⬜'} {d.title}
            </b>
            <div className="muted" style={{ marginTop: 4 }}>
              {d.text}
            </div>
          </div>
          {per[i] ? (
            <audio
              controls
              preload="none"
              src={`/api/audio/${ep.id}?adegan=${i}&v=${encodeURIComponent(per[i]!)}`}
              style={{ width: '100%', height: 36 }}
            />
          ) : null}
          <form
            action={`/api/audio/${ep.id}`}
            method="post"
            encType="multipart/form-data"
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <input type="hidden" name="adegan" value={i} />
            <input type="file" name="audio" accept=".mp3,.m4a,.wav,.aac,.ogg,audio/*" required style={{ flex: '1 1 200px' }} />
            <SubmitButton teksProses="Mengupload…" type="submit" className="sekunder">
              {per[i] ? 'Ganti' : 'Upload'}
            </SubmitButton>
          </form>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <form action={renderVideo}>
          <Id id={ep.id} />
          <SubmitButton type="submit" disabled={sudah < daftar.length} teksProses="Memulai render…">
            🎬{' '}
            {sudah < daftar.length ? `Render (kurang ${daftar.length - sudah} ${satuan.toLowerCase()})` : 'Semua lengkap, render sekarang'}
          </SubmitButton>
        </form>
        {sudah ? (
          <form action={deleteRecordings}>
            <Id id={ep.id} />
            <SubmitButton type="submit" className="bahaya" teksProses="Menghapus…">
              🗑️ Hapus semua rekaman
            </SubmitButton>
          </form>
        ) : null}
      </div>
    </div>
  );
}

/** Upload rekaman per part: kirim bagian demi bagian, lalu render setelah lengkap. */
function RekamanBagian({ ep }: { ep: Episode }) {
  const bagian = ep.audioParts ?? [];
  return (
    <div className="stack">
      {bagian.length ? (
        <div className="stack" style={{ gap: 8 }}>
          <b className="kecil">Rekaman terkirim ({bagian.length} bagian):</b>
          {bagian.map((b, i) => (
            <div key={b} className="kecil">
              Bagian {i + 1}
              <audio controls preload="none" src={`/api/audio/${ep.id}?bagian=${i}`} style={{ width: '100%', height: 36 }} />
            </div>
          ))}
        </div>
      ) : null}
      <form action={`/api/audio/${ep.id}`} method="post" encType="multipart/form-data" className="stack">
        <input type="hidden" name="mode" value="lanjut" />
        <input type="file" name="audio" accept=".mp3,.m4a,.wav,.aac,.ogg,audio/*" multiple required />
        <span className="kecil muted">
          {bagian.length ? `File ini jadi bagian ${bagian.length + 1} dan seterusnya. ` : ''}
          Boleh pilih beberapa file sekaligus; diurutkan menurut nama file (1, 2, 3…).
        </span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <SubmitButton type="submit" name="render" value="1" teksProses="Mengupload…">
            ⬆️ Upload & render
          </SubmitButton>
          <SubmitButton type="submit" name="render" value="0" className="sekunder" teksProses="Mengupload…">
            ➕ Upload, masih ada bagian berikutnya
          </SubmitButton>
        </div>
      </form>
      {bagian.length ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <form action={renderVideo}>
            <Id id={ep.id} />
            <SubmitButton type="submit" teksProses="Memulai render…">🎬 Sudah lengkap, render sekarang</SubmitButton>
          </form>
          <form action={deleteRecordings}>
            <Id id={ep.id} />
            <SubmitButton type="submit" className="bahaya" teksProses="Menghapus…">
              🗑️ Hapus semua bagian
            </SubmitButton>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function ekorLog(id: string, baris = 40) {
  const f = path.join(paths.logs(), `${id}.log`);
  if (!fs.existsSync(f)) return '';
  return fs.readFileSync(f, 'utf8').split('\n').slice(-baris).join('\n');
}

function besokJamTayang(jam: string) {
  const d = new Date(Date.now() + 86400_000);
  const tgl = new Intl.DateTimeFormat('en-CA', {
    timeZone: loadConfig().timeZone,
  }).format(d);
  return `${tgl}T${jam}`;
}

/** Input jadwal tayang, terisi rekomendasi Channel Manager (slot kosong berikutnya); tetap bisa diganti. */
function JadwalTayang({ ep }: { ep: Episode }) {
  const cfg = loadConfig();
  const saran = recommendSchedule(listEpisodes(), cfg).get(ep.id);
  const [tgl, jam] = saran?.local.split('T') ?? [];
  const tanggal = tgl ? new Date(`${tgl}T00:00:00Z`) : undefined;
  return (
    <label>
      Jadwal tayang ({cfg.timeZone})
      <input type="datetime-local" name="jadwal" defaultValue={saran?.local ?? besokJamTayang(cfg.defaultPublishTime)} required />
      <span className="kecil muted" style={{ fontWeight: 'normal' }}>
        {saran && tanggal ? (
          <>
            📅 Rekomendasi Channel Manager: <b>{DAY_NAMES[tanggal.getUTCDay()]}, {tanggal.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', timeZone: 'UTC' })} pukul {jam}</b>{' '}
            (slot kosong berikutnya di <Link href="/schedule">rencana tayang</Link>). Boleh diganti sesukamu.
          </>
        ) : (
          <>
            Belum ada slot kosong di <Link href="/schedule">rencana tayang</Link>; diisi jam tayang bawaan.
          </>
        )}
      </span>
    </label>
  );
}

const Id = ({ id }: { id: string }) => <input type="hidden" name="id" value={id} />;

function PanelAksi({ ep }: { ep: Episode }) {
  const cfg = loadConfig();
  if (BUSY_STATUSES.includes(ep.status)) {
    return (
      <div className="panel aksi">
        <h2>⏳ Agen sedang bekerja</h2>
        <p className="muted">{ep.statusNote}</p>
        <p className="kecil muted">Halaman ini menyegarkan diri otomatis. Kamu boleh menutupnya.</p>
      </div>
    );
  }

  switch (ep.status) {
    case 'idea':
      return (
        <div className="panel aksi stack">
          <h2>Langkah berikutnya: tulis naskah</h2>
          <form action={writeScript} className="stack">
            <Id id={ep.id} />
            <label className="kecil">
              Format video{' '}
              <select name="format" defaultValue={ep.idea.format ?? 'standard'}>
                {FORMAT_CHOICES.map((f) => (
                  <option key={f} value={f}>
                    {FORMAT_CHOICE_LABEL[f]}
                  </option>
                ))}
              </select>
            </label>
            <span className="kecil muted">
              Pilih <b>Keduanya</b> untuk membuat dua episode sekaligus dari materi ini: video biasa dan Shorts, dikerjakan bersamaan.
            </span>
            <SubmitButton type="submit">{ep.idea.type === 'memorization' ? '📖 Setujui & ambil teks surat' : '✍️ Setujui & tugaskan Penulis + Reviewer'}</SubmitButton>
          </form>
          <FormTolak id={ep.id} />
        </div>
      );

    case 'needs_script_approval':
      return (
        <div className="panel aksi stack">
          <h2>Periksa & setujui naskah</h2>
          {ep.review ? (
            <div>
              <div className="row">
                <b>Skor reviewer: {ep.review.score}/10</b>
                <span className={`badge ${ep.review.decision === 'approved' ? 'selesai' : 'error'}`}>{ep.review.decision}</span>
              </div>
              {ep.review.decision === 'needs_revision' ? (
                <p className="peringatan kecil">
                  Reviewer masih minta revisi setelah batas revisi otomatis. Baca catatannya sebelum menyetujui.
                </p>
              ) : null}
              <h3 style={{ marginTop: 12 }}>Wajib kamu cek sendiri:</h3>
              <ul className="cek">
                {ep.review.humanCheck.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <form action={approveScript} className="stack">
            <Id id={ep.id} />
            <label className="row" style={{ fontWeight: 600 }}>
              <input type="checkbox" name="dalilDicek" required />
              Saya sudah memverifikasi semua ayat, hadits & doa (teks dan sumbernya).
            </label>
            <SubmitButton type="submit" teksProses="Menyimpan…">✅ Setujui naskah → Sutradara</SubmitButton>
          </form>
          {ep.idea.type === 'memorization' ? null : (
            <form action={requestRevision} className="stack">
              <Id id={ep.id} />
              <label>
                Atau minta revisi:
                <textarea
                  name="feedback"
                  placeholder="contoh: adegan 3 terlalu panjang, ganti doa dengan doa keluar rumah, Nara lebih lucu"
                  required
                />
              </label>
              <SubmitButton type="submit" className="sekunder">
                🔁 Kirim ke Penulis
              </SubmitButton>
            </form>
          )}
          <FormTolak id={ep.id} />
        </div>
      );

    case 'needs_audio':
      return (
        <div className="panel aksi stack">
          <h2>🎙️ Rekam suaramu</h2>
          {ep.idea.type === 'memorization' ? (
            <ol className="kecil" style={{ margin: 0, paddingLeft: 18 }}>
              <li>
                Rekam di ruangan sepi pakai HP, dalam satu file atau <b>beberapa bagian</b> (potong di jeda, bukan di tengah ayat).
              </li>
              {ep.memorization?.verses[0]?.number === 0 ? <li>Mulai dengan basmalah (sekali).</li> : null}
              <li>
                Baca ayat {ep.memorization?.verses.find((a) => a.number > 0)?.number} sampai {ep.memorization?.verses.at(-1)?.number} berurutan
                {(ep.idea.memorization?.repetitions ?? 1) > 1 ? (
                  <>
                    , <b>tiap ayat diulang {ep.idea.memorization?.repetitions}x</b>
                  </>
                ) : null}
                .
              </li>
              <li>
                <b>Beri jeda ±1 detik setelah setiap bacaan</b>. Dari jeda inilah video tahu kapan pindah ke bacaan berikutnya.
              </li>
              <li>Upload file (mp3, m4a, wav). Waktunya bisa dikoreksi setelah render kalau ada yang meleset.</li>
            </ol>
          ) : (
            <ol className="kecil" style={{ margin: 0, paddingLeft: 18 }}>
              <li>Rekam di ruangan sepi pakai HP (aplikasi perekam bawaan cukup).</li>
              <li>
                Bacakan narasi adegan 1 sampai akhir <b>berurutan</b>, jeda ±1 detik antar adegan. Boleh satu file atau beberapa bagian
                (mis. per 2 menit, potong di jeda antar kalimat).
              </li>
              <li>Untuk adegan pertanyaan, beri jeda ±3 detik setelah bertanya.</li>
              <li>Upload file (mp3, m4a, wav). Video otomatis dirender menyesuaikan durasi suaramu.</li>
            </ol>
          )}
          <Link href={`/episode/${ep.id}/studio`} className="tombol" style={{ textAlign: 'center' }}>
            🎙️ Buka Studio Rekam (rekam sambil lihat video, atur nada)
          </Link>
          <PilihModeRekam ep={ep} />
          {ep.recordingMode === 'per-scene' ? <RekamanPerAdegan ep={ep} /> : <RekamanBagian ep={ep} />}
          <form action={renderVideo}>
            <Id id={ep.id} />
            <SubmitButton type="submit" className="sekunder" teksProses="Memulai render…">
              👀 Render pratinjau tanpa suara
            </SubmitButton>
          </form>
        </div>
      );

    case 'needs_video_approval':
      return (
        <div className="panel aksi stack">
          <h2>Tonton & setujui video</h2>
          <p className="kecil muted">
            Video diupload sebagai <b>Made for Kids</b>, kategori Pendidikan, dan langsung masuk playlist <b>{playlistName(ep, cfg)}</b>. Dengan jadwal, video tayang otomatis.
          </p>
          <form action={approveVideo} className="stack">
            <Id id={ep.id} />
            <JadwalTayang ep={ep} />
            <SubmitButton type="submit" teksProses="Mengupload ke YouTube…">🚀 Setujui & jadwalkan di YouTube</SubmitButton>
          </form>
          <form action={approveVideo}>
            <Id id={ep.id} />
            <SubmitButton type="submit" className="sekunder" teksProses="Mengupload…">
              Upload sebagai private saja (atur di Studio)
            </SubmitButton>
          </form>
          <VideoLama ep={ep} />
          {!ep.audioFile ? <p className="peringatan kecil">Ini masih pratinjau tanpa suara. Upload rekaman dulu sebelum tayang.</p> : null}
          {ep.idea.type === 'memorization' && ep.audioFile ? (
            <details>
              <summary>Waktu tiap bacaan meleset? Koreksi di sini</summary>
              <form action={saveMemorizationTiming} className="stack" style={{ marginTop: 10 }}>
                <Id id={ep.id} />
                <p className="kecil muted">
                  Detik mulai tiap bacaan di rekaman, dipisah koma ({ep.memorization?.segmentStarts?.length ?? '?'} bacaan).
                  {ep.memorization?.segmentStarts ? '' : ' Jeda tidak terdeteksi jelas, jadi video dibagi rata.'} Kosongkan untuk deteksi otomatis
                  lagi.
                </p>
                <input type="text" name="waktu" defaultValue={ep.memorization?.segmentStarts?.map((t) => t.toFixed(1)).join(', ') ?? ''} />
                <SubmitButton type="submit" className="sekunder" teksProses="Menyimpan…">
                  💾 Simpan & render ulang
                </SubmitButton>
              </form>
            </details>
          ) : null}
          <details>
            <summary>Rekam ulang / render ulang</summary>
            <p style={{ marginTop: 10 }}>
              <Link href={`/episode/${ep.id}/studio`}>🎙️ Buka Studio Rekam</Link> untuk merekam ulang adegan tertentu sambil melihat
              videonya, atau mengatur nada suara.
            </p>
            {ep.recordingMode === 'per-scene' ? (
              <div style={{ marginTop: 10 }}>
                <RekamanPerAdegan ep={ep} />
              </div>
            ) : (
              <form action={`/api/audio/${ep.id}`} method="post" encType="multipart/form-data" className="stack" style={{ marginTop: 10 }}>
                <input type="hidden" name="mode" value="ganti" />
                <input type="file" name="audio" accept=".mp3,.m4a,.wav,.aac,.ogg,audio/*" multiple required />
                <span className="kecil muted">Boleh pilih beberapa file sekaligus; diurutkan menurut nama file (1, 2, 3…).</span>
                <SubmitButton type="submit" className="sekunder" teksProses="Mengupload…">
                  ⬆️ Upload rekaman baru
                </SubmitButton>
              </form>
            )}
          </details>
          <FormTolak id={ep.id} />
        </div>
      );

    case 'scheduled':
    case 'published':
      return (
        <div className="panel aksi stack">
          <h2>{ep.status === 'scheduled' ? '📅 Terjadwal' : '✅ Terupload'}</h2>
          {ep.youtube ? (
            <a href={ep.youtube.url} target="_blank" rel="noreferrer">
              Buka di YouTube ↗
            </a>
          ) : null}
          {ep.youtube?.publishTime ? (
            <div className="muted">
              Tayang:{' '}
              {new Date(ep.youtube.publishTime).toLocaleString('id-ID', {
                timeZone: cfg.timeZone,
                dateStyle: 'full',
                timeStyle: 'short',
              })}
            </div>
          ) : null}
          <VersiLain ep={ep} />
          <PecahShorts ep={ep} />
          <EditUlang ep={ep} />
        </div>
      );

    case 'error':
    case 'rejected':
      return (
        <div className="panel aksi stack">
          <h2>{ep.status === 'error' ? '⚠️ Ada masalah' : 'Ditolak'}</h2>
          {ep.statusNote ? <p className="peringatan">{ep.statusNote}</p> : null}
          <form action={recover}>
            <Id id={ep.id} />
            <SubmitButton type="submit">↩️ Kembalikan ke langkah terakhir yang berhasil</SubmitButton>
          </form>
        </div>
      );
  }
}

/** Peringatan metadata yang tidak cocok dengan format video + tombol buat ulang. */
function CekMetadata({ ep }: { ep: Episode }) {
  if (!ep.metadata) return null;
  const masalah = checkMetadata(ep.metadata, ep.idea.format);
  const sibuk = isBusy(`${ep.id}-metadata`) || ep.status === 'rendering';
  const bolehUbah = !['uploading', 'scheduled', 'published'].includes(ep.status);
  return (
    <>
      {masalah.map((m) => (
        <p key={m} className="peringatan kecil" style={{ margin: 0 }}>
          {m}
        </p>
      ))}
      {bolehUbah ? (
        <form action={regenerateMetadata}>
          <Id id={ep.id} />
          <SubmitButton type="submit" className="sekunder" disabled={sibuk}>
            {sibuk ? '⏳ Channel Manager sedang menulis…' : `✍️ Buat ulang metadata ${ep.idea.format === 'short' ? 'Shorts' : 'video biasa'} (SEO)`}
          </SubmitButton>
        </form>
      ) : null}
    </>
  );
}

/** Buat versi format lain (Shorts ↔ video biasa) dengan materi & rekaman yang sama. */
function VersiLain({ ep }: { ep: Episode }) {
  const short = ep.idea.format === 'short';
  let adaPasangan = false;
  try {
    adaPasangan = Boolean(ep.twin && getEpisode(ep.twin));
  } catch {
    /* episode kembaran sudah dihapus */
  }
  if (adaPasangan || !ep.render) return null;
  // perkiraan panjang versi baru dari waktu adegan hasil render (intro/outro sedikit berbeda)
  const isi = contentDuration(ep);
  const menit = (d: number) => `${Math.floor(d / 60)}:${String(Math.round(d % 60)).padStart(2, '0')}`;
  // video panjang tidak disalin utuh jadi Shorts: YouTube hanya menganggap video vertikal ≤ 3 menit sebagai Shorts
  if (!short && isi !== undefined && isi > SHORTS_LIMIT_SECONDS) {
    return (
      <span className="kecil muted">
        📱 Video ini ±{menit(isi)}, terlalu panjang untuk disalin utuh jadi Shorts (YouTube hanya menganggap video vertikal sampai 3 menit
        sebagai Shorts).{' '}
        {ep.idea.type === 'memorization' ? '' : `Pakai "✂️ Pecah jadi beberapa Shorts" di bawah: diambil inti pembicaraannya saja.`}
      </span>
    );
  }
  return (
    <form action={createAlternateFormat} className="stack" style={{ gap: 6 }}>
      <Id id={ep.id} />
      <SubmitButton type="submit" className="sekunder">
        🔁 Buat versi {short ? 'video biasa (16:9)' : 'Shorts (vertikal)'} dari materi ini
      </SubmitButton>
      <span className="kecil muted">
        Naskah, adegan, dan rekaman suaranya sama; langsung dirender ke format {short ? 'video biasa' : 'Shorts'} tanpa rekam ulang (judul &
        deskripsi dibuat ulang sesuai format). Hasilnya jadi episode baru yang tertaut (🔗) dan bisa ditonton dulu sebelum dijadwalkan.
        {isi !== undefined ? ` Isi video ±${menit(isi)}.` : ''}
      </span>
    </form>
  );
}

/** Video biasa cerita → beberapa Shorts dari adegan yang paling penting (rekaman sama, tanpa rekam ulang). */
function PecahShorts({ ep }: { ep: Episode }) {
  if (ep.idea.format === 'short' || ep.idea.type === 'memorization' || !ep.render) return null;
  const turunan = (ep.derivatives ?? []).flatMap((t) => {
    try {
      return [getEpisode(t)];
    } catch {
      return [];
    }
  });
  const sibuk = isBusy(`shorts-${ep.id}`);
  return (
    <details open={sibuk || turunan.length > 0}>
      <summary>✂️ Pecah jadi beberapa Shorts (adegan penting saja)</summary>
      <div className="stack" style={{ marginTop: 10 }}>
        {turunan.length ? (
          <div className="kecil">
            Shorts dari video ini:
            <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
              {turunan.map((t) => (
                <li key={t.id}>
                  <Link href={`/episode/${t.id}`}>{t.script?.title ?? t.idea.title}</Link> <Badge status={t.status} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {sibuk ? (
          <p className="kecil">⏳ Sutradara sedang memilih adegan & menyiapkan Shorts… Shorts muncul di papan kerja lalu dirender satu per satu.</p>
        ) : (
          <form action={splitIntoShorts} className="stack" style={{ gap: 8 }}>
            <Id id={ep.id} />
            <p className="kecil muted" style={{ margin: 0 }}>
              Sutradara mengambil inti pembicaraannya saja: adegan yang paling penting & bermakna untuk tiap Shorts (masing-masing &lt; 60
              detik dan utuh bisa dipahami sendiri), lengkap dengan judulnya. Narasi & rekaman suaramu dipakai apa adanya, jadi tidak perlu rekam ulang. Tiap Shorts jadi
              episode baru yang bisa ditonton dulu sebelum dijadwalkan.
            </p>
            <label className="kecil">
              Jumlah Shorts{' '}
              <select name="jumlah" defaultValue="">
                <option value="">Otomatis ({autoShortsCount(contentDuration(ep))} Shorts untuk video ±{Math.round((contentDuration(ep) ?? 0) / 60)} menit)</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <textarea name="arahan" rows={2} placeholder="Arahan (opsional), misal: satu Shorts khusus tentang doa sebelum tidur" />
            <SubmitButton type="submit" className="sekunder">
              ✂️ Buat Shorts dari adegan penting
            </SubmitButton>
          </form>
        )}
      </div>
    </details>
  );
}

/** Minta revisi / edit ulang video yang sudah terjadwal atau tayang. */
function EditUlang({ ep }: { ep: Episode }) {
  const terjadwal = ep.status === 'scheduled';
  const tarik = (
    <label className="kecil row" style={{ gap: 6 }}>
      <input type="checkbox" name="tarik" defaultChecked={terjadwal} />
      {terjadwal ? 'Batalkan jadwal tayang sekarang (video lama jadi private)' : 'Sembunyikan video lama sekarang (jadi private)'}
    </label>
  );
  return (
    <details>
      <summary>✏️ Edit ulang / minta revisi</summary>
      <div className="stack" style={{ marginTop: 10 }}>
        <p className="kecil muted" style={{ margin: 0 }}>
          YouTube tidak bisa mengganti file video yang sudah diupload, jadi hasil edit diupload sebagai <b>video baru</b>. Video lama
          dijadikan <b>private</b> (tidak dihapus){terjadwal ? '' : '; penonton & komentarnya tetap ada di video lama'}. Kalau tidak
          dicentang, video lama baru disembunyikan setelah versi baru diupload.
        </p>
        <form action={reopenForEdit} className="stack" style={{ gap: 8 }}>
          <Id id={ep.id} />
          <input type="hidden" name="tujuan" value="video" />
          {tarik}
          <SubmitButton type="submit" className="sekunder">
            🎬 Edit video: rekam ulang / render ulang
          </SubmitButton>
        </form>
        <form action={reopenForEdit} className="stack" style={{ gap: 8 }}>
          <Id id={ep.id} />
          <input type="hidden" name="tujuan" value="naskah" />
          <textarea name="feedback" rows={3} placeholder="Apa yang perlu direvisi di naskah? (penulis akan menulis ulang, lalu rekam ulang)" required />
          {tarik}
          <SubmitButton type="submit" className="sekunder">
            📝 Minta revisi naskah
          </SubmitButton>
        </form>
      </div>
    </details>
  );
}

/** Upload lama dari episode yang diedit ulang. */
function VideoLama({ ep }: { ep: Episode }) {
  if (!ep.youtubeHistory?.length) return null;
  return (
    <div className="kecil muted">
      Versi sebelumnya di YouTube:{' '}
      {ep.youtubeHistory.map((v, i) => (
        <span key={v.videoId}>
          {i ? ', ' : ''}
          <a href={v.url} target="_blank" rel="noreferrer">
            {v.videoId}
          </a>{' '}
          ({v.withdrawn ? 'sudah private' : 'akan dijadikan private setelah versi baru diupload'})
        </span>
      ))}
    </div>
  );
}

function FormTolak({ id }: { id: string }) {
  return (
    <details>
      <summary>Tolak episode ini</summary>
      <form action={reject} className="row" style={{ marginTop: 8 }}>
        <Id id={id} />
        <input type="text" name="alasan" placeholder="alasan (opsional)" style={{ flex: 1 }} />
        <SubmitButton type="submit" className="bahaya" teksProses="Menolak…">
          Tolak
        </SubmitButton>
      </form>
    </details>
  );
}

export default async function HalamanEpisode({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let ep: Episode;
  try {
    ep = getEpisode(id);
  } catch {
    notFound();
  }
  const cfg = loadConfig();
  const seri = cfg.series.find((s) => s.id === ep.idea.series)?.name ?? ep.idea.series;
  const log = ekorLog(id);

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <Link href="/board" className="kecil">
            ← Papan kerja
          </Link>
          <h1>{ep.script?.title ?? ep.idea.title}</h1>
          <div className="row muted">
            <span>
              {seri} · usia {ep.idea.age} · {FORMAT_LABEL[ep.idea.format ?? 'standard']}
            </span>
            {ep.source ? (
              <Link href={`/episode/${ep.source.id}`} className="kecil">
                ✂️ Potongan dari video asal (adegan {ep.source.scenes.map((i) => i + 1).join(', ')})
              </Link>
            ) : null}
            {ep.twin ? (
              <Link href={`/episode/${ep.twin}`} className="kecil">
                🔗 Lihat versi {ep.idea.format === 'short' ? 'video biasa' : 'Shorts'}
              </Link>
            ) : null}
            <Badge status={ep.status} />
          </div>
        </div>
        <div className="row">
          <AskAgentButton />
          <AutoRefresh aktif={BUSY_STATUSES.includes(ep.status) || isBusy(`shorts-${ep.id}`) || isBusy(`${ep.id}-metadata`)} />
        </div>
      </div>

      <div className="grid2">
        <div className="stack">
          {ep.render ? (
            <div className="panel stack">
              <h2>Hasil render</h2>
              <video
                controls
                preload="metadata"
                src={`/api/media/${ep.render.video}?v=${ep.render.time}`}
                style={ep.idea.format === 'short' ? { maxWidth: 360, aspectRatio: '9 / 16', margin: '0 auto' } : undefined}
              />
              {ep.render.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="thumb" alt="thumbnail" src={`/api/media/${ep.render.thumbnail}?v=${ep.render.time}`} />
              ) : null}
            </div>
          ) : null}

          {ep.script ? (
            <div className="panel">
              <h2>Naskah</h2>
              <p className="muted">{ep.script.summary}</p>
              {(ep.scenes ?? ep.script.scenes).map((a, i) => (
                <div key={i} className="adegan">
                  <div className="nomor">{i + 1}</div>
                  <div>
                    <div className="kecil">
                      <span className="pembicara">{SPEAKER_LABEL[a.speaker]}</span> · {SCENE_TYPE_LABEL[a.type]}
                      {'background' in a
                        ? ` · ${BACKGROUND_LABEL[a.background]} · ${a.characters.map((c) => SPEAKER_LABEL[c]).join(', ') || 'tanpa karakter'} · ${EXPRESSION_LABEL[a.expression]}`
                        : ''}
                    </div>
                    <div className="narasi-baca">{a.narration}</div>
                    {'visualDirection' in a ? <div className="kecil muted">🎬 {a.visualDirection}</div> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="panel muted">Naskah belum ditulis.</div>
          )}

          {ep.script?.evidences.length ? (
            <div className="panel">
              <h2>Dalil yang dipakai (wajib dicek)</h2>
              {ep.script.evidences.map((d, i) => (
                <div key={i} className="dalil">
                  <div className="kecil">
                    <b>{d.type}</b> · {d.source}
                  </div>
                  {d.arabicText ? <div className="arab">{d.arabicText}</div> : null}
                  {d.latin ? (
                    <div className="kecil" style={{ fontStyle: 'italic' }}>
                      {d.latin}
                    </div>
                  ) : null}
                  <div>“{d.translation}”</div>
                </div>
              ))}
            </div>
          ) : null}

          {ep.script && ep.status === 'needs_script_approval' ? (
            <details className="panel">
              <summary>Edit naskah manual (JSON)</summary>
              <form action={saveManualScript} className="stack" style={{ marginTop: 10 }}>
                <Id id={ep.id} />
                <textarea className="kode" name="naskah" defaultValue={JSON.stringify(ep.script, null, 2)} />
                <SubmitButton type="submit" className="sekunder" teksProses="Menyimpan…">
                  💾 Simpan naskah
                </SubmitButton>
              </form>
            </details>
          ) : null}
        </div>

        <div className="stack">
          <PanelAksi ep={ep} />

          <div className="panel">
            <h2>Ide</h2>
            <p>
              <b>Pesan moral:</b> {ep.idea.moralMessage}
            </p>
            <p className="kecil muted">{ep.idea.reason}</p>
            {ep.idea.references.length ? (
              <ul className="kecil">
                {ep.idea.references.map((r, i) => (
                  <li key={i}>
                    {r.startsWith('http') ? (
                      <a href={r} target="_blank" rel="noreferrer">
                        {r}
                      </a>
                    ) : (
                      r
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {ep.review ? (
            <div className="panel">
              <h2>Catatan reviewer</h2>
              <ul className="kecil">
                {ep.review.notes.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {ep.metadata ? (
            <div className="panel stack">
              <h2>Metadata YouTube</h2>
              <div>
                <b>{ep.metadata.title}</b>
              </div>
              <pre className="md kecil">{ep.metadata.description}</pre>
              <div className="kecil muted">{ep.metadata.tags.map((t) => `#${t}`).join(' ')}</div>
              <CekMetadata ep={ep} />
            </div>
          ) : null}

          <div className="panel">
            <h2>Riwayat</h2>
            <ul className="kecil" style={{ paddingLeft: 18, margin: 0 }}>
              {ep.log
                .slice(-12)
                .reverse()
                .map((l, i) => (
                  <li key={i}>
                    <span className="muted">
                      {new Date(l.time).toLocaleString('id-ID', {
                        timeZone: cfg.timeZone,
                      })}
                    </span>{' '}
                    · <b>{l.by}</b>: {l.message}
                  </li>
                ))}
            </ul>
            {log ? (
              <details style={{ marginTop: 10 }}>
                <summary>Log teknis</summary>
                <pre className="log">{log}</pre>
              </details>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
