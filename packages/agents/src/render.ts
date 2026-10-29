// Video Creator bagian "mesin": render video & thumbnail dengan Remotion (gratis, di laptop).
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import {
  ensureDir,
  loadConfig,
  paths,
  segmenHafalan,
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
    fileAudio: ep.fileAudio,
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
  if (props.format === 'short') return { video, thumbnail: undefined };
  const thumbnail = `${ep.id}.png`;
  await jalankan(['still', 'src/index.ts', 'Thumbnail', path.join(dir, thumbnail), `--props=${thumbPropsFile}`], onLine);
  return { video, thumbnail };
}
