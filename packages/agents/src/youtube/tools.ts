// Tool khusus yang bisa dipakai agen (in-process MCP server).
import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { listEpisodes } from '@kantor/shared';
import { cariVideo, statistikChannel } from './data.ts';

const json = (data: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] });
const gagal = (e: unknown) => ({
  content: [{ type: 'text' as const, text: `Gagal: ${e instanceof Error ? e.message : String(e)}` }],
  isError: true,
});

export const kantorTools = createSdkMcpServer({
  name: 'kantor',
  version: '0.1.0',
  tools: [
    tool(
      'cari_video_youtube',
      'Cari video YouTube Indonesia populer untuk sebuah kata kunci (urut views). Mengembalikan views, views per hari, durasi, channel. Setiap panggilan memakai ±100 unit kuota, jadi pakai seperlunya (maks ~8 kali per riset).',
      {
        kata_kunci: z.string(),
        hari_terakhir: z.number().int().min(7).max(365).optional(),
        maks: z.number().int().min(5).max(25).optional(),
      },
      async (a) => {
        try {
          return json(await cariVideo(a.kata_kunci, a.hari_terakhir ?? 60, a.maks ?? 15));
        } catch (e) {
          return gagal(e);
        }
      },
    ),
    tool(
      'statistik_channel_kita',
      'Statistik channel kita: subscriber, jam tonton 365 hari, dan performa video 28 hari terakhir.',
      {},
      async () => {
        try {
          return json(await statistikChannel());
        } catch (e) {
          return gagal(e);
        }
      },
    ),
    tool('daftar_episode', 'Daftar episode yang sudah ada di kantor (judul, seri, format, status, jadwal tayang).', {}, async () =>
      json(
        listEpisodes().map((e) => ({
          judul: e.script?.judul ?? e.idea.judul,
          seri: e.idea.seri,
          usia: e.idea.usia,
          format: e.idea.format ?? 'biasa',
          status: e.status,
          jadwalTayang: e.youtube?.jadwalTayang,
        })),
      ),
    ),
  ],
});

export const TOOL_RISET = [
  'mcp__kantor__cari_video_youtube',
  'mcp__kantor__statistik_channel_kita',
  'mcp__kantor__daftar_episode',
];
export const TOOL_LAPORAN = ['mcp__kantor__statistik_channel_kita', 'mcp__kantor__daftar_episode'];
