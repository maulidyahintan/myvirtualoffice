'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { renderVideo, simpanEfekKarakter, simpanNada } from '@/app/actions';

export interface BagianStudio {
  judul: string;
  /** teks yang dibacakan (teleprompter) */
  teks: string;
  arab: boolean;
  catatan: string;
  /** detik mulai & lama bagian ini di video pratinjau (kalau sudah pernah dirender) */
  mulai?: number;
  durasi?: number;
  tersimpan: boolean;
  /** lama hening (detik) sebelum rekaman berhenti sendiri; lebih panjang untuk ayat yang dibaca berulang */
  heningStop: number;
  /** perkiraan lama membaca (detik); rekaman tidak berhenti otomatis sebelum ±70% dari ini */
  perkiraan: number;
  /** keterangan efek suara pembicara (cerita saja) */
  suara?: string;
}

interface Take {
  url: string;
  blob: Blob;
  detik: number;
  ext: string;
  /** detik di rekaman saat video mulai (sebelumnya hitung mundur) */
  offset: number;
}

type Status = 'siap' | 'hitung' | 'rekam' | 'putar' | 'simpan';

/** Format rekaman yang didukung browser (Chrome/Firefox: webm, Safari: mp4). */
function formatRekam(): { mime: string; ext: string } {
  const pilihan: [string, string][] = [
    ['audio/webm;codecs=opus', '.webm'],
    ['audio/webm', '.webm'],
    ['audio/mp4', '.m4a'],
    ['audio/ogg;codecs=opus', '.ogg'],
  ];
  for (const [mime, ext] of pilihan) if (MediaRecorder.isTypeSupported(mime)) return { mime, ext };
  return { mime: '', ext: '.webm' };
}

const detikTeks = (d: number) => `${d.toFixed(1)} dtk`;

/** Keras suara mikrofon saat ini (RMS 0..1). */
function kerasSuara(an: AnalyserNode, buf: Float32Array<ArrayBuffer>): number {
  an.getFloatTimeDomainData(buf);
  let jumlah = 0;
  for (const x of buf) jumlah += x * x;
  return Math.sqrt(jumlah / buf.length);
}

