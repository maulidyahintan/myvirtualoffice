// Video Creator bagian "mesin": render video & thumbnail dengan Remotion (gratis, di laptop).
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import {
  ensureDir,
  filterNada,
  filterSuara,
  FPS,
  frameIntroOutro,
  hitungFrameAdegan,
  hitungFrameHafalan,
  loadConfig,
  paths,
  segmenHafalan,
  suaraPembicara,
  updateEpisode,
  type Episode,
  type EpisodeVideoProps,
  type Format,
  type KantorConfig,
  type MusikVideo,
  type ThumbnailProps,
} from '@kantor/shared';

function jalankan(args: string[], onLine?: (s: string) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn('npx', ['--no-install', 'remotion', ...args], {
      cwd: paths.videoPkg(),
      shell: process.platform === 'win32',
      env: process.env,
    });
    const handle = (b: Buffer) => b.toString().split(/\r?\n/).filter(Boolean).forEach((l) => onLine?.(l));
    p.stdout.on('data', handle);
    p.stderr.on('data', handle);
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`Remotion keluar dengan kode ${code}`))));
  });
}

/** Jalankan ffmpeg bawaan Remotion dan kembalikan seluruh output (stderr berisi hasil analisis). */
function ffmpeg(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const p = spawn('npx', ['--no-install', 'remotion', 'ffmpeg', ...args], {
      cwd: paths.videoPkg(),
      shell: process.platform === 'win32',
      env: process.env,
    });
    let out = '';
    p.stdout.on('data', (b: Buffer) => (out += b.toString()));
    p.stderr.on('data', (b: Buffer) => (out += b.toString()));
    p.on('error', reject);
    p.on('close', () => resolve(out));
  });
}

/**
 * Cari waktu mulai tiap bacaan di rekaman hafalan dengan mendeteksi jeda (hening).
 * Jeda terpanjang dianggap batas antar bacaan. Kembalikan undefined kalau jedanya
 * kurang dari jumlah bacaan (video lalu dibagi rata sesuai panjang ayat).
 */
export async function deteksiSegmen(fileAudio: string, jumlahSegmen: number): Promise<number[] | undefined> {
  if (jumlahSegmen <= 1) return [0];
  const out = await ffmpeg(['-hide_banner', '-i', fileAudio, '-af', 'silencedetect=noise=-35dB:d=0.35', '-f', 'null', '-']);
  const durasiM = out.match(/Duration: (\d+):(\d+):([\d.]+)/);
  const durasi = durasiM ? Number(durasiM[1]) * 3600 + Number(durasiM[2]) * 60 + Number(durasiM[3]) : Infinity;
  const jeda: { mulai: number; akhir: number }[] = [];
  let mulai: number | undefined;
  for (const baris of out.split('\n')) {
    const s = baris.match(/silence_start: ([\d.]+)/);
    if (s) mulai = Number(s[1]);
    const e = baris.match(/silence_end: ([\d.]+)/);
    if (e && mulai !== undefined) {
      jeda.push({ mulai, akhir: Number(e[1]) });
      mulai = undefined;
    }
  }
  // abaikan hening di awal & akhir rekaman
  const tengah = jeda.filter((j) => j.mulai > 0.3 && j.akhir < durasi - 0.3);
  if (tengah.length < jumlahSegmen - 1) return undefined;
  const batas = tengah
    .sort((a, b) => b.akhir - b.mulai - (a.akhir - a.mulai))
    .slice(0, jumlahSegmen - 1)
    .map((j) => j.akhir - 0.15) // mulai tampil sesaat sebelum suara berikutnya
    .sort((a, b) => a - b);
  return [0, ...batas];
}

/** Jeda hening yang disisipkan setelah tiap rekaman per adegan, supaya adegan tidak terasa terburu-buru. */
const JEDA_PER_ADEGAN = 0.6;

function durasiDariOutput(out: string): number {
  const m = out.match(/Duration: (\d+):(\d+):([\d.]+)/);
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0;
}

/**
 * Lama audio (detik). Rekaman browser (webm) sering tanpa info durasi di header,
 * jadi kalau kosong file dibaca sampai habis.
 */
