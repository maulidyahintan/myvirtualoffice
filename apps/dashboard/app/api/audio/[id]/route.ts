import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, getEpisode, paths, setStatus, updateEpisode } from '@kantor/shared';
import { jalankanKantor } from '@/lib/jalankan';

const EKSTENSI = ['.mp3', '.m4a', '.wav', '.aac', '.ogg'];

// Upload rekaman suara → simpan ke packages/video/public/audio → render otomatis.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const ep = getEpisode(id);
  if (!ep.adegan) return Response.json({ error: 'Episode belum disutradarai' }, { status: 400 });

  const form = await req.formData();
  const file = form.get('audio');
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: 'File audio kosong' }, { status: 400 });
  }
  const ext = path.extname(file.name).toLowerCase();
  if (!EKSTENSI.includes(ext)) {
    return Response.json({ error: `Format harus salah satu dari ${EKSTENSI.join(', ')}` }, { status: 400 });
  }

  const nama = `${id}${ext}`;
  fs.writeFileSync(path.join(ensureDir(paths.audio()), nama), Buffer.from(await file.arrayBuffer()));
  updateEpisode(id, (e) => {
    e.fileAudio = `audio/${nama}`;
    // rekaman baru → waktu tiap bacaan hafalan dideteksi ulang
    if (e.hafalan) e.hafalan.mulaiSegmen = undefined;
  });
  setStatus(id, 'rendering', 'pemilik', `Rekaman suara diupload (${(file.size / 1e6).toFixed(1)} MB)`);
  jalankanKantor(['render', id], id);

  return Response.redirect(new URL(`/episode/${id}`, req.url), 303);
}
