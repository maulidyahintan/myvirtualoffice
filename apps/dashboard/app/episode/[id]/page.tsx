import fs from 'node:fs';
import path from 'node:path';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FORMAT_LABEL, getEpisode, loadConfig, paths, STATUS_SIBUK, PILIHAN_FORMAT, PILIHAN_FORMAT_LABEL, type Episode } from '@kantor/shared';
import {
  hapusRekaman,
  ubahModeRekam,
  mintaRevisi,
  pulihkan,
  renderVideo,
  setujuiNaskah,
  setujuiVideo,
  simpanNaskahManual,
  simpanWaktuHafalan,
  tolak,
  tulisNaskah,
} from '../../actions';
import { AutoRefresh } from '@/components/AutoRefresh';
import { Badge } from '@/components/Badge';
import { TombolTanyaAgen } from '@/components/TombolTanyaAgen';

export const dynamic = 'force-dynamic';

/** Pilih cara mengirim rekaman: berurutan (1 file / beberapa bagian) atau per adegan. */
function PilihModeRekam({ ep }: { ep: Episode }) {
  const mode = ep.modeRekam ?? 'urut';
  const satuan = ep.ide.jenis === 'hafalan' ? 'ayat' : 'adegan';
  const pilihan = [
    {
      mode: 'urut',
      label: '📼 Berurutan',
      ket: 'satu file, atau beberapa bagian (mis. per 2 menit)',
    },
    {
      mode: 'per-adegan',
      label: `🎬 Per ${satuan}`,
      ket: `satu file untuk tiap ${satuan}, durasi ${satuan} ikut persis`,
    },
  ] as const;
  return (
    <div className="stack" style={{ gap: 8 }}>
      <b className="kecil">Cara mengirim rekaman:</b>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {pilihan.map((p) => (
          <form key={p.mode} action={ubahModeRekam} style={{ flex: '1 1 220px' }}>
            <Id id={ep.id} />
            <input type="hidden" name="mode" value={p.mode} />
            <button type="submit" className={mode === p.mode ? '' : 'sekunder'} style={{ width: '100%', textAlign: 'left' }}>
              {p.label}
              <br />
              <span style={{ fontWeight: 400, fontSize: 13 }}>{p.ket}</span>
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}

/** Upload rekaman per adegan (hafalan: per ayat). Bisa juga dipakai untuk merekam ulang satu adegan saja. */
function RekamanPerAdegan({ ep }: { ep: Episode }) {
  const hafalan = ep.ide.jenis === 'hafalan';
  const satuan = hafalan ? 'Ayat' : 'Adegan';
  const ulang = ep.ide.hafalan?.ulang ?? 1;
  const daftar = hafalan
    ? (ep.hafalan?.ayat ?? []).map((a) => ({
        judul: a.nomor === 0 ? 'Basmalah' : `Ayat ${a.nomor}${ulang > 1 ? ` (baca ${ulang}x, jeda ±1 detik)` : ''}`,
        teks: a.latin,
      }))
    : (ep.adegan ?? []).map((a, i) => ({
        judul: `Adegan ${i + 1}${a.jenis === 'pertanyaan' ? ' (jeda berpikir ±3 detik ditambahkan otomatis)' : ''}`,
        teks: a.narasi,
      }));
  const per = ep.audioPerAdegan ?? [];
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
              {per[i] ? '✅' : '⬜'} {d.judul}
            </b>
            <div className="muted" style={{ marginTop: 4 }}>
              {d.teks}
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
            <button type="submit" className="sekunder">
              {per[i] ? 'Ganti' : 'Upload'}
            </button>
          </form>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <form action={renderVideo}>
          <Id id={ep.id} />
          <button type="submit" disabled={sudah < daftar.length}>
            🎬{' '}
            {sudah < daftar.length ? `Render (kurang ${daftar.length - sudah} ${satuan.toLowerCase()})` : 'Semua lengkap, render sekarang'}
          </button>
        </form>
        {sudah ? (
          <form action={hapusRekaman}>
            <Id id={ep.id} />
            <button type="submit" className="bahaya">
              🗑️ Hapus semua rekaman
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

/** Upload rekaman per bagian: kirim bagian demi bagian, lalu render setelah lengkap. */
function RekamanBagian({ ep }: { ep: Episode }) {
  const bagian = ep.bagianAudio ?? [];
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
          <button type="submit" name="render" value="1">
            ⬆️ Upload & render
          </button>
          <button type="submit" name="render" value="0" className="sekunder">
            ➕ Upload, masih ada bagian berikutnya
          </button>
        </div>
      </form>
      {bagian.length ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <form action={renderVideo}>
            <Id id={ep.id} />
            <button type="submit">🎬 Sudah lengkap, render sekarang</button>
          </form>
          <form action={hapusRekaman}>
            <Id id={ep.id} />
            <button type="submit" className="bahaya">
              🗑️ Hapus semua bagian
            </button>
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
    timeZone: loadConfig().zonaWaktu,
  }).format(d);
  return `${tgl}T${jam}`;
}

const Id = ({ id }: { id: string }) => <input type="hidden" name="id" value={id} />;

function PanelAksi({ ep }: { ep: Episode }) {
  const cfg = loadConfig();
  if (STATUS_SIBUK.includes(ep.status)) {
    return (
      <div className="panel aksi">
        <h2>⏳ Agen sedang bekerja</h2>
        <p className="muted">{ep.catatanStatus}</p>
        <p className="kecil muted">Halaman ini menyegarkan diri otomatis. Kamu boleh menutupnya.</p>
      </div>
    );
  }

  switch (ep.status) {
    case 'idea':
      return (
        <div className="panel aksi stack">
          <h2>Langkah berikutnya: tulis naskah</h2>
          <form action={tulisNaskah} className="stack">
            <Id id={ep.id} />
            <label className="kecil">
              Format video{' '}
              <select name="format" defaultValue={ep.ide.format ?? 'biasa'}>
                {PILIHAN_FORMAT.map((f) => (
                  <option key={f} value={f}>
                    {PILIHAN_FORMAT_LABEL[f]}
                  </option>
                ))}
              </select>
            </label>
            <span className="kecil muted">
              Pilih <b>Keduanya</b> untuk membuat dua episode sekaligus dari materi ini: video biasa dan Shorts, dikerjakan bersamaan.
            </span>
            <button type="submit">{ep.ide.jenis === 'hafalan' ? '📖 Setujui & ambil teks surat' : '✍️ Setujui & tugaskan Penulis + Reviewer'}</button>
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
                <b>Skor reviewer: {ep.review.skor}/10</b>
                <span className={`badge ${ep.review.keputusan === 'lolos' ? 'selesai' : 'error'}`}>{ep.review.keputusan}</span>
              </div>
              {ep.review.keputusan === 'revisi' ? (
                <p className="peringatan kecil">
                  Reviewer masih minta revisi setelah batas revisi otomatis. Baca catatannya sebelum menyetujui.
                </p>
              ) : null}
              <h3 style={{ marginTop: 12 }}>Wajib kamu cek sendiri:</h3>
              <ul className="cek">
                {ep.review.cekManusia.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <form action={setujuiNaskah} className="stack">
            <Id id={ep.id} />
            <label className="row" style={{ fontWeight: 600 }}>
              <input type="checkbox" name="dalilDicek" required />
              Saya sudah memverifikasi semua ayat, hadits & doa (teks dan sumbernya).
            </label>
            <button type="submit">✅ Setujui naskah → Sutradara</button>
          </form>
          {ep.ide.jenis === 'hafalan' ? null : (
            <form action={mintaRevisi} className="stack">
              <Id id={ep.id} />
              <label>
                Atau minta revisi:
                <textarea
                  name="feedback"
                  placeholder="contoh: adegan 3 terlalu panjang, ganti doa dengan doa keluar rumah, Nara lebih lucu"
                  required
                />
              </label>
              <button type="submit" className="sekunder">
                🔁 Kirim ke Penulis
              </button>
            </form>
          )}
          <FormTolak id={ep.id} />
        </div>
      );

    case 'needs_audio':
      return (
        <div className="panel aksi stack">
          <h2>🎙️ Rekam suaramu</h2>
          {ep.ide.jenis === 'hafalan' ? (
            <ol className="kecil" style={{ margin: 0, paddingLeft: 18 }}>
              <li>
                Rekam di ruangan sepi pakai HP, dalam satu file atau <b>beberapa bagian</b> (potong di jeda, bukan di tengah ayat).
              </li>
              {ep.hafalan?.ayat[0]?.nomor === 0 ? <li>Mulai dengan basmalah (sekali).</li> : null}
              <li>
                Baca ayat {ep.hafalan?.ayat.find((a) => a.nomor > 0)?.nomor} sampai {ep.hafalan?.ayat.at(-1)?.nomor} berurutan
                {(ep.ide.hafalan?.ulang ?? 1) > 1 ? (
                  <>
                    , <b>tiap ayat diulang {ep.ide.hafalan?.ulang}x</b>
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
          <PilihModeRekam ep={ep} />
          {ep.modeRekam === 'per-adegan' ? <RekamanPerAdegan ep={ep} /> : <RekamanBagian ep={ep} />}
          <form action={renderVideo}>
            <Id id={ep.id} />
            <button type="submit" className="sekunder">
              👀 Render pratinjau tanpa suara
            </button>
          </form>
        </div>
      );

    case 'needs_video_approval':
      return (
        <div className="panel aksi stack">
          <h2>Tonton & setujui video</h2>
          <p className="kecil muted">
            Video diupload sebagai <b>Made for Kids</b>, kategori Pendidikan. Dengan jadwal, video tayang otomatis.
          </p>
          <form action={setujuiVideo} className="stack">
            <Id id={ep.id} />
            <label>
              Jadwal tayang ({cfg.zonaWaktu})
              <input type="datetime-local" name="jadwal" defaultValue={besokJamTayang(cfg.jamTayangDefault)} required />
            </label>
            <button type="submit">🚀 Setujui & jadwalkan di YouTube</button>
          </form>
          <form action={setujuiVideo}>
            <Id id={ep.id} />
            <button type="submit" className="sekunder">
              Upload sebagai private saja (atur di Studio)
            </button>
          </form>
          {!ep.fileAudio ? <p className="peringatan kecil">Ini masih pratinjau tanpa suara. Upload rekaman dulu sebelum tayang.</p> : null}
          {ep.ide.jenis === 'hafalan' && ep.fileAudio ? (
            <details>
              <summary>Waktu tiap bacaan meleset? Koreksi di sini</summary>
              <form action={simpanWaktuHafalan} className="stack" style={{ marginTop: 10 }}>
                <Id id={ep.id} />
                <p className="kecil muted">
                  Detik mulai tiap bacaan di rekaman, dipisah koma ({ep.hafalan?.mulaiSegmen?.length ?? '?'} bacaan).
                  {ep.hafalan?.mulaiSegmen ? '' : ' Jeda tidak terdeteksi jelas, jadi video dibagi rata.'} Kosongkan untuk deteksi otomatis
                  lagi.
                </p>
                <input type="text" name="waktu" defaultValue={ep.hafalan?.mulaiSegmen?.map((t) => t.toFixed(1)).join(', ') ?? ''} />
                <button type="submit" className="sekunder">
                  💾 Simpan & render ulang
                </button>
              </form>
            </details>
          ) : null}
          <details>
            <summary>Rekam ulang / render ulang</summary>
            {ep.modeRekam === 'per-adegan' ? (
              <div style={{ marginTop: 10 }}>
                <RekamanPerAdegan ep={ep} />
              </div>
            ) : (
              <form action={`/api/audio/${ep.id}`} method="post" encType="multipart/form-data" className="stack" style={{ marginTop: 10 }}>
                <input type="hidden" name="mode" value="ganti" />
                <input type="file" name="audio" accept=".mp3,.m4a,.wav,.aac,.ogg,audio/*" multiple required />
                <span className="kecil muted">Boleh pilih beberapa file sekaligus; diurutkan menurut nama file (1, 2, 3…).</span>
                <button type="submit" className="sekunder">
                  ⬆️ Upload rekaman baru
                </button>
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
          {ep.youtube?.jadwalTayang ? (
            <div className="muted">
              Tayang:{' '}
              {new Date(ep.youtube.jadwalTayang).toLocaleString('id-ID', {
                timeZone: cfg.zonaWaktu,
                dateStyle: 'full',
                timeStyle: 'short',
              })}
            </div>
          ) : null}
        </div>
      );

    case 'error':
    case 'rejected':
      return (
        <div className="panel aksi stack">
          <h2>{ep.status === 'error' ? '⚠️ Ada masalah' : 'Ditolak'}</h2>
          {ep.catatanStatus ? <p className="peringatan">{ep.catatanStatus}</p> : null}
          <form action={pulihkan}>
            <Id id={ep.id} />
            <button type="submit">↩️ Kembalikan ke langkah terakhir yang berhasil</button>
          </form>
        </div>
      );
  }
}

function FormTolak({ id }: { id: string }) {
  return (
    <details>
      <summary>Tolak episode ini</summary>
      <form action={tolak} className="row" style={{ marginTop: 8 }}>
        <Id id={id} />
        <input type="text" name="alasan" placeholder="alasan (opsional)" style={{ flex: 1 }} />
        <button type="submit" className="bahaya">
          Tolak
        </button>
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
  const seri = cfg.seri.find((s) => s.id === ep.ide.seri)?.nama ?? ep.ide.seri;
  const log = ekorLog(id);

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <Link href="/" className="kecil">
            ← Papan kerja
          </Link>
          <h1>{ep.naskah?.judul ?? ep.ide.judul}</h1>
          <div className="row muted">
            <span>
              {seri} · usia {ep.ide.usia} · {FORMAT_LABEL[ep.ide.format ?? 'biasa']}
            </span>
            {ep.pasangan ? (
              <Link href={`/episode/${ep.pasangan}`} className="kecil">
                🔗 Lihat versi {ep.ide.format === 'short' ? 'video biasa' : 'Shorts'}
              </Link>
            ) : null}
            <Badge status={ep.status} />
          </div>
        </div>
        <div className="row">
          <TombolTanyaAgen />
          <AutoRefresh aktif={STATUS_SIBUK.includes(ep.status)} />
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
                src={`/api/media/${ep.render.video}?v=${ep.render.waktu}`}
                style={ep.ide.format === 'short' ? { maxWidth: 360, aspectRatio: '9 / 16', margin: '0 auto' } : undefined}
              />
              {ep.render.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="thumb" alt="thumbnail" src={`/api/media/${ep.render.thumbnail}?v=${ep.render.waktu}`} />
              ) : null}
            </div>
          ) : null}

          {ep.naskah ? (
            <div className="panel">
              <h2>Naskah</h2>
              <p className="muted">{ep.naskah.ringkasan}</p>
              {(ep.adegan ?? ep.naskah.adegan).map((a, i) => (
                <div key={i} className="adegan">
                  <div className="nomor">{i + 1}</div>
                  <div>
                    <div className="kecil">
                      <span className="pembicara">{a.pembicara}</span> · {a.jenis}
                      {'latar' in a ? ` · ${a.latar} · ${a.karakter.join(', ') || 'tanpa karakter'} · ${a.ekspresi}` : ''}
                    </div>
                    <div className="narasi-baca">{a.narasi}</div>
                    {'petunjukVisual' in a ? <div className="kecil muted">🎬 {a.petunjukVisual}</div> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="panel muted">Naskah belum ditulis.</div>
          )}

          {ep.naskah?.dalil.length ? (
            <div className="panel">
              <h2>Dalil yang dipakai (wajib dicek)</h2>
              {ep.naskah.dalil.map((d, i) => (
                <div key={i} className="dalil">
                  <div className="kecil">
                    <b>{d.jenis}</b> · {d.sumber}
                  </div>
                  {d.teksArab ? <div className="arab">{d.teksArab}</div> : null}
                  {d.latin ? (
                    <div className="kecil" style={{ fontStyle: 'italic' }}>
                      {d.latin}
                    </div>
                  ) : null}
                  <div>“{d.terjemah}”</div>
                </div>
              ))}
            </div>
          ) : null}

          {ep.naskah && ep.status === 'needs_script_approval' ? (
            <details className="panel">
              <summary>Edit naskah manual (JSON)</summary>
              <form action={simpanNaskahManual} className="stack" style={{ marginTop: 10 }}>
                <Id id={ep.id} />
                <textarea className="kode" name="naskah" defaultValue={JSON.stringify(ep.naskah, null, 2)} />
                <button type="submit" className="sekunder">
                  💾 Simpan naskah
                </button>
              </form>
            </details>
          ) : null}
        </div>

        <div className="stack">
          <PanelAksi ep={ep} />

          <div className="panel">
            <h2>Ide</h2>
            <p>
              <b>Pesan moral:</b> {ep.ide.pesanMoral}
            </p>
            <p className="kecil muted">{ep.ide.alasan}</p>
            {ep.ide.referensi.length ? (
              <ul className="kecil">
                {ep.ide.referensi.map((r, i) => (
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
                {ep.review.catatan.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {ep.metadata ? (
            <div className="panel stack">
              <h2>Metadata YouTube</h2>
              <div>
                <b>{ep.metadata.judul}</b>
              </div>
              <pre className="md kecil">{ep.metadata.deskripsi}</pre>
              <div className="kecil muted">{ep.metadata.tags.map((t) => `#${t}`).join(' ')}</div>
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
                      {new Date(l.waktu).toLocaleString('id-ID', {
                        timeZone: cfg.zonaWaktu,
                      })}
                    </span>{' '}
                    · <b>{l.oleh}</b>: {l.pesan}
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
