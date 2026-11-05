import { readChat, getEpisode, deleteChat, isBusy, addChatMessage, type ChatAgent } from '@kantor/shared';
import { CHAT_AGENTS } from '@kantor/shared/constants';
import { runOfficeCommand } from '@/lib/runner';

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
      return { ...p, episodeTitle: ep.script?.title ?? ep.idea.title };
    } catch {
      return p;
    }
  });
}

const sedangMengetik = (agen: ChatAgent) => isBusy(`chat-${agen}`) || readChat(agen).at(-1)?.from === 'owner';

/** GET ?agent=x → the conversation. Without agent → summary of every agent (last message). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const agen = agenDari(url.searchParams.get('agent'));
  if (agen) return Response.json({ messages: denganJudul(agen), typing: sedangMengetik(agen) });
  const summary = CHAT_AGENTS.map((a) => ({ agent: a, last: readChat(a).at(-1) ?? null, typing: sedangMengetik(a) }));
  return Response.json({ summary });
}

/** POST { agent, text, episodeId? } → save the message and ask the agent to reply in the background. */
export async function POST(req: Request) {
  const body = (await req.json()) as { agent?: string; text?: string; episodeId?: string };
  const agen = agenDari(body.agent);
  const teks = (body.text ?? '').trim();
  if (!agen || !teks) return Response.json({ error: 'Agen & pesan wajib diisi' }, { status: 400 });
  let episodeId: string | undefined;
  if (body.episodeId) {
    try {
      episodeId = getEpisode(body.episodeId).id;
    } catch {
      episodeId = undefined;
    }
  }
  addChatMessage(agen, { from: 'owner', text: teks, episodeId });
  runOfficeCommand(['chat', agen]);
  return Response.json({ messages: denganJudul(agen), typing: true });
}

/** DELETE ?agent=x → start a new conversation. */
export async function DELETE(req: Request) {
  const agen = agenDari(new URL(req.url).searchParams.get('agent'));
  if (!agen) return Response.json({ error: 'Agen tidak dikenal' }, { status: 400 });
  deleteChat(agen);
  return Response.json({ messages: [], typing: false });
}