async function durasiAudio(lokasi: string): Promise<number> {
  const dariHeader = durasiDariOutput(await ffmpeg(['-hide_banner', '-i', lokasi]));
  if (dariHeader > 0) return dariHeader;
  const waktu = [...(await ffmpeg(['-hide_banner', '-i', lokasi, '-f', 'null', '-'])).matchAll(/time=(\d+):(\d+):([\d.]+)/g)].at(-1);
  return waktu ? Number(waktu[1]) * 3600 + Number(waktu[2]) * 60 + Number(waktu[3]) : 0;
}

/** Lama audio (detik) dari path relatif ke packages/video/public. */
function durasiFile(rel: string): Promise<number> {
  return durasiAudio(path.join(paths.videoPkg(), 'public', rel));
}

/** Rekaman dengan nada digeser (file baru, rekaman asli tidak diubah). */
async function geserNada(id: string, fileAudio: string, semiton: number, onLine?: (s: string) => void): Promise<string> {
  const filter = filterNada(semiton);
  if (!filter) return fileAudio;
  const pub = path.join(paths.videoPkg(), 'public');
  const hasil = `audio/${id}-nada.wav`;
  fs.rmSync(path.join(pub, hasil), { force: true });
  const out = await ffmpeg(['-hide_banner', '-y', '-i', path.join(pub, fileAudio), '-af', filter, path.join(pub, hasil)]);
  if (!fs.existsSync(path.join(pub, hasil))) throw new Error(`Gagal mengubah nada suara:\n${out.slice(-600)}`);
  onLine?.(`Nada suara digeser ${semiton > 0 ? '+' : ''}${semiton} semiton`);
  return hasil;
}

/**
 * Detik mulai & lama tiap adegan (hafalan: tiap ayat) di video, dihitung dengan rumus
 * yang sama seperti calculateMetadata komposisi Episode.
 */
export async function waktuAdegan(props: EpisodeVideoProps): Promise<{ mulai: number; durasi: number }[]> {
  const durasiAudio = props.fileAudio ? await durasiFile(props.fileAudio) : undefined;
  const { intro } = frameIntroOutro(
    props.format,
    props.musik?.pembuka ? await durasiFile(props.musik.pembuka) : undefined,
    props.musik?.penutup ? await durasiFile(props.musik.penutup) : undefined,
  );
  let frames: number[];
  if (props.hafalan) {
    const h = props.hafalan;
    const perSegmen = hitungFrameHafalan(h.ayat, h.ulang, durasiAudio, h.mulaiSegmen);
    frames = h.ayat.map(() => 0);
    segmenHafalan(h.ayat, h.ulang).forEach((s, i) => (frames[s.ayat] += perSegmen[i] ?? 0));
  } else {
    frames = hitungFrameAdegan(props.adegan, durasiAudio, props.mulaiAdegan);
  }
  let f = intro;
  return frames.map((n) => {
    const w = { mulai: f / FPS, durasi: n / FPS };
    f += n;
    return w;
  });
}

/**
 * Potongan rekaman yang berisi suara: hening di awal (sisakan 0,2 dtk) & akhir
 * (sisakan 0,4 dtk, supaya ujung kata yang lirih tidak terpotong) dibuang. Kembalikan filter atrim, atau undefined kalau tidak perlu.
 */
async function filterRapikan(lokasi: string): Promise<string | undefined> {
  const durasi = await durasiAudio(lokasi);
  const out = await ffmpeg(['-hide_banner', '-i', lokasi, '-af', 'silencedetect=noise=-50dB:d=0.3', '-f', 'null', '-']);
  const hening: { mulai: number; akhir: number }[] = [];
  for (const m of out.matchAll(/silence_start: ([\d.]+)|silence_end: ([\d.]+)/g)) {
    if (m[1] !== undefined) hening.push({ mulai: Number(m[1]), akhir: durasi });
    else if (hening.length) hening[hening.length - 1].akhir = Number(m[2]);
  }
  const awal = hening[0] && hening[0].mulai < 0.05 ? hening[0].akhir : 0;
  const ujung = hening.at(-1);
  const akhir = ujung && ujung.akhir > durasi - 0.05 && ujung.mulai > awal ? ujung.mulai : durasi;
  const dari = Math.max(0, awal - 0.2);
  const sampai = Math.min(durasi, akhir + 0.4);
  if (dari < 0.05 && sampai > durasi - 0.05) return undefined;
  return `atrim=start=${dari.toFixed(3)}:end=${sampai.toFixed(3)},asetpts=PTS-STARTPTS`;
}

