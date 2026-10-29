// Ngobrol langsung dengan satu agen. Agen menjawab dengan peran & pedomannya sendiri,
// tapi TIDAK mengubah data apa pun (hanya menjawab). Pekerjaan tetap lewat tombol dashboard.
import fs from 'node:fs';
import path from 'node:path';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { bacaChat, getEpisode, paths, tambahChat, type AgenChat } from '@kantor/shared';
import { kantorTools, TOOL_LAPORAN, TOOL_RISET } from './youtube/tools.ts';

const PERAN: Record<AgenChat, { prompt: string; tools: string[]; mcpTools: string[] }> = {
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

function bacaPrompt(nama: string) {
  return fs.readFileSync(path.join(paths.prompts(), `${nama}.md`), 'utf8');
}

/** Ringkas episode supaya muat sebagai konteks obrolan. */
function konteksEpisode(id: string): string {
  try {
    const ep = getEpisode(id);
    const ringkas = {
      id: ep.id,
      status: ep.status,
      ide: ep.ide,
      naskah: ep.naskah,
      review: ep.review,
      adegan: ep.adegan?.map((a) => ({ latar: a.latar, karakter: a.karakter, ekspresi: a.ekspresi, teksLayar: a.teksLayar })),
      metadata: ep.metadata,
      logTerakhir: ep.log.slice(-8),
    };
    return `Episode yang sedang dibahas:\n${JSON.stringify(ringkas, null, 2).slice(0, 15000)}`;
  } catch {
    return '';
  }
}

/** Jawab pesan terakhir dari pemilik di percakapan dengan agen ini. */
export async function balasChat(agen: AgenChat) {
  const riwayat = bacaChat(agen);
  const terakhir = riwayat.at(-1);
  if (!terakhir || terakhir.dari !== 'saya') return;
  const peran = PERAN[agen];

  const transkrip = riwayat
    .slice(-20, -1)
    .map((p) => `${p.dari === 'saya' ? 'Pemilik' : 'Kamu'}: ${p.teks}`)
    .join('\n\n');

  const prompt = [
    `Tanggal hari ini: ${new Date().toISOString().slice(0, 10)}.`,
    terakhir.episodeId ? konteksEpisode(terakhir.episodeId) : '',
    transkrip ? `Percakapan sebelumnya:\n${transkrip}` : '',
    `Pesan baru dari pemilik:\n${terakhir.teks}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const q = query({
    prompt,
    options: {
      systemPrompt: [bacaPrompt(peran.prompt), '---', bacaPrompt('pedoman-channel'), '---', MODE_CHAT].join('\n\n'),
      model: process.env.KANTOR_MODEL || undefined,
      tools: peran.tools,
      allowedTools: [...peran.tools, ...peran.mcpTools],
      permissionMode: 'dontAsk',
      mcpServers: peran.mcpTools.length ? { kantor: kantorTools } : undefined,
      maxTurns: 12,
      settingSources: [],
    },
  });

  let jawaban = '';
  for await (const msg of q) {
    if (msg.type === 'result') {
      jawaban = msg.subtype === 'success' ? String(msg.result ?? '').trim() : `Maaf, aku gagal menjawab (${msg.subtype}).`;
    }
  }
  tambahChat(agen, { dari: 'agen', teks: jawaban || 'Maaf, aku belum bisa menjawab. Coba tanya lagi ya.', episodeId: terakhir.episodeId });
}
