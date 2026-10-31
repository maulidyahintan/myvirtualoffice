// Pecah video biasa yang sudah jadi menjadi beberapa Shorts: agen memilih adegan yang paling
// penting & bermakna, lalu tiap Shorts dirender memakai potongan rekaman yang sama (tanpa rekam ulang).
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import {
  addLog,
  createEpisodeFromIdea,
  FPS,
  getEpisode,
  sceneFrames,
  paths,
  normalizeMetadata,
  setStatus,
  updateEpisode,
  type Episode,
} from '@kantor/shared';
import { runAgent } from './run-agent.ts';
import { durasiAudio, ffmpeg } from './render.ts';

/** Batas isi (adegan) satu Shorts; ditambah intro/outro Shorts tetap di bawah 60 detik. */
export const BATAS_ISI_SHORTS = 52;
/** Jeda yang ditambahkan render per adegan (lihat siapkanAudioPerAdegan). */
const JEDA_ADEGAN = 0.6;
const JEDA_PERTANYAAN = 3;

const PotonganSchema = z.object({
  shorts: z.array(
    z.object({
      adegan: z.array(z.number().int()).describe('nomor adegan (mulai 1) yang dipakai, urut naik'),
      alasan: z.string().describe('kenapa potongan ini penting & bermakna, 1 kalimat'),
      judul: z.string().max(100),
      deskripsi: z.string(),
      tags: z.array(z.string()),
      teksThumbnail: z.string(),
    }),
  ),
});

interface Potongan {
  /** path relatif ke packages/video/public */
  file: string;
  offset: number | null;
  /** perkiraan lama adegan di video (detik) */
  detik: number;
}

const pub = () => path.join(paths.videoPkg(), 'public');

/** Titik tengah hening di rekaman, untuk memotong di antara kalimat. */
async function titikHening(lokasi: string): Promise<number[]> {
  const out = await ffmpeg(['-hide_banner', '-i', lokasi, '-af', 'silencedetect=noise=-40dB:d=0.25', '-f', 'null', '-']);
  const titik: number[] = [];
  let mulai: number | undefined;
  for (const m of out.matchAll(/silence_start: ([\d.]+)|silence_end: ([\d.]+)/g)) {
    if (m[1] !== undefined) mulai = Number(m[1]);
    else if (mulai !== undefined) titik.push((mulai + Number(m[2])) / 2);
  }
  return titik;
}

/**
 * Rekaman tiap adegan episode asal. Rekaman per adegan dipakai apa adanya; rekaman berurutan
 * dipotong di batas adegan seperti saat render, digeser ke hening terdekat (maks. 2 dtk).
 */
export async function rekamanPerAdegan(ep: Episode): Promise<Potongan[]> {
  const adegan = ep.adegan!;
  if (ep.modeRekam === 'per-adegan') {
    return Promise.all(
      adegan.map(async (a, i) => {
        const file = ep.audioPerAdegan?.[i];
        if (!file) throw new Error(`Rekaman adegan ${i + 1} tidak ada`);
        const offset = ep.offsetAdegan?.[i] ?? null;
        const detik = (await durasiAudio(path.join(pub(), file))) - (offset ?? 0) + JEDA_ADEGAN + (a.jenis === 'pertanyaan' ? JEDA_PERTANYAAN : 0);
        return { file, offset, detik };
      }),
    );
  }
  if (!ep.fileAudio) throw new Error('Episode belum punya rekaman suara');
  const lokasi = path.join(pub(), ep.fileAudio);
  const total = await durasiAudio(lokasi);
  const frames = sceneFrames(adegan, total);
  const hening = await titikHening(lokasi);
  let t = 0;
  const batas = [0];
  for (const f of frames.slice(0, -1)) {
    t += f / FPS;
    const dekat = hening.reduce<number | undefined>((b, h) => (Math.abs(h - t) <= 2 && (b === undefined || Math.abs(h - t) < Math.abs(b - t)) ? h : b), undefined);
    batas.push(Math.max(batas.at(-1)!, dekat ?? t));
  }
  batas.push(total);

  const dir = path.join(pub(), 'audio');
  return Promise.all(
    adegan.map(async (_, i) => {
      const file = `audio/${ep.id}-potong-${i + 1}.wav`;
      const af = `atrim=start=${batas[i].toFixed(3)}:end=${batas[i + 1].toFixed(3)},asetpts=PTS-STARTPTS`;
      await ffmpeg(['-hide_banner', '-y', '-i', lokasi, '-af', af, path.join(dir, path.basename(file))]);
      if (!fs.existsSync(path.join(pub(), file))) throw new Error(`Gagal memotong rekaman adegan ${i + 1}`);
      return { file, offset: null, detik: batas[i + 1] - batas[i] + JEDA_ADEGAN };
    }),
  );
}

/** Rapikan pilihan agen: nomor valid & urut, dan potong dari belakang kalau melebihi batas Shorts. */
function rapikanPilihan(nomor: number[], potongan: Potongan[]): number[] {
  const idx = [...new Set(nomor.map((n) => n - 1))].filter((i) => i >= 0 && i < potongan.length).sort((a, b) => a - b);
  while (idx.length > 1 && idx.reduce((s, i) => s + potongan[i].detik, 0) > BATAS_ISI_SHORTS) idx.pop();
  return idx;
}

