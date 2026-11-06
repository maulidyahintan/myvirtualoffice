import fs from 'node:fs';
import path from 'node:path';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  effectiveRecordingMode,
  mixesArabicAndIndonesian,
  aiVoiceInProgress,
  deleteBlockers,
  aiJobMarker,
  needsHumanVoice,
  visualStyle,
  rootDir,
  backgroundLabel,
  speakerNames,
  isoToLocal,
  MIN_SCHEDULE_GAP_MINUTES,
  NO_DRAFT_STATUSES,
  estimatedScriptSeconds,
  SCRIPT_WORD_LIMIT,
  scriptWordCount,
  EXPRESSION_LABEL,
  SCENE_TYPE_LABEL,
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
  nextFreeSlot,
  isBusy,
  BUSY_STATUSES,
  FORMAT_CHOICES,
  FORMAT_CHOICE_LABEL,
  type Episode,
} from '@kantor/shared';
import {
  regenerateMetadata,
  createAlternateFormat,
  moveToDraft,
  restoreFromDraft,
  splitIntoShorts,
  reopenForEdit,
  deleteRecordings,
  changeRecordingMode,
  requestRevision,
  requestVideoRevision,
  fillAiVoices,
  generateIllustrations,
  reviseOneScene,
  editSceneText,
  deleteArchivedEpisode,
  removeIllustration,
  setEpisodeVisualStyle,
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
  const mode = effectiveRecordingMode(ep);
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
/** Kunci suara AI dari .env root (dashboard tidak memuat .env proyek). */
/** Apakah kunci ini terisi (dashboard tidak memuat .env proyek, jadi dibaca langsung). */
function envAda(...nama: string[]): boolean {
  let isi = '';
  try {
    isi = fs.readFileSync(path.join(rootDir(), '.env'), 'utf8');
  } catch {
    /* tidak ada .env */
  }
  return nama.every((n) => process.env[n]?.trim() || new RegExp(`^${n}=[ \\t]*\\S+`, 'm').test(isi));
}

const suaraAiSiap = () => envAda('GEMINI_API_KEY');

/** Pemakaian suara AI hari ini (ditulis pengisi suara di data/suara-ai.json). */
function pemakaianSuaraAi(): { requests: number; exhausted: boolean } {
  try {
    const u = JSON.parse(fs.readFileSync(path.join(paths.data(), 'suara-ai.json'), 'utf8'));
    const today = u.date === new Date().toISOString().slice(0, 10);
    return { requests: today ? u.requests : 0, exhausted: today && Boolean(u.exhaustedAt) };
  } catch {
    return { requests: 0, exhausted: false };
  }
}

/** Status suara AI gratis di atas daftar rekaman: cara pakai, jatah hari ini, atau cara menyiapkannya. */
function IsiSuaraAi({ ep }: { ep: Episode }) {
  if (ep.idea.type === 'memorization' || !ep.scenes?.length) return null;
  const bisaAi = ep.scenes.filter((s, i) => !(effectiveRecordingMode(ep) === 'per-scene' && ep.audioPerScene?.[i]) && !needsHumanVoice(s)).length;
  if (!bisaAi) return null;
  if (!suaraAiSiap()) {
    return (
      <details className="kecil">
        <summary>🤖 Mau diisi suara AI gratis?</summary>
        <p className="muted" style={{ marginBottom: 0 }}>
          Buat API key di <b>aistudio.google.com/apikey</b> dengan proyek <b>tanpa akun penagihan</b> (supaya tidak pernah ada biaya), lalu
          isi <code>GEMINI_API_KEY=</code> di file <code>.env</code> proyek. Setelah itu tombolnya muncul di tiap adegan.
        </p>
      </details>
    );
  }
  const pakai = pemakaianSuaraAi();
  if (effectiveRecordingMode(ep) !== 'per-scene') {
    // AI voice fills scenes one by one, so it needs the per-scene mode: offer the switch as a clear button
    const adaRekaman = Boolean(ep.audioFile || ep.audioParts?.length);
    return (
      <form action={changeRecordingMode} className="stack" style={{ gap: 4 }}>
        <Id id={ep.id} />
        <input type="hidden" name="mode" value="per-scene" />
        <SubmitButton type="submit" className="sekunder" teksProses="Memindahkan…">
          🤖 Pakai suara AI: pindah ke mode per adegan
        </SubmitButton>
        <span className="kecil muted">
          Suara AI gratis mengisi adegan satu per satu, jadi perlu mode rekam per adegan.
          {adaRekaman ? ' Rekaman utuh yang sudah diupload tidak dipakai lagi di mode ini.' : ''}
        </span>
      </form>
    );
  }
  const dikerjakan = aiVoiceInProgress(ep.id);
  const sibuk = dikerjakan !== undefined || isBusy(aiJobMarker(ep.id));
  return (
    <form action={fillAiVoices} className="stack" style={{ gap: 4 }}>
      <Id id={ep.id} />
      <SubmitButton type="submit" className="sekunder" disabled={sibuk || pakai.exhausted} teksProses="Memulai…">
        {sibuk ? (
          <span className="row" style={{ gap: 8, alignItems: 'center', justifyContent: 'center' }}>
            <span className="putar" aria-hidden /> Mengisi suara AI{dikerjakan !== undefined ? ` adegan ${dikerjakan + 1}` : ''}…
          </span>
        ) : (
          `🤖 Isi semua adegan dengan suara AI (${bisaAi} adegan)`
        )}
      </SubmitButton>
      <span className="kecil muted">
        {pakai.exhausted
          ? 'Jatah suara AI gratis hari ini sudah habis; rekam sendiri atau coba lagi besok.'
          : `Diisi satu per satu, berurutan; adegan yang sedang dikerjakan ditandai ⏳. Bisa juga per adegan lewat tombol 🤖 di adegannya. Bacaan Arab tetap rekam sendiri. Jatah Google ±20 adegan per hari; hari ini terpakai ${pakai.requests}.`}
      </span>
    </form>
  );
}

/** Tombol suara AI untuk satu adegan, atau tanda loading kalau adegan ini sedang dibuatkan suaranya. */
function TombolSuaraAi({ ep, index }: { ep: Episode; index: number }) {
  const scene = ep.scenes?.[index];
  if (!scene || ep.idea.type === 'memorization' || ep.audioPerScene?.[index] || needsHumanVoice(scene) || !suaraAiSiap()) return null;
  const dikerjakan = aiVoiceInProgress(ep.id);
  if (dikerjakan === index) {
    return (
      <span className="label-suara memuat" role="status">
        <span className="putar" aria-hidden /> Membuat suara AI…
      </span>
    );
  }
  const sibuk = dikerjakan !== undefined || isBusy(aiJobMarker(ep.id));
  return (
    <form action={fillAiVoices}>
      <Id id={ep.id} />
      <input type="hidden" name="adegan" value={index + 1} />
      <SubmitButton
        type="submit"
        className="sekunder"
        disabled={sibuk || pemakaianSuaraAi().exhausted}
        teksProses="Memulai…"
        title={sibuk ? `Tunggu adegan ${dikerjakan !== undefined ? dikerjakan + 1 : 'lain'} selesai dulu` : undefined}
      >
        🤖 Isi suara AI
      </SubmitButton>
    </form>
  );
}

/** Edit narasi & teks layar satu adegan secara langsung; adegan doa bisa dijadikan cerita biasa tanpa teks Arab. */
function UbahNarasi({ ep, index }: { ep: Episode; index: number }) {
  const scene = ep.scenes![index];
  const adaRekaman = effectiveRecordingMode(ep) === 'per-scene' ? Boolean(ep.audioPerScene?.[index]) : Boolean(ep.audioFile || ep.audioParts?.length);
  return (
    <details className="kecil">
      <summary>✏️ Ubah narasi</summary>
      <form action={editSceneText} className="stack" style={{ marginTop: 8, gap: 6 }}>
        <Id id={ep.id} />
        <input type="hidden" name="adegan" value={index + 1} />
        <label>
          Narasi
          <textarea name="narasi" rows={3} required defaultValue={scene.narration} />
        </label>
        <label>
          Teks layar (opsional, singkat)
          <input type="text" name="teksLayar" defaultValue={scene.screenText ?? ''} maxLength={40} />
        </label>
        {scene.prayer ? (
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" name="kartuDoa" defaultChecked /> Tampilkan kartu doa (teks Arab di layar)
          </label>
        ) : null}
        <span className="muted">
          {scene.prayer ? 'Matikan kartu doa kalau adegan ini cukup artinya saja (jadi adegan cerita biasa, bisa diisi suara AI). ' : ''}
          {adaRekaman
            ? effectiveRecordingMode(ep) === 'per-scene'
              ? 'Kalau narasi diubah, rekaman adegan ini dilepas dan perlu direkam ulang (adegan lain tetap).'
              : 'Kalau narasi diubah, rekaman utuh episode ini tidak cocok lagi dan perlu direkam ulang. Pakai mode rekam per adegan supaya cukup adegan ini saja.'
            : ''}
        </span>
        <SubmitButton type="submit" className="sekunder" teksProses="Menyimpan…">
          💾 Simpan narasi adegan {index + 1}
        </SubmitButton>
      </form>
    </details>
  );
}

/** Upload (atau ganti) audio bacaan Arab satu adegan langsung di daftar naskah. */
function AudioBacaanArab({ ep, index }: { ep: Episode; index: number }) {
  const file = effectiveRecordingMode(ep) === 'per-scene' ? ep.audioPerScene?.[index] : undefined;
  const rekamanUtuh = effectiveRecordingMode(ep) !== 'per-scene' && Boolean(ep.audioFile || ep.audioParts?.length);
  return (
    <div className="kotak-bacaan stack">
      <b>🎙️ Audio bacaan Arab {file ? '✅' : ''}</b>
      {file ? (
        <audio controls preload="none" src={`/api/audio/${ep.id}?adegan=${index}&v=${encodeURIComponent(file)}`} style={{ width: '100%', height: 36 }} />
      ) : (
        <span className="muted">Rekam bacaan adegan ini dengan suaramu sendiri (makhraj & tajwid), lalu upload di sini.</span>
      )}
      <form action={`/api/audio/${ep.id}`} method="post" encType="multipart/form-data" className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="hidden" name="adegan" value={index} />
        <input type="file" name="audio" accept=".mp3,.m4a,.wav,.aac,.ogg,audio/*" required style={{ flex: '1 1 200px' }} />
        <SubmitButton teksProses="Mengupload…" type="submit" className="sekunder">
          {file ? 'Ganti audio' : '⬆️ Upload audio'}
        </SubmitButton>
      </form>
      {rekamanUtuh ? (
        <span className="muted">Episode ini memakai satu rekaman utuh; upload per adegan memindahkannya ke mode rekam per adegan.</span>
      ) : null}
    </div>
  );
}

/** Perbaiki satu adegan dengan arahan, lalu lihat pratinjau adegan itu saja (narasi & rekaman tetap). */
function PerbaikiAdegan({ ep, index }: { ep: Episode; index: number }) {
  if (ep.idea.type === 'memorization' || !['needs_audio', 'needs_video_approval', 'error'].includes(ep.status)) return null;
  const scene = ep.scenes![index];
  const gambar = visualStyle(ep, loadConfig()) === 'ai-illustration' && scene.illustration;
  const pratinjau = ep.scenePreviews?.[index];
  const sedang = isBusy(aiJobMarker(ep.id));
  return (
    <div className="stack" style={{ gap: 6, marginTop: 6 }}>
      {mixesArabicAndIndonesian(scene) ? (
        <span className="kecil peringatan" style={{ margin: 0 }}>
          ⚠️ Bacaan Arab di adegan ini masih bercampur kalimat Indonesia. Sebaiknya dipisah jadi adegan sendiri lewat &quot;Minta revisi
          naskah&quot;, supaya audio bacaannya bisa diupload terpisah.
        </span>
      ) : null}
      {needsHumanVoice(scene) ? <AudioBacaanArab ep={ep} index={index} /> : null}
      {pratinjau ? (
        <div className="stack" style={{ gap: 4 }}>
          <span className="kecil">
            <b>👀 Pratinjau adegan {index + 1} setelah diperbaiki</b> <span className="muted">(belum masuk video lengkap)</span>
          </span>
          <video controls preload="none" src={`/api/media/${pratinjau}`} style={{ width: '100%', maxWidth: 480, borderRadius: 8 }} />
        </div>
      ) : null}
      <UbahNarasi ep={ep} index={index} />
      <details className="kecil">
        <summary>🎬 Perbaiki adegan ini</summary>
        <form action={reviseOneScene} className="stack" style={{ marginTop: 8, gap: 6 }}>
          <Id id={ep.id} />
          <input type="hidden" name="adegan" value={index + 1} />
          <textarea
            name="arahan"
            rows={2}
            required
            placeholder={
              gambar
                ? 'contoh: burungnya lebih dekat dan kerikilnya jelas, langit sore'
                : 'contoh: Ibu memegang Al-Qur\'an, latar kamar malam, Mamas tersenyum, Mochi tidur di dekatnya'
            }
          />
          <span className="muted">
            {gambar ? 'Gambar AI adegan ini dibuat ulang sesuai arahan.' : 'Sutradara menyusun ulang latar, tokoh, ekspresi, aksi & properti adegan ini.'} Narasi &
            rekaman tetap. {ep.render ? 'Setelah itu pratinjau adegan ini saja dirender (±1 menit).' : ''}
          </span>
          <SubmitButton type="submit" className="sekunder" disabled={sedang} teksProses="Mengirim…">
            🎬 Perbaiki adegan {index + 1}
          </SubmitButton>
        </form>
      </details>
    </div>
  );
}

/** Ilustrasi AI untuk adegan penting: pilih gaya visual, buat, cek, gambar ulang, atau hapus per adegan. */
function PanelIlustrasi({ ep }: { ep: Episode }) {
  if (ep.idea.type === 'memorization' || !ep.scenes?.length) return null;
  if (!['needs_audio', 'needs_video_approval', 'error'].includes(ep.status)) return null;
  const cfg = loadConfig();
  const gaya = visualStyle(ep, cfg);
  const siap = envAda('CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN');
  const ada = ep.scenes.map((s, i) => ({ s, i })).filter(({ s }) => s.illustration);
  const kurang = ada.filter(({ s }) => !s.illustration?.image).length;
  const sedang = isBusy(aiJobMarker(ep.id));
  return (
    <div className="panel stack">
      <h2>🖼️ Ilustrasi AI (opsional)</h2>
      <p className="kecil muted" style={{ margin: 0 }}>
        Adegan penting (kisah yang diceritakan, benda/kejadian yang dibahas) diberi gambar kejadiannya, penuh layar dengan gerak kamera
        pelan. Percakapan tetap animasi tokoh kita. Gambar tanpa manusia, gratis lewat Cloudflare (ada jatah harian).
      </p>
      <form action={setEpisodeVisualStyle} className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Id id={ep.id} />
        <span className="kecil">Gaya visual episode ini:</span>
        {(['animation', 'ai-illustration'] as const).map((g) => (
          <SubmitButton key={g} type="submit" name="gaya" value={g} className={gaya === g ? '' : 'sekunder'} disabled={gaya === g}>
            {g === 'animation' ? '🎞️ Animasi saja' : '🖼️ Animasi + ilustrasi AI'}
          </SubmitButton>
        ))}
      </form>
      {gaya === 'ai-illustration' ? (
        <>
          {!siap ? (
            <p className="kecil muted" style={{ margin: 0 }}>
              Belum disiapkan: buat akun <b>Cloudflare paket Free</b>, lalu isi <code>CLOUDFLARE_ACCOUNT_ID=</code> dan{' '}
              <code>CLOUDFLARE_API_TOKEN=</code> (template token &quot;Workers AI&quot;) di file <code>.env</code> proyek.
            </p>
          ) : !ada.length || kurang ? (
            <form action={generateIllustrations}>
              <Id id={ep.id} />
              <SubmitButton type="submit" disabled={sedang} teksProses="Memulai…">
                🖼️ {ada.length ? `Buat ${kurang} ilustrasi yang belum ada` : 'Pilih adegan & buat ilustrasi'}
              </SubmitButton>
            </form>
          ) : null}
          {ada.length ? (
            <div className="grid-ilustrasi">
              {ada.map(({ s, i }) => (
                <figure key={i} className="kartu-ilustrasi">
                  {s.illustration?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/illustration/${path.basename(s.illustration.image)}`} alt={`Ilustrasi adegan ${i + 1}`} />
                  ) : (
                    <div className="ilustrasi-kosong kecil muted">belum digambar</div>
                  )}
                  <figcaption className="kecil">
                    <b>Adegan {i + 1}</b> <span className="muted">· {s.illustration?.prompt}</span>
                  </figcaption>
                  <div className="row" style={{ gap: 6 }}>
                    {siap ? (
                      <form action={generateIllustrations}>
                        <Id id={ep.id} />
                        <input type="hidden" name="adegan" value={i + 1} />
                        <SubmitButton type="submit" className="sekunder" disabled={sedang} teksProses="…">
                          🔁 Gambar ulang
                        </SubmitButton>
                      </form>
                    ) : null}
                    <form action={removeIllustration}>
                      <Id id={ep.id} />
                      <input type="hidden" name="adegan" value={i + 1} />
                      <SubmitButton type="submit" className="sekunder" teksProses="…">
                        ✕ Pakai animasi
                      </SubmitButton>
                    </form>
                  </div>
                </figure>
              ))}
            </div>
          ) : null}
          {ada.some(({ s }) => s.illustration?.image) && ep.status === 'needs_video_approval' ? (
            <p className="kecil muted" style={{ margin: 0 }}>
              Cek tiap gambar (pastikan tidak ada sosok manusia), lalu <b>render ulang</b> supaya ilustrasi masuk ke video.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

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
            {per[i] && ep.aiVoiceScenes?.[i] ? <span className="label-suara ai">🤖 suara AI</span> : null}
            {!per[i] && !hafalan && ep.scenes?.[i] && needsHumanVoice(ep.scenes[i]) ? (
              <span className="label-suara arab">✋ bacaan Arab, rekam sendiri</span>
            ) : null}
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
          {hafalan ? null : <TombolSuaraAi ep={ep} index={i} />}
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

/** Input jadwal tayang, terisi slot kosong paling dekat dari rencana Channel Manager; tetap bisa diganti. */
function JadwalTayang({ ep }: { ep: Episode }) {
  const cfg = loadConfig();
  // earliest empty slot for this format (other videos' tentative recommendations don't block it)
  const saran = nextFreeSlot(ep, listEpisodes(), cfg);
  const [tgl, jam] = saran?.local.split('T') ?? [];
  const tanggal = tgl ? new Date(`${tgl}T00:00:00Z`) : undefined;
  return (
    <label>
      Jadwal tayang ({cfg.timeZone})
      {/* min: the browser rejects times that are already too close before the form is sent */}
      <input
        type="datetime-local"
        name="jadwal"
        defaultValue={saran?.local ?? besokJamTayang(cfg.defaultPublishTime)}
        min={isoToLocal(new Date(Date.now() + (MIN_SCHEDULE_GAP_MINUTES + 5) * 60_000).toISOString(), cfg.timeZone)}
        required
      />
      <span className="kecil muted" style={{ fontWeight: 'normal' }}>
        {saran && tanggal ? (
          <>
            📅 Rekomendasi Channel Manager: <b>{DAY_NAMES[tanggal.getUTCDay()]}, {tanggal.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', timeZone: 'UTC' })} pukul {jam}</b>{' '}
            (slot kosong paling dekat di <Link href="/schedule">rencana tayang</Link>). Boleh diganti sesukamu.
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

function PanelAksi({ ep, jadwalTerlaluDekat = false }: { ep: Episode; jadwalTerlaluDekat?: boolean }) {
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
          <IsiSuaraAi ep={ep} />
          {effectiveRecordingMode(ep) === 'per-scene' ? <RekamanPerAdegan ep={ep} /> : <RekamanBagian ep={ep} />}
          <form action={renderVideo}>
            <Id id={ep.id} />
            <SubmitButton type="submit" className="sekunder" teksProses="Memulai render…">
              👀 Render pratinjau tanpa suara
            </SubmitButton>
          </form>
          <MintaRevisiNaskah ep={ep} />
        </div>
      );

    case 'needs_video_approval':
      return (
        <div className="panel aksi stack">
          <h2>Tonton & setujui video</h2>
          <p className="kecil muted">
            Video diupload sebagai <b>Made for Kids</b>, kategori Pendidikan, dan langsung masuk playlist <b>{playlistName(ep, cfg)}</b>. Dengan jadwal, video tayang otomatis.
          </p>
          {jadwalTerlaluDekat ? (
            <p className="peringatan kecil" style={{ margin: 0 }}>
              ⏰ Jadwal tayang yang dipilih sudah lewat atau kurang dari {MIN_SCHEDULE_GAP_MINUTES} menit dari sekarang (YouTube butuh waktu
              memproses video). Jadwal di bawah sudah diperbarui; cek lalu setujui lagi.
            </p>
          ) : null}
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
            {effectiveRecordingMode(ep) === 'per-scene' ? (
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
          <MintaRevisiVideo ep={ep} />
          <MintaRevisiNaskah ep={ep} />
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
          <HapusEpisode ep={ep} />
        </div>
      );
  }
}

/** Hapus permanen episode di Arsip, dengan centang konfirmasi (tanpa dialog browser). */
function HapusEpisode({ ep }: { ep: Episode }) {
  const alasan = deleteBlockers(ep);
  return (
    <details className="kecil">
      <summary>🗑️ Hapus episode ini permanen</summary>
      {alasan.length ? (
        <p className="muted" style={{ marginBottom: 0 }}>
          Tidak bisa dihapus: {alasan.join('; ')}.
        </p>
      ) : (
        <form action={deleteArchivedEpisode} className="stack" style={{ marginTop: 8, gap: 6 }}>
          <Id id={ep.id} />
          <span className="muted">
            Ide, naskah, rekaman suara, hasil render, ilustrasi, dan log episode ini dihapus dari komputer. <b>Tidak bisa dibatalkan.</b>
          </span>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" name="yakin" required /> Ya, hapus &quot;{ep.script?.title ?? ep.idea.title}&quot; permanen
          </label>
          <SubmitButton type="submit" className="bahaya" teksProses="Menghapus…">
            🗑️ Hapus permanen
          </SubmitButton>
        </form>
      )}
    </details>
  );
}

/** Minta revisi video (adegan & visual) tanpa mengubah narasi; rekaman tetap dipakai. */
function MintaRevisiVideo({ ep }: { ep: Episode }) {
  if (ep.idea.type === 'memorization' || !ep.scenes?.length || !ep.render) return null;
  return (
    <details>
      <summary>🎬 Minta revisi video (adegan & visual)</summary>
      <form action={requestVideoRevision} className="stack" style={{ marginTop: 10 }}>
        <Id id={ep.id} />
        <textarea
          name="feedback"
          placeholder="contoh: adegan 3 pindah ke dapur, Mochi tidur di adegan akhir, Mamas memegang Al-Qur'an saat membaca surat"
          required
        />
        <span className="kecil muted">
          Narasi & rekaman suaramu tetap; Sutradara menyusun ulang latar, tokoh, ekspresi, aksi & properti sesuai catatan, lalu video
          otomatis dirender ulang.
        </span>
        <SubmitButton type="submit" className="sekunder" teksProses="Mengirim…">
          🎬 Kirim ke Sutradara
        </SubmitButton>
      </form>
    </details>
  );
}

/** Minta revisi naskah setelah tahap naskah (saat rekam suara / persetujuan video). */
function MintaRevisiNaskah({ ep }: { ep: Episode }) {
  if (ep.idea.type === 'memorization' || !ep.script) return null;
  const adaRekaman = Boolean(ep.audioFile || ep.audioParts?.length || ep.audioPerScene?.some(Boolean));
  return (
    <details>
      <summary>📝 Minta revisi naskah</summary>
      <form action={requestRevision} className="stack" style={{ marginTop: 10 }}>
        <Id id={ep.id} />
        <textarea name="feedback" placeholder="contoh: padatkan jadi ±300 kata, buang adegan 4–5, tambah momen lucu Mochi" required />
        <span className="kecil muted">
          Naskah dikembalikan ke Penulis + Reviewer, lalu kamu setujui lagi dan Sutradara menyusun ulang adegannya.
          {adaRekaman ? ' Rekaman yang sudah ada tidak cocok dengan naskah baru, jadi perlu direkam ulang (file lamanya tidak dihapus).' : ''}
        </span>
        <SubmitButton type="submit" className="sekunder" teksProses="Mengirim…">
          🔁 Kirim ke Penulis
        </SubmitButton>
      </form>
    </details>
  );
}

/** Simpan ke Draft (tidak ditayangkan dulu); tidak tersedia saat agen bekerja atau setelah diupload. */
function TombolDraft({ ep }: { ep: Episode }) {
  if (ep.draftedAt || BUSY_STATUSES.includes(ep.status) || NO_DRAFT_STATUSES.includes(ep.status)) return null;
  return (
    <form action={moveToDraft}>
      <Id id={ep.id} />
      <SubmitButton className="sekunder kecil" teksProses="Menyimpan…">
        📥 Simpan ke Draft
      </SubmitButton>
    </form>
  );
}

const cfgZona = () => loadConfig().timeZone;

/** Jumlah kata & perkiraan durasi naskah; peringatan bila melebihi batas (video biasa ≤ 5 menit). */
function PanjangNaskah({ ep }: { ep: Episode }) {
  if (!ep.script) return null;
  const format = ep.idea.format ?? 'standard';
  const { max } = SCRIPT_WORD_LIMIT[format];
  const kata = scriptWordCount(ep.script);
  const detik = estimatedScriptSeconds(ep.script, format);
  const durasi = `${Math.floor(detik / 60)}:${String(Math.round(detik % 60)).padStart(2, '0')}`;
  const lewat = kata > max;
  return (
    <p className={lewat ? 'peringatan kecil' : 'kecil muted'} style={{ margin: '0 0 8px' }}>
      📏 {kata} kata · perkiraan video ±{durasi} (batas {max} kata{format === 'standard' ? ', maks. 5 menit' : ''})
      {lewat ? ' — terlalu panjang, minta revisi untuk dipadatkan.' : ''}
    </p>
  );
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

export default async function HalamanEpisode({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const jadwalTerlaluDekat = (await searchParams).jadwal === 'terlalu-dekat';
  let ep: Episode;
  try {
    ep = getEpisode(id);
  } catch {
    notFound();
  }
  const cfg = loadConfig();
  const namaTokoh = speakerNames(cfg);
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
          <TombolDraft ep={ep} />
          <AskAgentButton />
          <AutoRefresh
            aktif={BUSY_STATUSES.includes(ep.status) || isBusy(`shorts-${ep.id}`) || isBusy(`${ep.id}-metadata`) || isBusy(aiJobMarker(ep.id)) || aiVoiceInProgress(ep.id) !== undefined}
          />
        </div>
      </div>

      {ep.draftedAt ? (
        <div className="panel row info-draft" style={{ justifyContent: 'space-between' }}>
          <span>
            📥 <b>Episode ini di Draft</b> sejak{' '}
            {new Date(ep.draftedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', timeZone: cfgZona() })}: tidak dihitung di “Butuh kamu” dan
            tidak dijadwalkan. Kamu tetap bisa mengerjakannya; keluarkan dari Draft kalau sudah siap ditayangkan.
          </span>
          <form action={restoreFromDraft}>
            <Id id={ep.id} />
            <SubmitButton className="sekunder">↩️ Keluarkan dari Draft</SubmitButton>
          </form>
        </div>
      ) : null}

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
              <PanjangNaskah ep={ep} />
              <p className="muted">{ep.script.summary}</p>
              {(ep.scenes ?? ep.script.scenes).map((a, i) => (
                <div key={i} className="adegan">
                  <div className="nomor">{i + 1}</div>
                  <div>
                    <div className="kecil">
                      <span className="pembicara">{namaTokoh[a.speaker]}</span> · {SCENE_TYPE_LABEL[a.type]}
                      {'background' in a
                        ? ` · ${backgroundLabel(cfg, a.background)} · ${a.characters.map((c) => namaTokoh[c]).join(', ') || 'tanpa karakter'} · ${EXPRESSION_LABEL[a.expression]}`
                        : ''}
                    </div>
                    <div className="narasi-baca">{a.narration}</div>
                    {'visualDirection' in a ? <div className="kecil muted">🎬 {a.visualDirection}</div> : null}
                    {ep.scenes ? <PerbaikiAdegan ep={ep} index={i} /> : null}
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
          <PanelAksi ep={ep} jadwalTerlaluDekat={jadwalTerlaluDekat} />
          <PanelIlustrasi ep={ep} />

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
