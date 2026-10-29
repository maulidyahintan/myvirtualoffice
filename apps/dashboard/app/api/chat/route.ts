import { bacaChat, getEpisode, hapusChat, sedangSibuk, tambahChat, type AgenChat } from '@kantor/shared';
import { AGEN_CHAT } from '@kantor/shared/constants';
import { jalankanKantor } from '@/lib/jalankan';

export const dynamic = 'force-dynamic';

function agenDari(nilai: unknown): AgenChat | null {
  return typeof nilai === 'string' && (AGEN_CHAT as readonly string[]).includes(nilai) ? (nilai as AgenChat) : null;
}

/** Tambahkan judul episode ke pesan supaya widget bisa menampilkannya. */
function denganJudul(agen: AgenChat) {
  return bacaChat(agen).map((p) => {
    if (!p.episodeId) return p;
    try {
      const ep = getEpisode(p.episodeId);
      return { ...p, judulEpisode: ep.naskah?.judul ?? ep.ide.judul };
    } catch {
      return p;
    }
  });
}

const sedangMengetik = (agen: AgenChat) => sedangSibuk(`chat-${agen}`) || bacaChat(agen).at(-1)?.dari === 'saya';

/** GET ?agen=x → isi percakapan. Tanpa agen → ringkasan semua agen (pesan terakhir). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const agen = agenDari(url.searchParams.get('agen'));
  if (agen) return Response.json({ pesan: denganJudul(agen), mengetik: sedangMengetik(agen) });
  const ringkasan = AGEN_CHAT.map((a) => ({ agen: a, terakhir: bacaChat(a).at(-1) ?? null, mengetik: sedangMengetik(a) }));
  return Response.json({ ringkasan });
}

/** POST { agen, teks, episodeId? } → simpan pesan & minta agen membalas di belakang layar. */
export async function POST(req: Request) {
  const body = (await req.json()) as { agen?: string; teks?: string; episodeId?: string };
  const agen = agenDari(body.agen);
  const teks = (body.teks ?? '').trim();
  if (!agen || !teks) return Response.json({ error: 'Agen & pesan wajib diisi' }, { status: 400 });
  let episodeId: string | undefined;
  if (body.episodeId) {
    try {
      episodeId = getEpisode(body.episodeId).id;
    } catch {
      episodeId = undefined;
    }
  }
  tambahChat(agen, { dari: 'saya', teks, episodeId });
  jalankanKantor(['chat', agen]);
  return Response.json({ pesan: denganJudul(agen), mengetik: true });
}

/** DELETE ?agen=x → mulai obrolan baru. */
export async function DELETE(req: Request) {
  const agen = agenDari(new URL(req.url).searchParams.get('agen'));
  if (!agen) return Response.json({ error: 'Agen tidak dikenal' }, { status: 400 });
  hapusChat(agen);
  return Response.json({ pesan: [], mengetik: false });
}