/**
 * Gabungkan beberapa rekaman jadi satu file wav, berurutan. Tiap file diseragamkan dulu
 * (bisa beda HP/aplikasi), opsional dirapikan heningnya, lalu diberi jeda hening setelahnya.
 * Kembalikan file hasil, detik mulai & lama tiap rekaman (setelah dirapikan).
 */
export async function gabungAudio(
  id: string,
  files: string[],
  opsi: { jeda?: number[]; rapikan?: boolean; efek?: (string | undefined)[]; mulaiDari?: (number | null | undefined)[] } = {},
  onLine?: (s: string) => void,
): Promise<{ file: string; mulai: number[]; durasi: number[]; olahan: string[] }> {
  const pub = path.join(paths.videoPkg(), 'public');
  for (const f of files) if (!fs.existsSync(path.join(pub, f))) throw new Error(`Rekaman ${f} tidak ditemukan`);

  const olahan = files.map((_, i) => `audio/${id}-olah-${i + 1}.wav`);
  for (const [i, f] of files.entries()) {
    let sumber = path.join(pub, f);
    // rekaman Studio: buang bagian hitung mundur (sisakan 0,3 dtk kalau keburu bicara)
    const dari = Math.max(0, (opsi.mulaiDari?.[i] ?? 0) - 0.3);
    if (dari > 0.05) {
      const pra = path.join(pub, `audio/${id}-pra-${i + 1}.wav`);
      await ffmpeg(['-hide_banner', '-y', '-i', sumber, '-af', `atrim=start=${dari.toFixed(3)},asetpts=PTS-STARTPTS`, pra]);
      if (fs.existsSync(pra)) sumber = pra;
    }
    const potong = opsi.rapikan ? await filterRapikan(sumber) : undefined;
    const filter = [potong, opsi.efek?.[i], 'aresample=48000,aformat=sample_fmts=s16:channel_layouts=stereo'].filter(Boolean).join(',');
    const out = await ffmpeg(['-hide_banner', '-y', '-i', sumber, '-af', filter, path.join(pub, olahan[i])]);
    if (sumber !== path.join(pub, f)) fs.rmSync(sumber, { force: true });
    if (!fs.existsSync(path.join(pub, olahan[i]))) throw new Error(`Gagal mengolah rekaman ${f}:\n${out.slice(-600)}`);
  }
  const durasi = await Promise.all(olahan.map(durasiFile));
  const jeda = files.map((_, i) => opsi.jeda?.[i] ?? 0);
  const mulai = durasi.map((_, i) => durasi.slice(0, i).reduce((s, d, k) => s + d + jeda[k], 0));

  const hasil = `audio/${id}-gabung.wav`;
  fs.rmSync(path.join(pub, hasil), { force: true });
  const beriJeda = olahan.map((_, i) => `[${i}:a]${jeda[i] ? `apad=pad_dur=${jeda[i]}` : 'anull'}[a${i}]`).join(';');
  const sambung = `${olahan.map((_, i) => `[a${i}]`).join('')}concat=n=${olahan.length}:v=0:a=1[out]`;
  const out = await ffmpeg([
    '-hide_banner',
    '-y',
    ...olahan.flatMap((f) => ['-i', path.join(pub, f)]),
    '-filter_complex',
    `${beriJeda};${sambung}`,
    '-map',
    '[out]',
    path.join(pub, hasil),
  ]);
  if (!fs.existsSync(path.join(pub, hasil))) throw new Error(`Gagal menggabungkan rekaman:\n${out.slice(-600)}`);
  onLine?.(`${files.length} rekaman digabung`);
  return { file: hasil, mulai, durasi, olahan };
}

