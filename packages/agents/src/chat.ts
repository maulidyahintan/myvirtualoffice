// Direct chat with one agent. Agent answers with its own role & guidelines,
// but does NOT modify any data (only answers). Work still goes through dashboard buttons.
import fs from 'node:fs';
import path from 'node:path';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { readChat, getEpisode, paths, addChatMessage, type ChatAgent } from '@kantor/shared';
import { kantorTools, TOOL_LAPORAN, TOOL_RISET } from './youtube/tools.ts';

const PERAN: Record<ChatAgent, { prompt: string; tools: string[]; mcpTools: string[] }> = {
  manajer: { prompt: 'manajer', tools: [], mcpTools: ['mcp__kantor__daftar_episode'] },
  riset: { prompt: 'riset', tools: ['WebSearch', 'WebFetch'], mcpTools: TOOL_RISET },
  penulis: { prompt: 'penulis', tools: [], mcpTools: [] },
  reviewer: { prompt: 'reviewer', tools: ['WebSearch', 'WebFetch'], mcpTools: [] },
  sutradara: { prompt: 'sutradara', tools: [], mcpTools: [] },
  channel: { prompt: 'channel-manager', tools: [], mcpTools: TOOL_LAPORAN },
};

const MODE_CHAT = `## Mode obrolan
Sekarang kamu sedang mengobrol langsung dengan pemilik channel lewat kolom chat.
- Jawab dalam bahasa Indonesia yang santai, ramah, dan ringkas (biasanya 2–6 kalimat,
  boleh daftar singkat). Tidak perlu JSON.
- Kamu TIDAK bisa mengubah data, menulis ulang naskah, atau menjalankan pekerjaan dari
  chat. Kalau pemilik ingin sesuatu dikerjakan, beri saran isinya dan sebutkan tombol
  di dashboard yang harus ditekan (misal "Minta revisi" di halaman episode).
- Untuk dalil: jangan mengarang. Kalau tidak yakin, katakan tidak yakin.
- Kalau pertanyaan di luar bidangmu, jawab sebisanya lalu sarankan pegawai yang tepat
  (Miku = riset, Chimi = penulis, Choki = reviewer, Momo = sutradara, Lulu = channel manager).`;

function readPrompt(name: string) {
  return fs.readFileSync(path.join(paths.prompts(), `${name}.md`), 'utf8');
}

/** Summarize episode to fit as chat context. */
function episodeContext(id: string): string {
  try {
    const ep = getEpisode(id);
    const summary = {
      id: ep.id,
      status: ep.status,
      idea: ep.idea,
      script: ep.script,
      review: ep.review,
      scenes: ep.scenes?.map((a) => ({ background: a.background, characters: a.characters, expression: a.expression, screenText: a.screenText })),
      metadata: ep.metadata,
      recentLog: ep.log.slice(-8),
    };
    return `Episode yang sedang dibahas:\n${JSON.stringify(summary, null, 2).slice(0, 15000)}`;
  } catch {
    return '';
  }
}

/** Reply to last message from owner in conversation with this agent. */
export async function replyToChat(agent: ChatAgent) {
  const history = readChat(agent);
  const last = history.at(-1);
  if (!last || last.from !== 'owner') return;
  const role = PERAN[agent];

  const transcript = history
    .slice(-20, -1)
    .map((m) => `${m.from === 'owner' ? 'Pemilik' : 'Kamu'}: ${m.text}`)
    .join('\n\n');

  const prompt = [
    `Tanggal hari ini: ${new Date().toISOString().slice(0, 10)}.`,
    last.episodeId ? episodeContext(last.episodeId) : '',
    transcript ? `Percakapan sebelumnya:\n${transcript}` : '',
    `Pesan baru dari pemilik:\n${last.text}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const q = query({
    prompt,
    options: {
      systemPrompt: [readPrompt(role.prompt), '---', readPrompt('pedoman-channel'), '---', MODE_CHAT].join('\n\n'),
      model: process.env.KANTOR_MODEL || undefined,
      tools: role.tools,
      allowedTools: [...role.tools, ...role.mcpTools],
      permissionMode: 'dontAsk',
      mcpServers: role.mcpTools.length ? { kantor: kantorTools } : undefined,
      maxTurns: 12,
      settingSources: [],
    },
  });

  let answer = '';
  for await (const msg of q) {
    if (msg.type === 'result') {
      answer = msg.subtype === 'success' ? String(msg.result ?? '').trim() : `Maaf, aku gagal menjawab (${msg.subtype}).`;
    }
  }
  addChatMessage(agent, { from: 'agent', text: answer || 'Maaf, aku belum bisa menjawab. Coba tanya lagi ya.', episodeId: last.episodeId });
}
