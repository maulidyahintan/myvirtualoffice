import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, loadConfig, paths, saveConfig } from '@kantor/shared';
import { MUSIC_TYPES, type MusicType } from '@kantor/shared/constants';

const TIPE: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
};

function bacaJenis(jenis: string): MusicType | undefined {
  return MUSIC_TYPES.includes(jenis as MusicType) ? (jenis as MusicType) : undefined;
}

// Putar musik yang tersimpan (pratinjau di halaman pengaturan).
export async function GET(_req: Request, ctx: { params: Promise<{ type: string }> }) {
  const jenis = bacaJenis((await ctx.params).type);
  const file = jenis ? loadConfig().music?.[jenis] : undefined;
  const lokasi = file ? path.join(paths.videoPkg(), 'public', file) : '';
  if (!file || !fs.existsSync(lokasi)) return new Response('Tidak ditemukan', { status: 404 });
  return new Response(fs.readFileSync(lokasi), {
    headers: { 'Content-Type': TIPE[path.extname(lokasi)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' },
  });
}

// Upload musik pembuka/penutup → packages/video/public/musik/<jenis>.<ext>
export async function POST(req: Request, ctx: { params: Promise<{ type: string }> }) {
  const jenis = bacaJenis((await ctx.params).type);
  if (!jenis) return Response.json({ error: 'Jenis musik tidak dikenal' }, { status: 400 });

  const file = (await req.formData()).get('musik');
  if (!(file instanceof File) || file.size === 0) return Response.json({ error: 'File musik kosong' }, { status: 400 });
  const ext = path.extname(file.name).toLowerCase();
  if (!TIPE[ext]) return Response.json({ error: `Format harus salah satu dari ${Object.keys(TIPE).join(', ')}` }, { status: 400 });

  const dir = ensureDir(paths.musik());
  // buang file lama (bisa beda ekstensi)
  for (const f of fs.readdirSync(dir)) if (path.parse(f).name === jenis) fs.unlinkSync(path.join(dir, f));
  fs.writeFileSync(path.join(dir, `${jenis}${ext}`), Buffer.from(await file.arrayBuffer()));

  const cfg = loadConfig();
  cfg.music = { volume: 0.7, inShorts: true, ...cfg.music, [jenis]: `musik/${jenis}${ext}` };
  saveConfig(cfg);

  return Response.redirect(new URL('/settings', req.url), 303);
}