function hapusOlahan(olahan: string[]) {
  for (const f of olahan) fs.rmSync(path.join(paths.videoPkg(), 'public', f), { force: true });
}

/** Jeda berpikir untuk anak setelah adegan pertanyaan (rekaman per adegan tidak perlu menunggu). */
const JEDA_PERTANYAAN = 3;

/** Rekaman per adegan/ayat → satu file + detik mulai tiap adegan (hafalan: tiap bacaan). */
async function siapkanAudioPerAdegan(ep: Episode, onLine?: (s: string) => void) {
  const hafal = ep.ide.jenis === 'hafalan' ? ep.hafalan : undefined;
  const jumlah = hafal ? hafal.ayat.length : (ep.adegan?.length ?? 0);
  const per = ep.audioPerAdegan ?? [];
  const kosong = Array.from({ length: jumlah }, (_, i) => i).filter((i) => !per[i]);
  if (kosong.length) {
    throw new Error(`Rekaman ${hafal ? 'ayat' : 'adegan'} ke-${kosong.map((i) => i + 1).join(', ')} belum diupload`);
  }
  const files = per.slice(0, jumlah) as string[];
  const jeda = files.map((_, i) => JEDA_PER_ADEGAN + (!hafal && ep.adegan?.[i]?.jenis === 'pertanyaan' ? JEDA_PERTANYAAN : 0));
  // efek suara karakter (Ibu, Mamas, …) hanya untuk cerita; bacaan Al-Qur'an tetap suara asli
  const cfg = loadConfig();
  const efek = files.map((_, i) =>
    !hafal && ep.efekKarakter !== false && ep.adegan?.[i] ? filterSuara(suaraPembicara(ep.adegan[i].pembicara, cfg)) : undefined,
  );
  const { file, mulai, durasi, olahan } = await gabungAudio(ep.id, files, { jeda, rapikan: true, efek, mulaiDari: ep.offsetAdegan }, onLine);
  ep.fileAudio = file;

  let mulaiSegmen: number[] | undefined;
  if (hafal && !hafal.mulaiSegmen) {
    // tiap file ayat bisa berisi beberapa bacaan ulang → cari jedanya di dalam file itu
    const segmen = segmenHafalan(hafal.ayat, ep.ide.hafalan?.ulang ?? 1);
    mulaiSegmen = [];
    for (const [i, f] of olahan.entries()) {
      const n = segmen.filter((s) => s.ayat === i).length;
      // jeda tidak jelas → bacaan dibagi rata dalam file ayat itu
      const dalam =
        n > 1
          ? ((await deteksiSegmen(path.join(paths.videoPkg(), 'public', f), n)) ?? Array.from({ length: n }, (_, k) => (k * durasi[i]) / n))
          : [0];
      mulaiSegmen.push(...dalam.map((t) => mulai[i] + t));
    }
    hafal.mulaiSegmen = mulaiSegmen;
  }
  hapusOlahan(olahan);
  updateEpisode(ep.id, (e) => {
    e.fileAudio = file;
    if (mulaiSegmen && e.hafalan) e.hafalan.mulaiSegmen = mulaiSegmen;
  });
  return hafal ? undefined : mulai;
}

/** Musik pembuka/penutup dari pengaturan; file yang hilang dilewati. */
function musikVideo(cfg: KantorConfig, format: Format): MusikVideo | undefined {
  const m = cfg.musik;
  if (!m || (format === 'short' && !m.diShorts)) return undefined;
  const ada = (f?: string) => (f && fs.existsSync(path.join(paths.videoPkg(), 'public', f)) ? f : undefined);
  const hasil = { pembuka: ada(m.pembuka), penutup: ada(m.penutup), volume: m.volume };
  return hasil.pembuka || hasil.penutup ? hasil : undefined;
}

