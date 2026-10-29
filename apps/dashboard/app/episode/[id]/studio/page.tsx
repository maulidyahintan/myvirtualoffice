import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEpisode, hitungKata, NADA_MAKS, type Episode } from '@kantor/shared';
import { StudioRekam, type BagianStudio } from '@/components/StudioRekam';

export const dynamic = 'force-dynamic';

const NAMA_PEMBICARA: Record<string, string> = { narator: 'Narator', ibu: 'Ibu', mamas: 'Mamas', mochi: 'Mochi' };

function daftarBagian(ep: Episode): BagianStudio[] {
  const waktu = ep.render?.adegan;
  const ulang = ep.ide.hafalan?.ulang ?? 1;
  const bagian: Omit<BagianStudio, 'mulai' | 'durasi' | 'tersimpan'>[] =
    ep.ide.jenis === 'hafalan'
      ? (ep.hafalan?.ayat ?? []).map((a) => ({
          judul: a.nomor === 0 ? 'Basmalah' : `Ayat ${a.nomor}`,
          teks: a.arab,
          arab: true,
          catatan: [a.latin, a.nomor > 0 && ulang > 1 ? `Baca ${ulang}x, jeda ±1 detik di antaranya.` : ''].filter(Boolean).join(' · '),
          // bacaan berulang dijeda ±1 detik → jangan sampai rekaman berhenti di tengah
          heningStop: a.nomor > 0 && ulang > 1 ? 3.5 : 2.5,
          // ±5 huruf per detik, dikali jumlah bacaan
          perkiraan: (a.arab.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\s]/g, '').length / 5) * (a.nomor > 0 ? ulang : 1),
        }))
      : (ep.adegan ?? []).map((a, i) => ({
          judul: `Adegan ${i + 1} · ${NAMA_PEMBICARA[a.pembicara] ?? a.pembicara}`,
          teks: a.narasi,
          arab: false,
          catatan: a.jenis === 'pertanyaan' ? 'Jeda berpikir ±3 detik untuk anak ditambahkan otomatis setelah pertanyaan.' : '',
          heningStop: 2.5,
          // ±2,3 kata per detik (membaca pelan untuk anak)
          perkiraan: hitungKata(a.narasi) / 2.3,
        }));
  const cocok = waktu?.length === bagian.length;
  return bagian.map((b, i) => ({
    ...b,
    mulai: cocok ? waktu[i].mulai : undefined,
    durasi: cocok ? waktu[i].durasi : undefined,
    tersimpan: Boolean(ep.modeRekam === 'per-adegan' && ep.audioPerAdegan?.[i]),
  }));
}

export default async function HalamanStudio({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let ep: Episode;
  try {
    ep = getEpisode(id);
  } catch {
    notFound();
  }
  if (!ep.adegan) notFound();

  return (
    <div className="stack">
      <div>
        <Link href={`/episode/${id}`} className="kecil">
          ← Kembali ke episode
        </Link>
        <h1>🎙️ Studio Rekam</h1>
        <p className="muted kecil" style={{ margin: 0 }}>
          {ep.naskah?.judul ?? ep.ide.judul} · Rekam {ep.ide.jenis === 'hafalan' ? 'per ayat' : 'per adegan'} sambil melihat videonya. Tiap
          rekaman yang disimpan menentukan panjang {ep.ide.jenis === 'hafalan' ? 'ayat' : 'adegan'} itu di video akhir.
        </p>
      </div>
      <StudioRekam
        id={id}
        video={ep.render?.video ? `/api/media/${ep.render.video}?v=${encodeURIComponent(ep.render.waktu)}` : undefined}
        vertikal={ep.ide.format === 'short'}
        bagian={daftarBagian(ep)}
        nadaAwal={ep.nadaSuara ?? 0}
        nadaMaks={NADA_MAKS}
        satuan={ep.ide.jenis === 'hafalan' ? 'ayat' : 'adegan'}
      />
    </div>
  );
}
