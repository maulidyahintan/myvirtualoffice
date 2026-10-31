import { readChat, getEpisode, deleteChat, isBusy, addChatMessage, type ChatAgent } from '@kantor/shared';
import { CHAT_AGENTS } from '@kantor/shared/constants';
import { jalankanKantor } from '@/lib/jalankan';

export const dynamic = 'force-dynamic';

function agenDari(nilai: unknown): ChatAgent | null {
  return typeof nilai === 'string' && (CHAT_AGENTS as readonly string[]).includes(nilai) ? (nilai as ChatAgent) : null;
}

/** Tambahkan judul episode ke pesan supaya widget bisa menampilkannya. */
function denganJudul(agen: ChatAgent) {
  return readChat(agen).map((p) => {
    if (!p.episodeId) return p;
    try {
      const ep = getEpisode(p.episodeId);
      return { ...p, judulEpisode: ep.script?.title ?? ep.idea.title };
    } catch {
      return p;
    }
  });
}

const sedangMengetik = (agen: ChatAgent) => isBusy(`chat-${agen}`) || readChat(agen).at(-1)?.from === 'saya';

/** GET ?agen=x → isi percakapan. Tanpa agen → ringkasan semua agen (pesan terakhir). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const agen = agenDari(url.searchParams.get('agen'));
  if (agen) return Response.json({ pesan: denganJudul(agen), mengetik: sedangMengetik(agen) });
  const ringkasan = CHAT_AGENTS.map((a) => ({ agen: a, terakhir: readChat(a).at(-1) ?? null, mengetik: sedangMengetik(a) }));
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
  addChatMessage(agen, { dari: 'saya', teks, episodeId });
  jalankanKantor(['chat', agen]);
  return Response.json({ pesan: denganJudul(agen), mengetik: true });
}

/** DELETE ?agen=x → mulai obrolan baru. */
export async function DELETE(req: Request) {
  const agen = agenDari(new URL(req.url).searchParams.get('agen'));
  if (!agen) return Response.json({ error: 'Agen tidak dikenal' }, { status: 400 });
  deleteChat(agen);
  return Response.json({ pesan: [], mengetik: false });
}