export function StudioRekam({
  id,
  video,
  vertikal,
  bagian,
  nadaAwal,
  nadaMaks,
  efekAwal,
  satuan,
}: {
  id: string;
  video?: string;
  vertikal: boolean;
  bagian: BagianStudio[];
  nadaAwal: number;
  nadaMaks: number;
  /** undefined = efek karakter tidak berlaku (hafalan) */
  efekAwal?: boolean;
  satuan: string;
}) {
  const router = useRouter();
  const [aktif, setAktif] = useState(() => Math.max(0, bagian.findIndex((b) => !b.tersimpan)));
  const [take, setTake] = useState<Record<number, Take>>({});
  const [tersimpan, setTersimpan] = useState(() => bagian.map((b) => b.tersimpan));
  const [status, setStatus] = useState<Status>('siap');
  const [hitung, setHitung] = useState(0);
  const [detik, setDetik] = useState(0);
  const [nada, setNada] = useState(nadaAwal);
  const [pesan, setPesan] = useState('');
  /** detik hening sebelum berhenti sendiri; 0 = berhenti manual */
  const [batasHening, setBatasHening] = useState<number | null>(null);
  const [level, setLevel] = useState(0);
  const [sisaHening, setSisaHening] = useState<number | null>(null);
  const [efek, setEfek] = useState(efekAwal ?? false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mulaiRef = useRef(0);
  const timerRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const b = bagian[aktif];
  const t = take[aktif];
  const hening = batasHening ?? b.heningStop;
  const adaVideo = Boolean(video && b.mulai !== undefined);
  const lengkap = tersimpan.every(Boolean);

  // pindah bagian → video ke awal bagian itu
  useEffect(() => {
    const v = videoRef.current;
    if (v && b.mulai !== undefined) {
      v.pause();
      v.currentTime = b.mulai;
    }
  }, [aktif, b.mulai]);

  // lepaskan mikrofon saat halaman ditutup
  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      void audioCtxRef.current?.close();
      clearInterval(timerRef.current);
    },
    [],
  );

  // nada disimpan otomatis (berlaku saat render)
  useEffect(() => {
    if (nada === nadaAwal) return;
    const t = setTimeout(() => void simpanNada(id, nada), 600);
    return () => clearTimeout(t);
  }, [id, nada, nadaAwal]);

  // video berhenti di akhir adegan, tidak lanjut ke adegan berikutnya
  useEffect(() => {
    const v = videoRef.current;
    if (!v || b.mulai === undefined || b.durasi === undefined) return;
    const akhir = b.mulai + b.durasi;
    const cek = () => {
      if (v.currentTime >= akhir) {
        v.pause();
        v.currentTime = akhir - 0.05;
      }
    };
    v.addEventListener('timeupdate', cek);
    return () => v.removeEventListener('timeupdate', cek);
  }, [b.mulai, b.durasi]);

  function putarVideo() {
    const v = videoRef.current;
    if (!v || b.mulai === undefined) return;
    v.muted = true;
    v.currentTime = b.mulai;
    void v.play();
  }

  function hentikan() {
    videoRef.current?.pause();
    audioRef.current?.pause();
    clearInterval(timerRef.current);
  }

  async function rekam() {
    setPesan('');
    try {
      streamRef.current ??= await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: true },
      });
    } catch {
      setPesan('Mikrofon tidak bisa dibuka. Izinkan akses mikrofon untuk localhost di browser.');
      return;
    }
    hentikan();
    const i = aktif;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      audioCtxRef.current.createMediaStreamSource(streamRef.current).connect(analyserRef.current);
    }
    void audioCtxRef.current.resume();
    const an = analyserRef.current!;
    const buf = new Float32Array(an.fftSize);

    // mulai merekam sejak hitung mundur, supaya suara yang keburu keluar tidak terpotong
    // (hening di awal dirapikan saat render)
    const { mime, ext } = formatRekam();
    const rec = new MediaRecorder(streamRef.current, mime ? { mimeType: mime } : undefined);
    const potongan: Blob[] = [];
    rec.ondataavailable = (e) => {
      if (e.data.size) potongan.push(e.data);
    };
    rec.onstop = () => {
      const lama = (performance.now() - mulaiRef.current) / 1000;
      const offset = (mulaiRef.current - awalRekam) / 1000;
      const blob = new Blob(potongan, { type: rec.mimeType || mime });
      setTake((s) => {
        if (s[i]) URL.revokeObjectURL(s[i].url);
        return { ...s, [i]: { url: URL.createObjectURL(blob), blob, detik: lama, ext, offset } };
      });
      setStatus('siap');
    };
    recRef.current = rec;
    rec.start();
    const awalRekam = performance.now();

    // hitung mundur sambil mengukur bising ruangan (patokan "hening")
    setStatus('hitung');
    const bising: number[] = [];
    for (let n = 3; n > 0; n--) {
      setHitung(n);
      for (let k = 0; k < 7; k++) {
        await new Promise((r) => setTimeout(r, 100));
        bising.push(kerasSuara(an, buf));
      }
    }
    const dasar = Math.max(0.004, (bising.sort((x, y) => x - y)[Math.floor(bising.length / 2)] ?? 0) * 2.5);

    mulaiRef.current = performance.now();
    putarVideo();
    setDetik(0);
    setStatus('rekam');
    // Berhenti sendiri setelah selesai bicara. Supaya tidak memotong kalimat:
    // - level dihaluskan (suku kata yang pelan tidak dianggap hening),
    // - ambang ikut menyesuaikan kerasnya suaramu,
    // - tidak berhenti sebelum ±70% perkiraan lama membaca.
    let halus = 0;
    let puncak = 0;
    let sudahBicara = false;
    let suaraTerakhir = performance.now();
    const minimal = bagian[i].perkiraan * 0.7 * 1000;
    timerRef.current = window.setInterval(() => {
      const kini = performance.now();
      const keras = kerasSuara(an, buf);
      halus = Math.max(keras, halus * 0.93);
      const ambang = Math.max(dasar, puncak * 0.06);
      setDetik((kini - mulaiRef.current) / 1000);
      setLevel(Math.min(1, keras / (dasar * 6)));
      if (halus > ambang) {
        sudahBicara = true;
        suaraTerakhir = kini;
        puncak = Math.max(puncak * 0.999, keras);
        setSisaHening(null);
        return;
      }
      const batas = batasRef.current * 1000;
      if (!batas || !sudahBicara || kini - mulaiRef.current < minimal) return setSisaHening(null);
      const sisa = batas - (kini - suaraTerakhir);
      setSisaHening(sisa < batas - 600 ? Math.max(0, sisa / 1000) : null);
      if (sisa <= 0) berhentiRef.current();
    }, 50);
  }

  function berhenti() {
    hentikan();
    setLevel(0);
    setSisaHening(null);
    if (recRef.current?.state === 'recording') recRef.current.stop();
  }

  /** Putar rekaman bersama potongan videonya; `offset` = detik di rekaman saat video mulai. */
  async function dengar(src: string, offset = 0) {
    const a = audioRef.current;
    if (!a) return;
    hentikan();
    setPesan('');
    a.src = src;
    if (offset > 0) {
      await new Promise((r) => a.addEventListener('loadedmetadata', r, { once: true }));
      a.currentTime = offset;
    }
    a.onended = () => {
      videoRef.current?.pause();
      setStatus('siap');
    };
    a.onerror = () => {
      setPesan('Rekaman tidak bisa diputar.');
      setStatus('siap');
    };
    putarVideo();
    void a.play();
    setStatus('putar');
  }

  function stopDengar() {
    hentikan();
    setStatus('siap');
  }

  async function simpan() {
    if (!t) return;
    setStatus('simpan');
    const fd = new FormData();
    fd.append('adegan', String(aktif));
    fd.append('audio', t.blob, `rekaman${t.ext}`);
    fd.append('offset', t.offset.toFixed(3));
    const res = await fetch(`/api/audio/${id}?json=1`, { method: 'POST', body: fd });
    if (!res.ok) {
      setPesan(`Gagal menyimpan: ${(await res.json().catch(() => ({}))).error ?? res.status}`);
      setStatus('siap');
      return;
    }
    const baru = tersimpan.map((s, i) => s || i === aktif);
    setTersimpan(baru);
    setTake((s) => {
      URL.revokeObjectURL(s[aktif].url);
      const { [aktif]: _, ...sisa } = s;
      return sisa;
    });
    // lanjut ke bagian berikutnya yang belum direkam
    const lanjut = baru.findIndex((s, i) => !s && i > aktif);
    const pertama = baru.findIndex((s) => !s);
    if (lanjut >= 0 || pertama >= 0) setAktif(lanjut >= 0 ? lanjut : pertama);
    setStatus('siap');
    router.refresh();
  }

  async function render() {
    const fd = new FormData();
    fd.append('id', id);
    await renderVideo(fd);
    router.push(`/episode/${id}`);
  }

  // Spasi = mulai/berhenti rekam
  const rekamRef = useRef(rekam);
  const berhentiRef = useRef(berhenti);
  const batasRef = useRef(hening);
  rekamRef.current = rekam;
  berhentiRef.current = berhenti;
  batasRef.current = hening;
  useEffect(() => {
    function tombol(e: KeyboardEvent) {
      if (e.code !== 'Space' || (e.target as HTMLElement).closest('input, textarea, button, select')) return;
      e.preventDefault();
      if (status === 'siap') void rekamRef.current();
      else if (status === 'rekam') berhentiRef.current();
    }
    window.addEventListener('keydown', tombol);
    return () => window.removeEventListener('keydown', tombol);
  }, [status]);

  const sibuk = status !== 'siap';
  const lebih = b.durasi !== undefined && detik > b.durasi;

  return (
    <div className="studio">
      <div className="stack">
        <div className={`studio-layar${vertikal ? ' vertikal' : ''}`}>
          {video ? <video ref={videoRef} src={video} muted playsInline preload="auto" /> : null}
          {!adaVideo ? (
            <div className="studio-kosong kecil">
              {video
                ? 'Waktu adegan di pratinjau belum diketahui. Render ulang sekali supaya video bisa diputar per adegan.'
                : 'Belum ada pratinjau video. Klik "Render pratinjau tanpa suara" di halaman episode supaya bisa merekam sambil melihat videonya. Merekam tanpa video tetap bisa.'}
            </div>
          ) : null}
          {status === 'hitung' ? <div className="studio-hitung">{hitung}</div> : null}
          {status === 'rekam' ? (
            <div className="studio-rec">
              ● REC {detikTeks(detik)}
              {sisaHening !== null ? <span style={{ fontWeight: 600 }}> · berhenti dalam {sisaHening.toFixed(1)}…</span> : null}
              <span className="studio-level">
                <span style={{ width: `${level * 100}%` }} />
              </span>
            </div>
          ) : null}
        </div>

        <div className="panel stack" style={{ gap: 10 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <b>{b.judul}</b>
            <span className="kecil muted">
              {aktif + 1} / {bagian.length}
            </span>
          </div>
          <div className={`studio-teks${b.arab ? ' arab' : ''}`} dir={b.arab ? 'rtl' : undefined}>
            {b.teks}
          </div>
          {b.catatan ? <div className="kecil muted">{b.catatan}</div> : null}
          {b.suara && efekAwal !== undefined ? (
            <div className="kecil">
              🎭 <b>{efek ? b.suara : 'Efek karakter mati: suara asli'}</b>
            </div>
          ) : null}

          {b.durasi !== undefined ? (
            <div className="kecil">
              Panjang di pratinjau: <b>{detikTeks(b.durasi)}</b>
              {t ? (
                <>
                  {' '}
                  · rekamanmu: <b>{detikTeks(t.detik)}</b>
                </>
              ) : null}
              <div className="studio-bar">
                <div
                  style={{
                    width: `${Math.min(100, ((status === 'rekam' ? detik : (t?.detik ?? 0)) / b.durasi) * 100)}%`,
                    background: lebih ? 'var(--emas)' : 'var(--hijau)',
                  }}
                />
              </div>
              <span className="muted">Tidak harus sama: video akhir mengikuti panjang rekamanmu.</span>
            </div>
          ) : null}

          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            {status === 'rekam' ? (
              <button type="button" className="bahaya" onClick={berhenti}>
                ⏹ Berhenti
              </button>
            ) : (
              <button type="button" onClick={() => void rekam()} disabled={sibuk}>
                ⏺ {t || tersimpan[aktif] ? 'Rekam ulang' : 'Rekam'}
              </button>
            )}
            {status === 'putar' ? (
              <button type="button" className="sekunder" onClick={stopDengar}>
                ⏹ Stop
              </button>
            ) : (
              <>
                {t ? (
                  <button type="button" className="sekunder" onClick={() => void dengar(t.url, t.offset)} disabled={sibuk}>
                    ▶️ Dengar rekaman baru
                  </button>
                ) : null}
                {tersimpan[aktif] ? (
                  <button
                    type="button"
                    className="sekunder"
                    onClick={() => void dengar(`/api/audio/${id}?adegan=${aktif}&nada=${nada}&efek=${efek ? 1 : 0}&v=${Date.now()}`)}
                    disabled={sibuk}
                  >
                    ▶️ Dengar yang tersimpan{efek && b.suara ? ' (dengan efek)' : nada ? ' (dengan nada)' : ''}
                  </button>
                ) : null}
              </>
            )}
            {t ? (
              <button type="button" onClick={() => void simpan()} disabled={sibuk}>
                {status === 'simpan' ? 'Menyimpan…' : '💾 Simpan & lanjut'}
              </button>
            ) : null}
          </div>
          <label className="kecil" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            Berhenti otomatis setelah selesai bicara:
            <select value={hening} onChange={(e) => setBatasHening(Number(e.target.value))}>
              {[...new Set([2, 2.5, 3, 4, 5, b.heningStop])]
                .sort((x, y) => x - y)
                .map((d) => (
                  <option key={d} value={d}>
                    hening {d} detik
                  </option>
                ))}
              <option value={0}>mati (tekan stop sendiri)</option>
            </select>
          </label>
          <div className="kecil muted">
            Satu rekaman = satu {satuan}. Video berhenti di akhir {satuan} ini. Tekan spasi untuk mulai/berhenti. Hening di awal & akhir
            rekaman dirapikan otomatis saat render. Pakai headset supaya suara video tidak ikut terekam.
          </div>
          {pesan ? <div className="peringatan kecil">{pesan}</div> : null}
          <audio ref={audioRef} hidden />
        </div>

        {efekAwal !== undefined ? (
          <div className="panel stack" style={{ gap: 8 }}>
            <b>🎭 Efek suara karakter</b>
            <label className="kecil" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={efek}
                onChange={(e) => {
                  setEfek(e.target.checked);
                  void simpanEfekKarakter(id, e.target.checked);
                }}
              />
              Pakai efek suara per pembicara di episode ini
            </label>
            <div className="kecil muted">
              Narator memakai suara asli, Ibu lebih berat & kalem, Mamas seperti anak kecil yang ceria. Efek diterapkan saat render; dengarkan
              lewat &quot;Dengar yang tersimpan&quot;. Atur kekuatan efek tiap karakter di halaman <a href="/pengaturan">Pengaturan</a>.
            </div>
          </div>
        ) : null}

        <div className="panel stack" style={{ gap: 8 }}>
          <b>🎚️ Nada suara</b>
          <label className="kecil">
            {nada === 0 ? 'Asli' : `${nada > 0 ? '+' : ''}${nada} semiton (${nada > 0 ? 'lebih tinggi' : 'lebih rendah'})`}
            <input
              type="range"
              min={-nadaMaks}
              max={nadaMaks}
              step={0.5}
              value={nada}
              onChange={(e) => setNada(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </label>
          <div className="kecil muted">
            Berlaku untuk seluruh rekaman episode ini saat render; kecepatan bicara tidak berubah. Dengarkan efeknya lewat tombol
            &quot;Dengar yang tersimpan&quot;. Geser tipis saja (±1–2) supaya suara tetap alami dan bacaan tetap jelas.
          </div>
        </div>
      </div>

      <div className="panel stack" style={{ gap: 6, alignSelf: 'start' }}>
        <b>
          Daftar {satuan} ({tersimpan.filter(Boolean).length}/{bagian.length})
        </b>
        {bagian.map((x, i) => (
          <button
            key={i}
            type="button"
            className={`studio-item${i === aktif ? ' aktif' : ''}`}
            onClick={() => {
              hentikan();
              setStatus('siap');
              setAktif(i);
            }}
            disabled={status === 'rekam' || status === 'hitung'}
          >
            <span>{tersimpan[i] ? '✅' : take[i] ? '🟡' : '⬜'}</span>
            <span className="studio-item-isi">
              <b>{x.judul}</b>
              <span className="muted">{x.teks}</span>
            </span>
          </button>
        ))}
        <button type="button" onClick={() => void render()} disabled={!lengkap || sibuk} style={{ marginTop: 8 }}>
          🎬 {lengkap ? 'Render dengan rekaman ini' : `Render (kurang ${tersimpan.filter((s) => !s).length} ${satuan})`}
        </button>
        <span className="kecil muted">🟡 = sudah direkam tapi belum disimpan</span>
      </div>
    </div>
  );
}
