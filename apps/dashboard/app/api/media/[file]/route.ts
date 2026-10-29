import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { paths } from '@kantor/shared';

const TIPE: Record<string, string> = { '.mp4': 'video/mp4', '.png': 'image/png' };

// Menyajikan hasil render (video & thumbnail) ke dashboard, dengan dukungan Range
// supaya video bisa di-seek.
export async function GET(req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  const nama = path.basename(file); // cegah path traversal
  const ext = path.extname(nama);
  const lokasi = path.join(paths.renders(), nama);
  if (!TIPE[ext] || !fs.existsSync(lokasi)) return new Response('Tidak ditemukan', { status: 404 });

  const ukuran = fs.statSync(lokasi).size;
  const range = req.headers.get('range');
  const headers: Record<string, string> = { 'Content-Type': TIPE[ext], 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' };

  if (range) {
    const [a, b] = range.replace('bytes=', '').split('-');
    const start = Number(a);
    const end = b ? Number(b) : Math.min(start + 4_000_000, ukuran - 1);
    const stream = fs.createReadStream(lokasi, { start, end });
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${ukuran}`, 'Content-Length': String(end - start + 1) },
    });
  }
  return new Response(Readable.toWeb(fs.createReadStream(lokasi)) as ReadableStream, {
    headers: { ...headers, 'Content-Length': String(ukuran) },
  });
}
