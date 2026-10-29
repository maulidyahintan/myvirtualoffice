import fs from 'node:fs';
import path from 'node:path';
import { addLog, ensureDir, getEpisode, paths, setStatus, updateEpisode } from '@kantor/shared';
import { jalankanKantor } from '@/lib/jalankan';

const TIPE: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
};
const EKSTENSI = Object.keys(TIPE);

// Putar satu rekaman untuk dicek: ?bagian=0, 1, … atau ?adegan=0, 1, …
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const ep = getEpisode(id);
  const q = new URL(req.url).searchParams;
  const file = q.has('adegan') ? ep.audioPerAdegan?.[Number(q.get('adegan'))] : ep.bagianAudio?.[Number(q.get('bagian'))];
  const lokasi = file ? path.join(paths.videoPkg(), 'public', file) : '';
  if (!file || !fs.existsSync(lokasi)) return new Response('Tidak ditemukan', { status: 404 });
  return new Response(fs.readFileSync(lokasi), {
    headers: { 'Content-Type': TIPE[path.extname(lokasi)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' },
  });
}

// Upload rekaman suara → simpan ke packages/video/public/audio → render.
// Rekaman boleh dikirim per bagian (mis. 3 file @2 menit): bagian disimpan berurutan
// dan digabung saat render.
//   mode=lanjut  → tambahkan setelah bagian yang sudah ada
//   mode=ganti   → buang rekaman lama
//   render=1     → langsung render (0 = masih ada bagian berikutnya)
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const ep = getEpisode(id);
  if (!ep.adegan) return Response.json({ error: 'Episode belum disutradarai' }, { status: 400 });

  const form = await req.formData();
  const files = form
    .getAll('audio')
    .filter((f): f is File => f instanceof File && f.size > 0)
    // dipilih sekaligus → urut nama file (bagian-1, bagian-2, … / 1, 2, 10 urut angka)
    .sort((a, b) => a.name.localeCompare(b.name, 'id', { numeric: true }));
  if (!files.length) return Response.json({ error: 'File audio kosong' }, { status: 400 });
  const salah = files.find((f) => !EKSTENSI.includes(path.extname(f.name).toLowerCase()));
  if (salah) {
    return Response.json({ error: `${salah.name}: format harus salah satu dari ${EKSTENSI.join(', ')}` }, { status: 400 });
  }

  const dir = ensureDir(paths.audio());
  const pub = path.join(paths.videoPkg(), 'public');

  // rekaman per adegan (hafalan: per ayat): satu file untuk satu slot, tidak langsung render
  if (form.has('adegan')) {
    const i = Number(form.get('adegan'));
    const jumlah = ep.ide.jenis === 'hafalan' ? (ep.hafalan?.ayat.length ?? 0) : ep.adegan.length;
    if (!Number.isInteger(i) || i < 0 || i >= jumlah) return Response.json({ error: 'Nomor adegan tidak valid' }, { status: 400 });
    const nama = `${id}-adegan-${i + 1}-${Date.now().toString(36)}${path.extname(files[0].name).toLowerCase()}`;
    fs.writeFileSync(path.join(dir, nama), Buffer.from(await files[0].arrayBuffer()));
    updateEpisode(id, (e) => {
      const per = Array.from({ length: jumlah }, (_, k) => e.audioPerAdegan?.[k] ?? null);
      if (per[i]) fs.rmSync(path.join(pub, per[i]!), { force: true });
      per[i] = `audio/${nama}`;
      e.audioPerAdegan = per;
      e.modeRekam = 'per-adegan';
      if (e.hafalan) e.hafalan.mulaiSegmen = undefined;
    });
    addLog(id, 'pemilik', `Rekaman ${ep.ide.jenis === 'hafalan' ? 'ayat' : 'adegan'} ${i + 1} diupload`);
    return Response.redirect(new URL(`/episode/${id}#adegan-${i + 1}`, req.url), 303);
  }

  const lanjut = form.get('mode') === 'lanjut';
  let bagian = lanjut ? [...(ep.bagianAudio ?? [])] : [];
  if (!lanjut) {
    for (const lama of [...(ep.bagianAudio ?? []), ep.fileAudio]) if (lama) fs.rmSync(path.join(pub, lama), { force: true });
  }

  const stempel = Date.now().toString(36);
  for (const file of files) {
    const nama = `${id}-${stempel}-${bagian.length + 1}${path.extname(file.name).toLowerCase()}`;
    fs.writeFileSync(path.join(dir, nama), Buffer.from(await file.arrayBuffer()));
    bagian = [...bagian, `audio/${nama}`];
  }

  updateEpisode(id, (e) => {
    e.modeRekam = 'urut';
    e.bagianAudio = bagian;
    e.fileAudio = bagian.length === 1 ? bagian[0] : undefined;
    // rekaman berubah → waktu tiap bacaan hafalan dideteksi ulang
    if (e.hafalan) e.hafalan.mulaiSegmen = undefined;
  });

  const mb = (files.reduce((s, f) => s + f.size, 0) / 1e6).toFixed(1);
  const pesan = `${files.length > 1 ? `${files.length} bagian` : `Bagian ${bagian.length}`} rekaman diupload (${mb} MB), total ${bagian.length} bagian`;
  if (form.get('render') === '0') {
    addLog(id, 'pemilik', `${pesan}, menunggu bagian berikutnya`);
  } else {
    setStatus(id, 'rendering', 'pemilik', pesan);
    jalankanKantor(['render', id], id);
  }

  return Response.redirect(new URL(`/episode/${id}`, req.url), 303);
}