export async function renderEpisode(ep: Episode, onLine?: (s: string) => void) {
  if (!ep.adegan?.length) throw new Error('Episode belum punya adegan dari Sutradara');
  const cfg = loadConfig();
  const dir = ensureDir(paths.renders());

  let mulaiAdegan: number[] | undefined;
  if (ep.modeRekam === 'per-adegan') {
    mulaiAdegan = await siapkanAudioPerAdegan(ep, onLine);
  } else if ((ep.bagianAudio?.length ?? 0) > 1) {
    const { file, olahan } = await gabungAudio(ep.id, ep.bagianAudio!, {}, onLine);
    hapusOlahan(olahan);
    ep.fileAudio = file;
    updateEpisode(ep.id, (e) => {
      e.fileAudio = file;
    });
  }

  if (ep.fileAudio && !fs.existsSync(path.join(paths.videoPkg(), 'public', ep.fileAudio))) {
    throw new Error(`File audio ${ep.fileAudio} tidak ditemukan`);
  }

  let hafalan: EpisodeVideoProps['hafalan'];
  if (ep.ide.jenis === 'hafalan' && ep.hafalan) {
    const ulang = ep.ide.hafalan?.ulang ?? 1;
    let mulaiSegmen = ep.hafalan.mulaiSegmen;
    const jumlah = segmenHafalan(ep.hafalan.ayat, ulang).length;
    if (ep.fileAudio && (!mulaiSegmen || mulaiSegmen.length !== jumlah)) {
      mulaiSegmen = await deteksiSegmen(path.join(paths.videoPkg(), 'public', ep.fileAudio), jumlah);
      onLine?.(mulaiSegmen ? `Jeda antar bacaan terdeteksi (${jumlah} bacaan)` : 'Jeda antar bacaan tidak cukup jelas — durasi dibagi sesuai panjang ayat');
      updateEpisode(ep.id, (e) => {
        if (e.hafalan) e.hafalan.mulaiSegmen = mulaiSegmen;
      });
    }
    hafalan = { namaSurat: ep.hafalan.namaSurat, artiSurat: ep.hafalan.artiSurat, ayat: ep.hafalan.ayat, ulang, mulaiSegmen };
  }

  const props: EpisodeVideoProps = {
    namaChannel: cfg.namaChannel,
    judul: ep.naskah?.judul ?? ep.ide.judul,
    namaSeri: cfg.seri.find((s) => s.id === ep.ide.seri)?.nama ?? '',
    adegan: ep.adegan,
    fileAudio: ep.fileAudio && ep.nadaSuara ? await geserNada(ep.id, ep.fileAudio, ep.nadaSuara, onLine) : ep.fileAudio,
    mulaiAdegan,
    format: ep.ide.format ?? 'biasa',
    hafalan,
    musik: musikVideo(cfg, ep.ide.format ?? 'biasa'),
  };
  const propsFile = path.join(dir, `${ep.id}.props.json`);
  fs.writeFileSync(propsFile, JSON.stringify(props));

  const pertama = ep.adegan.find((a) => a.karakter.length > 0) ?? ep.adegan[0];
  const thumbProps: ThumbnailProps = {
    teks: ep.metadata?.teksThumbnail ?? props.judul,
    latar: pertama.latar,
    karakter: pertama.karakter.length ? pertama.karakter : ['ibu', 'mamas'],
    ...(hafalan ? { subjudul: 'Hafalan Surat' } : {}),
    ekspresi: 'senang',
  };
  const thumbPropsFile = path.join(dir, `${ep.id}.thumb.json`);
  fs.writeFileSync(thumbPropsFile, JSON.stringify(thumbProps));

  // Ukuran video (16:9 atau 9:16) diatur otomatis oleh komposisi dari props.format
  const video = `${ep.id}.mp4`;
  await jalankan(['render', 'src/index.ts', 'Episode', path.join(dir, video), `--props=${propsFile}`], onLine);
  // Shorts tidak memakai thumbnail kustom (YouTube memilih frame dari video)
  const adegan = await waktuAdegan(props);
  if (props.format === 'short') return { video, thumbnail: undefined, adegan };
  const thumbnail = `${ep.id}.png`;
  await jalankan(['still', 'src/index.ts', 'Thumbnail', path.join(dir, thumbnail), `--props=${thumbPropsFile}`], onLine);
  return { video, thumbnail, adegan };
}
