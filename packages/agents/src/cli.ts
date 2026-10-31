// CLI kantor. Dipakai dashboard (di belakang layar) atau langsung dari terminal:
//   npm run kantor -- riset ["arahan opsional"]
//   npm run kantor -- tulis <id>
//   npm run kantor -- hafalan <id>      (ambil teks surat untuk video hafalan)
//   npm run kantor -- sutradara <id>
//   npm run kantor -- render <id>
//   npm run kantor -- upload <id> [2026-11-01T16:30:00+07:00]
//   npm run kantor -- shorts <id> [jumlah] ["arahan"]  (pecah video biasa jadi beberapa Shorts)
//   npm run kantor -- metadata <id> [render]  (buat ulang judul/deskripsi sesuai format, lalu render)
//   npm run kantor -- rencana ["arahan"]  (Channel Manager menyusun rencana jadwal tayang)
//   npm run kantor -- playlist [id]    (masukkan video ke playlist sesuai tipenya; tanpa id: semua yang belum)
//   npm run kantor -- tarik <id>        (jadikan private upload lama episode yang diedit ulang)
//   npm run kantor -- chat <agen>       (agen membalas pesan terakhir di kolom chat)
//   npm run kantor -- harian           (riset harian kalau sudah waktunya; dipanggil penjadwal)
//   npm run kantor -- harian-pasang    (pasang penjadwal macOS) | harian-lepas
//   npm run kantor -- laporan
//   npm run kantor -- status
import './env.ts';
import { CHAT_AGENTS, contentDuration, getEpisode, autoShortsCount, listEpisodes, setStatus, STATUS_LABEL, markDone, markBusy, addChatMessage, type ChatAgent } from '@kantor/shared';
import { replyToChat } from './chat.ts';
import { uninstallScheduler, installScheduler, runDailyResearchIfDue } from './automation.ts';
import { splitIntoShorts } from './shorts.ts';
import {
  regenerateMetadata,
  report,
  addToPlaylists,
  render,
  research,
  prepareMemorization,
  buildPublishPlan,
  direct,
  withdrawOldVideos,
  writeScript,
  upload,
} from './workflow.ts';

const [cmd, arg1, arg2, arg3] = process.argv.slice(2);

async function main() {
  switch (cmd) {
    // Research - English + Indonesian alias
    case 'research':
    case 'riset':
      markBusy('riset');
      try {
        return void (await research(arg1));
      } finally {
        markDone('riset');
      }
    // Daily research - English + Indonesian alias
    case 'daily':
    case 'harian':
      return runDailyResearchIfDue();
    case 'daily-install':
    case 'harian-pasang':
      return installScheduler();
    case 'daily-uninstall':
    case 'harian-lepas':
      return uninstallScheduler();
    // Write script - English + Indonesian alias
    case 'write':
    case 'tulis':
      return writeScript(need(arg1));
    // Memorization - English + Indonesian alias
    case 'memorization':
    case 'hafalan':
      return prepareMemorization(need(arg1));
    // Direct - English + Indonesian alias
    case 'direct':
    case 'sutradara':
      return direct(need(arg1));
    case 'render':
      return render(need(arg1));
    case 'upload':
      return upload(need(arg1), arg2 ? new Date(arg2).toISOString() : undefined);
    case 'shorts': {
      const id = need(arg1);
      markBusy(`shorts-${id}`);
      try {
        const count = Math.min(5, Math.max(1, Number(arg2) || autoShortsCount(contentDuration(getEpisode(id)))));
        return void (await splitIntoShorts(id, count, arg3, render));
      } finally {
        markDone(`shorts-${id}`);
      }
    }
    case 'metadata': {
      const id = need(arg1);
      markBusy(`${id}-metadata`);
      try {
        await regenerateMetadata(id);
      } finally {
        markDone(`${id}-metadata`);
      }
      return arg2 === 'render' ? render(id) : undefined;
    }
    // Publish plan - English + Indonesian alias
    case 'plan':
    case 'rencana':
      markBusy('rencana');
      try {
        return await buildPublishPlan(arg1);
      } finally {
        markDone('rencana');
      }
    case 'playlist':
      markBusy('playlist');
      try {
        return await addToPlaylists(arg1);
      } finally {
        markDone('playlist');
      }
    // Withdraw - English + Indonesian alias
    case 'withdraw':
    case 'tarik':
      return withdrawOldVideos(need(arg1));
    case 'chat': {
      const agent = need(arg1) as ChatAgent;
      if (!CHAT_AGENTS.includes(agent)) throw new Error(`Agen tidak dikenal: ${agent}`);
      markBusy(`chat-${agent}`);
      try {
        return await replyToChat(agent);
      } catch (e) {
        addChatMessage(agent, { from: 'agent', text: `Maaf, ada masalah: ${(e as Error).message}` });
        throw e;
      } finally {
        markDone(`chat-${agent}`);
      }
    }
    // Report - English + Indonesian alias
    case 'report':
    case 'laporan':
      markBusy('laporan');
      try {
        return void (await report());
      } finally {
        markDone('laporan');
      }
    case 'status':
      for (const e of listEpisodes()) {
        console.log(`${e.id.padEnd(48)} ${STATUS_LABEL[e.status]}  — ${e.script?.title ?? e.idea.title}`);
      }
      return;
    default:
      console.log('Commands: research|riset | daily|harian | daily-install|harian-pasang | daily-uninstall|harian-lepas | chat <agent> | write|tulis <id> | memorization|hafalan <id> | direct|sutradara <id> | render <id> | upload <id> [schedule] | shorts <id> [count] | metadata <id> [render] | plan|rencana [guidance] | playlist [id] | withdraw|tarik <id> | report|laporan | status');
  }
}

function need(id?: string): string {
  if (!id) throw new Error('ID episode wajib diisi');
  return id;
}

main().catch((e: unknown) => {
  const pesan = e instanceof Error ? e.message : String(e);
  console.error(`❌ ${pesan}`);
  const butuhId = ['tulis', 'hafalan', 'sutradara', 'render', 'upload'].includes(cmd ?? '');
  if (butuhId && arg1) {
    try {
      setStatus(arg1, 'error', cmd!, pesan);
    } catch {
      /* episode mungkin tidak ada */
    }
  }
  process.exit(1);
});