export async function pecahJadiShorts(id: string, jumlah: number, arahan?: string, onRender?: (id: string) => Promise<void>) {
  const ep = getEpisode(id);
  if (!ep.adegan?.length || !ep.naskah) throw new Error('Episode belum punya adegan');
  if (ep.ide.jenis === 'hafalan') throw new Error('Video hafalan: pakai "Buat versi Shorts" saja');
  const catat = (pesan: string) => addLog(id, 'sutradara', pesan);

  catat(`Menyiapkan ${jumlah} Shorts: memotong rekaman per adegan`);
  const potongan = await rekamanPerAdegan(ep);
  const daftar = ep.adegan.map((a, i) => ({
    nomor: i + 1,
    jenis: a.jenis,
    pembicara: a.pembicara,
    narasi: a.narasi,
    detik: Math.round(potongan[i].detik * 10) / 10,
  }));

  catat('Memilih adegan yang paling penting & bermakna');
  const hasil = await runAgent({
    peran: 'sutradara',
    schema: PotonganSchema,
    maxTurns: 4,
    prompt: `Video biasa "${ep.naskah.judul}" sudah tayang. Pesan moral: ${ep.ide.pesanMoral}

Pilih adegan untuk ${jumlah} YouTube Shorts dari video ini. Narasi & rekamannya TIDAK diubah, kamu hanya memilih adegan.
Aturan:
- Tiap Shorts total "detik" adegannya maksimal ${BATAS_ISI_SHORTS} detik.
- Tiap Shorts harus utuh & bisa dipahami sendiri tanpa menonton video aslinya: ada pembuka yang menarik, inti, dan pesan/penutup yang bermakna.
- Ambil INTI pembicaraannya saja, jangan menyalin seluruh cerita: pilih adegan yang paling penting, menyentuh, atau berisi pelajaran/dalil; lewati salam, pengantar, transisi, dan pengulangan.
- Buat maksimal ${jumlah} Shorts. Kalau bagian yang benar-benar penting hanya cukup untuk lebih sedikit, buat lebih sedikit (jangan mengisi dengan bagian yang kurang bermakna).
- Adegan boleh dilompati, tapi urutannya tetap sesuai cerita (nomor naik). Jangan memotong dialog sehingga jawaban muncul tanpa pertanyaannya.
- Tiap Shorts sebaiknya membahas sisi yang berbeda; satu adegan boleh dipakai di lebih dari satu Shorts kalau memang perlu.
- Buat juga metadata YouTube Shorts untuk tiap Shorts (SEO, jangan pakai gaya video biasa): judul ≤ 60 karakter dengan kata kunci utama di depan (menarik untuk anak & orang tua); deskripsi 1–2 kalimat berisi kata kunci + sumber dalil singkat, diakhiri baris \`#Shorts\` dan 1–2 tagar topik; 5–10 tags relevan; teksThumbnail ≤ 3 kata.
${arahan ? `\nArahan dari pemilik channel: ${arahan}\n` : ''}
Daftar adegan (detik = lama di video):
${JSON.stringify(daftar, null, 2)}`,
  });

  const dibuat: string[] = [];
  for (const [k, s] of hasil.shorts.slice(0, jumlah).entries()) {
    const idx = rapikanPilihan(s.adegan, potongan);
    if (!idx.length) continue;
    const baru = createEpisodeFromIdea({ ...ep.ide, judul: s.judul, format: 'short' }, 'sutradara');
    const salin = idx.map((i, n) => {
      const tujuan = `audio/${baru.id}-adegan-${n + 1}${path.extname(potongan[i].file)}`;
      fs.copyFileSync(path.join(pub(), potongan[i].file), path.join(pub(), tujuan));
      return tujuan;
    });
    updateEpisode(baru.id, (e) => {
      const asal = structuredClone(ep);
      e.asal = { id, adegan: idx };
      e.naskah = { ...asal.naskah!, judul: s.judul, adegan: idx.map((i) => asal.naskah!.adegan[i]).filter(Boolean) };
      e.review = asal.review;
      e.adegan = idx.map((i) => asal.adegan![i]);
      e.metadata = normalizeMetadata({ judul: s.judul, deskripsi: s.deskripsi, tags: s.tags, teksThumbnail: s.teksThumbnail }, 'short');
      e.modeRekam = 'per-adegan';
      e.audioPerAdegan = salin;
      e.offsetAdegan = idx.map((i) => potongan[i].offset);
      // rekaman berurutan direkam tanpa efek karakter → tetap suara yang sama dengan video asal
      e.efekKarakter = ep.modeRekam === 'per-adegan' ? asal.efekKarakter : false;
      e.nadaSuara = asal.nadaSuara;
      e.log.push({
        waktu: new Date().toISOString(),
        oleh: 'sutradara',
        pesan: `Shorts ${k + 1} dari episode ${id}: adegan ${idx.map((i) => i + 1).join(', ')}. ${s.alasan}`,
      });
    });
    setStatus(baru.id, 'rendering', 'sutradara', 'Menunggu giliran render');
    dibuat.push(baru.id);
  }
  if (ep.modeRekam !== 'per-adegan') for (const p of potongan) fs.rmSync(path.join(pub(), p.file), { force: true });
  updateEpisode(id, (e) => {
    e.turunan = [...(e.turunan ?? []), ...dibuat];
  });
  catat(`${dibuat.length} Shorts dibuat: ${dibuat.join(', ')}`);

  // render satu per satu; satu gagal tidak menghentikan yang lain
  for (const b of dibuat) {
    try {
      await onRender?.(b);
    } catch (e) {
      setStatus(b, 'error', 'video-creator', (e as Error).message);
    }
  }
  return dibuat;
}
