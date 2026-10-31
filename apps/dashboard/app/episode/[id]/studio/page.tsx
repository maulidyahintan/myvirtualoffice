import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEpisode, hitungKata, loadConfig, MAX_PITCH, DEFAULT_MEMORIZATION_VOICE, DEFAULT_CHARACTER_VOICE, memorizationVoice, speakerVoice, type Episode } from '@kantor/shared';
import { StudioRekam, type BagianStudio } from '@/components/StudioRekam';

export const dynamic = 'force-dynamic';

const NAMA_SPEAKERS: Record<string, string> = { narator: 'Narator', ibu: 'Ibu', mamas: 'Mamas', mochi: 'Mochi' };

/** Keterangan efek suara pembicara, misal "Ibu · lebih berat, kalem & pelan (nada −2, tempo 95%)". */
function ketSuara(pembicara: string): string {
  const s = speakerVoice(pembicara, loadConfig());
  const ket = DEFAULT_CHARACTER_VOICE[pembicara as keyof typeof DEFAULT_CHARACTER_VOICE]?.note ?? '';
  const asli = !s.pitch && s.tempo === 1;
  return `${NAMA_SPEAKERS[pembicara] ?? pembicara}: ${asli ? 'suara asli' : `${ket} (nada ${s.pitch > 0 ? '+' : ''}${s.pitch}, tempo ${Math.round(s.tempo * 100)}%)`}`;
}

/** Keterangan efek suara bacaan hafalan, misal "Suara hafalan: seperti anak-anak, lebih pelan (nada +3, tempo 85%)". */
function ketHafalan(): string {
  const s = memorizationVoice(loadConfig());
  return `Suara hafalan: ${DEFAULT_MEMORIZATION_VOICE.note} (nada ${s.pitch > 0 ? '+' : ''}${s.pitch}, tempo ${Math.round(s.tempo * 100)}%)`;
}

function daftarBagian(ep: Episode): BagianStudio[] {
  const waktu = ep.render?.scenes;
  const suaraAyat = ep.idea.type === 'memorization' ? ketHafalan() : undefined;
  const ulang = ep.idea.memorization?.repetitions ?? 1;
  const part: Omit<BagianStudio, 'mulai' | 'durasi' | 'tersimpan'>[] =
    ep.idea.type === 'memorization'
      ? (ep.memorization?.verses ?? []).map((a) => ({
          judul: a.number === 0 ? 'Basmalah' : `Ayat ${a.number}`,
          teks: a.arabic,
          arab: true,
          catatan: [a.latin, a.number > 0 && ulang > 1 ? `Baca ${ulang}x, jeda ±1 detik di antaranya.` : ''].filter(Boolean).join(' · '),
          // bacaan berulang dijeda ±1 detik → jangan sampai rekaman berhenti di tengah
          heningStop: a.number > 0 && ulang > 1 ? 3.5 : 2.5,
          // ±5 huruf per detik, dikali jumlah bacaan
          perkiraan: (a.arabic.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\s]/g, '').length / 5) * (a.number > 0 ? ulang : 1),
          suara: suaraAyat,
        }))
      : (ep.scenes ?? []).map((a, i) => ({
          judul: `Adegan ${i + 1} · ${NAMA_SPEAKERS[a.speaker] ?? a.speaker}`,
          teks: a.narration,
          arab: false,
          catatan: a.type === 'question' ? 'Jeda berpikir ±3 detik untuk anak ditambahkan otomatis setelah pertanyaan.' : '',
          heningStop: 2.5,
          // ±2,3 kata per detik (membaca pelan untuk anak)
          perkiraan: hitungKata(a.narration) / 2.3,
          suara: ketSuara(a.speaker),
        }));
  const cocok = waktu?.length === bagian.length;
  return bagian.map((b, i) => ({
    ...b,
    mulai: cocok ? waktu[i].start : undefined,
    durasi: cocok ? waktu[i].duration : undefined,
    tersimpan: Boolean(ep.recordingMode === 'per-scene' && ep.audioPerScene?.[i]),
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
  if (!ep.scenes) notFound();

  return (
    <div className="stack">
      <div>
        <Link href={`/episode/${id}`} className="kecil">
          ← Kembali ke episode
        </Link>
        <h1>🎙️ Studio Rekam</h1>
        <p className="muted kecil" style={{ margin: 0 }}>
          {ep.script?.title ?? ep.idea.title} · Rekam {ep.idea.type === 'memorization' ? 'per ayat' : 'per adegan'} sambil melihat videonya. Tiap
          rekaman yang disimpan menentukan panjang {ep.idea.type === 'memorization' ? 'ayat' : 'adegan'} itu di video akhir.
        </p>
      </div>
      <StudioRekam
        id={id}
        video={ep.render?.video ? `/api/media/${ep.render.video}?v=${encodeURIComponent(ep.render.time)}` : undefined}
        vertikal={ep.idea.format === 'short'}
        bagian={daftarBagian(ep)}
        nadaAwal={ep.voicePitch ?? 0}
        nadaMaks={MAX_PITCH}
        efekAwal={ep.characterEffects !== false}
        satuan={ep.idea.type === 'memorization' ? 'ayat' : 'adegan'}
      />
    </div>
  );
}
