import fs from 'node:fs';
import path from 'node:path';
import { paths } from '@kantor/shared';

// Menyajikan ilustrasi AI (packages/video/public/ilustrasi) untuk pratinjau di halaman episode.
export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  const nama = path.basename(file); // cegah path traversal
  const lokasi = path.join(paths.videoPkg(), 'public', 'ilustrasi', nama);
  if (path.extname(nama) !== '.jpg' || !fs.existsSync(lokasi)) return new Response('Tidak ditemukan', { status: 404 });
  return new Response(fs.readFileSync(lokasi), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' } });
}
